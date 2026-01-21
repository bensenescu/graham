import { useState, useCallback, useMemo } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import type { BlockReview, ReviewSummary } from "@/types/schemas/reviews";
import type { PageBlock } from "@/types/schemas/pages";
import { authenticatedFetch } from "@every-app/sdk/core";
import { createBlockReviewCollection } from "@/client/tanstack-db";
import type { ReviewTab } from "@/client/components/AIReviewPanel";

export type { ReviewTab };

interface ReviewAPIResponse {
  strengths: string[];
  improvements: string[];
  tips?: string[] | null;
}

interface UseAIReviewOptions {
  pageId: string;
  blocks: PageBlock[];
  promptId: string | null;
  customInstructions?: string;
}

interface ReviewMutationVariables {
  block: PageBlock;
  promptId: string;
  customInstructions?: string;
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
  const reviews = useMemo(() => {
    const map = new Map<string, BlockReview>();
    for (const review of reviewsArray ?? []) {
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

  // Calculate summary
  const summary = useMemo(
    () => calculateSummary(pageId, Array.from(reviews.values()), blocks.length),
    [pageId, reviews, blocks.length],
  );

  // React Query mutation for reviewing a block
  const reviewMutation = useMutation({
    mutationFn: async ({
      block,
      customInstructions,
    }: ReviewMutationVariables) => {
      const result = await callReviewAPI(block, customInstructions);
      return { block, result };
    },
    onMutate: async ({ block }) => {
      setLoadingBlockIds((prev) => new Set(prev).add(block.id));
    },
    onSuccess: ({ block, result }, { promptId }) => {
      const reviewId = crypto.randomUUID();
      const now = new Date().toISOString();

      reviewCollection.insert({
        id: reviewId,
        blockId: block.id,
        promptId,
        strengths: result.strengths,
        improvements: result.improvements,
        tips: result.tips ?? null,
        answerSnapshot: block.answer || null,
        createdAt: now,
        updatedAt: now,
      });

      setLoadingBlockIds((prev) => {
        const next = new Set(prev);
        next.delete(block.id);
        return next;
      });
    },
    onError: (_error, { block }) => {
      setLoadingBlockIds((prev) => {
        const next = new Set(prev);
        next.delete(block.id);
        return next;
      });
    },
  });

  // Review a single block
  const reviewBlock = useCallback(
    async (blockId: string) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block || !promptId) return;

      // Open panel, focus on this block, and switch to detailed tab
      setIsPanelOpen(true);
      setActiveBlockId(blockId);
      setRequestedTab("detailed");

      // Execute the mutation
      try {
        await reviewMutation.mutateAsync({
          block,
          promptId,
          customInstructions,
        });
      } catch {
        // Error handled in onError
      }
    },
    [blocks, promptId, customInstructions, reviewMutation],
  );

  // Review all blocks
  const reviewAll = useCallback(async () => {
    if (!promptId) return;

    setIsReviewingAll(true);
    setIsPanelOpen(true);

    // Review blocks sequentially with some parallelism
    const batchSize = 3;
    for (let i = 0; i < blocks.length; i += batchSize) {
      const batch = blocks.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (block) => {
          try {
            await reviewMutation.mutateAsync({
              block,
              promptId,
              customInstructions,
            });
          } catch {
            // Error handled in onError
          }
        }),
      );
    }

    setIsReviewingAll(false);
  }, [blocks, promptId, customInstructions, reviewMutation]);

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
