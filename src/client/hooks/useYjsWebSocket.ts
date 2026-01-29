import { useEffect, useRef, useState, useCallback } from "react";
import * as Y from "yjs";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";

// Message types for Yjs protocol
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

// Connection states
export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

// Reconnection configuration
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]; // Exponential backoff
const MAX_RECONNECT_ATTEMPTS = 6;

export interface UserInfo {
  userId: string;
  userName: string;
  userColor: string;
}

export interface UseYjsWebSocketOptions {
  /** The Y.Doc to sync */
  doc: Y.Doc;
  /** The awareness instance for cursor/presence sync */
  awareness: awarenessProtocol.Awareness;
  /** The WebSocket URL to connect to */
  url: string;
  /** User information for presence */
  userInfo: UserInfo;
  /** Whether the connection should be active */
  enabled?: boolean;
  /** Callback when connection state changes */
  onConnectionStateChange?: (state: ConnectionState) => void;
}

export interface UseYjsWebSocketReturn {
  /** Current connection state */
  connectionState: ConnectionState;
  /** Manually disconnect */
  disconnect: () => void;
  /** Manually reconnect */
  reconnect: () => void;
  /** Send a JSON message over the WebSocket */
  sendJsonMessage: (data: Record<string, unknown>) => void;
}

/**
 * Hook for managing a WebSocket connection to a Yjs Durable Object
 *
 * Handles:
 * - Connection lifecycle (connect, disconnect, reconnect)
 * - Yjs document synchronization
 * - Awareness state synchronization
 * - Automatic reconnection with exponential backoff
 */
export function useYjsWebSocket({
  doc,
  awareness,
  url,
  userInfo,
  enabled = true,
  onConnectionStateChange,
}: UseYjsWebSocketOptions): UseYjsWebSocketReturn {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const syncedRef = useRef(false);

  // Update connection state and notify
  const updateConnectionState = useCallback(
    (state: ConnectionState) => {
      setConnectionState(state);
      onConnectionStateChange?.(state);
    },
    [onConnectionStateChange],
  );

  // Handle incoming WebSocket messages
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (typeof event.data === "string") {
        // Handle JSON messages (presence updates, etc.)
        try {
          const data = JSON.parse(event.data);
          // JSON messages are handled externally via awareness
          console.log("Received JSON message:", data.type);
        } catch {
          console.error("Invalid JSON message received");
        }
        return;
      }

      // Handle binary Yjs protocol messages
      const data = new Uint8Array(event.data);
      const decoder = decoding.createDecoder(data);
      const messageType = decoding.readVarUint(decoder);

      switch (messageType) {
        case MESSAGE_SYNC: {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, MESSAGE_SYNC);

          const syncMessageType = syncProtocol.readSyncMessage(
            decoder,
            encoder,
            doc,
            null,
          );

          // Send response if we have one
          if (encoding.length(encoder) > 1) {
            wsRef.current?.send(encoding.toUint8Array(encoder));
          }

          // Mark as synced after receiving sync step 2
          if (
            syncMessageType === syncProtocol.messageYjsSyncStep2 ||
            syncMessageType === syncProtocol.messageYjsUpdate
          ) {
            if (!syncedRef.current) {
              syncedRef.current = true;
              updateConnectionState("connected");
            }
          }
          break;
        }

        case MESSAGE_AWARENESS: {
          const update = decoding.readVarUint8Array(decoder);
          awarenessProtocol.applyAwarenessUpdate(awareness, update, null);
          break;
        }

        default:
          console.warn("Unknown message type:", messageType);
      }
    },
    [doc, awareness, updateConnectionState],
  );

  // Set up local awareness state
  const setupAwareness = useCallback(() => {
    awareness.setLocalStateField("user", {
      name: userInfo.userName,
      color: userInfo.userColor,
      userId: userInfo.userId,
    });
  }, [awareness, userInfo]);

  // Subscribe to local doc changes and send updates
  useEffect(() => {
    if (!enabled) return;

    const sendUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === wsRef.current || !wsRef.current) return;
      if (wsRef.current.readyState !== WebSocket.OPEN) return;

      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      wsRef.current.send(encoding.toUint8Array(encoder));
    };

    doc.on("update", sendUpdate);
    return () => {
      doc.off("update", sendUpdate);
    };
  }, [doc, enabled]);

  // Subscribe to local awareness changes and send updates
  useEffect(() => {
    if (!enabled) return;

    const sendAwarenessUpdate = (
      { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown,
    ) => {
      if (origin === "remote" || !wsRef.current) return;
      if (wsRef.current.readyState !== WebSocket.OPEN) return;

      const changedClients = added.concat(updated).concat(removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients),
      );
      wsRef.current.send(encoding.toUint8Array(encoder));
    };

    awareness.on("update", sendAwarenessUpdate);
    return () => {
      awareness.off("update", sendAwarenessUpdate);
    };
  }, [awareness, enabled]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    syncedRef.current = false;
    updateConnectionState("connecting");

    // Build WebSocket URL with user info
    const wsUrl = new URL(url, window.location.origin);
    wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
    wsUrl.searchParams.set("userId", userInfo.userId);
    wsUrl.searchParams.set("userName", userInfo.userName);
    wsUrl.searchParams.set("userColor", userInfo.userColor);

    const ws = new WebSocket(wsUrl.toString());
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      setupAwareness();
      // Connection state will be set to 'connected' after sync
    };

    ws.onmessage = handleMessage;

    ws.onclose = (event) => {
      wsRef.current = null;
      syncedRef.current = false;

      // Don't reconnect if this was a clean close
      if (event.code === 1000 || !enabled) {
        updateConnectionState("disconnected");
        return;
      }

      // Attempt reconnection with backoff
      if (reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay =
          RECONNECT_DELAYS[
            Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)
          ];
        console.log(
          `WebSocket closed, reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current + 1})`,
        );
        updateConnectionState("disconnected");

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptRef.current++;
          connect();
        }, delay);
      } else {
        console.error("Max reconnection attempts reached");
        updateConnectionState("error");
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      // onclose will be called after this
    };
  }, [
    url,
    userInfo,
    enabled,
    handleMessage,
    setupAwareness,
    updateConnectionState,
  ]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      // Remove awareness state before disconnecting
      awarenessProtocol.removeAwarenessStates(
        awareness,
        [awareness.clientID],
        "disconnect",
      );

      wsRef.current.close(1000, "Manual disconnect");
      wsRef.current = null;
    }

    syncedRef.current = false;
    updateConnectionState("disconnected");
  }, [awareness, updateConnectionState]);

  // Reconnect to WebSocket
  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptRef.current = 0;
    // Small delay to ensure clean disconnect
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  // Send a JSON message
  const sendJsonMessage = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    connectionState,
    disconnect,
    reconnect,
    sendJsonMessage,
  };
}
