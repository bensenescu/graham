import { db } from "@/db";
import { blockReviews, pageBlocks, pages, pageShares } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

type UpsertBlockReview = {
  id: string;
  blockId: string;
  promptId: string;
  suggestion: string | null;
  answerSnapshot: string | null;
};

/**
 * Find all reviews for blocks belonging to a user's accessible pages (owned + shared).
 */
async function findAllByUserId(userId: string) {
  // Get all page IDs for pages the user owns
  const userPages = await db.query.pages.findMany({
    where: eq(pages.userId, userId),
    columns: { id: true },
  });

  // Get all page IDs for pages shared with the user
  const sharedPageRecords = await db.query.pageShares.findMany({
    where: eq(pageShares.userId, userId),
    columns: { pageId: true },
  });

  const ownedIds = userPages.map((p) => p.id);
  const sharedIds = sharedPageRecords.map((s) => s.pageId);
  const pageIds = [...new Set([...ownedIds, ...sharedIds])];

  if (pageIds.length === 0) {
    return [];
  }

  // Get all block IDs for those pages
  const blocks = await db.query.pageBlocks.findMany({
    where: inArray(pageBlocks.pageId, pageIds),
    columns: { id: true },
  });

  if (blocks.length === 0) {
    return [];
  }

  const blockIds = blocks.map((b) => b.id);

  // Get all reviews for those blocks
  return db.query.blockReviews.findMany({
    where: inArray(blockReviews.blockId, blockIds),
  });
}

/**
 * Find a review by ID.
 */
async function findById(id: string) {
  return db.query.blockReviews.findFirst({
    where: eq(blockReviews.id, id),
  });
}

/**
 * Find a review by block ID and prompt ID.
 */
async function findByBlockAndPrompt(blockId: string, promptId: string) {
  return db.query.blockReviews.findFirst({
    where: and(
      eq(blockReviews.blockId, blockId),
      eq(blockReviews.promptId, promptId),
    ),
  });
}

/**
 * Find all reviews for a specific block.
 */
async function findByBlockId(blockId: string) {
  return db.query.blockReviews.findMany({
    where: eq(blockReviews.blockId, blockId),
  });
}

/**
 * Find all reviews for blocks on a specific page.
 */
async function findByPageId(pageId: string) {
  // First get all block IDs for this page
  const blocks = await db.query.pageBlocks.findMany({
    where: eq(pageBlocks.pageId, pageId),
    columns: { id: true },
  });

  if (blocks.length === 0) {
    return [];
  }

  const blockIds = blocks.map((b) => b.id);

  // Then get all reviews for those blocks
  return db.query.blockReviews.findMany({
    where: inArray(blockReviews.blockId, blockIds),
  });
}

/**
 * Upsert a block review (insert or update based on blockId + promptId).
 */
async function upsert(data: UpsertBlockReview) {
  const existing = await findByBlockAndPrompt(data.blockId, data.promptId);

  if (existing) {
    // Update existing review
    await db
      .update(blockReviews)
      .set({
        suggestion: data.suggestion,
        answerSnapshot: data.answerSnapshot,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(blockReviews.id, existing.id));

    return { ...existing, ...data, updatedAt: new Date().toISOString() };
  } else {
    // Insert new review
    const now = new Date().toISOString();
    await db.insert(blockReviews).values({
      id: data.id,
      blockId: data.blockId,
      promptId: data.promptId,
      suggestion: data.suggestion,
      answerSnapshot: data.answerSnapshot,
      createdAt: now,
      updatedAt: now,
    });

    return { ...data, createdAt: now, updatedAt: now };
  }
}

/**
 * Delete a review by ID.
 */
async function deleteById(id: string) {
  await db.delete(blockReviews).where(eq(blockReviews.id, id));
}

/**
 * Delete all reviews for a block.
 */
async function deleteByBlockId(blockId: string) {
  await db.delete(blockReviews).where(eq(blockReviews.blockId, blockId));
}

export const BlockReviewRepository = {
  findAllByUserId,
  findById,
  findByBlockAndPrompt,
  findByBlockId,
  findByPageId,
  upsert,
  delete: deleteById,
  deleteByBlockId,
} as const;
