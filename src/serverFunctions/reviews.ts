import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@every-app/sdk/tanstack";
import { BlockReviewRepository } from "@/server/repositories/BlockReviewRepository";
import { upsertBlockReviewSchema } from "@/types/schemas/reviews";
import { z } from "zod";

/**
 * Get all block reviews for the user's pages.
 */
export const getAllBlockReviews = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    const reviews = await BlockReviewRepository.findAllByUserId(context.userId);
    return { reviews };
  });

/**
 * Get all reviews for blocks on a page.
 */
export const getBlockReviewsForPage = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z.object({ pageId: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const reviews = await BlockReviewRepository.findByPageId(data.pageId);
    return { reviews };
  });

/**
 * Upsert a block review (create or update).
 */
export const upsertBlockReview = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => upsertBlockReviewSchema.parse(data))
  .handler(async ({ data }) => {
    const result = await BlockReviewRepository.upsert({
      id: data.id,
      blockId: data.blockId,
      promptId: data.promptId,
      suggestion: data.suggestion ?? null,
      answerSnapshot: data.answerSnapshot ?? null,
    });
    return { review: result };
  });

/**
 * Delete a block review.
 */
export const deleteBlockReview = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    await BlockReviewRepository.delete(data.id);
    return { success: true };
  });
