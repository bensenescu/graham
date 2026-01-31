import { db } from "@/db";
import { blockReviews, pageBlocks } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getAccessibleBlockIdsForUser } from "./helpers/access";

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
  const blockIds = await getAccessibleBlockIdsForUser(userId);

  if (blockIds.length === 0) {
    return [];
  }

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

  const blockIds = blocks.map((b: { id: string }) => b.id);

  // Then get all reviews for those blocks
  return db.query.blockReviews.findMany({
    where: inArray(blockReviews.blockId, blockIds),
  });
}

/**
 * Upsert a block review (insert or update based on blockId + promptId).
 * Defense-in-depth: update includes blockId in WHERE clause.
 */
async function upsert(data: UpsertBlockReview, userId: string) {
  const blockIds = await getAccessibleBlockIdsForUser(userId);

  if (!blockIds.includes(data.blockId)) {
    throw new Error("Block not found or access denied");
  }

  const existing = await findByBlockAndPrompt(data.blockId, data.promptId);

  if (existing) {
    // Update existing review - defense-in-depth: include blockId in WHERE
    await db
      .update(blockReviews)
      .set({
        suggestion: data.suggestion,
        answerSnapshot: data.answerSnapshot,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(blockReviews.id, existing.id),
          eq(blockReviews.blockId, data.blockId),
          inArray(blockReviews.blockId, blockIds),
        ),
      );

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
 * Defense-in-depth: includes blockId in WHERE clause.
 */
async function deleteById(id: string, blockId: string, userId: string) {
  const blockIds = await getAccessibleBlockIdsForUser(userId);

  if (blockIds.length === 0) {
    return;
  }

  await db
    .delete(blockReviews)
    .where(
      and(
        eq(blockReviews.id, id),
        eq(blockReviews.blockId, blockId),
        inArray(blockReviews.blockId, blockIds),
      ),
    );
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
