import { useEffect, useRef } from "react";
import type { WebsocketProvider } from "y-websocket";
import type { UserInfo } from "./collabTypes";

const DEBUG_AWARENESS = false;

const CURSOR_PATCHED = Symbol("collabCursorPatched");
const ORIGINAL_SET_LOCAL_STATE_FIELD = Symbol(
  "collabOriginalSetLocalStateField",
);

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
  /** Whether a session token is available */
  hasToken: boolean;
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
  hasToken,
  roomName,
}: UseCollabAwarenessOptions): void {
  // Patch awareness to avoid cursor flicker from frequent null clears.
  //
  // In this app we mount multiple TipTap editors (title + question + answer)
  // that share the same Yjs awareness instance. The yCursorPlugin clears the
  // local cursor on blur/destroy by calling setLocalStateField("cursor", null).
  // With multiple editors, focus changes and ProseMirror transactions can
  // cause repeated cursor clears, which makes remote carets flash in/out.
  //
  // We intentionally ignore only cursor=null updates to keep the last known
  // caret visible while the user is actively collaborating. Other awareness
  // fields (user info, selections) still update normally.
  //
  // Note: there is likely a better architecture here (e.g., a single editor
  // instance or a dedicated cursor manager) that avoids patching awareness.
  useEffect(() => {
    if (!provider) return;
    const awareness = provider.awareness as typeof provider.awareness & {
      [CURSOR_PATCHED]?: boolean;
      [ORIGINAL_SET_LOCAL_STATE_FIELD]?: typeof provider.awareness.setLocalStateField;
    };

    if (awareness[CURSOR_PATCHED]) return;

    const originalSetLocalStateField =
      awareness.setLocalStateField.bind(awareness);
    awareness[ORIGINAL_SET_LOCAL_STATE_FIELD] = originalSetLocalStateField;
    awareness.setLocalStateField = (field, value) => {
      if (field === "cursor" && value === null) {
        return;
      }
      return originalSetLocalStateField(field, value);
    };
    awareness[CURSOR_PATCHED] = true;
  }, [provider]);

  // Keep refs for use in event handlers
  const userInfoRef = useRef(userInfo);
  userInfoRef.current = userInfo;

  const hasTokenRef = useRef(hasToken);
  hasTokenRef.current = hasToken;

  // Set awareness when userInfo changes (only when session is ready)
  useEffect(() => {
    if (!provider) return;

    if (!hasToken) {
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
  }, [provider, userInfo, hasToken, roomName]);

  // Re-apply awareness on reconnect and visibility change
  useEffect(() => {
    if (!provider) return;

    const applyAwareness = () => {
      const currentUserInfo = userInfoRef.current;

      // Don't apply Anonymous awareness
      if (!hasTokenRef.current || currentUserInfo.userId === "anonymous") {
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
