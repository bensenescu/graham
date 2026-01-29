import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CollaborativeQADocumentBlock } from "./CollaborativeQADocumentBlock";
import type { PageBlock } from "@/types/schemas/pages";
import type { BlockReview } from "@/types/schemas/reviews";
import { generateSortKeyBetween } from "@/client/lib/fractional-indexing";
import { useKeyboardNavigation } from "@/client/hooks/useKeyboardNavigation";
import {
  getBlockItemId,
  ADD_QUESTION_BUTTON_ID,
} from "@/client/lib/element-ids";
import {
  usePageCollaborationContext,
  type PageCollaborationContextValue,
} from "./PageCollaborationProvider";
import { PagePresenceIndicator } from "./PagePresenceIndicator";
import { ConnectionIndicator } from "./ConnectionStatusBanner";

interface CollaborativeQADocumentEditorProps {
  pageId: string;
  blocks: PageBlock[];
  reviews?: Map<string, BlockReview>;
  loadingBlockIds?: Set<string>;
  activeBlockId?: string | null;
  showInlineReviews?: boolean;
  onBlockCreate: (block: PageBlock) => void;
  onBlockUpdate: (id: string, updates: Partial<PageBlock>) => void;
  onBlockDelete: (id: string) => void;
  onBlockFocus?: (id: string) => void;
  onReviewRequest?: (id: string) => void;
}

/**
 * Collaborative auto-resizing title input that syncs with Yjs Y.Text
 */
function CollaborativeTitle({
  collaboration,
  onTitleChange,
}: {
  collaboration: PageCollaborationContextValue;
  onTitleChange?: (title: string) => void;
}) {
  const { titleText, connectionState } = collaboration;
  const [value, setValue] = useState(titleText.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to Y.Text changes
  useEffect(() => {
    const observer = () => {
      const newValue = titleText.toString();
      setValue(newValue);
      onTitleChange?.(newValue);
    };

    titleText.observe(observer);
    return () => titleText.unobserve(observer);
  }, [titleText, onTitleChange]);

  // Handle local changes
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      const oldValue = titleText.toString();

      if (newValue !== oldValue) {
        titleText.delete(0, oldValue.length);
        titleText.insert(0, newValue);
      }
    },
    [titleText],
  );

  // Show connection state in border
  const borderClass =
    connectionState === "connected"
      ? ""
      : connectionState === "connecting"
        ? "border-b-2 border-blue-300"
        : "border-b-2 border-yellow-400";

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleChange}
      placeholder="Untitled"
      style={{ fontSize: "1.5rem", lineHeight: "2rem" }}
      className={`w-full font-bold text-base-content bg-transparent border-none outline-none pt-4 pb-2 placeholder:text-base-content/40 ${borderClass}`}
    />
  );
}

/**
 * Collaborative Document-style Q&A editor
 *
 * Uses the PageCollaborationProvider context for real-time collaboration.
 */
export function CollaborativeQADocumentEditor({
  pageId,
  blocks,
  reviews,
  loadingBlockIds,
  activeBlockId,
  showInlineReviews = true,
  onBlockCreate,
  onBlockUpdate,
  onBlockDelete,
  onBlockFocus,
  onReviewRequest,
}: CollaborativeQADocumentEditorProps) {
  // Get collaboration context
  const collaboration = usePageCollaborationContext();
  const {
    userInfo,
    blockOrder,
    connectionState,
    users,
    addBlock: addBlockCollab,
    removeBlock: removeBlockCollab,
    reorderBlock: reorderBlockCollab,
    updatePresence,
    reconnect,
  } = collaboration;

  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sensors = useDraggableSensors();

  // Merge D1 blocks with collaborative block order
  // Use the collaborative block order if available, otherwise fall back to D1 blocks
  const sortedBlocks = useMemo(() => {
    if (blockOrder.length > 0) {
      // Map collaborative block order to actual block data
      return blockOrder
        .map((item) => blocks.find((b) => b.id === item.id))
        .filter((b): b is PageBlock => b !== undefined);
    }

    // Fallback to D1 block ordering
    return [...blocks].sort((a, b) =>
      b.sortKey > a.sortKey ? 1 : b.sortKey < a.sortKey ? -1 : 0,
    );
  }, [blocks, blockOrder]);

  // Update presence when active block changes
  useEffect(() => {
    updatePresence(activeBlockId || null);
  }, [activeBlockId, updatePresence]);

  // Direct update to parent (called on blur from block component)
  const handleQuestionChange = useCallback(
    (id: string, question: string) => {
      onBlockUpdate(id, { question });
    },
    [onBlockUpdate],
  );

  const handleAnswerChange = useCallback(
    (id: string, answer: string) => {
      onBlockUpdate(id, { answer });
    },
    [onBlockUpdate],
  );

  const handleDelete = useCallback(
    (id: string) => {
      // Remove from collaborative state
      removeBlockCollab(id);
      // Also remove from D1
      onBlockDelete(id);
    },
    [removeBlockCollab, onBlockDelete],
  );

  const handleAddBlock = useCallback(() => {
    // Add via collaborative state
    const { id: newBlockId, sortKey } = addBlockCollab();

    const newBlock: PageBlock = {
      id: newBlockId,
      pageId,
      question: "",
      answer: "",
      sortKey,
    };

    setFocusBlockId(newBlock.id);
    onBlockCreate(newBlock);
  }, [addBlockCollab, pageId, onBlockCreate]);

  const handleAddAfter = useCallback(
    (afterId: string) => {
      // Add via collaborative state
      const { id: newBlockId, sortKey } = addBlockCollab(afterId);

      const newBlock: PageBlock = {
        id: newBlockId,
        pageId,
        question: "",
        answer: "",
        sortKey,
      };

      setFocusBlockId(newBlock.id);
      onBlockCreate(newBlock);
    },
    [addBlockCollab, pageId, onBlockCreate],
  );

  // Keyboard navigation for blocks (include add button at the end)
  const navItemIds = useMemo(
    () => [...sortedBlocks.map((block) => block.id), ADD_QUESTION_BUTTON_ID],
    [sortedBlocks],
  );

  // Get element ID - handles both blocks and the add button
  const getNavElementId = useCallback((id: string) => {
    if (id === ADD_QUESTION_BUTTON_ID) {
      return ADD_QUESTION_BUTTON_ID;
    }
    return getBlockItemId(id);
  }, []);

  const handleKeyboardAdd = useCallback(
    (afterId: string | null) => {
      if (afterId && afterId !== ADD_QUESTION_BUTTON_ID) {
        handleAddAfter(afterId);
      } else {
        handleAddBlock();
      }
    },
    [handleAddAfter, handleAddBlock],
  );

  // Handle keyboard delete (only if not the only block, and not the add button)
  const handleKeyboardDelete = useCallback(
    (id: string) => {
      if (id === ADD_QUESTION_BUTTON_ID) return;
      if (sortedBlocks.length > 1) {
        handleDelete(id);
      }
    },
    [sortedBlocks.length, handleDelete],
  );

  // Handle keyboard edit (focus the question textarea)
  const handleKeyboardEdit = useCallback((id: string) => {
    if (id === ADD_QUESTION_BUTTON_ID) return;
    const blockElement = document.getElementById(getBlockItemId(id));
    const questionTextarea = blockElement?.querySelector("textarea");
    questionTextarea?.focus();
  }, []);

  useKeyboardNavigation({
    itemIds: navItemIds,
    getElementId: getNavElementId,
    onAdd: handleKeyboardAdd,
    onDelete: handleKeyboardDelete,
    onEdit: handleKeyboardEdit,
    onReview: onReviewRequest,
  });

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const draggedIndex = sortedBlocks.findIndex(
        (block) => block.id === active.id,
      );
      const targetIndex = sortedBlocks.findIndex(
        (block) => block.id === over.id,
      );

      if (draggedIndex === -1 || targetIndex === -1) return;

      // Use collaborative reorder
      reorderBlockCollab(active.id as string, targetIndex);

      // Also update D1 sort key
      const { beforeBlock, afterBlock } = calculateNewPosition(
        sortedBlocks,
        draggedIndex,
        targetIndex,
      );

      const newSortKey = generateSortKeyBetween(
        afterBlock?.sortKey,
        beforeBlock?.sortKey,
      );

      onBlockUpdate(active.id as string, { sortKey: newSortKey });
    },
    [sortedBlocks, reorderBlockCollab, onBlockUpdate],
  );

  return (
    <div ref={containerRef} className="pt-6 pb-6 px-6 min-h-screen">
      <div className="max-w-3xl mx-auto bg-base-100 rounded-lg px-4 py-2 border border-base-300 min-h-[calc(100vh-6rem)]">
        {/* Page title - editable */}
        <input
          type="text"
          value={localTitle}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          placeholder="Untitled"
          style={{ fontSize: "1.5rem", lineHeight: "2rem" }}
          className="w-full font-bold text-base-content bg-transparent border-none outline-none pt-4 pb-2 placeholder:text-base-content/40"
        />

        {sortedBlocks.length === 0 ? (
          <div className="py-8">
            <p className="text-base-content/50 mb-4">No questions yet</p>
            <button
              onClick={handleAddBlock}
              className="btn btn-primary btn-sm gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Question
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedBlocks.map((block) => block.id)}
              strategy={verticalListSortingStrategy}
            >
              <div>
                {sortedBlocks.map((block) => (
                  <CollaborativeQADocumentBlock
                    key={block.id}
                    block={block}
                    review={reviews?.get(block.id)}
                    isReviewLoading={loadingBlockIds?.has(block.id)}
                    isActive={activeBlockId === block.id}
                    showInlineReviews={showInlineReviews}
                    onQuestionChange={handleQuestionChange}
                    onAnswerChange={handleAnswerChange}
                    onDelete={handleDelete}
                    onReviewRequest={onReviewRequest}
                    onFocus={onBlockFocus}
                    isOnly={sortedBlocks.length === 1}
                    autoFocusQuestion={block.id === focusBlockId}
                    onAutoFocusDone={() => setFocusBlockId(null)}
                    userInfo={userInfo}
                    collaborationEnabled={connectionState === "connected"}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Add button at bottom */}
        {sortedBlocks.length > 0 && (
          <div className="pb-2">
            <button
              id={ADD_QUESTION_BUTTON_ID}
              tabIndex={0}
              onClick={handleAddBlock}
              className="btn btn-ghost btn-sm gap-2 text-base-content/60 hover:text-base-content focus:bg-primary/10 focus:text-base-content"
            >
              <Plus className="h-4 w-4" />
              Add Question
              <kbd className="ml-1 px-1.5 py-0.5 text-xs font-mono bg-base-300 border border-base-content/20 rounded">
                a
              </kbd>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function calculateNewPosition(
  blocks: PageBlock[],
  draggedIndex: number,
  targetIndex: number,
): { beforeBlock?: PageBlock; afterBlock?: PageBlock } {
  const isMovingDown = draggedIndex < targetIndex;

  if (isMovingDown) {
    return {
      beforeBlock: blocks[targetIndex],
      afterBlock: blocks[targetIndex + 1],
    };
  } else {
    return {
      beforeBlock: blocks[targetIndex - 1],
      afterBlock: blocks[targetIndex],
    };
  }
}

function useDraggableSensors() {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  return sensors;
}

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});
