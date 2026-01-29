import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import {
  usePageCollaboration,
  type BlockOrderItem,
  type PagePresenceUser,
} from "../hooks/usePageCollaboration";
import { type ConnectionState, type UserInfo } from "../hooks/useYjsWebSocket";

/**
 * Context value for page-level collaboration
 */
export interface PageCollaborationContextValue {
  /** The page ID */
  pageId: string;
  /** User information */
  userInfo: UserInfo;
  /** The Yjs Y.Text for the title */
  titleText: Y.Text;
  /** The current block order as an array */
  blockOrder: BlockOrderItem[];
  /** The Yjs Y.Doc */
  doc: Y.Doc;
  /** The awareness instance */
  awareness: awarenessProtocol.Awareness;
  /** Current connection state */
  connectionState: ConnectionState;
  /** Other users on this page */
  users: PagePresenceUser[];
  /** Add a new block */
  addBlock: (afterBlockId?: string) => { id: string; sortKey: string };
  /** Remove a block */
  removeBlock: (blockId: string) => void;
  /** Reorder a block */
  reorderBlock: (blockId: string, newIndex: number) => void;
  /** Update presence (which block user is editing) */
  updatePresence: (activeBlockId: string | null) => void;
  /** Manually reconnect */
  reconnect: () => void;
}

const PageCollaborationContext =
  createContext<PageCollaborationContextValue | null>(null);

export interface PageCollaborationProviderProps {
  /** The page ID to collaborate on */
  pageId: string;
  /** User information for presence */
  userInfo: UserInfo;
  /** Whether collaboration should be enabled */
  enabled?: boolean;
  /** Children components */
  children: ReactNode;
}

/**
 * Generate a user color based on user ID
 */
function generateUserColor(userId: string): string {
  // List of pleasant, visible colors
  const colors = [
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

  // Hash the user ID to get a consistent color
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return colors[Math.abs(hash) % colors.length];
}

/**
 * Provider component for page-level collaboration
 *
 * Wraps the page editor and provides collaboration context to all child components.
 * Handles user info, connection status, and real-time sync.
 */
export function PageCollaborationProvider({
  pageId,
  userInfo: providedUserInfo,
  enabled = true,
  children,
}: PageCollaborationProviderProps) {
  // Ensure user has a color
  const userInfo = useMemo(
    (): UserInfo => ({
      ...providedUserInfo,
      userColor:
        providedUserInfo.userColor || generateUserColor(providedUserInfo.userId),
    }),
    [providedUserInfo],
  );

  // Use the page collaboration hook
  const collaboration = usePageCollaboration({
    pageId,
    userInfo,
    enabled,
  });

  // Memoize the context value
  const contextValue = useMemo(
    (): PageCollaborationContextValue => ({
      pageId,
      userInfo,
      titleText: collaboration.titleText,
      blockOrder: collaboration.blockOrder,
      doc: collaboration.doc,
      awareness: collaboration.awareness,
      connectionState: collaboration.connectionState,
      users: collaboration.users,
      addBlock: collaboration.addBlock,
      removeBlock: collaboration.removeBlock,
      reorderBlock: collaboration.reorderBlock,
      updatePresence: collaboration.updatePresence,
      reconnect: collaboration.reconnect,
    }),
    [pageId, userInfo, collaboration],
  );

  return (
    <PageCollaborationContext.Provider value={contextValue}>
      {children}
    </PageCollaborationContext.Provider>
  );
}

/**
 * Hook to access the page collaboration context
 *
 * Must be used within a PageCollaborationProvider
 */
export function usePageCollaborationContext(): PageCollaborationContextValue {
  const context = useContext(PageCollaborationContext);
  if (!context) {
    throw new Error(
      "usePageCollaborationContext must be used within a PageCollaborationProvider",
    );
  }
  return context;
}

/**
 * Hook to check if inside a PageCollaborationProvider
 */
export function useOptionalPageCollaborationContext(): PageCollaborationContextValue | null {
  return useContext(PageCollaborationContext);
}
