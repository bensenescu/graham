import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
  createContext,
  useContext,
} from "react";
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
import { QADocumentBlock } from "./QADocumentBlock";
import { CollabTextEditor, getFragmentText } from "./CollabTextEditor";
import type { PageBlock } from "@/types/schemas/pages";
import type { BlockReview } from "@/types/schemas/reviews";
import {
  generateDefaultSortKey,
  generateSortKeyBetween,
} from "@/client/lib/fractional-indexing";
import { useKeyboardNavigation } from "@/client/hooks/useKeyboardNavigation";
import {
  getBlockItemId,
  ADD_QUESTION_BUTTON_ID,
} from "@/client/lib/element-ids";
import {
  usePageCollab,
  type UsePageCollabReturn,
} from "@/client/hooks/usePageCollab";

// Context for passing collab state to child blocks
export interface PageCollabContextValue {
  collab: UsePageCollabReturn | null;
  isCollabReady: boolean;
}

export const PageCollabContext = createContext<PageCollabContextValue>({
  collab: null,
  isCollabReady: false,
});

export function usePageCollabContext() {
  return useContext(PageCollabContext);
}

interface QADocumentEditorProps {
  pageId: string;
  pageTitle?: string;
  blocks: PageBlock[];
  reviews?: Map<string, BlockReview>;
  /** Set of block IDs currently being reviewed */
  loadingBlockIds?: Set<string>;
  activeBlockId?: string | null;
  /** Whether to show inline AI reviews */
  showInlineReviews?: boolean;
  onBlockCreate: (block: PageBlock) => void;
  onBlockUpdate: (id: string, updates: Partial<PageBlock>) => void;
  onBlockDelete: (id: string) => void;
  onBlockFocus?: (id: string) => void;
  onReviewRequest?: (id: string) => void;
  onTitleChange?: (title: string) => void;
}

/**
 * Document-style Q&A editor with clean, minimal design.
 * Supports AI review integration with bi-directional sync.
 *
 * Note: This component does NOT have its own scroll container.
 * The parent component (ResizablePanelLayout) handles scrolling.
 */
export function QADocumentEditor({
  pageId,
  pageTitle,
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
  onTitleChange,
}: QADocumentEditorProps) {
  // Local state for block management (drag/drop, add/remove)
  const [localBlocks, setLocalBlocks] = useState<PageBlock[]>(blocks);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sensors = useDraggableSensors();

  // Collaborative editing via Yjs
  const collab = usePageCollab({ pageId });
  const { provider, connectionState, getTitleFragment, userInfo, reconnect } =
    collab;

  // Whether collaboration is ready for local editing (provider exists)
  const isReady = provider !== null;

  useEffect(() => {
    console.debug("[QADocumentEditor] collab status", {
      pageId,
      hasProvider: provider !== null,
      connectionState,
      isReady,
    });
  }, [pageId, provider, connectionState, isReady]);

  // Sync title from Yjs to DB on blur
  const handleTitleBlur = useCallback(() => {
    const titleFragment = getTitleFragment();
    if (!titleFragment) return;

    const yjsTitle = getFragmentText(titleFragment);
    if (yjsTitle !== pageTitle) {
      onTitleChange?.(yjsTitle);
    }
  }, [getTitleFragment, pageTitle, onTitleChange]);

  // Sync local state when blocks change from parent
  useEffect(() => {
    const localJson = JSON.stringify(localBlocks);
    const blocksJson = JSON.stringify(blocks);
    if (localJson !== blocksJson) {
      setLocalBlocks(blocks);
    }
  }, [blocks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sort blocks by sortKey
  const sortedBlocks = useMemo(() => {
    return [...localBlocks].sort((a, b) =>
      b.sortKey > a.sortKey ? 1 : b.sortKey < a.sortKey ? -1 : 0,
    );
  }, [localBlocks]);

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
      setLocalBlocks((prev) => prev.filter((block) => block.id !== id));
      onBlockDelete(id);
    },
    [onBlockDelete],
  );

  const handleAddBlock = useCallback(() => {
    const sorted = [...localBlocks].sort((a, b) =>
      b.sortKey > a.sortKey ? 1 : b.sortKey < a.sortKey ? -1 : 0,
    );
    const lowestSortKey = sorted[sorted.length - 1]?.sortKey;
    const newSortKey = lowestSortKey
      ? "!" + lowestSortKey
      : generateDefaultSortKey();

    const newBlock: PageBlock = {
      id: crypto.randomUUID(),
      pageId,
      question: "",
      answer: "",
      sortKey: newSortKey,
    };

    setLocalBlocks((prev) => [...prev, newBlock]);
    setFocusBlockId(newBlock.id);
    onBlockCreate(newBlock);
  }, [localBlocks, pageId, onBlockCreate]);

  const handleAddAfter = useCallback(
    (afterId: string) => {
      const sorted = [...localBlocks].sort((a, b) =>
        b.sortKey > a.sortKey ? 1 : b.sortKey < a.sortKey ? -1 : 0,
      );
      const blockIndex = sorted.findIndex((b) => b.id === afterId);
      if (blockIndex === -1) return;

      const afterBlock = sorted[blockIndex];
      const belowBlock = sorted[blockIndex + 1];

      const newSortKey = generateSortKeyBetween(
        belowBlock?.sortKey,
        afterBlock.sortKey,
      );

      const newBlock: PageBlock = {
        id: crypto.randomUUID(),
        pageId,
        question: "",
        answer: "",
        sortKey: newSortKey,
      };

      setLocalBlocks((prev) => [...prev, newBlock]);
      setFocusBlockId(newBlock.id);
      onBlockCreate(newBlock);
    },
    [localBlocks, pageId, onBlockCreate],
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

  // Handle keyboard add (after current block, or at end if none focused)
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

      const sorted = [...localBlocks].sort((a, b) =>
        b.sortKey > a.sortKey ? 1 : b.sortKey < a.sortKey ? -1 : 0,
      );

      const draggedIndex = sorted.findIndex((block) => block.id === active.id);
      const targetIndex = sorted.findIndex((block) => block.id === over.id);

      if (draggedIndex === -1 || targetIndex === -1) return;

      const { beforeBlock, afterBlock } = calculateNewPosition(
        sorted,
        draggedIndex,
        targetIndex,
      );

      const newSortKey = generateSortKeyBetween(
        afterBlock?.sortKey,
        beforeBlock?.sortKey,
      );

      setLocalBlocks((prev) =>
        prev.map((block) =>
          block.id === active.id ? { ...block, sortKey: newSortKey } : block,
        ),
      );
      onBlockUpdate(active.id as string, { sortKey: newSortKey });
    },
    [localBlocks, onBlockUpdate],
  );

  // Collab context value for child blocks
  const collabContextValue = useMemo<PageCollabContextValue>(
    () => ({
      collab: isReady ? collab : null,
      isCollabReady: isReady,
    }),
    [collab, isReady],
  );

  return (
    <PageCollabContext.Provider value={collabContextValue}>
      <div ref={containerRef} className="pt-6 pb-6 px-6 min-h-screen">
        <div className="max-w-3xl mx-auto bg-base-100 rounded-lg px-4 py-2 border border-base-300 min-h-[calc(100vh-6rem)]">
          {/* Loading state - show until collaboration is ready */}
          {!isReady ? (
            <div className="flex flex-col items-center justify-center py-20 text-base-content/60">
              <span className="loading loading-spinner loading-lg mb-4" />
              <span>Loading document...</span>
            </div>
          ) : (
            <>
              {/* Connection status indicator - simple dot */}
              <div className="flex items-center gap-2 text-xs text-base-content/60 pt-2 h-6">
                {connectionState === "connected" ? (
                  <span
                    className="w-2 h-2 rounded-full bg-success"
                    title="Online"
                  />
                ) : connectionState === "connecting" ? (
                  <>
                    <span className="loading loading-spinner loading-xs" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <span
                      className="w-2 h-2 rounded-full bg-warning"
                      title="Offline"
                    />
                    <span>Offline</span>
                    <button
                      onClick={reconnect}
                      className="underline hover:text-base-content"
                    >
                      Reconnect
                    </button>
                  </>
                )}
              </div>

              {/* Page title */}
              <div className="pt-2 pb-2">
                <CollabTextEditor
                  fragment={getTitleFragment()!}
                  provider={provider}
                  userName={userInfo.userName}
                  userColor={userInfo.userColor}
                  placeholder="Untitled"
                  className="text-2xl font-bold text-base-content [&_p]:m-0"
                  onBlur={handleTitleBlur}
                  initialContent={pageTitle || ""}
                  singleLine
                />
              </div>

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
                        <QADocumentBlock
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
            </>
          )}
        </div>
      </div>
    </PageCollabContext.Provider>
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
