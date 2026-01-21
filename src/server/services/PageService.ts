import { PageRepository } from "../repositories/PageRepository";
import type {
  CreatePageInput,
  UpdatePageInput,
  DeletePageInput,
} from "@/types/schemas/pages";

/**
 * Get all pages for a user.
 */
async function getAll(userId: string) {
  const pages = await PageRepository.findAllByUserId(userId);
  return { pages };
}

/**
 * Create a page.
 */
async function create(userId: string, data: CreatePageInput) {
  await PageRepository.create({
    id: data.id,
    userId,
    title: data.title,
    content: data.content ?? "",
  });

  return { success: true };
}

/**
 * Update a page.
 * Validates ownership before updating.
 */
async function update(userId: string, data: UpdatePageInput) {
  const existingPage = await PageRepository.findByIdAndUserId(data.id, userId);

  if (!existingPage) {
    throw new Error("Page not found");
  }

  // Prepare update data
  const updateData = {
    title: data.title ?? existingPage.title,
    content: data.content ?? existingPage.content,
  };

  await PageRepository.update(data.id, userId, updateData);
  return { success: true };
}

/**
 * Delete a page.
 * Validates ownership before deleting.
 */
async function deletePage(userId: string, data: DeletePageInput) {
  const existingPage = await PageRepository.findByIdAndUserId(data.id, userId);

  if (!existingPage) {
    throw new Error("Page not found");
  }

  await PageRepository.delete(data.id, userId);
  return { success: true };
}

export const PageService = {
  getAll,
  create,
  update,
  delete: deletePage,
} as const;
