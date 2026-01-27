import { z } from "zod";

// === Page Share Schema ===
export const pageShareSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  userId: z.string(),
  sharedBy: z.string(),
  createdAt: z.string().optional(),
});

export type PageShare = z.infer<typeof pageShareSchema>;

// === Page Share with User Info (for display) ===
export const pageShareWithUserSchema = pageShareSchema.extend({
  userEmail: z.string(),
});

export type PageShareWithUser = z.infer<typeof pageShareWithUserSchema>;

// === Add Page Share ===
export const addPageShareSchema = z.object({
  pageId: z.string().uuid("Invalid page ID"),
  userIds: z.array(z.string()).min(1, "At least one user must be selected"),
});

export type AddPageShareInput = z.infer<typeof addPageShareSchema>;

// === Remove Page Share ===
export const removePageShareSchema = z.object({
  pageId: z.string().uuid("Invalid page ID"),
  userId: z.string(),
});

export type RemovePageShareInput = z.infer<typeof removePageShareSchema>;

// === List Page Shares ===
export const listPageSharesSchema = z.object({
  pageId: z.string().uuid("Invalid page ID"),
});

export type ListPageSharesInput = z.infer<typeof listPageSharesSchema>;
