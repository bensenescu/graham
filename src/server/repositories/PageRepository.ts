import { db } from "@/db";
import { pages } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// Types for repository operations
type CreatePage = {
  id: string;
  userId: string;
  title: string;
  content?: string;
};

type UpdatePage = {
  title?: string;
  content?: string;
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
      content: true,
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
 * Create a page.
 */
async function create(data: CreatePage) {
  await db.insert(pages).values({
    id: data.id,
    userId: data.userId,
    title: data.title,
    content: data.content ?? "",
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

export const PageRepository = {
  findAllByUserId,
  findByIdAndUserId,
  create,
  update,
  delete: deleteById,
} as const;
