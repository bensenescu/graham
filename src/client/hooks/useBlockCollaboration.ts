import { useMemo, useCallback } from "react";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import {
  useYjsWebSocket,
  type ConnectionState,
  type UserInfo,
} from "./useYjsWebSocket";

export interface BlockAwarenessUser {
  userId: string;
  userName: string;
  userColor: string;
  cursor?: {
    field: "question" | "answer";
    anchor: number;
    head: number;
  };
}

export interface UseBlockCollaborationOptions {
  /** The block ID to collaborate on */
  blockId: string;
  /** User information for presence */
  userInfo: UserInfo;
  /** Whether the connection should be active */
  enabled?: boolean;
}

export interface UseBlockCollaborationReturn {
  /** The Yjs Y.Text for the question field */
  questionText: Y.Text;
  /** The Yjs Y.Text for the answer field */
  answerText: Y.Text;
  /** The Yjs Y.Doc */
  doc: Y.Doc;
  /** The awareness instance */
  awareness: awarenessProtocol.Awareness;
  /** Current connection state */
  connectionState: ConnectionState;
  /** Other users editing this block */
  users: BlockAwarenessUser[];
  /** Update cursor position */
  updateCursor: (
    field: "question" | "answer",
    anchor: number,
    head: number,
  ) => void;
  /** Clear cursor (e.g., on blur) */
  clearCursor: () => void;
  /** Manually reconnect */
  reconnect: () => void;
}

/**
 * Hook for collaborative editing of a single Q&A block
 *
 * Creates a Y.Doc with question and answer Y.Text instances,
 * manages WebSocket connection to the PageBlockDO, and
 * provides awareness state for cursor positions.
 */
export function useBlockCollaboration({
  blockId,
  userInfo,
  enabled = true,
}: UseBlockCollaborationOptions): UseBlockCollaborationReturn {
  // Create Y.Doc and awareness (memoized per blockId)
  const { doc, awareness } = useMemo(() => {
    const ydoc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(ydoc);
    return { doc: ydoc, awareness };
  }, [blockId]); // Re-create when blockId changes

  // Get the Y.Text instances
  const questionText = useMemo(() => doc.getText("question"), [doc]);
  const answerText = useMemo(() => doc.getText("answer"), [doc]);

  // Build the WebSocket URL
  const wsUrl = `/api/collab/block/${blockId}`;

  // Connect via WebSocket
  const { connectionState, reconnect, sendJsonMessage } = useYjsWebSocket({
    doc,
    awareness,
    url: wsUrl,
    userInfo,
    enabled,
  });

  // Extract users from awareness state
  const users = useMemo((): BlockAwarenessUser[] => {
    const result: BlockAwarenessUser[] = [];
    awareness.getStates().forEach((state, clientId) => {
      // Don't include ourselves
      if (clientId === awareness.clientID) return;

      if (state.user) {
        result.push({
          userId: state.user.userId,
          userName: state.user.name,
          userColor: state.user.color,
          cursor: state.cursor,
        });
      }
    });
    return result;
  }, [awareness]);

  // Update cursor position in awareness
  const updateCursor = useCallback(
    (field: "question" | "answer", anchor: number, head: number) => {
      awareness.setLocalStateField("cursor", { field, anchor, head });

      // Also send a JSON message for immediate cursor updates
      sendJsonMessage({
        type: "cursor",
        field,
        position: { anchor, head },
      });
    },
    [awareness, sendJsonMessage],
  );

  // Clear cursor from awareness
  const clearCursor = useCallback(() => {
    awareness.setLocalStateField("cursor", null);
  }, [awareness]);

  return {
    questionText,
    answerText,
    doc,
    awareness,
    connectionState,
    users,
    updateCursor,
    clearCursor,
    reconnect,
  };
}
