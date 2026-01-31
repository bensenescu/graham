import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@every-app/sdk/tanstack";
import { BlockReviewService } from "@/server/services/BlockReviewService";
import { ensurePageAccessWithSharing } from "@/server/services/helpers/ensurePageAccess";
import { upsertBlockReviewSchema } from "@/types/schemas/reviews";
import { idInputSchema, pageIdInputSchema } from "@/types/schemas/common";

/**
 * Get all block reviews for the user's pages.
 */
export const getAllBlockReviews = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    return BlockReviewService.getAll(context.userId);
  });

/**
 * Get all reviews for blocks on a page.
 */
export const getBlockReviewsForPage = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => pageIdInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    await ensurePageAccessWithSharing(data.pageId, context.userId);
    return BlockReviewService.getByPageId(context.userId, data.pageId);
  });

/**
 * Upsert a block review (create or update).
 */
export const upsertBlockReview = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => upsertBlockReviewSchema.parse(data))
  .handler(async ({ data, context }) => {
    return BlockReviewService.upsert(context.userId, {
      id: data.id,
      blockId: data.blockId,
      promptId: data.promptId,
      suggestion: data.suggestion ?? null,
      answerSnapshot: data.answerSnapshot ?? null,
    });
  });

/**
 * Delete a block review.
 */
export const deleteBlockReview = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => idInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return BlockReviewService.delete(context.userId, { id: data.id });
  });
