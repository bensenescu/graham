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
