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
import { z } from "zod";

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
    return PageService.delete(context.userId, data);
  });

// === Page Block Server Functions ===

export const getPageBlocks = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) =>
    z.object({ pageId: z.string().uuid() }).parse(data),
  )
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
