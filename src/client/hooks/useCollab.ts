import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import {
  collabManager,
  type ConnectionState,
  type CollabConnection,
} from "@/client/lib/PageCollabManager";
import { useCurrentUser } from "@/client/every-app";
import { generateUserColor } from "@/client/lib/user-colors";
import { useCollabAwareness } from "./useCollabAwareness";
import { useSessionToken } from "./useSessionToken";
import type { UserInfo } from "./collabTypes";

// Re-export types for consumers
export type { UserInfo } from "./collabTypes";
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
  reconnect: () => Promise<void>;
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

  // DEBUG: Track hook mount time
  const hookMountTimeRef = useRef(performance.now());
  useEffect(() => {
    console.log(
      "[useCollab] mounted, roomName:",
      roomName,
      "enabled:",
      enabled,
    );
    return () => {
      console.log("[useCollab] unmounted, roomName:", roomName);
    };
  }, [roomName, enabled]);

  const { token, refreshSessionToken } = useSessionToken({
    sessionToken,
  });
  const currentUser = useCurrentUser();
  const userInfo = useMemo<UserInfo>(() => {
    const userId = currentUser?.userId ?? "anonymous";
    const userName = currentUser?.email ?? "Anonymous";
    return {
      userId,
      userName,
      userColor: generateUserColor(userId),
    };
  }, [currentUser?.userId, currentUser?.email]);

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

  // Connect provider when token is available
  useEffect(() => {
    if (!enabled || !token) {
      console.log(
        "[useCollab] connectWithToken blocked:",
        `enabled=${enabled}, hasToken=${!!token}, roomName=${roomName}`,
      );
      return;
    }

    const elapsed = performance.now() - hookMountTimeRef.current;
    console.log(
      `[useCollab] connectWithToken starting: roomName=${roomName}, elapsedSinceMount=${elapsed.toFixed(0)}ms`,
    );

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
  }, [enabled, token, url, roomName]);

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
      const elapsed = performance.now() - hookMountTimeRef.current;
      console.log(
        `[useCollab] sync event: synced=${synced}, roomName=${roomName}, elapsedSinceMount=${elapsed.toFixed(0)}ms`,
      );
      setIsSynced(synced);
      if (synced) {
        setHasSyncedOnce(true);
      }
    };

    provider.on("sync", handleSync);
    if (provider.synced) {
      const elapsed = performance.now() - hookMountTimeRef.current;
      console.log(
        `[useCollab] provider already synced: roomName=${roomName}, elapsedSinceMount=${elapsed.toFixed(0)}ms`,
      );
      setIsSynced(true);
      setHasSyncedOnce(true);
    }

    return () => {
      provider.off("sync", handleSync);
    };
  }, [provider, roomName]);

  // Reactive token refresh on auth errors
  useEffect(() => {
    if (!provider || !enabled) return;

    const handleStatus = async ({ status }: { status: string }) => {
      // On error, attempt to refresh the token and reconnect
      if (status === "disconnected" || status === "error") {
        // Only attempt refresh if we had a token before (auth failure scenario)
        if (token) {
          const freshToken = await refreshSessionToken();
          if (freshToken) {
            const nextProvider = collabManager.connectWithToken({
              url,
              roomName,
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
  }, [provider, enabled, token, refreshSessionToken, url, roomName]);

  // Centralized awareness management
  useCollabAwareness({
    provider,
    userInfo,
    hasToken: !!token,
    roomName,
  });

  const reconnect = useCallback(async () => {
    // Refresh token first to handle expiration
    const freshToken = await refreshSessionToken();
    if (!freshToken) return;

    const nextProvider = collabManager.connectWithToken({
      url,
      roomName,
      token: freshToken,
      userInfo: userInfoRef.current,
    });
    if (nextProvider) {
      setProvider(nextProvider);
      setConnectionState(nextProvider.wsconnected ? "connected" : "connecting");
    }
  }, [url, roomName, refreshSessionToken]);

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
