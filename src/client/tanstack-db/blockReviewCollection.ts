import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  getAllBlockReviews,
  upsertBlockReview,
  deleteBlockReview,
} from "@/serverFunctions/reviews";
import { createCollection } from "@tanstack/react-db";
import { lazyInitForWorkers } from "@every-app/sdk/cloudflare";

export const blockReviewCollection = lazyInitForWorkers(() =>
  createCollection(
    queryCollectionOptions({
      queryKey: ["blockReviews"],
      queryFn: async () => {
        const result = await getAllBlockReviews();
        return result.reviews;
      },
      queryClient,
      getKey: (item) => item.id,
      onInsert: async ({ transaction }) => {
        const { modified: review } = transaction.mutations[0];
        await upsertBlockReview({
          data: {
            id: review.id,
            blockId: review.blockId,
            promptId: review.promptId,
            suggestion: review.suggestion,
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
            suggestion: review.suggestion,
            answerSnapshot: review.answerSnapshot,
          },
        });
      },
      onDelete: async ({ transaction }) => {
        const { original } = transaction.mutations[0];
        await deleteBlockReview({ data: { id: original.id } });
      },
    }),
  ),
);
