import { useMemo, useEffect, useState } from "react";
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

/**
 * Get or generate a unique client ID for this browser session
 */
function getClientId(): string {
  const STORAGE_KEY = "collab-client-id";

  if (typeof window === "undefined") {
    return crypto.randomUUID();
  }

  let clientId = localStorage.getItem(STORAGE_KEY);
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, clientId);
  }
  return clientId;
}

/**
 * Get or set the user's display name for collaboration
 */
function getDisplayName(): string {
  const STORAGE_KEY = "collab-display-name";

  if (typeof window === "undefined") {
    return "Anonymous";
  }

  let name = localStorage.getItem(STORAGE_KEY);
  if (!name) {
    // Generate a random name as fallback
    name = `User ${Math.floor(Math.random() * 1000)}`;
    localStorage.setItem(STORAGE_KEY, name);
  }
  return name;
}

export interface UseCollaborationUserReturn {
  userInfo: UserInfo;
  isLoading: boolean;
  setDisplayName: (name: string) => void;
}

/**
 * Hook to get user information for collaborative editing
 *
 * In a production app, this would fetch user info from the auth system.
 * For now, it uses localStorage to persist a client ID and display name.
 */
export function useCollaborationUser(): UseCollaborationUserReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [displayName, setDisplayNameState] = useState("Anonymous");

  useEffect(() => {
    // Initialize from localStorage on mount
    setDisplayNameState(getDisplayName());
    setIsLoading(false);
  }, []);

  const setDisplayName = (name: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("collab-display-name", name);
    }
    setDisplayNameState(name);
  };

  const userInfo = useMemo((): UserInfo => {
    const userId = getClientId();
    return {
      userId,
      userName: displayName,
      userColor: generateUserColor(userId),
    };
  }, [displayName]);

  return {
    userInfo,
    isLoading,
    setDisplayName,
  };
}
