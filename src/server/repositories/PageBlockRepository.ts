import { db } from "@/db";
import { pageBlocks } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getAccessiblePageIdsForUser } from "./helpers/access";

// Types for repository operations
type CreatePageBlock = {
  id: string;
  pageId: string;
  question: string;
  answer?: string;
  sortKey: string;
};

type UpdatePageBlock = {
  question?: string;
  answer?: string;
  sortKey?: string;
  updatedAt?: string;
};

/**
 * Find all blocks for all pages accessible by user (owned + shared).
 */
async function findAllByUserId(userId: string) {
  const pageIds = await getAccessiblePageIdsForUser(userId);

  if (pageIds.length === 0) {
    return [];
  }

  return db.query.pageBlocks.findMany({
    where: inArray(pageBlocks.pageId, pageIds),
    columns: {
      id: true,
      pageId: true,
      question: true,
      answer: true,
      sortKey: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Find all blocks for a page.
 */
async function findAllByPageId(pageId: string) {
  return db.query.pageBlocks.findMany({
    where: eq(pageBlocks.pageId, pageId),
    columns: {
      id: true,
      pageId: true,
      question: true,
      answer: true,
      sortKey: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Find a block by ID.
 */
async function findById(id: string) {
  return db.query.pageBlocks.findFirst({
    where: eq(pageBlocks.id, id),
  });
}

/**
 * Create a page block.
 */
async function create(data: CreatePageBlock) {
  await db.insert(pageBlocks).values({
    id: data.id,
    pageId: data.pageId,
    question: data.question,
    answer: data.answer ?? "",
    sortKey: data.sortKey,
  });
}

/**
 * Batch create multiple page blocks.
 * Uses db.batch() for Cloudflare D1 compatibility.
 */
async function batchCreate(blocks: CreatePageBlock[]) {
  if (blocks.length === 0) return;

  const now = new Date().toISOString();

  const insertStatements = blocks.map((block) =>
    db.insert(pageBlocks).values({
      id: block.id,
      pageId: block.pageId,
      question: block.question,
      answer: block.answer ?? "",
      sortKey: block.sortKey,
      createdAt: now,
      updatedAt: now,
    }),
  );

  const [first, ...rest] = insertStatements;
  await db.batch([first, ...rest]);
}

/**
 * Update a page block.
 * Defense-in-depth: includes pageId in WHERE clause.
 */
async function update(
  id: string,
  pageId: string,
  userId: string,
  data: UpdatePageBlock,
) {
  const pageIds = await getAccessiblePageIdsForUser(userId);

  if (pageIds.length === 0) {
    return;
  }

  await db
    .update(pageBlocks)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(pageBlocks.id, id),
        eq(pageBlocks.pageId, pageId),
        inArray(pageBlocks.pageId, pageIds),
      ),
    );
}

/**
 * Delete a page block.
 * Defense-in-depth: includes pageId in WHERE clause.
 */
async function deleteById(id: string, pageId: string, userId: string) {
  const pageIds = await getAccessiblePageIdsForUser(userId);

  if (pageIds.length === 0) {
    return;
  }

  await db
    .delete(pageBlocks)
    .where(
      and(
        eq(pageBlocks.id, id),
        eq(pageBlocks.pageId, pageId),
        inArray(pageBlocks.pageId, pageIds),
      ),
    );
}

/**
 * Delete all blocks for a page.
 */
async function deleteAllByPageId(pageId: string) {
  await db.delete(pageBlocks).where(eq(pageBlocks.pageId, pageId));
}

export const PageBlockRepository = {
  findAllByUserId,
  findAllByPageId,
  findById,
  create,
  batchCreate,
  update,
  delete: deleteById,
  deleteAllByPageId,
} as const;
