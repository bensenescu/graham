import { db } from "@/db";
import { pages, pageShares } from "@/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";

// Types for repository operations
type CreatePage = {
  id: string;
  userId: string;
  title: string;
};

type UpdatePage = {
  title?: string;
  updatedAt?: string;
};

/**
 * Find all pages for a user.
 */
async function findAllByUserId(userId: string) {
  return db.query.pages.findMany({
    where: eq(pages.userId, userId),
    columns: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: (pages, { desc }) => [desc(pages.updatedAt)],
  });
}

/**
 * Find a page by ID and user ID.
 */
async function findByIdAndUserId(id: string, userId: string) {
  return db.query.pages.findFirst({
    where: and(eq(pages.id, id), eq(pages.userId, userId)),
  });
}

/**
 * Find a page by ID and user ID with its blocks.
 */
async function findByIdAndUserIdWithBlocks(id: string, userId: string) {
  return db.query.pages.findFirst({
    where: and(eq(pages.id, id), eq(pages.userId, userId)),
    with: {
      blocks: true,
    },
  });
}

/**
 * Create a page.
 */
async function create(data: CreatePage) {
  await db.insert(pages).values({
    id: data.id,
    userId: data.userId,
    title: data.title,
  });
}

/**
 * Update a page.
 * Defense-in-depth: includes userId in WHERE clause.
 */
async function update(id: string, userId: string, data: UpdatePage) {
  await db
    .update(pages)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(pages.id, id), eq(pages.userId, userId)));
}

/**
 * Delete a page.
 * Defense-in-depth: includes userId in WHERE clause.
 */
async function deleteById(id: string, userId: string) {
  await db.delete(pages).where(and(eq(pages.id, id), eq(pages.userId, userId)));
}

/**
 * Find a page by ID if user has access (owner or collaborator).
 */
async function findByIdWithAccess(id: string, userId: string) {
  // First check if user is the owner
  const ownedPage = await db.query.pages.findFirst({
    where: and(eq(pages.id, id), eq(pages.userId, userId)),
  });

  if (ownedPage) {
    return { page: ownedPage, isOwner: true };
  }

  // Check if user is a collaborator
  const share = await db.query.pageShares.findFirst({
    where: and(eq(pageShares.pageId, id), eq(pageShares.userId, userId)),
  });

  if (share) {
    const sharedPage = await db.query.pages.findFirst({
      where: eq(pages.id, id),
    });
    if (sharedPage) {
      return { page: sharedPage, isOwner: false };
    }
  }

  return { page: null, isOwner: false };
}

/**
 * Update a page - allows both owners and collaborators.
 * Defense-in-depth: uses the page's owner userId in WHERE clause.
 */
async function updateWithAccess(id: string, userId: string, data: UpdatePage) {
  const { page, isOwner } = await findByIdWithAccess(id, userId);

  if (!page) {
    throw new Error("Page not found or access denied");
  }

  // Update the page - defense-in-depth: use page's actual owner in WHERE
  await db
    .update(pages)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(pages.id, id), eq(pages.userId, page.userId)));
}

/**
 * Get all page IDs accessible by user (owned + shared).
 */
async function getAccessiblePageIds(userId: string) {
  // Get owned pages
  const ownedPages = await db.query.pages.findMany({
    where: eq(pages.userId, userId),
    columns: { id: true },
  });

  // Get shared pages
  const sharedPageRecords = await db.query.pageShares.findMany({
    where: eq(pageShares.userId, userId),
    columns: { pageId: true },
  });

  const ownedIds = ownedPages.map((p) => p.id);
  const sharedIds = sharedPageRecords.map((s) => s.pageId);

  return [...new Set([...ownedIds, ...sharedIds])];
}

export const PageRepository = {
  findAllByUserId,
  findByIdAndUserId,
  findByIdAndUserIdWithBlocks,
  findByIdWithAccess,
  getAccessiblePageIds,
  create,
  update,
  updateWithAccess,
  delete: deleteById,
} as const;
