import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@every-app/sdk/tanstack";
import { PromptService } from "@/server/services/PromptService";
import { PageReviewSettingsService } from "@/server/services/PageReviewSettingsService";
import { PageOverallReviewSettingsService } from "@/server/services/PageOverallReviewSettingsService";
import {
  createPromptSchema,
  updatePromptSchema,
  deletePromptSchema,
  createPageReviewSettingsSchema,
  updatePageReviewSettingsSchema,
  updatePageOverallReviewSettingsSchema,
} from "@/types/schemas/prompts";
import { pageIdInputSchema } from "@/types/schemas/common";

// === Prompt Server Functions ===

export const getAllPrompts = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    return PromptService.getAll(context.userId);
  });

export const createPrompt = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => createPromptSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PromptService.create(context.userId, data);
  });

export const updatePrompt = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => updatePromptSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PromptService.update(context.userId, data);
  });

export const deletePrompt = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => deletePromptSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PromptService.delete(context.userId, data);
  });

// === Page Review Settings Server Functions ===

export const getAllPageReviewSettings = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    return PageReviewSettingsService.getAll(context.userId);
  });

export const getPageReviewSettings = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => pageIdInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PageReviewSettingsService.getByPageId(context.userId, data.pageId);
  });

export const upsertPageReviewSettings = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => createPageReviewSettingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PageReviewSettingsService.upsert(context.userId, data);
  });

export const updatePageReviewSettings = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => updatePageReviewSettingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PageReviewSettingsService.update(context.userId, data);
  });

// === Page Overall Review Settings Server Functions ===

export const getAllPageOverallReviewSettings = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    return PageOverallReviewSettingsService.getAll(context.userId);
  });

export const getPageOverallReviewSettings = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => pageIdInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PageOverallReviewSettingsService.getByPageId(
      context.userId,
      data.pageId,
    );
  });

export const updatePageOverallReviewSettings = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    updatePageOverallReviewSettingsSchema.parse(data),
  )
  .handler(async ({ data, context }) => {
    return PageOverallReviewSettingsService.update(context.userId, data);
  });
