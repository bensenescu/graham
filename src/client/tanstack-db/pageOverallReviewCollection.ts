import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  getAllPageOverallReviews,
  upsertPageOverallReview,
  deletePageOverallReview,
} from "@/serverFunctions/overallReviews";
import { createCollection } from "@tanstack/react-db";
import { lazyInitForWorkers } from "@every-app/sdk/cloudflare";

export const pageOverallReviewCollection = lazyInitForWorkers(() =>
  createCollection(
    queryCollectionOptions({
      queryKey: ["pageOverallReviews"],
      queryFn: async () => {
        const result = await getAllPageOverallReviews();
        return result.reviews;
      },
      queryClient,
      getKey: (item) => item.id,
      onInsert: async ({ transaction }) => {
        const { modified: review } = transaction.mutations[0];
        await upsertPageOverallReview({
          data: {
            id: review.id,
            pageId: review.pageId,
            promptId: review.promptId,
            summary: review.summary,
          },
        });
      },
      onUpdate: async ({ transaction }) => {
        const { modified: review } = transaction.mutations[0];
        await upsertPageOverallReview({
          data: {
            id: review.id,
            pageId: review.pageId,
            promptId: review.promptId,
            summary: review.summary,
          },
        });
      },
      onDelete: async ({ transaction }) => {
        const { original } = transaction.mutations[0];
        await deletePageOverallReview({ data: { id: original.id } });
      },
    }),
  ),
);
