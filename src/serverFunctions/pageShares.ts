import { createServerFn } from "@tanstack/react-start";
import { ensureUserMiddleware } from "@/middleware/ensureUser";
import { useSessionTokenClientMiddleware } from "@every-app/sdk/tanstack";
import { PageShareService } from "@/server/services/PageShareService";
import {
  addPageShareSchema,
  removePageShareSchema,
  listPageSharesSchema,
} from "@/types/schemas/pageShares";

/**
 * Get all shares for a page (only owner can see).
 */
export const getPageShares = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => listPageSharesSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PageShareService.getSharesForPage(context.userId, data);
  });

/**
 * Add collaborators to a page.
 */
export const addPageShares = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => addPageShareSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PageShareService.addShares(context.userId, data);
  });

/**
 * Remove a collaborator from a page.
 */
export const removePageShare = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => removePageShareSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PageShareService.removeShare(context.userId, data);
  });

/**
 * Get all pages shared with the current user.
 */
export const getSharedPages = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    return PageShareService.getSharedPages(context.userId);
  });

/**
 * Get all users in the workspace (for the sharing dropdown).
 */
export const getWorkspaceUsers = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .handler(async ({ context }) => {
    return PageShareService.getAllUsers(context.userId);
  });

/**
 * Check if current user has access to a page and whether they're the owner.
 */
export const checkPageAccess = createServerFn()
  .middleware([useSessionTokenClientMiddleware, ensureUserMiddleware])
  .inputValidator((data: unknown) => listPageSharesSchema.parse(data))
  .handler(async ({ data, context }) => {
    return PageShareService.checkAccess(data.pageId, context.userId);
  });
