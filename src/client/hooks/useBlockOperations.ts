import { useState, useCallback, useEffect, useMemo } from "react";
import type { PageBlock } from "@/types/schemas/pages";
import {
  generateDefaultSortKey,
  generateSortKeyBetween,
  sortBlocksBySortKey,
} from "@/client/lib/fractional-indexing";

interface UseBlockOperationsOptions {
  pageId: string;
  blocks: PageBlock[];
  onBlockCreate: (block: PageBlock) => void;
  onBlockUpdate: (id: string, updates: Partial<PageBlock>) => void;
  onBlockDelete: (id: string) => void;
}

/**
 * Hook for managing block CRUD operations and local state.
 */
export function useBlockOperations({
  pageId,
  blocks,
  onBlockCreate,
  onBlockUpdate,
  onBlockDelete,
}: UseBlockOperationsOptions) {
  const [localBlocks, setLocalBlocks] = useState<PageBlock[]>(blocks);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);

  // Sync local state when blocks change from parent
  useEffect(() => {
    const localJson = JSON.stringify(localBlocks);
    const blocksJson = JSON.stringify(blocks);
    if (localJson !== blocksJson) {
      setLocalBlocks(blocks);
    }
  }, [blocks, localBlocks]);

  // Sort blocks by sortKey
  const sortedBlocks = useMemo(() => {
    return sortBlocksBySortKey(localBlocks);
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
    const sorted = sortBlocksBySortKey(localBlocks);
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
      const sorted = sortBlocksBySortKey(localBlocks);
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

  const handleSortKeyUpdate = useCallback(
    (id: string, newSortKey: string) => {
      setLocalBlocks((prev) =>
        prev.map((block) =>
          block.id === id ? { ...block, sortKey: newSortKey } : block,
        ),
      );
      onBlockUpdate(id, { sortKey: newSortKey });
    },
    [onBlockUpdate],
  );

  const clearFocusBlockId = useCallback(() => {
    setFocusBlockId(null);
  }, []);

  return {
    localBlocks,
    sortedBlocks,
    focusBlockId,
    handleQuestionChange,
    handleAnswerChange,
    handleDelete,
    handleAddBlock,
    handleAddAfter,
    handleSortKeyUpdate,
    clearFocusBlockId,
  };
}
