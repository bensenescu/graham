import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import {
  collabManager,
  type ConnectionState,
  type CollabConnection,
} from "@/client/lib/PageCollabManager";
import { useSessionReadyToken, type UserInfo } from "./useSessionReadyToken";
import { useCollabAwareness } from "./useCollabAwareness";

// Re-export types for consumers
export type { UserInfo } from "./useSessionReadyToken";
export type { ConnectionState } from "@/client/lib/PageCollabManager";

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
  reconnect: () => Promise<void>;
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

  // Centralized session/token/userInfo logic
  const { sessionReady, token, userInfo, refreshToken } = useSessionReadyToken({
    sessionToken,
  });

  // Store userInfo in a ref for use in callbacks
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

    setConnection(conn);
    setConnectionState("disconnected");

    // If provider is already available, use it
    if (conn.provider) {
      setProvider(conn.provider);
      setConnectionState(
        conn.provider.wsconnected ? "connected" : "connecting",
      );
      setIsSynced(conn.provider.synced);
    }

    // Subscribe to provider ready event
    const unsubProviderReady = collabManager.onProviderReady(pageId, () => {
      const p = collabManager.getProvider(pageId);
      if (p) {
        setProvider(p);
        setConnectionState(p.wsconnected ? "connected" : "connecting");
        if (p.synced) {
          setIsSynced(true);
        }
      }
    });

    return () => {
      unsubProviderReady();
      collabManager.releaseConnection(pageId);
      setConnection(null);
      setProvider(null);
      setIsSynced(false);
      setHasSyncedOnce(false);
    };
  }, [pageId, enabled]);

  // Connect provider when session is ready and token is available
  useEffect(() => {
    if (!enabled || !token || !sessionReady) return;

    const nextProvider = collabManager.connectWithToken({
      roomName: pageId,
      token,
      userInfo: userInfoRef.current,
    });

    if (nextProvider) {
      setProvider(nextProvider);
      setConnectionState(nextProvider.wsconnected ? "connected" : "connecting");
    }
  }, [enabled, token, sessionReady, pageId]);

  // Subscribe to state changes from manager
  useEffect(() => {
    if (!connection) return;

    const unsubscribe = collabManager.onStateChange(pageId, setConnectionState);
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
    };

    provider.on("sync", handleSync);
    if (provider.synced) {
      setIsSynced(true);
      setHasSyncedOnce(true);
    }

    return () => {
      provider.off("sync", handleSync);
    };
  }, [provider]);

  // Reactive token refresh on auth errors
  useEffect(() => {
    if (!provider || !enabled) return;

    const handleStatus = async ({ status }: { status: string }) => {
      // On error, attempt to refresh the token and reconnect
      if (status === "disconnected" || status === "error") {
        // Only attempt refresh if we had a token before (auth failure scenario)
        if (token) {
          const freshToken = await refreshToken();
          if (freshToken) {
            const nextProvider = collabManager.connectWithToken({
              roomName: pageId,
              token: freshToken,
              userInfo: userInfoRef.current,
            });
            if (nextProvider) {
              setProvider(nextProvider);
              setConnectionState(
                nextProvider.wsconnected ? "connected" : "connecting",
              );
            }
          }
        }
      }
    };

    provider.on("status", handleStatus);
    return () => {
      provider.off("status", handleStatus);
    };
  }, [provider, enabled, token, refreshToken, pageId]);

  // Centralized awareness management
  useCollabAwareness({
    provider,
    userInfo,
    sessionReady,
    roomName: pageId,
  });

  const reconnect = useCallback(async () => {
    // Refresh token first to handle expiration
    const freshToken = await refreshToken();
    if (!freshToken) return;

    const nextProvider = collabManager.connectWithToken({
      roomName: pageId,
      token: freshToken,
      userInfo: userInfoRef.current,
    });
    if (nextProvider) {
      setProvider(nextProvider);
      setConnectionState(nextProvider.wsconnected ? "connected" : "connecting");
    }
  }, [pageId, refreshToken]);

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
