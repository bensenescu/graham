import { db } from "@/db";
import { pageBlocks, pages, pageShares } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

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
 * Find all blocks for all pages accessible to a user (owned + shared).
 */
async function findAllByUserId(userId: string) {
  // Get all page IDs owned by the user
  const ownedPages = await db.query.pages.findMany({
    where: eq(pages.userId, userId),
    columns: { id: true },
  });

  // Get all page IDs shared with the user
  const sharedPages = await db.query.pageShares.findMany({
    where: eq(pageShares.userId, userId),
    columns: { pageId: true },
  });

  const pageIds = Array.from(
    new Set([
      ...ownedPages.map((p) => p.id),
      ...sharedPages.map((s) => s.pageId),
    ]),
  );

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
 */
async function update(id: string, data: UpdatePageBlock) {
  await db
    .update(pageBlocks)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(pageBlocks.id, id));
}

/**
 * Delete a page block.
 */
async function deleteById(id: string) {
  await db.delete(pageBlocks).where(eq(pageBlocks.id, id));
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
