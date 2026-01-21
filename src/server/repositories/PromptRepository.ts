import { db } from "@/db";
import { prompts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type CreatePrompt = {
  id: string;
  userId: string;
  name: string;
  prompt: string;
};

type UpdatePrompt = {
  name?: string;
  prompt?: string;
  updatedAt?: string;
};

/**
 * Find all prompts for a user.
 */
async function findAllByUserId(userId: string) {
  return db.query.prompts.findMany({
    where: eq(prompts.userId, userId),
    orderBy: (prompts, { desc }) => [desc(prompts.updatedAt)],
  });
}

/**
 * Find a prompt by ID and user ID.
 */
async function findByIdAndUserId(id: string, userId: string) {
  return db.query.prompts.findFirst({
    where: and(eq(prompts.id, id), eq(prompts.userId, userId)),
  });
}

/**
 * Create a prompt.
 */
async function create(data: CreatePrompt) {
  await db.insert(prompts).values({
    id: data.id,
    userId: data.userId,
    name: data.name,
    prompt: data.prompt,
  });
}

/**
 * Update a prompt.
 */
async function update(id: string, userId: string, data: UpdatePrompt) {
  await db
    .update(prompts)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(prompts.id, id), eq(prompts.userId, userId)));
}

/**
 * Delete a prompt.
 */
async function deleteById(id: string, userId: string) {
  await db
    .delete(prompts)
    .where(and(eq(prompts.id, id), eq(prompts.userId, userId)));
}

export const PromptRepository = {
  findAllByUserId,
  findByIdAndUserId,
  create,
  update,
  delete: deleteById,
} as const;
