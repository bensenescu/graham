import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@every-app/sdk/tanstack";
import { PageOverallReviewService } from "@/server/services/PageOverallReviewService";
import { upsertPageOverallReviewSchema } from "@/types/schemas/reviews";
import { idInputSchema, pageIdInputSchema } from "@/types/schemas/common";

/**
 * Get all overall reviews for the user's pages.
 */
export const getAllPageOverallReviews = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    return PageOverallReviewService.getAll(context.userId);
  });

/**
 * Get the overall review for a page.
 */
export const getPageOverallReview = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => pageIdInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PageOverallReviewService.getByPageId(context.userId, data.pageId);
  });

/**
 * Upsert a page overall review (create or update).
 */
export const upsertPageOverallReview = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => upsertPageOverallReviewSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PageOverallReviewService.upsert(context.userId, {
      id: data.id,
      pageId: data.pageId,
      promptId: data.promptId ?? null,
      summary: data.summary,
    });
  });

/**
 * Delete a page overall review.
 */
export const deletePageOverallReview = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => idInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PageOverallReviewService.delete(context.userId, { id: data.id });
  });
