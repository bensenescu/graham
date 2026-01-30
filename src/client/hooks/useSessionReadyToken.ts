import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@every-app/sdk/tanstack";
import { getSessionToken } from "@every-app/sdk/core";

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

export interface UserInfo {
  userId: string;
  userName: string;
  userColor: string;
}

export interface UseSessionReadyTokenOptions {
  /** Override token (if provided, skips getSessionToken) */
  sessionToken?: string | null;
}

export interface UseSessionReadyTokenReturn {
  /** Whether the session is ready (user is authenticated) */
  sessionReady: boolean;
  /** The resolved session token (null if not ready) */
  token: string | null;
  /** User info derived from the session */
  userInfo: UserInfo;
}

/**
 * Hook that provides session readiness, token, and user info.
 * Centralizes the logic for determining when a user is authenticated
 * and ready for collaboration.
 */
export function useSessionReadyToken(
  options: UseSessionReadyTokenOptions = {},
): UseSessionReadyTokenReturn {
  const { sessionToken } = options;
  const [resolvedToken, setResolvedToken] = useState<string | null>(
    sessionToken ?? null,
  );

  const currentUser = useCurrentUser();
  const sessionReady = !!currentUser?.userId;

  const userInfo = useMemo((): UserInfo => {
    const userId = currentUser?.userId ?? "anonymous";
    const userName = currentUser?.email ?? "Anonymous";
    return { userId, userName, userColor: generateUserColor(userId) };
  }, [currentUser?.userId, currentUser?.email]);

  // Resolve token from session when ready
  useEffect(() => {
    // If explicit token provided, use it
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

  return useMemo(
    () => ({
      sessionReady,
      token: resolvedToken,
      userInfo,
    }),
    [sessionReady, resolvedToken, userInfo],
  );
}
