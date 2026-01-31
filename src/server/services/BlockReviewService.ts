import { BlockReviewRepository } from "../repositories/BlockReviewRepository";
import { PageBlockRepository } from "../repositories/PageBlockRepository";
import { PageRepository } from "../repositories/PageRepository";

type UpsertBlockReviewInput = {
  id: string;
  blockId: string;
  promptId: string;
  suggestion: string | null;
  answerSnapshot: string | null;
};

type DeleteBlockReviewInput = {
  id: string;
};

/**
 * Get all block reviews for pages accessible by user (owned + shared).
 */
async function getAll(userId: string) {
  const reviews = await BlockReviewRepository.findAllByUserId(userId);
  return { reviews };
}

/**
 * Get all reviews for blocks on a page.
 * Validates user has access to the page (owner or collaborator).
 */
async function getByPageId(userId: string, pageId: string) {
  // Verify user has access to the page
  const { page } = await PageRepository.findByIdWithAccess(pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }

  const reviews = await BlockReviewRepository.findByPageId(pageId);
  return { reviews };
}

/**
 * Upsert a block review.
 * Validates user has access to the block's parent page (owner or collaborator).
 */
async function upsert(userId: string, data: UpsertBlockReviewInput) {
  // Find the block to get its pageId
  const block = await PageBlockRepository.findById(data.blockId);
  if (!block) {
    throw new Error("Block not found");
  }

  // Verify user has access to the page
  const { page } = await PageRepository.findByIdWithAccess(
    block.pageId,
    userId,
  );
  if (!page) {
    throw new Error("Page not found");
  }

  const result = await BlockReviewRepository.upsert(
    {
      id: data.id,
      blockId: data.blockId,
      promptId: data.promptId,
      suggestion: data.suggestion,
      answerSnapshot: data.answerSnapshot,
    },
    userId,
  );

  return { review: result };
}

/**
 * Delete a block review.
 * Validates user has access to the block's parent page (owner or collaborator).
 */
async function deleteReview(userId: string, data: DeleteBlockReviewInput) {
  // Find the review to get its blockId
  const review = await BlockReviewRepository.findById(data.id);
  if (!review) {
    throw new Error("Review not found");
  }

  // Find the block to get its pageId
  const block = await PageBlockRepository.findById(review.blockId);
  if (!block) {
    throw new Error("Block not found");
  }

  // Verify user has access to the page
  const { page } = await PageRepository.findByIdWithAccess(
    block.pageId,
    userId,
  );
  if (!page) {
    throw new Error("Page not found");
  }

  await BlockReviewRepository.delete(data.id, review.blockId, userId);
  return { success: true };
}

export const BlockReviewService = {
  getAll,
  getByPageId,
  upsert,
  delete: deleteReview,
} as const;
