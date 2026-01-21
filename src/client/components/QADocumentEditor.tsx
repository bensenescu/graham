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
import { QADocumentBlock } from "./QADocumentBlock";
import type { PageBlock } from "@/types/schemas/pages";
import type { BlockReview } from "@/types/schemas/reviews";
import {
  generateDefaultSortKey,
  generateSortKeyBetween,
} from "@/client/lib/fractional-indexing";

interface QADocumentEditorProps {
  pageId: string;
  pageTitle?: string;
  blocks: PageBlock[];
  reviews?: Map<string, BlockReview>;
  activeBlockId?: string | null;
  showGradeBadges?: boolean;
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
  activeBlockId,
  showGradeBadges = false,
  onBlockCreate,
  onBlockUpdate,
  onBlockDelete,
  onBlockFocus,
  onReviewRequest,
  onTitleChange,
}: QADocumentEditorProps) {
  // Local state for editing
  const [localBlocks, setLocalBlocks] = useState<PageBlock[]>(blocks);
  const [localTitle, setLocalTitle] = useState(pageTitle || "");
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sensors = useDraggableSensors();

  // Sync local state when blocks change from parent
  useEffect(() => {
    const localJson = JSON.stringify(localBlocks);
    const blocksJson = JSON.stringify(blocks);
    if (localJson !== blocksJson) {
      setLocalBlocks(blocks);
    }
  }, [blocks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local title when pageTitle changes from parent
  useEffect(() => {
    if (pageTitle !== undefined && pageTitle !== localTitle) {
      setLocalTitle(pageTitle);
    }
  }, [pageTitle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle title change with callback to parent
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setLocalTitle(newTitle);
      onTitleChange?.(newTitle);
    },
    [onTitleChange],
  );

  // Sort blocks by sortKey
  const sortedBlocks = useMemo(() => {
    return [...localBlocks].sort((a, b) =>
      b.sortKey > a.sortKey ? 1 : b.sortKey < a.sortKey ? -1 : 0,
    );
  }, [localBlocks]);

  // Debounced save to parent
  const debouncedUpdate = useCallback(
    (id: string, updates: Partial<PageBlock>) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        onBlockUpdate(id, updates);
      }, 500);
    },
    [onBlockUpdate],
  );

  const handleQuestionChange = useCallback(
    (id: string, question: string) => {
      setLocalBlocks((prev) =>
        prev.map((block) => (block.id === id ? { ...block, question } : block)),
      );
      debouncedUpdate(id, { question });
    },
    [debouncedUpdate],
  );

  const handleAnswerChange = useCallback(
    (id: string, answer: string) => {
      setLocalBlocks((prev) =>
        prev.map((block) => (block.id === id ? { ...block, answer } : block)),
      );
      debouncedUpdate(id, { answer });
    },
    [debouncedUpdate],
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
      onBlockCreate(newBlock);
    },
    [localBlocks, pageId, onBlockCreate],
  );

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

  return (
    <div ref={containerRef} className="py-6 px-4 min-h-full">
      <div className="max-w-3xl mx-auto bg-base-100 rounded-lg px-4 py-2 border border-base-300">
        {/* Page title - editable */}
        <input
          type="text"
          value={localTitle}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="w-full text-2xl font-bold text-base-content bg-transparent border-none outline-none pt-4 pb-2 placeholder:text-base-content/40"
        />

        {sortedBlocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-base-content/60 mb-4">
              Start by adding your first question.
            </p>
            <button onClick={handleAddBlock} className="btn btn-primary gap-2">
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
                    review={
                      showGradeBadges ? reviews?.get(block.id) : undefined
                    }
                    isActive={activeBlockId === block.id}
                    onQuestionChange={handleQuestionChange}
                    onAnswerChange={handleAnswerChange}
                    onDelete={handleDelete}
                    onAddAfter={handleAddAfter}
                    onReviewRequest={onReviewRequest}
                    onFocus={onBlockFocus}
                    isOnly={sortedBlocks.length === 1}
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
              onClick={handleAddBlock}
              className="btn btn-ghost btn-sm gap-2 text-base-content/60 hover:text-base-content"
            >
              <Plus className="h-4 w-4" />
              Add Question
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
