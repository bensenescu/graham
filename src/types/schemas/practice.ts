import { z } from "zod";

// === Practice Criterion ===
export const practiceCriterionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  sortOrder: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type PracticeCriterion = z.infer<typeof practiceCriterionSchema>;

// === Practice Pool Settings ===
export const practicePoolModeSchema = z.enum(["all", "selected", "low_rated"]);
export type PracticePoolMode = z.infer<typeof practicePoolModeSchema>;

export const practicePoolSettingsSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  mode: practicePoolModeSchema,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type PracticePoolSettings = z.infer<typeof practicePoolSettingsSchema>;

// === Practice Pool Block ===
export const practicePoolBlockSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  blockId: z.string(),
  createdAt: z.string().optional(),
});

export type PracticePoolBlock = z.infer<typeof practicePoolBlockSchema>;

// === Practice Session ===
export const practiceSessionStatusSchema = z.enum([
  "active",
  "reviewing",
  "completed",
  "abandoned",
]);
export type PracticeSessionStatus = z.infer<typeof practiceSessionStatusSchema>;

export const practiceSessionSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  status: practiceSessionStatusSchema,
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type PracticeSession = z.infer<typeof practiceSessionSchema>;

// === Practice Answer ===
export const transcriptionStatusSchema = z.enum([
  "pending",
  "completed",
  "failed",
]);
export type TranscriptionStatus = z.infer<typeof transcriptionStatusSchema>;

export const practiceAnswerSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  blockId: z.string(),
  transcription: z.string().nullable(),
  transcriptionStatus: transcriptionStatusSchema,
  durationSeconds: z.string(), // stored as text in SQLite
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type PracticeAnswer = z.infer<typeof practiceAnswerSchema>;

// === Practice Answer Rating ===
export const ratingValueSchema = z.enum(["1", "2", "3"]); // Needs Work, OK, Great
export type RatingValue = z.infer<typeof ratingValueSchema>;

export const practiceAnswerRatingSchema = z.object({
  id: z.string(),
  answerId: z.string(),
  criterionId: z.string(),
  rating: ratingValueSchema,
  createdAt: z.string().optional(),
});

export type PracticeAnswerRating = z.infer<typeof practiceAnswerRatingSchema>;

// === Input Schemas ===

// Create Practice Criterion
export const createPracticeCriterionSchema = z.object({
  id: z.string().uuid("Invalid criterion ID"),
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  sortOrder: z.string(),
});

export type CreatePracticeCriterionInput = z.infer<
  typeof createPracticeCriterionSchema
>;

// Update Practice Criterion
export const updatePracticeCriterionSchema = z.object({
  id: z.string().uuid("Invalid criterion ID"),
  name: z.string().min(1).max(100).optional(),
  sortOrder: z.string().optional(),
});

export type UpdatePracticeCriterionInput = z.infer<
  typeof updatePracticeCriterionSchema
>;

// Delete Practice Criterion
export const deletePracticeCriterionSchema = z.object({
  id: z.string().uuid("Invalid criterion ID"),
});

export type DeletePracticeCriterionInput = z.infer<
  typeof deletePracticeCriterionSchema
>;

// Update Practice Pool Settings
export const updatePracticePoolSettingsSchema = z.object({
  pageId: z.string().uuid("Invalid page ID"),
  mode: practicePoolModeSchema,
  selectedBlockIds: z.array(z.string().uuid()).optional(), // for "selected" mode
});

export type UpdatePracticePoolSettingsInput = z.infer<
  typeof updatePracticePoolSettingsSchema
>;

// Create Practice Session
export const createPracticeSessionSchema = z.object({
  id: z.string().uuid("Invalid session ID"),
  pageId: z.string().uuid("Invalid page ID"),
});

export type CreatePracticeSessionInput = z.infer<
  typeof createPracticeSessionSchema
>;

// Update Practice Session
export const updatePracticeSessionSchema = z.object({
  id: z.string().uuid("Invalid session ID"),
  status: practiceSessionStatusSchema.optional(),
  completedAt: z.string().nullable().optional(),
});

export type UpdatePracticeSessionInput = z.infer<
  typeof updatePracticeSessionSchema
>;

// Create Practice Answer
export const createPracticeAnswerSchema = z.object({
  id: z.string().uuid("Invalid answer ID"),
  sessionId: z.string().uuid("Invalid session ID"),
  blockId: z.string().uuid("Invalid block ID"),
  durationSeconds: z.number().int().positive(),
});

export type CreatePracticeAnswerInput = z.infer<
  typeof createPracticeAnswerSchema
>;

// Update Practice Answer (for transcription)
export const updatePracticeAnswerSchema = z.object({
  id: z.string().uuid("Invalid answer ID"),
  transcription: z.string().nullable().optional(),
  transcriptionStatus: transcriptionStatusSchema.optional(),
});

export type UpdatePracticeAnswerInput = z.infer<
  typeof updatePracticeAnswerSchema
>;

// Delete Practice Answer (for re-recording)
export const deletePracticeAnswerSchema = z.object({
  id: z.string().uuid("Invalid answer ID"),
});

export type DeletePracticeAnswerInput = z.infer<
  typeof deletePracticeAnswerSchema
>;

// Create Practice Answer Rating
export const createPracticeAnswerRatingSchema = z.object({
  id: z.string().uuid("Invalid rating ID"),
  answerId: z.string().uuid("Invalid answer ID"),
  criterionId: z.string().uuid("Invalid criterion ID"),
  rating: ratingValueSchema,
});

export type CreatePracticeAnswerRatingInput = z.infer<
  typeof createPracticeAnswerRatingSchema
>;

// Batch Create Ratings (for saving all ratings at once)
export const batchCreatePracticeAnswerRatingsSchema = z.object({
  answerId: z.string().uuid("Invalid answer ID"),
  ratings: z.array(
    z.object({
      id: z.string().uuid("Invalid rating ID"),
      criterionId: z.string().uuid("Invalid criterion ID"),
      rating: ratingValueSchema,
    }),
  ),
});

export type BatchCreatePracticeAnswerRatingsInput = z.infer<
  typeof batchCreatePracticeAnswerRatingsSchema
>;

// === Extended Types (with relations) ===

export type PracticeAnswerWithRatings = PracticeAnswer & {
  ratings: PracticeAnswerRating[];
};

export type PracticeSessionWithAnswers = PracticeSession & {
  answers: PracticeAnswerWithRatings[];
};

// For displaying question stats
export type QuestionPracticeStats = {
  blockId: string;
  question: string;
  practiceCount: number;
  averageRatings: Record<string, number>; // criterionId -> average
  lastPracticedAt: string | null;
};
