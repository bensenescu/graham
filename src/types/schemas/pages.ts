import { z } from "zod";

// === Create Page ===
export const createPageSchema = z.object({
  id: z.string().length(36), // expect uuid
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  content: z.string().default(""),
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
  content: z.string().optional(),
});

export type UpdatePageInput = z.infer<typeof updatePageSchema>;

// === Delete Page ===
export const deletePageSchema = z.object({
  id: z.string().uuid("Invalid page ID"),
});

export type DeletePageInput = z.infer<typeof deletePageSchema>;
