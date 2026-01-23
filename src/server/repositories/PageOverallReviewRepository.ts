import { db } from "@/db";
import { pageOverallReviews } from "@/db/schema";
import { eq } from "drizzle-orm";

type UpsertPageOverallReview = {
  id: string;
  pageId: string;
  promptId: string | null;
  summary: string;
};

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
 */
async function upsert(data: UpsertPageOverallReview) {
  const existing = await findByPageId(data.pageId);

  if (existing) {
    // Update existing review
    await db
      .update(pageOverallReviews)
      .set({
        promptId: data.promptId,
        summary: data.summary,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(pageOverallReviews.id, existing.id));

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
 */
async function deleteById(id: string) {
  await db.delete(pageOverallReviews).where(eq(pageOverallReviews.id, id));
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
  findById,
  findByPageId,
  upsert,
  delete: deleteById,
  deleteByPageId,
} as const;
