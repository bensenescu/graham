import { useMemo, useCallback, useEffect, useState } from "react";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import {
  useYjsWebSocket,
  type ConnectionState,
  type UserInfo,
} from "./useYjsWebSocket";
import { generateSortKeyBetween } from "../lib/fractional-indexing";

export interface BlockOrderItem {
  id: string;
  sortKey: string;
}

export interface PagePresenceUser {
  clientId: number;
  userId: string;
  userName: string;
  userColor: string;
  activeBlockId?: string;
}

export interface UsePageCollaborationOptions {
  /** The page ID to collaborate on */
  pageId: string;
  /** User information for presence (optional - derived from session if not provided) */
  userInfo?: UserInfo;
  /** Whether the connection should be active */
  enabled?: boolean;
}

export interface UsePageCollaborationReturn {
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

/**
 * Hook for collaborative page metadata (title, block ordering)
 *
 * Creates a Y.Doc with title Y.Text and blockOrder Y.Array,
 * manages WebSocket connection to the PageMetaDO, and
 * provides awareness state for page-level presence.
 */
export function usePageCollaboration({
  pageId,
  userInfo,
  enabled = true,
}: UsePageCollaborationOptions): UsePageCollaborationReturn {
  // Track block order changes with state for reactivity
  const [blockOrder, setBlockOrder] = useState<BlockOrderItem[]>([]);

  // Create Y.Doc and awareness (memoized per pageId)
  const { doc, awareness } = useMemo(() => {
    const ydoc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(ydoc);
    return { doc: ydoc, awareness };
  }, [pageId]); // Re-create when pageId changes

  // Get the Y.Text instance for title
  const titleText = useMemo(() => doc.getText("title"), [doc]);

  // Get the Y.Array instance for block order
  const blockOrderArray = useMemo(
    () => doc.getArray<BlockOrderItem>("blockOrder"),
    [doc],
  );

  // Connect via WebSocket
  const { connectionState, reconnect, sendJsonMessage } = useYjsWebSocket({
    url: "/api/collab/page",
    roomName: pageId,
    userInfo,
    enabled,
    doc,
    awareness,
  });

  // Subscribe to block order changes
  useEffect(() => {
    const updateBlockOrder = () => {
      setBlockOrder(blockOrderArray.toArray());
    };

    // Initial value
    updateBlockOrder();

    // Subscribe to changes
    blockOrderArray.observe(updateBlockOrder);

    return () => {
      blockOrderArray.unobserve(updateBlockOrder);
    };
  }, [blockOrderArray]);

  // Extract users from awareness state
  const users = useMemo((): PagePresenceUser[] => {
    const result: PagePresenceUser[] = [];
    awareness.getStates().forEach((state, clientId) => {
      // Don't include ourselves
      if (clientId === awareness.clientID) return;

      if (state.user) {
        result.push({
          clientId,
          userId: state.user.userId,
          userName: state.user.name,
          userColor: state.user.color,
          activeBlockId: state.activeBlockId,
        });
      }
    });
    return result;
  }, [awareness]);

  // Add a new block
  const addBlock = useCallback(
    (afterBlockId?: string): { id: string; sortKey: string } => {
      const newBlockId = crypto.randomUUID();
      const items = blockOrderArray.toArray();

      let sortKey: string;
      let insertIndex: number;

      if (afterBlockId) {
        const afterIndex = items.findIndex((b) => b.id === afterBlockId);
        if (afterIndex !== -1) {
          const beforeKey = items[afterIndex]?.sortKey;
          const afterKey = items[afterIndex + 1]?.sortKey;
          sortKey = generateSortKeyBetween(afterKey, beforeKey);
          insertIndex = afterIndex + 1;
        } else {
          // Fallback: add at end
          const lastKey = items[items.length - 1]?.sortKey;
          sortKey = generateSortKeyBetween(lastKey, undefined);
          insertIndex = items.length;
        }
      } else {
        // Add at end
        const lastKey = items[items.length - 1]?.sortKey;
        sortKey = generateSortKeyBetween(lastKey, undefined);
        insertIndex = items.length;
      }

      const newBlock: BlockOrderItem = { id: newBlockId, sortKey };
      blockOrderArray.insert(insertIndex, [newBlock]);

      // Also send as JSON message for immediate broadcast
      sendJsonMessage({
        type: "addBlock",
        blockId: newBlockId,
        sortKey,
        afterBlockId,
      });

      return newBlock;
    },
    [blockOrderArray, sendJsonMessage],
  );

  // Remove a block
  const removeBlock = useCallback(
    (blockId: string) => {
      const items = blockOrderArray.toArray();
      const index = items.findIndex((b) => b.id === blockId);
      if (index !== -1) {
        blockOrderArray.delete(index, 1);

        // Also send as JSON message
        sendJsonMessage({
          type: "removeBlock",
          blockId,
        });
      }
    },
    [blockOrderArray, sendJsonMessage],
  );

  // Reorder a block
  const reorderBlock = useCallback(
    (blockId: string, newIndex: number) => {
      const items = blockOrderArray.toArray();
      const currentIndex = items.findIndex((b) => b.id === blockId);

      if (currentIndex === -1 || currentIndex === newIndex) return;

      // Calculate new sort key based on neighbors at the new position
      let newSortKey: string;
      if (newIndex === 0) {
        // Moving to the beginning
        newSortKey = generateSortKeyBetween(undefined, items[0]?.sortKey);
      } else if (newIndex >= items.length - 1) {
        // Moving to the end
        newSortKey = generateSortKeyBetween(
          items[items.length - 1]?.sortKey,
          undefined,
        );
      } else {
        // Moving to middle - need to consider that we're removing from currentIndex
        const adjustedIndex = newIndex > currentIndex ? newIndex : newIndex - 1;
        const beforeItem = items[adjustedIndex];
        const afterItem = items[adjustedIndex + 1];
        newSortKey = generateSortKeyBetween(
          beforeItem?.sortKey,
          afterItem?.sortKey,
        );
      }

      // Remove from current position
      blockOrderArray.delete(currentIndex, 1);

      // Insert at new position
      const adjustedNewIndex =
        newIndex > currentIndex ? newIndex - 1 : newIndex;
      blockOrderArray.insert(adjustedNewIndex, [
        { id: blockId, sortKey: newSortKey },
      ]);

      // Also send as JSON message
      sendJsonMessage({
        type: "reorderBlock",
        blockId,
        newIndex,
        newSortKey,
      });
    },
    [blockOrderArray, sendJsonMessage],
  );

  // Update presence (which block user is editing)
  const updatePresence = useCallback(
    (activeBlockId: string | null) => {
      awareness.setLocalStateField("activeBlockId", activeBlockId);

      // Also send as JSON message
      sendJsonMessage({
        type: "presence",
        activeBlockId,
      });
    },
    [awareness, sendJsonMessage],
  );

  return {
    titleText,
    blockOrder,
    doc,
    awareness,
    connectionState,
    users,
    addBlock,
    removeBlock,
    reorderBlock,
    updatePresence,
    reconnect,
  };
}
