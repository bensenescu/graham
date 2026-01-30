import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { useCurrentUser } from "@every-app/sdk/tanstack";
import { getSessionToken } from "@every-app/sdk/core";
import {
  collabManager,
  type UserInfo,
  type ConnectionState,
  type CollabConnection,
} from "@/client/lib/PageCollabManager";

// Re-export types for consumers
export type { UserInfo, ConnectionState } from "@/client/lib/PageCollabManager";

export interface UsePageCollabOptions {
  pageId: string;
  enabled?: boolean;
  sessionToken?: string | null;
}

export interface UsePageCollabReturn {
  doc: Y.Doc | null;
  provider: WebsocketProvider | null;
  connectionState: ConnectionState;
  isSynced: boolean;
  hasSyncedOnce: boolean;
  reconnect: () => void;
  userInfo: UserInfo;
  /** Get a Y.XmlFragment for a named field (creates if doesn't exist) */
  getFragment: (name: string) => Y.XmlFragment | null;
  /** Get the title fragment */
  getTitleFragment: () => Y.XmlFragment | null;
  /** Get a block's question fragment */
  getBlockQuestionFragment: (blockId: string) => Y.XmlFragment | null;
  /** Get a block's answer fragment */
  getBlockAnswerFragment: (blockId: string) => Y.XmlFragment | null;
}

const CURSOR_COLORS = [
  "#E57373",
  "#64B5F6",
  "#81C784",
  "#FFD54F",
  "#BA68C8",
  "#4DD0E1",
  "#FF8A65",
  "#A1887F",
  "#90A4AE",
  "#F06292",
];

function generateUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

/**
 * Hook for collaborative page editing using Yjs.
 *
 * Uses PageCollabManager to create connections outside React's lifecycle,
 * avoiding race conditions and provider recreation issues.
 *
 * Connects to /api/page-collab/{pageId} and provides access to
 * multiple named Y.XmlFragment fields within a single Y.Doc:
 * - `title` - page title
 * - `block:{blockId}:question` - each block's question
 * - `block:{blockId}:answer` - each block's answer
 */
export function usePageCollab({
  pageId,
  enabled = true,
  sessionToken,
}: UsePageCollabOptions): UsePageCollabReturn {
  const [connection, setConnection] = useState<CollabConnection | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [isSynced, setIsSynced] = useState(false);
  const [hasSyncedOnce, setHasSyncedOnce] = useState(false);
  const [resolvedToken, setResolvedToken] = useState<string | null>(
    sessionToken ?? null,
  );

  // Get user info from current session
  const currentUser = useCurrentUser();
  const sessionReady = !!currentUser?.userId;
  const userInfo = useMemo((): UserInfo => {
    const userId = currentUser?.userId ?? "anonymous";
    const userName = currentUser?.email ?? "Anonymous";
    return { userId, userName, userColor: generateUserColor(userId) };
  }, [currentUser?.userId, currentUser?.email]);

  // Store userInfo in a ref so we can update awareness without recreating connection
  const userInfoRef = useRef(userInfo);
  userInfoRef.current = userInfo;

  // Get connection from manager (doc only; provider connects explicitly)
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Get connection synchronously - doc available immediately for local editing
    const conn = collabManager.getConnection({
      roomName: pageId,
      userInfo: userInfoRef.current,
    });

    console.debug("[usePageCollab] connection created", {
      pageId,
      hasProvider: !!conn.provider,
    });

    setConnection(conn);
    setConnectionState("disconnected");

    // If provider is already available, use it
    if (conn.provider) {
      setProvider(conn.provider);
      setConnectionState(
        conn.provider.wsconnected ? "connected" : "connecting",
      );
      setIsSynced(conn.provider.synced);
      console.debug("[usePageCollab] provider already available", {
        pageId,
        wsconnected: conn.provider.wsconnected,
        synced: conn.provider.synced,
      });
    }

    // Subscribe to provider ready event
    const unsubProviderReady = collabManager.onProviderReady(pageId, () => {
      const p = collabManager.getProvider(pageId);
      if (p) {
        setProvider(p);
        // Update connection state based on provider status
        setConnectionState(p.wsconnected ? "connected" : "connecting");
        // Check if already synced
        if (p.synced) {
          setIsSynced(true);
        }
        console.debug("[usePageCollab] provider ready", {
          pageId,
          wsconnected: p.wsconnected,
          synced: p.synced,
        });
      }
    });

    return () => {
      unsubProviderReady();
      collabManager.releaseConnection(pageId);
      setConnection(null);
      setProvider(null);
      setIsSynced(false);
      setHasSyncedOnce(false);
      console.debug("[usePageCollab] cleanup", { pageId });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, enabled]); // Don't include isSessionReady - session refresh shouldn't recreate connection

  useEffect(() => {
    if (sessionToken !== undefined) {
      setResolvedToken(sessionToken ?? null);
      return;
    }

    let isActive = true;

    if (!sessionReady) {
      setResolvedToken(null);
      return () => {
        isActive = false;
      };
    }

    getSessionToken().then((token) => {
      if (!isActive) return;
      setResolvedToken(token ?? null);
    });

    return () => {
      isActive = false;
    };
  }, [sessionReady, sessionToken]);

  useEffect(() => {
    // Only connect when we have both a token AND valid user info (not Anonymous)
    if (!enabled || !resolvedToken || !sessionReady) return;

    console.debug("[usePageCollab] connectWithToken", {
      pageId,
      hasToken: !!resolvedToken,
      sessionReady,
      userInfo: userInfoRef.current,
    });

    const nextProvider = collabManager.connectWithToken({
      roomName: pageId,
      token: resolvedToken,
      userInfo: userInfoRef.current,
    });

    if (nextProvider) {
      setProvider(nextProvider);
      setConnectionState(nextProvider.wsconnected ? "connected" : "connecting");
      console.debug("[usePageCollab] provider created", {
        pageId,
        wsconnected: nextProvider.wsconnected,
        awarenessLocalState: nextProvider.awareness.getLocalState(),
      });
    }
  }, [enabled, resolvedToken, sessionReady, pageId]);

  // Update awareness when userInfo changes (without recreating connection)
  useEffect(() => {
    if (provider) {
      provider.awareness.setLocalStateField("user", {
        name: userInfo.userName,
        color: userInfo.userColor,
        userId: userInfo.userId,
      });
      console.debug("[usePageCollab] awareness updated", {
        pageId,
        userId: userInfo.userId,
      });
    }
  }, [provider, userInfo]);

  // Subscribe to state changes from manager
  useEffect(() => {
    if (!connection) return;

    const unsubscribe = collabManager.onStateChange(pageId, (state) => {
      setConnectionState(state);
      console.debug("[usePageCollab] connection state", { pageId, state });
    });
    return unsubscribe;
  }, [pageId, connection]);

  // Track sync state from provider
  useEffect(() => {
    if (!provider) return;

    const handleSync = (synced: boolean) => {
      setIsSynced(synced);
      if (synced) {
        setHasSyncedOnce(true);
      }
      console.debug("[usePageCollab] sync state", { pageId, synced });
    };

    provider.on("sync", handleSync);
    // Check initial state
    if (provider.synced) {
      setIsSynced(true);
      setHasSyncedOnce(true);
      console.debug("[usePageCollab] initial sync true", { pageId });
    }

    return () => {
      provider.off("sync", handleSync);
    };
  }, [provider]);

  const reconnect = useCallback(() => {
    if (!resolvedToken) return;
    const nextProvider = collabManager.connectWithToken({
      roomName: pageId,
      token: resolvedToken,
      userInfo: userInfoRef.current,
    });
    if (nextProvider) {
      setProvider(nextProvider);
      setConnectionState(nextProvider.wsconnected ? "connected" : "connecting");
    }
  }, [pageId, resolvedToken]);

  const getFragment = useCallback(
    (name: string): Y.XmlFragment | null => {
      if (!connection) return null;
      return connection.doc.getXmlFragment(name);
    },
    [connection],
  );

  const getTitleFragment = useCallback((): Y.XmlFragment | null => {
    return getFragment("title");
  }, [getFragment]);

  const getBlockQuestionFragment = useCallback(
    (blockId: string): Y.XmlFragment | null => {
      return getFragment(`block:${blockId}:question`);
    },
    [getFragment],
  );

  const getBlockAnswerFragment = useCallback(
    (blockId: string): Y.XmlFragment | null => {
      return getFragment(`block:${blockId}:answer`);
    },
    [getFragment],
  );

  return useMemo(
    () => ({
      doc: connection?.doc ?? null,
      provider,
      connectionState,
      isSynced,
      hasSyncedOnce,
      reconnect,
      userInfo, // Always use current userInfo, not stale connection.userInfo
      getFragment,
      getTitleFragment,
      getBlockQuestionFragment,
      getBlockAnswerFragment,
    }),
    [
      connection,
      provider,
      connectionState,
      isSynced,
      hasSyncedOnce,
      reconnect,
      userInfo,
      getFragment,
      getTitleFragment,
      getBlockQuestionFragment,
      getBlockAnswerFragment,
    ],
  );
}
