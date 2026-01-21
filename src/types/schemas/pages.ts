import { z } from "zod";

// === Q&A Block Schema ===
export const qaBlockSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  sortKey: z.string(),
});

export type QABlock = z.infer<typeof qaBlockSchema>;

// === Page Content Schema (JSON structure) ===
export const pageContentSchema = z.object({
  blocks: z.array(qaBlockSchema),
});

export type PageContent = z.infer<typeof pageContentSchema>;

// === Create Page ===
export const createPageSchema = z.object({
  id: z.string().length(36), // expect uuid
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  content: z.string().default(""), // JSON string of PageContent
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
  content: z.string().optional(), // JSON string of PageContent
});

export type UpdatePageInput = z.infer<typeof updatePageSchema>;

// === Delete Page ===
export const deletePageSchema = z.object({
  id: z.string().uuid("Invalid page ID"),
});

export type DeletePageInput = z.infer<typeof deletePageSchema>;

// === Helper functions ===

/**
 * Parse page content JSON string to PageContent object
 */
export function parsePageContent(content: string): PageContent {
  if (!content || content === "") {
    return { blocks: [] };
  }
  try {
    const parsed = JSON.parse(content);
    return pageContentSchema.parse(parsed);
  } catch {
    // If parsing fails, return empty blocks
    return { blocks: [] };
  }
}

/**
 * Stringify PageContent object to JSON string
 */
export function stringifyPageContent(content: PageContent): string {
  return JSON.stringify(content);
}
