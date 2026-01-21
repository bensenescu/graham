import { db } from "@/db";
import { blockReviews, pageBlocks } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

type UpsertBlockReview = {
  id: string;
  blockId: string;
  promptId: string;
  strengths: string[];
  improvements: string[];
  tips: string[] | null;
  answerSnapshot: string | null;
};

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
        strengths: JSON.stringify(data.strengths),
        improvements: JSON.stringify(data.improvements),
        tips: data.tips ? JSON.stringify(data.tips) : null,
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
      strengths: JSON.stringify(data.strengths),
      improvements: JSON.stringify(data.improvements),
      tips: data.tips ? JSON.stringify(data.tips) : null,
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
  findById,
  findByBlockAndPrompt,
  findByBlockId,
  findByPageId,
  upsert,
  delete: deleteById,
  deleteByBlockId,
} as const;
