import { useEffect, useState, useRef, useCallback } from "react";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { WebsocketProvider } from "y-websocket";
import { getSessionToken } from "@every-app/sdk/core";
import { useCurrentUser } from "@every-app/sdk/tanstack";

export interface UserInfo {
  userId: string;
  userName: string;
  userColor: string;
}

export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface UseYjsWebSocketOptions {
  url: string;
  /** Room name - combined with url to form full WebSocket path */
  roomName?: string;
  userInfo: UserInfo;
  enabled?: boolean;
  /** Optional external Y.Doc - if not provided, one is created internally */
  doc?: Y.Doc;
  /** Optional external awareness - if provided, user state will be set on it */
  awareness?: awarenessProtocol.Awareness;
}

export interface UseYjsWebSocketReturn {
  doc: Y.Doc;
  provider: WebsocketProvider | null;
  connectionState: ConnectionState;
  /** Whether the initial document sync is complete */
  isSynced: boolean;
  reconnect: () => void;
  sendJsonMessage: (data: Record<string, unknown>) => void;
}

export function useYjsWebSocket({
  url,
  roomName = "",
  userInfo,
  enabled = true,
  doc: externalDoc,
  awareness: externalAwareness,
}: UseYjsWebSocketOptions): UseYjsWebSocketReturn {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [isSynced, setIsSynced] = useState(false);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const docRef = useRef<Y.Doc>(externalDoc ?? new Y.Doc());
  const cleanupRef = useRef<(() => void) | null>(null);

  // Wait for session to be ready
  const currentUser = useCurrentUser();
  const isSessionReady = currentUser !== null;

  const connect = useCallback(async () => {
    if (!enabled || !docRef.current || !isSessionReady) return;

    // Clean up previous connection
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    setConnectionState("connecting");

    // Get auth token
    let token: string;
    try {
      token = await getSessionToken();
    } catch (error) {
      console.error("Failed to get session token:", error);
      setConnectionState("error");
      return;
    }

    // Build WebSocket URL
    const wsUrl = new URL(url, window.location.origin);
    wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";

    const newProvider = new WebsocketProvider(
      wsUrl.origin + wsUrl.pathname,
      roomName,
      docRef.current,
      {
        params: {
          token,
          userId: userInfo.userId,
          userName: userInfo.userName,
          userColor: userInfo.userColor,
        },
      }
    );

    // Set user awareness (use external awareness if provided)
    const awareness = externalAwareness ?? newProvider.awareness;
    awareness.setLocalStateField("user", {
      name: userInfo.userName,
      color: userInfo.userColor,
      userId: userInfo.userId,
    });

    newProvider.on("status", ({ status }: { status: string }) => {
      if (status === "connected") {
        setConnectionState("connected");
      } else if (status === "disconnected") {
        setConnectionState("disconnected");
        setIsSynced(false);
      }
    });

    newProvider.on("sync", (synced: boolean) => {
      setIsSynced(synced);
    });

    // Check if already synced (can happen if provider syncs before event listener is added)
    if (newProvider.synced) {
      setIsSynced(true);
    }

    // Store cleanup function
    cleanupRef.current = () => {
      newProvider.destroy();
      setIsSynced(false);
    };

    setProvider(newProvider);
  }, [url, roomName, userInfo, enabled, externalAwareness, isSessionReady]);

  const reconnect = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    setProvider(null);
    connect();
  }, [connect]);

  const sendJsonMessage = useCallback(
    (data: Record<string, unknown>) => {
      if (provider?.ws?.readyState === WebSocket.OPEN) {
        provider.ws.send(JSON.stringify(data));
      }
    },
    [provider]
  );

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (enabled && isSessionReady) {
      connect();
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [enabled, isSessionReady, connect]);

  return {
    doc: docRef.current,
    provider,
    connectionState,
    isSynced,
    reconnect,
    sendJsonMessage,
  };
}
