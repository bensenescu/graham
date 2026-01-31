import { PageReviewSettingsRepository } from "../repositories/PageReviewSettingsRepository";
import { PromptRepository } from "../repositories/PromptRepository";
import {
  ensurePageAccess,
  ensurePageAccessWithSharing,
} from "./helpers/ensurePageAccess";
import { DEFAULT_PAGE_REVIEW_MODEL } from "@/constants/defaults";
import type {
  CreatePageReviewSettingsInput,
  UpdatePageReviewSettingsInput,
} from "@/types/schemas/prompts";

/**
 * Get all review settings for the user's pages.
 */
async function getAll(userId: string) {
  const settings = await PageReviewSettingsRepository.findAllByUserId(userId);
  return { settings };
}

/**
 * Get review settings for a page.
 */
async function getByPageId(userId: string, pageId: string) {
  // Verify user has access to the page (owner or collaborator)
  await ensurePageAccessWithSharing(pageId, userId);

  const settings = await PageReviewSettingsRepository.findByPageId(pageId);

  if (!settings) {
    return { settings: null };
  }

  return { settings };
}

/**
 * Create or update review settings for a page.
 */
async function upsert(userId: string, data: CreatePageReviewSettingsInput) {
  // Verify user owns the page
  await ensurePageAccess(data.pageId, userId);

  // Verify defaultPromptId belongs to user if provided
  if (data.defaultPromptId) {
    const prompt = await PromptRepository.findByIdAndUserId(
      data.defaultPromptId,
      userId,
    );
    if (!prompt) {
      throw new Error("Default prompt not found");
    }
  }

  await PageReviewSettingsRepository.upsert({
    id: data.id,
    pageId: data.pageId,
    model: data.model ?? DEFAULT_PAGE_REVIEW_MODEL,
    defaultPromptId: data.defaultPromptId ?? null,
  });

  return { success: true };
}

/**
 * Update review settings for a page.
 */
async function update(userId: string, data: UpdatePageReviewSettingsInput) {
  // Verify user owns the page
  await ensurePageAccess(data.pageId, userId);

  // Verify defaultPromptId belongs to user if provided
  if (data.defaultPromptId) {
    const prompt = await PromptRepository.findByIdAndUserId(
      data.defaultPromptId,
      userId,
    );
    if (!prompt) {
      throw new Error("Default prompt not found");
    }
  }

  await PageReviewSettingsRepository.update(data.pageId, {
    model: data.model,
    defaultPromptId: data.defaultPromptId,
  });

  return { success: true };
}

export const PageReviewSettingsService = {
  getAll,
  getByPageId,
  upsert,
  update,
} as const;
