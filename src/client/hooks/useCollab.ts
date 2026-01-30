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

export interface UseCollabOptions {
  /** Base URL for WebSocket connection */
  url: string;
  /** Room name for collaboration */
  roomName: string;
  /** Whether collaboration is enabled */
  enabled?: boolean;
  /** Session token for authentication (optional override) */
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

  // Centralized session/token/userInfo logic
  const { sessionReady, token, userInfo } = useSessionReadyToken({
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
          setConnectionState(p.wsconnected ? "connected" : "connecting");
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
  }, [url, roomName, enabled]);

  // Connect provider when session is ready and token is available
  useEffect(() => {
    if (!enabled || !token || !sessionReady) return;

    const nextProvider = collabManager.connectWithToken({
      url,
      roomName,
      token,
      userInfo: userInfoRef.current,
    });

    if (nextProvider) {
      setProvider(nextProvider);
      setConnectionState(nextProvider.wsconnected ? "connected" : "connecting");
    }
  }, [enabled, token, sessionReady, url, roomName]);

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
    if (provider.synced) {
      setIsSynced(true);
      setHasSyncedOnce(true);
    }

    return () => {
      provider.off("sync", handleSync);
    };
  }, [provider]);

  // Centralized awareness management
  useCollabAwareness({
    provider,
    userInfo,
    sessionReady,
    roomName,
  });

  const reconnect = useCallback(() => {
    if (!token) return;
    const nextProvider = collabManager.connectWithToken({
      url,
      roomName,
      token,
      userInfo: userInfoRef.current,
    });
    if (nextProvider) {
      setProvider(nextProvider);
      setConnectionState(nextProvider.wsconnected ? "connected" : "connecting");
    }
  }, [url, roomName, token]);

  return useMemo(
    () => ({
      doc: connection?.doc ?? null,
      provider,
      connectionState,
      isSynced,
      hasSyncedOnce,
      reconnect,
      userInfo,
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
