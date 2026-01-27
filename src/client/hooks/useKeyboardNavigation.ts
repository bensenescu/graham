import { useCallback, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  SHORTCUT_MOVE_DOWN_HOTKEY,
  SHORTCUT_MOVE_UP_HOTKEY,
  SHORTCUT_ADD_QUESTION_HOTKEY,
  SHORTCUT_DELETE_QUESTION_HOTKEY,
  SHORTCUT_EDIT_QUESTION_HOTKEY,
  SHORTCUT_REVIEW_QUESTION_HOTKEY,
} from "@/client/lib/keyboard-shortcuts";

interface UseKeyboardNavigationOptions {
  /** Array of item IDs in display order */
  itemIds: string[];
  /** Function to get the DOM element ID from an item ID */
  getElementId: (id: string) => string;
  /** Callback when add is triggered after an item */
  onAdd?: (afterId: string | null) => void;
  /** Callback when delete is triggered on an item */
  onDelete?: (id: string) => void;
  /** Callback when edit is triggered on an item */
  onEdit?: (id: string) => void;
  /** Callback when review is triggered on an item */
  onReview?: (id: string) => void;
  /** Whether keyboard navigation is enabled (e.g., disable when editing) */
  enabled?: boolean;
}

/**
 * Hook for keyboard navigation of QA blocks.
 * Provides j/k (arrow keys) navigation, a for add, x for delete, e for edit, r for review.
 */
export function useKeyboardNavigation({
  itemIds,
  getElementId,
  onAdd,
  onDelete,
  onEdit,
  onReview,
  enabled = true,
}: UseKeyboardNavigationOptions) {
  // Use ref to track which ID to focus after actions
  const pendingFocusIdRef = useRef<string | null>(null);

  // Helper to get currently focused item ID
  const getFocusedItemId = useCallback(() => {
    const activeElement = document.activeElement;
    return itemIds.find((id) => {
      const item = document.getElementById(getElementId(id));
      return item === activeElement;
    });
  }, [itemIds, getElementId]);

  // Helper to focus item at specific index
  const focusItemAtIndex = useCallback(
    (index: number) => {
      if (itemIds.length === 0) return;
      const clampedIndex = Math.max(0, Math.min(itemIds.length - 1, index));
      const targetId = itemIds[clampedIndex];
      const targetItem = document.getElementById(getElementId(targetId));
      targetItem?.focus();
    },
    [itemIds, getElementId],
  );

  // Helper to focus a specific item by ID
  const focusItemById = useCallback(
    (id: string) => {
      const targetItem = document.getElementById(getElementId(id));
      targetItem?.focus();
    },
    [getElementId],
  );

  // Move down: j or ArrowDown
  useHotkeys(
    SHORTCUT_MOVE_DOWN_HOTKEY,
    () => {
      const currentId = getFocusedItemId();
      if (currentId === undefined) {
        focusItemAtIndex(0);
      } else {
        const currentIndex = itemIds.indexOf(currentId);
        focusItemAtIndex(currentIndex + 1);
      }
    },
    { preventDefault: true, enabled },
    [getFocusedItemId, focusItemAtIndex, itemIds],
  );

  // Move up: k or ArrowUp
  useHotkeys(
    SHORTCUT_MOVE_UP_HOTKEY,
    () => {
      const currentId = getFocusedItemId();
      if (currentId === undefined) {
        focusItemAtIndex(itemIds.length - 1);
      } else {
        const currentIndex = itemIds.indexOf(currentId);
        focusItemAtIndex(currentIndex - 1);
      }
    },
    { preventDefault: true, enabled },
    [getFocusedItemId, focusItemAtIndex, itemIds],
  );

  // Add question: a
  useHotkeys(
    SHORTCUT_ADD_QUESTION_HOTKEY,
    () => {
      if (!onAdd) return;
      const currentId = getFocusedItemId();
      onAdd(currentId ?? null);
    },
    { preventDefault: true, enabled },
    [getFocusedItemId, onAdd],
  );

  // Delete question: x
  useHotkeys(
    SHORTCUT_DELETE_QUESTION_HOTKEY,
    () => {
      if (!onDelete) return;
      const currentId = getFocusedItemId();
      if (!currentId) return;

      const currentIndex = itemIds.indexOf(currentId);
      // Determine which item to focus after delete
      let nextFocusId: string | null = null;
      if (currentIndex > 0) {
        nextFocusId = itemIds[currentIndex - 1];
      } else if (currentIndex < itemIds.length - 1) {
        nextFocusId = itemIds[currentIndex + 1];
      }

      pendingFocusIdRef.current = nextFocusId;
      onDelete(currentId);

      // Focus the next item after DOM update
      requestAnimationFrame(() => {
        if (pendingFocusIdRef.current) {
          focusItemById(pendingFocusIdRef.current);
          pendingFocusIdRef.current = null;
        }
      });
    },
    { preventDefault: true, enabled },
    [getFocusedItemId, onDelete, itemIds, focusItemById],
  );

  // Edit question: e
  useHotkeys(
    SHORTCUT_EDIT_QUESTION_HOTKEY,
    () => {
      if (!onEdit) return;
      const currentId = getFocusedItemId();
      if (currentId) {
        onEdit(currentId);
      }
    },
    { preventDefault: true, enabled },
    [getFocusedItemId, onEdit],
  );

  // Review question: r
  useHotkeys(
    SHORTCUT_REVIEW_QUESTION_HOTKEY,
    () => {
      if (!onReview) return;
      const currentId = getFocusedItemId();
      if (currentId) {
        onReview(currentId);
      }
    },
    { preventDefault: true, enabled },
    [getFocusedItemId, onReview],
  );

  return {
    focusItemAtIndex,
    focusItemById,
  };
}
