import { db } from "@/db";
import { pageShares, pages, users } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

type CreatePageShare = {
  id: string;
  pageId: string;
  userId: string;
  sharedBy: string;
};

/**
 * Find all shares for a page (with user email info).
 */
async function findAllByPageId(pageId: string) {
  const shares = await db
    .select({
      id: pageShares.id,
      pageId: pageShares.pageId,
      userId: pageShares.userId,
      sharedBy: pageShares.sharedBy,
      createdAt: pageShares.createdAt,
      userEmail: users.email,
    })
    .from(pageShares)
    .innerJoin(users, eq(pageShares.userId, users.id))
    .where(eq(pageShares.pageId, pageId));

  return shares;
}

/**
 * Find all pages shared with a user (for "Shared with me" section).
 */
async function findPagesSharedWithUser(userId: string) {
  const shares = await db
    .select({
      id: pages.id,
      title: pages.title,
      createdAt: pages.createdAt,
      updatedAt: pages.updatedAt,
      ownerId: pages.userId,
      ownerEmail: users.email,
    })
    .from(pageShares)
    .innerJoin(pages, eq(pageShares.pageId, pages.id))
    .innerJoin(users, eq(pages.userId, users.id))
    .where(eq(pageShares.userId, userId));

  return shares;
}

/**
 * Check if a user has access to a page (either owner or collaborator).
 */
async function hasAccess(pageId: string, userId: string) {
  // Check if owner
  const page = await db.query.pages.findFirst({
    where: and(eq(pages.id, pageId), eq(pages.userId, userId)),
  });

  if (page) {
    return { hasAccess: true, isOwner: true };
  }

  // Check if collaborator
  const share = await db.query.pageShares.findFirst({
    where: and(eq(pageShares.pageId, pageId), eq(pageShares.userId, userId)),
  });

  if (share) {
    return { hasAccess: true, isOwner: false };
  }

  return { hasAccess: false, isOwner: false };
}

/**
 * Check if user is the owner of a page.
 */
async function isOwner(pageId: string, userId: string) {
  const page = await db.query.pages.findFirst({
    where: and(eq(pages.id, pageId), eq(pages.userId, userId)),
  });

  return !!page;
}

/**
 * Create a page share.
 */
async function create(data: CreatePageShare) {
  await db.insert(pageShares).values({
    id: data.id,
    pageId: data.pageId,
    userId: data.userId,
    sharedBy: data.sharedBy,
  });
}

/**
 * Create multiple page shares at once.
 */
async function createMany(shares: CreatePageShare[]) {
  if (shares.length === 0) return;

  await db.insert(pageShares).values(shares);
}

/**
 * Delete a page share by pageId and userId.
 */
async function deleteByPageAndUser(pageId: string, userId: string) {
  await db
    .delete(pageShares)
    .where(and(eq(pageShares.pageId, pageId), eq(pageShares.userId, userId)));
}

/**
 * Delete all shares for a page.
 */
async function deleteAllByPageId(pageId: string) {
  await db.delete(pageShares).where(eq(pageShares.pageId, pageId));
}

/**
 * Check if a share already exists.
 */
async function exists(pageId: string, userId: string) {
  const share = await db.query.pageShares.findFirst({
    where: and(eq(pageShares.pageId, pageId), eq(pageShares.userId, userId)),
  });

  return !!share;
}

/**
 * Get all users in the workspace (for the dropdown).
 */
async function getAllUsers() {
  return db.query.users.findMany({
    columns: {
      id: true,
      email: true,
    },
    orderBy: (users, { asc }) => [asc(users.email)],
  });
}

export const PageShareRepository = {
  findAllByPageId,
  findPagesSharedWithUser,
  hasAccess,
  isOwner,
  create,
  createMany,
  deleteByPageAndUser,
  deleteAllByPageId,
  exists,
  getAllUsers,
} as const;
