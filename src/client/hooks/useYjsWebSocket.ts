import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { WebsocketProvider } from "y-websocket";
import { getSessionToken } from "@every-app/sdk/core";
import { useCurrentUser } from "@every-app/sdk/tanstack";

const CURSOR_COLORS = [
  "#E57373", "#64B5F6", "#81C784", "#FFD54F", "#BA68C8",
  "#4DD0E1", "#FF8A65", "#A1887F", "#90A4AE", "#F06292",
];

function generateUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

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
  /** User info - if not provided, generated from current session */
  userInfo?: UserInfo;
  enabled?: boolean;
  /** External Y.Doc - if not provided, one is created internally */
  doc?: Y.Doc;
  /** External awareness - if provided, user state will be set on it */
  awareness?: awarenessProtocol.Awareness;
}

export interface UseYjsWebSocketReturn {
  doc: Y.Doc;
  provider: WebsocketProvider | null;
  connectionState: ConnectionState;
  /** Whether the initial document sync is complete */
  isSynced: boolean;
  reconnect: () => void;
  userInfo: UserInfo;
  sendJsonMessage: (data: Record<string, unknown>) => void;
}

export function useYjsWebSocket({
  url,
  roomName = "",
  userInfo: externalUserInfo,
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

  // Get user info from current session (used when externalUserInfo not provided)
  const currentUser = useCurrentUser();
  const derivedUserInfo = useMemo((): UserInfo => {
    const userId = currentUser?.userId ?? "anonymous";
    const userName = currentUser?.email ?? "Anonymous";
    return { userId, userName, userColor: generateUserColor(userId) };
  }, [currentUser?.userId, currentUser?.email]);
  const userInfo = externalUserInfo ?? derivedUserInfo;
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
    userInfo,
    sendJsonMessage,
  };
}
