import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@every-app/sdk/tanstack";
import { PageOverallReviewRepository } from "@/server/repositories/PageOverallReviewRepository";
import { upsertPageOverallReviewSchema } from "@/types/schemas/reviews";
import { z } from "zod";

/**
 * Get all overall reviews for the user's pages.
 */
export const getAllPageOverallReviews = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    const reviews = await PageOverallReviewRepository.findAllByUserId(
      context.userId,
    );
    return { reviews };
  });

/**
 * Get the overall review for a page.
 */
export const getPageOverallReview = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z.object({ pageId: z.string() }).parse(data),
  )
  .handler(async ({ data }) => {
    const review = await PageOverallReviewRepository.findByPageId(data.pageId);
    return { review: review ?? null };
  });

/**
 * Upsert a page overall review (create or update).
 */
export const upsertPageOverallReview = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => upsertPageOverallReviewSchema.parse(data))
  .handler(async ({ data }) => {
    const result = await PageOverallReviewRepository.upsert({
      id: data.id,
      pageId: data.pageId,
      promptId: data.promptId ?? null,
      summary: data.summary,
    });
    return { review: result };
  });

/**
 * Delete a page overall review.
 */
export const deletePageOverallReview = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => z.object({ id: z.string() }).parse(data))
  .handler(async ({ data }) => {
    await PageOverallReviewRepository.delete(data.id);
    return { success: true };
  });
