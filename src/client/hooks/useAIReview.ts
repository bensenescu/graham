import { useState, useCallback, useMemo } from "react";
import { useLiveQuery, eq } from "@tanstack/react-db";
import { useMutation } from "@tanstack/react-query";
import type { BlockReview, ReviewSummary } from "@/types/schemas/reviews";
import type { PageBlock } from "@/types/schemas/pages";
import { authenticatedFetch } from "@every-app/sdk/core";
import {
  blockReviewCollection,
  pageBlockCollection,
} from "@/client/tanstack-db";

interface ReviewAPIResponse {
  suggestion: string | null;
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
 * Reviews are displayed inline within each Q&A block.
 */
export function useAIReview({
  pageId,
  blocks,
  promptId,
  customInstructions,
}: UseAIReviewOptions) {
  // Get all block IDs for this page to filter reviews
  const { data: pageBlocks } = useLiveQuery((q) =>
    q
      .from({ block: pageBlockCollection })
      .where(({ block }) => eq(block.pageId, pageId)),
  );

  const pageBlockIds = useMemo(
    () => new Set((pageBlocks ?? []).map((b) => b.id)),
    [pageBlocks],
  );

  // Get reviews from the singleton collection (all reviews)
  const { data: allReviews } = useLiveQuery((q) =>
    q.from({ review: blockReviewCollection }),
  );

  // Filter reviews to only those for blocks on this page
  const reviewsArray = useMemo(() => {
    return (allReviews ?? []).filter((r) => pageBlockIds.has(r.blockId));
  }, [allReviews, pageBlockIds]);

  // Convert to a Map keyed by blockId for easy lookup
  // If promptId is set, filter to only reviews for that prompt
  // If promptId is null, show the most recent review for each block
  const reviews = useMemo(() => {
    const map = new Map<string, BlockReview>();
    for (const review of reviewsArray) {
      if (promptId) {
        // Filter by specific prompt
        if (review.promptId === promptId) {
          map.set(review.blockId, review);
        }
      } else {
        // No prompt filter - show most recent review per block
        const existing = map.get(review.blockId);
        if (!existing || review.updatedAt > existing.updatedAt) {
          map.set(review.blockId, review);
        }
      }
    }
    return map;
  }, [reviewsArray, promptId]);

  // Track which blocks are currently being reviewed (loading state)
  const [loadingBlockIds, setLoadingBlockIds] = useState<Set<string>>(
    new Set(),
  );
  const [isReviewingAll, setIsReviewingAll] = useState(false);

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

      blockReviewCollection.insert({
        id: reviewId,
        blockId: block.id,
        promptId,
        suggestion: result.suggestion,
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

    // Review blocks in batches for parallelism
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

  // Check if a block is currently loading
  const isBlockLoading = useCallback(
    (blockId: string) => loadingBlockIds.has(blockId),
    [loadingBlockIds],
  );

  return {
    reviews,
    summary,
    isReviewingAll,
    loadingBlockIds,
    reviewBlock,
    reviewAll,
    isBlockLoading,
  };
}
