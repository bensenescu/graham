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
import { QABlock } from "./QABlock";
import type {
  QABlock as QABlockType,
  PageContent,
} from "@/types/schemas/pages";
import {
  generateDefaultSortKey,
  generateSortKeyBetween,
} from "@/client/lib/fractional-indexing";

interface QAEditorProps {
  content: PageContent;
  onContentChange: (content: PageContent) => void;
}

export function QAEditor({ content, onContentChange }: QAEditorProps) {
  // Local state for editing - this prevents re-renders from parent on every keystroke
  const [localBlocks, setLocalBlocks] = useState<QABlockType[]>(content.blocks);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sensors = useDraggableSensors();

  // Sync local state when content changes from parent (e.g., initial load, external changes)
  useEffect(() => {
    // Only update if the blocks are actually different (by comparing JSON)
    const localJson = JSON.stringify(localBlocks);
    const contentJson = JSON.stringify(content.blocks);
    if (localJson !== contentJson) {
      setLocalBlocks(content.blocks);
    }
  }, [content.blocks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sort blocks by sortKey in descending order (higher = top)
  const sortedBlocks = useMemo(() => {
    return [...localBlocks].sort((a, b) =>
      b.sortKey > a.sortKey ? 1 : b.sortKey < a.sortKey ? -1 : 0,
    );
  }, [localBlocks]);

  // Debounced save to parent
  const debouncedSave = useCallback(
    (newBlocks: QABlockType[]) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        onContentChange({ blocks: newBlocks });
      }, 500);
    },
    [onContentChange],
  );

  // Immediate save to parent (for structural changes like add/delete/reorder)
  const immediateSave = useCallback(
    (newBlocks: QABlockType[]) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      onContentChange({ blocks: newBlocks });
    },
    [onContentChange],
  );

  const handleQuestionChange = useCallback(
    (id: string, question: string) => {
      setLocalBlocks((prev) => {
        const newBlocks = prev.map((block) =>
          block.id === id ? { ...block, question } : block,
        );
        debouncedSave(newBlocks);
        return newBlocks;
      });
    },
    [debouncedSave],
  );

  const handleAnswerChange = useCallback(
    (id: string, answer: string) => {
      setLocalBlocks((prev) => {
        const newBlocks = prev.map((block) =>
          block.id === id ? { ...block, answer } : block,
        );
        debouncedSave(newBlocks);
        return newBlocks;
      });
    },
    [debouncedSave],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setLocalBlocks((prev) => {
        const newBlocks = prev.filter((block) => block.id !== id);
        immediateSave(newBlocks);
        return newBlocks;
      });
    },
    [immediateSave],
  );

  const handleAddBlock = useCallback(() => {
    setLocalBlocks((prev) => {
      // Sort to find the lowest sortKey
      const sorted = [...prev].sort((a, b) =>
        b.sortKey > a.sortKey ? 1 : b.sortKey < a.sortKey ? -1 : 0,
      );
      const lowestSortKey = sorted[sorted.length - 1]?.sortKey;
      const newSortKey = lowestSortKey
        ? "!" + lowestSortKey // Below the lowest
        : generateDefaultSortKey();

      const newBlock: QABlockType = {
        id: crypto.randomUUID(),
        question: "",
        answer: "",
        sortKey: newSortKey,
      };

      const newBlocks = [...prev, newBlock];
      immediateSave(newBlocks);
      return newBlocks;
    });
  }, [immediateSave]);

  const handleAddAfter = useCallback(
    (afterId: string) => {
      setLocalBlocks((prev) => {
        // Sort to find positions
        const sorted = [...prev].sort((a, b) =>
          b.sortKey > a.sortKey ? 1 : b.sortKey < a.sortKey ? -1 : 0,
        );
        const blockIndex = sorted.findIndex((b) => b.id === afterId);
        if (blockIndex === -1) return prev;

        const afterBlock = sorted[blockIndex];
        const belowBlock = sorted[blockIndex + 1];

        const newSortKey = generateSortKeyBetween(
          belowBlock?.sortKey,
          afterBlock.sortKey,
        );

        const newBlock: QABlockType = {
          id: crypto.randomUUID(),
          question: "",
          answer: "",
          sortKey: newSortKey,
        };

        const newBlocks = [...prev, newBlock];
        immediateSave(newBlocks);
        return newBlocks;
      });
    },
    [immediateSave],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      setLocalBlocks((prev) => {
        const sorted = [...prev].sort((a, b) =>
          b.sortKey > a.sortKey ? 1 : b.sortKey < a.sortKey ? -1 : 0,
        );

        const draggedIndex = sorted.findIndex(
          (block) => block.id === active.id,
        );
        const targetIndex = sorted.findIndex((block) => block.id === over.id);

        if (draggedIndex === -1 || targetIndex === -1) return prev;

        const { beforeBlock, afterBlock } = calculateNewPosition(
          sorted,
          draggedIndex,
          targetIndex,
        );

        const newSortKey = generateSortKeyBetween(
          afterBlock?.sortKey,
          beforeBlock?.sortKey,
        );

        const newBlocks = prev.map((block) =>
          block.id === active.id ? { ...block, sortKey: newSortKey } : block,
        );

        immediateSave(newBlocks);
        return newBlocks;
      });
    },
    [immediateSave],
  );

  return (
    <div className="h-full flex flex-col">
      {/* Blocks */}
      <div className="flex-1 overflow-auto p-4">
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
              <div className="space-y-4 max-w-3xl mx-auto">
                {sortedBlocks.map((block) => (
                  <QABlock
                    key={block.id}
                    block={block}
                    onQuestionChange={handleQuestionChange}
                    onAnswerChange={handleAnswerChange}
                    onDelete={handleDelete}
                    onAddAfter={handleAddAfter}
                    isOnly={sortedBlocks.length === 1}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Add button at bottom */}
        {sortedBlocks.length > 0 && (
          <div className="max-w-3xl mx-auto mt-4">
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
  blocks: QABlockType[],
  draggedIndex: number,
  targetIndex: number,
): { beforeBlock?: QABlockType; afterBlock?: QABlockType } {
  const isMovingDown = draggedIndex < targetIndex;

  if (isMovingDown) {
    // Moving down in UI = moving to higher index = want to appear after targetIndex
    // Need a sort key between target and the item below it (target+1)
    return {
      beforeBlock: blocks[targetIndex], // Higher sort key
      afterBlock: blocks[targetIndex + 1], // Lower sort key
    };
  } else {
    // Moving up in UI = moving to lower index = want to appear before targetIndex
    // Need a sort key between the item above target (target-1) and target
    return {
      beforeBlock: blocks[targetIndex - 1], // Higher sort key
      afterBlock: blocks[targetIndex], // Lower sort key
    };
  }
}

/**
 * Configure drag-and-drop sensors for Q&A block reordering.
 */
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

/**
 * Modifier that restricts drag movement to vertical axis only.
 */
const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});
