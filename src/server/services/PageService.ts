import { PageRepository } from "../repositories/PageRepository";
import { PromptRepository } from "../repositories/PromptRepository";
import { PageReviewSettingsRepository } from "../repositories/PageReviewSettingsRepository";
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
 * Create a page with default review settings.
 */
async function create(userId: string, data: CreatePageInput) {
  // Create the page
  await PageRepository.create({
    id: data.id,
    userId,
    title: data.title,
  });

  // Create default prompt for this page
  const promptId = crypto.randomUUID();
  await PromptRepository.create({
    id: promptId,
    userId,
    name: `${data.title} - Default`,
    prompt: "",
  });

  // Create page review settings with the default prompt
  const settingsId = crypto.randomUUID();
  await PageReviewSettingsRepository.create({
    id: settingsId,
    pageId: data.id,
    model: "openai-gpt-5.2-high",
    defaultPromptId: promptId,
    customPromptIds: [],
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
