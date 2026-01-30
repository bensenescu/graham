import { useEffect, useRef } from "react";
import type { WebsocketProvider } from "y-websocket";
import type { UserInfo } from "./useSessionReadyToken";

const DEBUG_AWARENESS = false;

function debugLog(message: string, data?: Record<string, unknown>) {
  if (DEBUG_AWARENESS) {
    console.debug(`[useCollabAwareness] ${message}`, data);
  }
}

export interface UseCollabAwarenessOptions {
  /** The WebSocket provider for awareness */
  provider: WebsocketProvider | null;
  /** User info to set in awareness */
  userInfo: UserInfo;
  /** Whether the session is ready (user is authenticated) */
  sessionReady: boolean;
  /** Room name for logging */
  roomName: string;
}

/**
 * Hook that manages collaborative awareness state.
 * Handles:
 * - Setting user awareness when session is ready
 * - Re-applying awareness on reconnect (status: connected)
 * - Re-applying awareness on tab visibility change
 * - Clearing awareness on unmount and beforeunload
 */
export function useCollabAwareness({
  provider,
  userInfo,
  sessionReady,
  roomName,
}: UseCollabAwarenessOptions): void {
  // Keep refs for use in event handlers
  const userInfoRef = useRef(userInfo);
  userInfoRef.current = userInfo;

  const sessionReadyRef = useRef(sessionReady);
  sessionReadyRef.current = sessionReady;

  // Set awareness when userInfo changes (only when session is ready)
  useEffect(() => {
    if (!provider) return;

    if (!sessionReady) {
      debugLog("skipping awareness update (session not ready)", {
        roomName,
        userId: userInfo.userId,
      });
      return;
    }

    debugLog("updating awareness", {
      roomName,
      userName: userInfo.userName,
      userId: userInfo.userId,
    });

    provider.awareness.setLocalStateField("user", {
      name: userInfo.userName,
      color: userInfo.userColor,
      userId: userInfo.userId,
    });
  }, [provider, userInfo, sessionReady, roomName]);

  // Re-apply awareness on reconnect and visibility change
  useEffect(() => {
    if (!provider) return;

    const applyAwareness = () => {
      const currentUserInfo = userInfoRef.current;

      // Don't apply Anonymous awareness
      if (!sessionReadyRef.current || currentUserInfo.userId === "anonymous") {
        debugLog("skipping re-apply awareness (session not ready)", {
          roomName,
          userId: currentUserInfo.userId,
        });
        return;
      }

      debugLog("re-applying awareness", {
        roomName,
        userName: currentUserInfo.userName,
        userId: currentUserInfo.userId,
      });

      provider.awareness.setLocalStateField("user", {
        name: currentUserInfo.userName,
        color: currentUserInfo.userColor,
        userId: currentUserInfo.userId,
      });
    };

    // Re-apply awareness when provider reconnects
    const handleStatus = ({ status }: { status: string }) => {
      if (status === "connected") {
        applyAwareness();
      }
    };

    // Re-apply awareness when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && provider.wsconnected) {
        applyAwareness();
      }
    };

    provider.on("status", handleStatus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      provider.off("status", handleStatus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [provider, roomName]);

  // Clear awareness on unmount and beforeunload
  useEffect(() => {
    if (!provider) return;

    const clearAwareness = () => {
      debugLog("clearing awareness", { roomName });
      provider.awareness.setLocalState(null);
    };

    const handleBeforeUnload = () => {
      clearAwareness();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearAwareness();
    };
  }, [provider, roomName]);
}
