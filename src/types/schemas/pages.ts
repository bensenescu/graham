import { z } from "zod";

// === Page Block Schema (normalized - stored in page_blocks table) ===
export const pageBlockSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  question: z.string(),
  answer: z.string(),
  sortKey: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type PageBlock = z.infer<typeof pageBlockSchema>;

// === Create Page ===
export const createPageSchema = z.object({
  id: z.string().uuid("Invalid page ID"),
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
});

export type CreatePageInput = z.infer<typeof createPageSchema>;

// === Update Page ===
export const updatePageSchema = z.object({
  id: z.string().uuid("Invalid page ID"),
  title: z
    .string()
    .min(1, "Title is required")
    .max(255, "Title too long")
    .optional(),
});

export type UpdatePageInput = z.infer<typeof updatePageSchema>;

// === Delete Page ===
export const deletePageSchema = z.object({
  id: z.string().uuid("Invalid page ID"),
});

export type DeletePageInput = z.infer<typeof deletePageSchema>;

// === Create Page Block ===
export const createPageBlockSchema = z.object({
  id: z.string().uuid("Invalid block ID"),
  pageId: z.string().uuid("Invalid page ID"),
  question: z.string(),
  answer: z.string().default(""),
  sortKey: z.string(),
});

export type CreatePageBlockInput = z.infer<typeof createPageBlockSchema>;

// === Update Page Block ===
export const updatePageBlockSchema = z.object({
  id: z.string().uuid("Invalid block ID"),
  question: z.string().optional(),
  answer: z.string().optional(),
  sortKey: z.string().optional(),
});

export type UpdatePageBlockInput = z.infer<typeof updatePageBlockSchema>;

// === Delete Page Block ===
export const deletePageBlockSchema = z.object({
  id: z.string().uuid("Invalid block ID"),
});

export type DeletePageBlockInput = z.infer<typeof deletePageBlockSchema>;

// === Batch Create Page Blocks (for template creation) ===
export const batchCreatePageBlocksSchema = z.object({
  pageId: z.string().uuid("Invalid page ID"),
  blocks: z.array(
    z.object({
      id: z.string().uuid("Invalid block ID"),
      question: z.string(),
      answer: z.string().default(""),
      sortKey: z.string(),
    }),
  ),
});

export type BatchCreatePageBlocksInput = z.infer<
  typeof batchCreatePageBlocksSchema
>;
