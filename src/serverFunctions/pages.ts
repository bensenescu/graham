import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@every-app/sdk/tanstack";
import { PageService } from "@/server/services/PageService";
import {
  createPageSchema,
  updatePageSchema,
  deletePageSchema,
} from "@/types/schemas/pages";

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
