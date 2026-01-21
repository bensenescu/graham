import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  getBlockReviewsForPage,
  upsertBlockReview,
  deleteBlockReview,
} from "@/serverFunctions/reviews";
import { createCollection } from "@tanstack/react-db";

// Factory function to create a block review collection for a specific page
export function createBlockReviewCollection(pageId: string) {
  return createCollection(
    queryCollectionOptions({
      queryKey: ["blockReviews", pageId],
      queryFn: async () => {
        const result = await getBlockReviewsForPage({ data: { pageId } });
        return result.reviews;
      },
      queryClient,
      getKey: (item) => item.id,
      // Handle all CRUD operations
      onInsert: async ({ transaction }) => {
        const { modified: review } = transaction.mutations[0];
        await upsertBlockReview({
          data: {
            id: review.id,
            blockId: review.blockId,
            promptId: review.promptId,
            strengths: review.strengths,
            improvements: review.improvements,
            tips: review.tips,
            answerSnapshot: review.answerSnapshot,
          },
        });
      },
      onUpdate: async ({ transaction }) => {
        const { modified: review } = transaction.mutations[0];
        await upsertBlockReview({
          data: {
            id: review.id,
            blockId: review.blockId,
            promptId: review.promptId,
            strengths: review.strengths,
            improvements: review.improvements,
            tips: review.tips,
            answerSnapshot: review.answerSnapshot,
          },
        });
      },
      onDelete: async ({ transaction }) => {
        const { original } = transaction.mutations[0];
        await deleteBlockReview({ data: { id: original.id } });
      },
    }),
  );
}
