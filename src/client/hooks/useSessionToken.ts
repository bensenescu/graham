import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSessionToken } from "@every-app/sdk/core";

export interface UseSessionTokenOptions {
  /** Override token (if provided, skips getSessionToken) */
  sessionToken?: string | null;
}

export interface UseSessionTokenReturn {
  /** The resolved session token (null if not ready) */
  token: string | null;
  /** Refresh the token (e.g., after auth error). Returns the new token or null. */
  refreshSessionToken: () => Promise<string | null>;
}

const SESSION_MANAGER_POLL_MS = 100;
const SESSION_MANAGER_MAX_WAIT_MS = 5000;

export function useSessionToken(
  options: UseSessionTokenOptions = {},
): UseSessionTokenReturn {
  const { sessionToken } = options;
  const [resolvedToken, setResolvedToken] = useState<string | null>(
    sessionToken ?? null,
  );

  // Guard against concurrent refresh calls
  const refreshInFlightRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    // If explicit token provided, use it
    if (sessionToken !== undefined) {
      setResolvedToken(sessionToken ?? null);
      return;
    }

    let isActive = true;

    const startTime = performance.now();
    const tryGetToken = async (): Promise<void> => {
      const tokenStartTime = performance.now();
      console.log("[useSessionToken] getSessionToken() starting...");
      try {
        const token = await getSessionToken();
        const elapsed = performance.now() - tokenStartTime;
        console.log(
          `[useSessionToken] getSessionToken() completed: hasToken=${!!token}, elapsed=${elapsed.toFixed(0)}ms`,
        );
        if (!isActive) return;
        setResolvedToken(token ?? null);
      } catch (error) {
        const elapsedSinceStart = performance.now() - startTime;
        const message =
          error instanceof Error ? error.message : "Unknown error";
        console.warn("[useSessionToken] getSessionToken() failed:", message);
        if (!isActive) return;
        if (
          message.includes("Session manager not available") &&
          elapsedSinceStart < SESSION_MANAGER_MAX_WAIT_MS
        ) {
          setTimeout(tryGetToken, SESSION_MANAGER_POLL_MS);
          return;
        }
        setResolvedToken(null);
      }
    };

    tryGetToken();

    return () => {
      isActive = false;
    };
  }, [sessionToken]);

  const refreshSessionToken = useCallback(async (): Promise<string | null> => {
    // If explicit token is provided, we can't refresh it
    if (sessionToken !== undefined) {
      return sessionToken ?? null;
    }

    // Dedupe concurrent refresh calls
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const refreshPromise = getSessionToken().then((token) => {
      const newToken = token ?? null;
      setResolvedToken(newToken);
      refreshInFlightRef.current = null;
      return newToken;
    });

    refreshInFlightRef.current = refreshPromise;
    return refreshPromise;
  }, [sessionToken]);

  return useMemo(
    () => ({
      token: resolvedToken,
      refreshSessionToken,
    }),
    [resolvedToken, refreshSessionToken],
  );
}
