import { PromptRepository } from "../repositories/PromptRepository";
import { PageReviewSettingsRepository } from "../repositories/PageReviewSettingsRepository";
import type {
  CreatePromptInput,
  UpdatePromptInput,
  DeletePromptInput,
} from "@/types/schemas/prompts";

/**
 * Get all prompts for a user.
 * Also includes prompts referenced by shared page settings (for collaborators).
 */
async function getAll(userId: string) {
  // Get user's own prompts
  const userPrompts = await PromptRepository.findAllByUserId(userId);
  const userPromptIds = new Set(userPrompts.map((p) => p.id));

  // Get all page review settings accessible to user (including shared pages)
  const allSettings =
    await PageReviewSettingsRepository.findAllByUserId(userId);

  // Find prompt IDs from settings that user doesn't own
  const sharedPromptIds = allSettings
    .map((s) => s.defaultPromptId)
    .filter((id): id is string => id !== null && !userPromptIds.has(id));

  // Fetch those shared prompts
  const sharedPrompts = await PromptRepository.findByIds(sharedPromptIds);

  // Combine and deduplicate
  const prompts = [...userPrompts, ...sharedPrompts];
  return { prompts };
}

/**
 * Create a prompt.
 */
async function create(userId: string, data: CreatePromptInput) {
  await PromptRepository.create({
    id: data.id,
    userId,
    name: data.name,
    prompt: data.prompt,
  });

  return { success: true };
}

/**
 * Update a prompt.
 */
async function update(userId: string, data: UpdatePromptInput) {
  const existingPrompt = await PromptRepository.findByIdAndUserId(
    data.id,
    userId,
  );

  if (!existingPrompt) {
    throw new Error("Prompt not found");
  }

  const updateData: { name?: string; prompt?: string } = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.prompt !== undefined) updateData.prompt = data.prompt;

  await PromptRepository.update(data.id, userId, updateData);
  return { success: true };
}

/**
 * Delete a prompt.
 */
async function deletePrompt(userId: string, data: DeletePromptInput) {
  const existingPrompt = await PromptRepository.findByIdAndUserId(
    data.id,
    userId,
  );

  if (!existingPrompt) {
    throw new Error("Prompt not found");
  }

  await PromptRepository.delete(data.id, userId);
  return { success: true };
}

export const PromptService = {
  getAll,
  create,
  update,
  delete: deletePrompt,
} as const;
