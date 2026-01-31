import { db } from "@/db";
import { pageOverallReviews } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getAccessiblePageIdsForUser } from "./helpers/access";

type UpsertPageOverallReview = {
  id: string;
  pageId: string;
  promptId: string | null;
  summary: string;
};

/**
 * Find all overall reviews for pages accessible by user (owned + shared).
 */
async function findAllByUserId(userId: string) {
  // Get all page IDs accessible by the user (owned + shared)
  const pageIds = await getAccessiblePageIdsForUser(userId);

  if (pageIds.length === 0) {
    return [];
  }

  return db.query.pageOverallReviews.findMany({
    where: inArray(pageOverallReviews.pageId, pageIds),
  });
}

/**
 * Find an overall review by ID.
 */
async function findById(id: string) {
  return db.query.pageOverallReviews.findFirst({
    where: eq(pageOverallReviews.id, id),
  });
}

/**
 * Find the overall review for a specific page.
 */
async function findByPageId(pageId: string) {
  return db.query.pageOverallReviews.findFirst({
    where: eq(pageOverallReviews.pageId, pageId),
  });
}

/**
 * Upsert a page overall review (insert or update based on pageId).
 * Defense-in-depth: update includes pageId in WHERE clause.
 */
async function upsert(data: UpsertPageOverallReview, userId: string) {
  const pageIds = await getAccessiblePageIdsForUser(userId);

  if (!pageIds.includes(data.pageId)) {
    throw new Error("Page not found or access denied");
  }

  const existing = await findByPageId(data.pageId);

  if (existing) {
    // Update existing review - defense-in-depth: include pageId in WHERE
    await db
      .update(pageOverallReviews)
      .set({
        promptId: data.promptId,
        summary: data.summary,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(pageOverallReviews.id, existing.id),
          eq(pageOverallReviews.pageId, data.pageId),
          inArray(pageOverallReviews.pageId, pageIds),
        ),
      );

    return { ...existing, ...data, updatedAt: new Date().toISOString() };
  } else {
    // Insert new review
    const now = new Date().toISOString();
    await db.insert(pageOverallReviews).values({
      id: data.id,
      pageId: data.pageId,
      promptId: data.promptId,
      summary: data.summary,
      createdAt: now,
      updatedAt: now,
    });

    return { ...data, createdAt: now, updatedAt: now };
  }
}

/**
 * Delete an overall review by ID.
 * Defense-in-depth: includes pageId in WHERE clause.
 */
async function deleteById(id: string, pageId: string, userId: string) {
  const pageIds = await getAccessiblePageIdsForUser(userId);

  if (pageIds.length === 0) {
    return;
  }

  await db
    .delete(pageOverallReviews)
    .where(
      and(
        eq(pageOverallReviews.id, id),
        eq(pageOverallReviews.pageId, pageId),
        inArray(pageOverallReviews.pageId, pageIds),
      ),
    );
}

/**
 * Delete the overall review for a page.
 */
async function deleteByPageId(pageId: string) {
  await db
    .delete(pageOverallReviews)
    .where(eq(pageOverallReviews.pageId, pageId));
}

export const PageOverallReviewRepository = {
  findAllByUserId,
  findById,
  findByPageId,
  upsert,
  delete: deleteById,
  deleteByPageId,
} as const;
