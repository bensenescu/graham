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

export interface UseCollabOptions {
  /** Base URL for WebSocket connection */
  url: string;
  /** Room name for collaboration */
  roomName: string;
  /** Whether collaboration is enabled */
  enabled?: boolean;
  /** Session token for authentication */
  sessionToken?: string | null;
}

export interface UseCollabReturn {
  doc: Y.Doc | null;
  provider: WebsocketProvider | null;
  connectionState: ConnectionState;
  isSynced: boolean;
  hasSyncedOnce: boolean;
  reconnect: () => void;
  userInfo: UserInfo;
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
 * Generic hook for Yjs collaboration using CollabManager.
 *
 * Uses CollabManager to create connections outside React's lifecycle,
 * avoiding race conditions and provider recreation issues.
 */
export function useCollab({
  url,
  roomName,
  enabled = true,
  sessionToken,
}: UseCollabOptions): UseCollabReturn {
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
      url,
      roomName,
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
    const unsubProviderReady = collabManager.onProviderReady(
      roomName,
      () => {
        const p = collabManager.getProvider(roomName, url);
        if (p) {
          setProvider(p);
          // Update connection state based on provider status
          setConnectionState(p.wsconnected ? "connected" : "connecting");
          // Check if already synced
          if (p.synced) {
            setIsSynced(true);
          }
        }
      },
      url,
    );

    return () => {
      unsubProviderReady();
      collabManager.releaseConnection(roomName, url);
      setConnection(null);
      setProvider(null);
      setIsSynced(false);
      setHasSyncedOnce(false);
    };
  }, [url, roomName, enabled]); // Don't include userInfo - we use ref to avoid recreation

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
    if (!enabled || !resolvedToken) return;

    const nextProvider = collabManager.connectWithToken({
      url,
      roomName,
      token: resolvedToken,
      userInfo: userInfoRef.current,
    });

    if (nextProvider) {
      setProvider(nextProvider);
      setConnectionState(nextProvider.wsconnected ? "connected" : "connecting");
    }
  }, [enabled, resolvedToken, url, roomName]);

  // Update awareness when userInfo changes (without recreating connection)
  useEffect(() => {
    if (provider) {
      provider.awareness.setLocalStateField("user", {
        name: userInfo.userName,
        color: userInfo.userColor,
        userId: userInfo.userId,
      });
    }
  }, [provider, userInfo]);

  // Subscribe to state changes from manager
  useEffect(() => {
    if (!connection) return;

    const unsubscribe = collabManager.onStateChange(
      roomName,
      setConnectionState,
      url,
    );
    return unsubscribe;
  }, [url, roomName, connection]);

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
    // Check initial state
    if (provider.synced) {
      setIsSynced(true);
      setHasSyncedOnce(true);
    }

    return () => {
      provider.off("sync", handleSync);
    };
  }, [provider]);

  const reconnect = useCallback(() => {
    if (!resolvedToken) return;
    const nextProvider = collabManager.connectWithToken({
      url,
      roomName,
      token: resolvedToken,
      userInfo: userInfoRef.current,
    });
    if (nextProvider) {
      setProvider(nextProvider);
      setConnectionState(nextProvider.wsconnected ? "connected" : "connecting");
    }
  }, [url, roomName, resolvedToken]);

  return useMemo(
    () => ({
      doc: connection?.doc ?? null,
      provider,
      connectionState,
      isSynced,
      hasSyncedOnce,
      reconnect,
      userInfo: connection?.userInfo ?? userInfo,
    }),
    [
      connection,
      provider,
      connectionState,
      isSynced,
      hasSyncedOnce,
      reconnect,
      userInfo,
    ],
  );
}
