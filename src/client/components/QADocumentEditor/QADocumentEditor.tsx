import { useCallback, useMemo, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Plus } from "lucide-react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { QADocumentBlock } from "../QADocumentBlock";
import { CollabTextEditor, getFragmentText } from "../CollabTextEditor";
import { DocumentSkeleton } from "./DocumentSkeleton";
import { ConnectionStatus } from "./ConnectionStatus";
import type { PageBlock } from "@/types/schemas/pages";
import type { BlockReview } from "@/types/schemas/reviews";
import { useBlockOperations } from "@/client/hooks/useBlockOperations";
import {
  useDraggableSensors,
  useDragEndHandler,
  restrictToVerticalAxis,
} from "@/client/hooks/useDragAndDrop";
import { useKeyboardNavigation } from "@/client/hooks/useKeyboardNavigation";
import {
  getBlockItemId,
  ADD_QUESTION_BUTTON_ID,
} from "@/client/lib/element-ids";
import { usePageCollab } from "@/client/hooks/usePageCollab";
import {
  PageCollabContext,
  type PageCollabContextValue,
} from "@/client/contexts/PageCollabContext";

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
  const containerRef = useRef<HTMLDivElement>(null);

  // Block operations
  const {
    sortedBlocks,
    focusBlockId,
    handleQuestionChange,
    handleAnswerChange,
    handleDelete,
    handleAddBlock,
    handleAddAfter,
    handleSortKeyUpdate,
    clearFocusBlockId,
    localBlocks,
  } = useBlockOperations({
    pageId,
    blocks,
    onBlockCreate,
    onBlockUpdate,
    onBlockDelete,
  });

  // Drag and drop
  const sensors = useDraggableSensors();
  const handleDragEnd = useDragEndHandler({
    blocks: localBlocks,
    onSortKeyUpdate: handleSortKeyUpdate,
  });

  // Collaborative editing via Yjs
  const collab = usePageCollab({ pageId });
  const {
    provider,
    connectionState,
    getTitleFragment,
    userInfo,
    reconnect,
    hasSyncedOnce,
  } = collab;

  // Track if we've ever successfully loaded - only show skeleton on first load
  const hasLoadedRef = useRef(false);
  if (hasSyncedOnce && !hasLoadedRef.current) {
    hasLoadedRef.current = true;
  }
  const isReady = hasLoadedRef.current;
  const showSkeleton = !isReady;

  // Sync title from Yjs to DB on blur
  const handleTitleBlur = useCallback(() => {
    const titleFragment = getTitleFragment();
    if (!titleFragment) return;

    const yjsTitle = getFragmentText(titleFragment);
    if (yjsTitle !== pageTitle) {
      onTitleChange?.(yjsTitle);
    }
  }, [getTitleFragment, pageTitle, onTitleChange]);

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
        <div className="max-w-3xl mx-auto">
          <div className="pb-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-sm text-base-content/60 hover:text-base-content transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Pages
            </Link>
          </div>
        </div>
        <div className="max-w-3xl mx-auto bg-base-100 rounded-lg px-4 py-2 border border-base-300 min-h-[calc(100vh-6rem)]">
          {showSkeleton ? (
            <DocumentSkeleton />
          ) : (
            <>
              <ConnectionStatus
                connectionState={connectionState}
                onReconnect={reconnect}
              />

              {/* Page title */}
              <div className="pt-2 pb-2">
                {isReady && provider ? (
                  <CollabTextEditor
                    fragment={getTitleFragment()!}
                    provider={provider}
                    userId={userInfo.userId}
                    userName={userInfo.userName}
                    userColor={userInfo.userColor}
                    placeholder="Untitled"
                    className="text-2xl font-bold text-base-content [&_p]:m-0"
                    onBlur={handleTitleBlur}
                    initialContent={pageTitle || ""}
                    singleLine
                  />
                ) : (
                  <p className="text-2xl font-bold text-base-content">
                    {pageTitle || "Untitled"}
                  </p>
                )}
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
                          onAutoFocusDone={clearFocusBlockId}
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
