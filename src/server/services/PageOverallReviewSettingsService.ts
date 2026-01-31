import { PageOverallReviewSettingsRepository } from "../repositories/PageOverallReviewSettingsRepository";
import { PromptRepository } from "../repositories/PromptRepository";
import {
  ensurePageAccess,
  ensurePageAccessWithSharing,
} from "./helpers/ensurePageAccess";
import type { UpdatePageOverallReviewSettingsInput } from "@/types/schemas/prompts";

/**
 * Get all overall review settings for the user's pages.
 */
async function getAll(userId: string) {
  const settings =
    await PageOverallReviewSettingsRepository.findAllByUserId(userId);
  return { settings };
}

/**
 * Get overall review settings for a page.
 * Returns settings with expanded selected prompts.
 */
async function getByPageId(userId: string, pageId: string) {
  // Verify user has access to the page (owner or collaborator)
  await ensurePageAccessWithSharing(pageId, userId);

  const settings =
    await PageOverallReviewSettingsRepository.findByPageId(pageId);

  if (!settings) {
    return { settings: null };
  }

  return { settings };
}

/**
 * Update overall review settings for a page.
 */
async function update(
  userId: string,
  data: UpdatePageOverallReviewSettingsInput,
) {
  // Verify user owns the page
  await ensurePageAccess(data.pageId, userId);

  // Verify all selected prompts belong to user if provided
  if (data.selectedPromptIds && data.selectedPromptIds.length > 0) {
    const userPrompts = await PromptRepository.findAllByUserId(userId);
    const userPromptIds = new Set(userPrompts.map((p) => p.id));

    for (const promptId of data.selectedPromptIds) {
      if (!userPromptIds.has(promptId)) {
        throw new Error(`Prompt ${promptId} not found or not owned by user`);
      }
    }
  }

  await PageOverallReviewSettingsRepository.update(data.pageId, {
    mode: data.mode,
    selectedPromptIds: data.selectedPromptIds,
  });

  return { success: true };
}

export const PageOverallReviewSettingsService = {
  getAll,
  getByPageId,
  update,
} as const;
