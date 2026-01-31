import { useCallback } from "react";
import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  Modifier,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { PageBlock } from "@/types/schemas/pages";
import {
  generateSortKeyBetween,
  sortBlocksBySortKey,
} from "@/client/lib/fractional-indexing";

/**
 * Hook for configuring drag-and-drop sensors.
 */
export function useDraggableSensors() {
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
 * Modifier to restrict drag to vertical axis only.
 */
export const restrictToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

interface UseDragEndHandlerOptions {
  blocks: PageBlock[];
  onSortKeyUpdate: (id: string, newSortKey: string) => void;
}

/**
 * Hook for handling drag end events and calculating new sort positions.
 */
export function useDragEndHandler({
  blocks,
  onSortKeyUpdate,
}: UseDragEndHandlerOptions) {
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const sorted = sortBlocksBySortKey(blocks);

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

      onSortKeyUpdate(active.id as string, newSortKey);
    },
    [blocks, onSortKeyUpdate],
  );

  return handleDragEnd;
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
