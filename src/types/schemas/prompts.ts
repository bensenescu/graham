import { z } from "zod";

// === Prompt Schema ===
export const promptSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  prompt: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Prompt = z.infer<typeof promptSchema>;

// === Create Prompt ===
export const createPromptSchema = z.object({
  id: z.string().uuid("Invalid prompt ID"),
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  prompt: z.string(),
});

export type CreatePromptInput = z.infer<typeof createPromptSchema>;

// === Update Prompt ===
export const updatePromptSchema = z.object({
  id: z.string().uuid("Invalid prompt ID"),
  name: z.string().min(1).max(255).optional(),
  prompt: z.string().optional(),
});

export type UpdatePromptInput = z.infer<typeof updatePromptSchema>;

// === Delete Prompt ===
export const deletePromptSchema = z.object({
  id: z.string().uuid("Invalid prompt ID"),
});

export type DeletePromptInput = z.infer<typeof deletePromptSchema>;

// === Page Review Settings Schema ===
export const pageReviewSettingsSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  model: z.string(),
  defaultPromptId: z.string().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type PageReviewSettings = z.infer<typeof pageReviewSettingsSchema>;

// === Create Page Review Settings ===
export const createPageReviewSettingsSchema = z.object({
  id: z.string().uuid("Invalid settings ID"),
  pageId: z.string().uuid("Invalid page ID"),
  model: z.string().default("openai-gpt-5.2-high"),
  defaultPromptId: z.string().uuid().nullable().optional(),
});

export type CreatePageReviewSettingsInput = z.infer<
  typeof createPageReviewSettingsSchema
>;

// === Update Page Review Settings ===
export const updatePageReviewSettingsSchema = z.object({
  pageId: z.string().uuid("Invalid page ID"),
  model: z.string().optional(),
  defaultPromptId: z.string().uuid().nullable().optional(),
});

export type UpdatePageReviewSettingsInput = z.infer<
  typeof updatePageReviewSettingsSchema
>;

// === Available AI Models ===
export const aiModels = [
  {
    id: "openai-gpt-5.2-xhigh",
    name: "OpenAI - GPT 5.2 xhigh",
    description: "Highest quality, slower",
  },
  {
    id: "openai-gpt-5.2-high",
    name: "OpenAI - GPT 5.2 high",
    description: "Balanced quality and speed",
  },
  {
    id: "anthropic-opus-4.5",
    name: "Anthropic - Opus 4.5",
    description: "Strong reasoning",
  },
] as const;

export type AIModelId = (typeof aiModels)[number]["id"];

// === Overall Review Mode ===
export const overallReviewModeSchema = z.enum([
  "all_prompts",
  "select_prompts",
  "custom",
]);

export type OverallReviewMode = z.infer<typeof overallReviewModeSchema>;

// === Page Overall Review Settings Schema ===
export const pageOverallReviewSettingsSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  mode: overallReviewModeSchema,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type PageOverallReviewSettings = z.infer<
  typeof pageOverallReviewSettingsSchema
>;

// === Page Overall Review Settings with Selected Prompts ===
export const pageOverallReviewSettingsWithPromptsSchema =
  pageOverallReviewSettingsSchema.extend({
    selectedPrompts: z.array(promptSchema),
  });

export type PageOverallReviewSettingsWithPrompts = z.infer<
  typeof pageOverallReviewSettingsWithPromptsSchema
>;

// === Update Page Overall Review Settings ===
export const updatePageOverallReviewSettingsSchema = z.object({
  pageId: z.string().uuid("Invalid page ID"),
  mode: overallReviewModeSchema.optional(),
  selectedPromptIds: z.array(z.string().uuid()).optional(),
});

export type UpdatePageOverallReviewSettingsInput = z.infer<
  typeof updatePageOverallReviewSettingsSchema
>;
