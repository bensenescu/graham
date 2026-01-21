import { PageReviewSettingsRepository } from "../repositories/PageReviewSettingsRepository";
import { PromptRepository } from "../repositories/PromptRepository";
import { PageRepository } from "../repositories/PageRepository";
import type {
  CreatePageReviewSettingsInput,
  UpdatePageReviewSettingsInput,
} from "@/types/schemas/prompts";

/**
 * Get review settings for a page.
 * Returns settings with expanded customPromptIds.
 */
async function getByPageId(userId: string, pageId: string) {
  // Verify user owns the page
  const page = await PageRepository.findByIdAndUserId(pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }

  const settings = await PageReviewSettingsRepository.findByPageId(pageId);

  if (!settings) {
    return { settings: null };
  }

  // Parse customPromptIds from JSON
  const customPromptIds = JSON.parse(settings.customPromptIds) as string[];

  // Get all prompts for this user to resolve custom prompts
  const allPrompts = await PromptRepository.findAllByUserId(userId);
  const customPrompts = allPrompts.filter((p) =>
    customPromptIds.includes(p.id),
  );

  return {
    settings: {
      ...settings,
      customPromptIds,
      customPrompts,
    },
  };
}

/**
 * Create or update review settings for a page.
 */
async function upsert(userId: string, data: CreatePageReviewSettingsInput) {
  // Verify user owns the page
  const page = await PageRepository.findByIdAndUserId(data.pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }

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
    model: data.model ?? "openai-gpt-5.2-high",
    defaultPromptId: data.defaultPromptId ?? null,
    customPromptIds: data.customPromptIds ?? [],
  });

  return { success: true };
}

/**
 * Update review settings for a page.
 */
async function update(userId: string, data: UpdatePageReviewSettingsInput) {
  // Verify user owns the page
  const page = await PageRepository.findByIdAndUserId(data.pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }

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
    customPromptIds: data.customPromptIds,
  });

  return { success: true };
}

/**
 * Initialize default settings for a new page.
 * Creates a default prompt named "{Page Title} - Default" and sets it as the default.
 */
async function initializeForPage(
  userId: string,
  pageId: string,
  pageTitle: string,
) {
  // Create the default prompt
  const promptId = crypto.randomUUID();
  await PromptRepository.create({
    id: promptId,
    userId,
    name: `${pageTitle} - Default`,
    prompt:
      "Review this answer for a YC application. Evaluate clarity, specificity, and persuasiveness. Provide actionable feedback on how to improve the response.",
  });

  // Create the page review settings
  const settingsId = crypto.randomUUID();
  await PageReviewSettingsRepository.create({
    id: settingsId,
    pageId,
    model: "openai-gpt-5.2-high",
    defaultPromptId: promptId,
    customPromptIds: [],
  });

  return { promptId, settingsId };
}

export const PageReviewSettingsService = {
  getByPageId,
  upsert,
  update,
  initializeForPage,
} as const;
