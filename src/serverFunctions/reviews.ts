import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@every-app/sdk/tanstack";
import { BlockReviewRepository } from "@/server/repositories/BlockReviewRepository";
import { upsertBlockReviewSchema } from "@/types/schemas/reviews";
import { z } from "zod";

/**
 * Helper to parse JSON fields from DB records.
 */
function parseReviewFromDb(
  review: Awaited<ReturnType<typeof BlockReviewRepository.findById>>,
) {
  if (!review) return null;
  return {
    ...review,
    strengths: JSON.parse(review.strengths) as string[],
    improvements: JSON.parse(review.improvements) as string[],
    tips: review.tips ? (JSON.parse(review.tips) as string[]) : null,
  };
}

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
    return {
      reviews: reviews.map((r) => ({
        ...r,
        strengths: JSON.parse(r.strengths) as string[],
        improvements: JSON.parse(r.improvements) as string[],
        tips: r.tips ? (JSON.parse(r.tips) as string[]) : null,
      })),
    };
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
      strengths: data.strengths,
      improvements: data.improvements,
      tips: data.tips ?? null,
      answerSnapshot: data.answerSnapshot ?? null,
    });
    // Result already has parsed arrays from the repository
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
