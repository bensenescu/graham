import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  getPageOverallReview,
  upsertPageOverallReview,
  deletePageOverallReview,
} from "@/serverFunctions/overallReviews";
import { createCollection } from "@tanstack/react-db";

// Factory function to create a page overall review collection for a specific page
export function createPageOverallReviewCollection(pageId: string) {
  return createCollection(
    queryCollectionOptions({
      queryKey: ["pageOverallReview", pageId],
      queryFn: async () => {
        const result = await getPageOverallReview({ data: { pageId } });
        // Return as array (either empty or with one item)
        return result.review ? [result.review] : [];
      },
      queryClient,
      getKey: (item) => item.id,
      // Handle all CRUD operations
      onInsert: async ({ transaction }) => {
        const { modified: review } = transaction.mutations[0];
        await upsertPageOverallReview({
          data: {
            id: review.id,
            pageId: review.pageId,
            promptId: review.promptId,
            customPrompt: review.customPrompt,
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
            customPrompt: review.customPrompt,
            summary: review.summary,
          },
        });
      },
      onDelete: async ({ transaction }) => {
        const { original } = transaction.mutations[0];
        await deletePageOverallReview({ data: { id: original.id } });
      },
    }),
  );
}
