import { z } from "zod";

// === Block Review Schema (matches DB structure) ===
export const blockReviewSchema = z.object({
  id: z.string(),
  blockId: z.string(),
  promptId: z.string(),
  strengths: z.array(z.string()), // What's good about the answer (1 item)
  improvements: z.array(z.string()), // What could be improved (2 items)
  tips: z.array(z.string()).nullable(), // Additional suggestions (1 item, optional)
  answerSnapshot: z.string().nullable(), // Snapshot of answer at review time
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type BlockReview = z.infer<typeof blockReviewSchema>;

// === Create/Upsert Block Review ===
export const upsertBlockReviewSchema = z.object({
  id: z.string(),
  blockId: z.string(),
  promptId: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  tips: z.array(z.string()).nullable().optional(),
  answerSnapshot: z.string().nullable().optional(),
});

export type UpsertBlockReviewInput = z.infer<typeof upsertBlockReviewSchema>;

// === Review Summary Schema (for overall page review) ===
export const reviewSummarySchema = z.object({
  pageId: z.string(),
  reviewedCount: z.number(),
  totalCount: z.number(),
  updatedAt: z.string(),
});

export type ReviewSummary = z.infer<typeof reviewSummarySchema>;

// === API Response from review endpoint ===
export const reviewAPIResponseSchema = z.object({
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  tips: z.array(z.string()).optional(),
});

export type ReviewAPIResponse = z.infer<typeof reviewAPIResponseSchema>;

// === Page Overall Review Schema (narrative summary for entire page) ===
export const pageOverallReviewSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  promptId: z.string().nullable(), // which prompt was used (null for custom)
  customPrompt: z.string().nullable(), // if custom prompt was used
  summary: z.string(), // the narrative summary from LLM
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type PageOverallReview = z.infer<typeof pageOverallReviewSchema>;

// === Upsert Page Overall Review ===
export const upsertPageOverallReviewSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  promptId: z.string().nullable().optional(),
  customPrompt: z.string().nullable().optional(),
  summary: z.string(),
});

export type UpsertPageOverallReviewInput = z.infer<
  typeof upsertPageOverallReviewSchema
>;

// === API Response from overall review endpoint ===
export const overallReviewAPIResponseSchema = z.object({
  summary: z.string(),
});

export type OverallReviewAPIResponse = z.infer<
  typeof overallReviewAPIResponseSchema
>;
