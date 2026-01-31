import { PageRepository } from "../repositories/PageRepository";
import { PromptRepository } from "../repositories/PromptRepository";
import { PageReviewSettingsRepository } from "../repositories/PageReviewSettingsRepository";
import { PageOverallReviewSettingsRepository } from "../repositories/PageOverallReviewSettingsRepository";
import { ensurePageAccess } from "./helpers/ensurePageAccess";
import { DEFAULT_PAGE_REVIEW_MODEL } from "@/constants/defaults";
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
    model: DEFAULT_PAGE_REVIEW_MODEL,
    defaultPromptId: promptId,
  });

  // Create default overall review settings
  await PageOverallReviewSettingsRepository.create({
    id: crypto.randomUUID(),
    pageId: data.id,
    mode: "all_prompts",
    selectedPromptIds: [],
  });

  return { success: true };
}

/**
 * Update a page.
 * Validates ownership before updating.
 */
async function update(userId: string, data: UpdatePageInput) {
  const existingPage = await ensurePageAccess(data.id, userId);

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
  await ensurePageAccess(data.id, userId);

  await PageRepository.delete(data.id, userId);
  return { success: true };
}

export const PageService = {
  getAll,
  create,
  update,
  delete: deletePage,
} as const;
