import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@every-app/sdk/tanstack";
import { PageService } from "@/server/services/PageService";
import { PageBlockService } from "@/server/services/PageBlockService";
import {
  createPageSchema,
  updatePageSchema,
  deletePageSchema,
  createPageBlockSchema,
  updatePageBlockSchema,
  deletePageBlockSchema,
  batchCreatePageBlocksSchema,
} from "@/types/schemas/pages";
import { pageIdInputSchema } from "@/types/schemas/common";
import { env } from "cloudflare:workers";

export const getAllPages = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    return PageService.getAll(context.userId);
  });

export const createPage = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => createPageSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PageService.create(context.userId, data);
  });

export const updatePage = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => updatePageSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PageService.update(context.userId, data);
  });

export const deletePage = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => deletePageSchema.parse(data))
  .handler(async ({ data, context }) => {
    // Delete the page from DB
    const result = await PageService.delete(context.userId, data);

    // Clear collaboration state from Durable Object
    try {
      const doId = env.PAGE_COLLAB_DO.idFromName(`page-${data.id}`);
      const doStub = env.PAGE_COLLAB_DO.get(doId);
      await doStub.fetch(
        new Request("https://do/delete", { method: "DELETE" }),
      );
    } catch (error) {
      // Log but don't fail the deletion if collab cleanup fails
      console.error("Failed to clear collab state:", error);
    }

    return result;
  });

// === Page Block Server Functions ===

export const getAllPageBlocks = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    return PageBlockService.getAll(context.userId);
  });

export const getPageBlocks = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => pageIdInputSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PageBlockService.getAllByPageId(context.userId, data.pageId);
  });

export const createPageBlock = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => createPageBlockSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PageBlockService.create(context.userId, data);
  });

export const batchCreatePageBlocks = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => batchCreatePageBlocksSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PageBlockService.batchCreate(context.userId, data);
  });

export const updatePageBlock = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => updatePageBlockSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PageBlockService.update(context.userId, data);
  });

export const deletePageBlock = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => deletePageBlockSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PageBlockService.delete(context.userId, data);
  });
