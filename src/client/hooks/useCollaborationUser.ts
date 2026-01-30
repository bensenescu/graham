import { useMemo } from "react";
import { useCurrentUser } from "@every-app/sdk/tanstack";
import type { UserInfo } from "./useYjsWebSocket";

/**
 * List of pleasant, visible colors for user cursors
 */
const CURSOR_COLORS = [
  "#E57373", // Red
  "#64B5F6", // Blue
  "#81C784", // Green
  "#FFD54F", // Yellow
  "#BA68C8", // Purple
  "#4DD0E1", // Cyan
  "#FF8A65", // Orange
  "#A1887F", // Brown
  "#90A4AE", // Grey Blue
  "#F06292", // Pink
];

/**
 * Generate a consistent color from a user ID
 */
function generateUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

export interface UseCollaborationUserReturn {
  userInfo: UserInfo;
  isLoading: boolean;
}

/**
 * Hook to get user information for collaborative editing.
 * Uses the authenticated user's email and ID.
 */
export function useCollaborationUser(): UseCollaborationUserReturn {
  const currentUser = useCurrentUser();

  const userInfo = useMemo((): UserInfo => {
    const userId = currentUser?.userId ?? "anonymous";
    const userName = currentUser?.email ?? "Anonymous";
    return {
      userId,
      userName,
      userColor: generateUserColor(userId),
    };
  }, [currentUser?.userId, currentUser?.email]);

  return {
    userInfo,
    isLoading: currentUser === null,
  };
}
