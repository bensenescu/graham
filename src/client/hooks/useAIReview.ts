import { useState, useCallback, useMemo, useRef } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { createOptimisticAction } from "@tanstack/react-db";
import type { BlockReview, ReviewSummary } from "@/types/schemas/reviews";
import type { PageBlock } from "@/types/schemas/pages";
import { authenticatedFetch } from "@every-app/sdk/core";
import { createBlockReviewCollection } from "@/client/tanstack-db";

interface ReviewAPIResponse {
  strengths: string[];
  improvements: string[];
  tips?: string[] | null;
}

/**
 * Call the review API to get AI feedback on a block.
 */
async function callReviewAPI(
  block: PageBlock,
  customInstructions?: string,
): Promise<ReviewAPIResponse> {
  const response = await authenticatedFetch("/api/review", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      blockId: block.id,
      question: block.question,
      answer: block.answer || "",
      customInstructions,
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(errorData.error || `Review failed: ${response.status}`);
  }

  return (await response.json()) as ReviewAPIResponse;
}

/**
 * Calculate overall summary from individual reviews
 */
function calculateSummary(
  pageId: string,
  reviews: BlockReview[],
  totalBlocks: number,
): ReviewSummary | null {
  if (reviews.length === 0) return null;

  return {
    pageId,
    reviewedCount: reviews.length,
    totalCount: totalBlocks,
    updatedAt: new Date().toISOString(),
  };
}

interface UseAIReviewOptions {
  pageId: string;
  blocks: PageBlock[];
  promptId: string | null; // The prompt to use for reviews
  customInstructions?: string;
}

import type { ReviewTab } from "@/client/components/AIReviewPanel";
// Re-export ReviewTab for convenience
export type { ReviewTab };

/**
 * Hook for managing AI review state and operations.
 */
export function useAIReview({
  pageId,
  blocks,
  promptId,
  customInstructions,
}: UseAIReviewOptions) {
  // Create the collection for this page
  const reviewCollection = useMemo(
    () => createBlockReviewCollection(pageId),
    [pageId],
  );

  // Get reviews from the collection
  const { data: reviewsArray } = useLiveQuery((q) =>
    q.from({ review: reviewCollection }),
  );

  // Convert to a Map keyed by blockId for easy lookup
  // Note: For now we only have one review per block (using default prompt)
  // In the future when we support multiple prompts, we'll need a different structure
  const reviews = useMemo(() => {
    const map = new Map<string, BlockReview>();
    for (const review of reviewsArray ?? []) {
      // Only include reviews for the current prompt
      if (promptId && review.promptId === promptId) {
        map.set(review.blockId, review);
      }
    }
    return map;
  }, [reviewsArray, promptId]);

  // Track which blocks are currently being reviewed (loading state)
  const [loadingBlockIds, setLoadingBlockIds] = useState<Set<string>>(
    new Set(),
  );
  const [isReviewingAll, setIsReviewingAll] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [requestedTab, setRequestedTab] = useState<ReviewTab | null>(null);

  // Keep refs for values needed in the optimistic action
  const customInstructionsRef = useRef(customInstructions);
  customInstructionsRef.current = customInstructions;

  const promptIdRef = useRef(promptId);
  promptIdRef.current = promptId;

  // Calculate summary
  const summary = useMemo(
    () => calculateSummary(pageId, Array.from(reviews.values()), blocks.length),
    [pageId, reviews, blocks.length],
  );

  // Create the optimistic action for reviewing a block
  const reviewBlockAction = useMemo(() => {
    return createOptimisticAction<{ block: PageBlock }>({
      onMutate: ({ block }) => {
        // Add to loading set (we don't insert a placeholder into the collection)
        setLoadingBlockIds((prev) => new Set(prev).add(block.id));
      },
      mutationFn: async ({ block }) => {
        const currentPromptId = promptIdRef.current;
        if (!currentPromptId) {
          throw new Error("No prompt selected for review");
        }

        try {
          // Call the API to get the review
          const result = await callReviewAPI(
            block,
            customInstructionsRef.current,
          );

          // Generate an ID for the review
          const reviewId = crypto.randomUUID();
          const now = new Date().toISOString();

          // Insert the review into the collection (this will persist via onInsert handler)
          reviewCollection.insert({
            id: reviewId,
            blockId: block.id,
            promptId: currentPromptId,
            strengths: result.strengths,
            improvements: result.improvements,
            tips: result.tips ?? null,
            answerSnapshot: block.answer || null,
            createdAt: now,
            updatedAt: now,
          });

          // Remove from loading set
          setLoadingBlockIds((prev) => {
            const next = new Set(prev);
            next.delete(block.id);
            return next;
          });

          return result;
        } catch (error) {
          // Remove from loading set on error
          setLoadingBlockIds((prev) => {
            const next = new Set(prev);
            next.delete(block.id);
            return next;
          });
          throw error;
        }
      },
    });
  }, [reviewCollection]);

  // Review a single block
  const reviewBlock = useCallback(
    async (blockId: string) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;

      if (!promptId) {
        console.error("No prompt selected for review");
        return;
      }

      // Open panel, focus on this block, and switch to detailed tab
      setIsPanelOpen(true);
      setActiveBlockId(blockId);
      setRequestedTab("detailed");

      // Execute the optimistic action
      try {
        await reviewBlockAction({ block });
      } catch (error) {
        console.error("Review failed:", error);
        // Error is already handled in mutationFn (loading state cleared)
      }
    },
    [blocks, promptId, reviewBlockAction],
  );

  // Review all blocks
  const reviewAll = useCallback(async () => {
    if (!promptId) {
      console.error("No prompt selected for review");
      return;
    }

    setIsReviewingAll(true);
    setIsPanelOpen(true);

    // Review blocks sequentially with some parallelism
    const batchSize = 3;
    for (let i = 0; i < blocks.length; i += batchSize) {
      const batch = blocks.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (block) => {
          try {
            await reviewBlockAction({ block });
          } catch (e) {
            console.error(`Review failed for block ${block.id}:`, e);
          }
        }),
      );
    }

    setIsReviewingAll(false);
  }, [blocks, promptId, reviewBlockAction]);

  // Open panel
  const openPanel = useCallback(() => {
    setIsPanelOpen(true);
  }, []);

  // Close panel
  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  // Set active block (for bi-directional sync)
  const setActiveBlock = useCallback((blockId: string | null) => {
    setActiveBlockId(blockId);
  }, []);

  // Clear the requested tab (called by panel after it has switched)
  const clearRequestedTab = useCallback(() => {
    setRequestedTab(null);
  }, []);

  // Check if a block is currently loading
  const isBlockLoading = useCallback(
    (blockId: string) => loadingBlockIds.has(blockId),
    [loadingBlockIds],
  );

  return {
    reviews,
    summary,
    isPanelOpen,
    isReviewingAll,
    activeBlockId,
    requestedTab,
    loadingBlockIds,
    reviewBlock,
    reviewAll,
    openPanel,
    closePanel,
    setActiveBlock,
    clearRequestedTab,
    isBlockLoading,
  };
}
