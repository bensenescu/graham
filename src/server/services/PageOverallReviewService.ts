import { PageOverallReviewRepository } from "../repositories/PageOverallReviewRepository";
import { PageRepository } from "../repositories/PageRepository";

type UpsertPageOverallReviewInput = {
  id: string;
  pageId: string;
  promptId: string | null;
  summary: string;
};

type DeletePageOverallReviewInput = {
  id: string;
};

/**
 * Get all overall reviews for pages accessible by user (owned + shared).
 */
async function getAll(userId: string) {
  const reviews = await PageOverallReviewRepository.findAllByUserId(userId);
  return { reviews };
}

/**
 * Get the overall review for a page.
 * Validates user has access to the page (owner or collaborator).
 */
async function getByPageId(userId: string, pageId: string) {
  // Verify user has access to the page
  const { page } = await PageRepository.findByIdWithAccess(pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }

  const review = await PageOverallReviewRepository.findByPageId(pageId);
  return { review: review ?? null };
}

/**
 * Upsert a page overall review.
 * Validates user has access to the page (owner or collaborator).
 */
async function upsert(userId: string, data: UpsertPageOverallReviewInput) {
  // Verify user has access to the page
  const { page } = await PageRepository.findByIdWithAccess(data.pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }

  const result = await PageOverallReviewRepository.upsert({
    id: data.id,
    pageId: data.pageId,
    promptId: data.promptId,
    summary: data.summary,
  });

  return { review: result };
}

/**
 * Delete a page overall review.
 * Validates user has access to the page (owner or collaborator).
 */
async function deleteReview(
  userId: string,
  data: DeletePageOverallReviewInput,
) {
  // Find the review to get its pageId
  const review = await PageOverallReviewRepository.findById(data.id);
  if (!review) {
    throw new Error("Review not found");
  }

  // Verify user has access to the page
  const { page } = await PageRepository.findByIdWithAccess(
    review.pageId,
    userId,
  );
  if (!page) {
    throw new Error("Page not found");
  }

  await PageOverallReviewRepository.delete(data.id, review.pageId);
  return { success: true };
}

export const PageOverallReviewService = {
  getAll,
  getByPageId,
  upsert,
  delete: deleteReview,
} as const;
