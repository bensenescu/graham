import { z } from "zod";

// === Grade enum ===
export const gradeSchema = z.enum(["A", "B", "C", "D", "F"]);
export type Grade = z.infer<typeof gradeSchema>;

// === Review status ===
export const reviewStatusSchema = z.enum([
  "pending",
  "loading",
  "completed",
  "error",
]);
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

// === AI Review Schema ===
export const aiReviewSchema = z.object({
  id: z.string(),
  blockId: z.string(), // Links to PageBlock
  grade: gradeSchema,
  score: z.number().min(0).max(100),
  strengths: z.array(z.string()), // What's good about the answer
  improvements: z.array(z.string()), // What could be improved
  tips: z.array(z.string()).optional(), // Additional suggestions
  status: reviewStatusSchema.default("completed"),
  createdAt: z.string(),
  model: z.string().optional(), // Which AI model was used
  error: z.string().optional(), // Error message if status is "error"
});

export type AIReview = z.infer<typeof aiReviewSchema>;

// === Review Summary Schema (for overall page review) ===
export const reviewSummarySchema = z.object({
  pageId: z.string(),
  overallGrade: gradeSchema,
  overallScore: z.number().min(0).max(100),
  reviewedCount: z.number(),
  totalCount: z.number(),
  updatedAt: z.string(),
});

export type ReviewSummary = z.infer<typeof reviewSummarySchema>;

// === Request to review a single block ===
export const reviewBlockRequestSchema = z.object({
  blockId: z.string(),
  question: z.string(),
  answer: z.string(),
});

export type ReviewBlockRequest = z.infer<typeof reviewBlockRequestSchema>;

// === Request to review all blocks ===
export const reviewAllRequestSchema = z.object({
  pageId: z.string(),
  blocks: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      answer: z.string(),
    }),
  ),
});

export type ReviewAllRequest = z.infer<typeof reviewAllRequestSchema>;
