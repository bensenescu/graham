import { sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

// === AI Review Prompts ===

// Prompts table (global prompts shared across all pages)
export const prompts = sqliteTable(
  "prompts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    prompt: text("prompt").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index("prompts_user_id_idx").on(table.userId)],
);

// Page Review Settings table (per-page configuration)
export const pageReviewSettings = sqliteTable("page_review_settings", {
  id: text("id").primaryKey(),
  pageId: text("page_id")
    .notNull()
    .unique()
    .references(() => pages.id, { onDelete: "cascade" }),
  model: text("model").notNull().default("openai-gpt-5.2-high"),
  defaultPromptId: text("default_prompt_id").references(() => prompts.id, {
    onDelete: "set null",
  }),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// Users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// Pages table
export const pages = sqliteTable(
  "pages",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index("pages_user_id_idx").on(table.userId)],
);

// Page Blocks table (normalized Q&A blocks)
export const pageBlocks = sqliteTable(
  "page_blocks",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    answer: text("answer").notNull().default(""),
    sortKey: text("sort_key").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index("page_blocks_page_id_idx").on(table.pageId)],
);

// Overall Review Settings table (per-page configuration for overall page review)
export const pageOverallReviewSettings = sqliteTable(
  "page_overall_review_settings",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .unique()
      .references(() => pages.id, { onDelete: "cascade" }),
    mode: text("mode").notNull().default("all_prompts"), // "all_prompts" | "select_prompts" | "custom"
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
);

// Junction table for selected prompts in overall review (enforces FK constraints)
export const pageOverallReviewSelectedPrompts = sqliteTable(
  "page_overall_review_selected_prompts",
  {
    id: text("id").primaryKey(),
    pageOverallReviewSettingsId: text("page_overall_review_settings_id")
      .notNull()
      .references(() => pageOverallReviewSettings.id, { onDelete: "cascade" }),
    promptId: text("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("pors_settings_id_idx").on(table.pageOverallReviewSettingsId),
    index("pors_prompt_id_idx").on(table.promptId),
  ],
);

// Page Overall Reviews table (AI-generated narrative summary for entire page)
export const pageOverallReviews = sqliteTable("page_overall_reviews", {
  id: text("id").primaryKey(),
  pageId: text("page_id")
    .notNull()
    .unique()
    .references(() => pages.id, { onDelete: "cascade" }),
  promptId: text("prompt_id").references(() => prompts.id, {
    onDelete: "set null",
  }), // which prompt was used
  summary: text("summary").notNull(), // the narrative summary from LLM
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// Block Reviews table (AI-generated reviews for each block/prompt combination)
export const blockReviews = sqliteTable(
  "block_reviews",
  {
    id: text("id").primaryKey(),
    blockId: text("block_id")
      .notNull()
      .references(() => pageBlocks.id, { onDelete: "cascade" }),
    promptId: text("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    suggestion: text("suggestion"), // Markdown feedback, nullable (null = no suggestions)
    answerSnapshot: text("answer_snapshot"), // Snapshot of answer at review time
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("block_reviews_block_id_idx").on(table.blockId),
    // Unique constraint for upsert: one review per block per prompt
    uniqueIndex("block_reviews_block_prompt_idx").on(
      table.blockId,
      table.promptId,
    ),
  ],
);

// === Practice Mode Tables ===

// Practice Criteria table (user-defined rating criteria)
export const practiceCriteria = sqliteTable(
  "practice_criteria",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g., "Confidence", "Completeness", "Answer Quality"
    sortOrder: text("sort_order").notNull(), // fractional indexing for ordering
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index("practice_criteria_user_id_idx").on(table.userId)],
);

// Practice Pool Settings table (per-page configuration for which questions to practice)
export const practicePoolSettings = sqliteTable("practice_pool_settings", {
  id: text("id").primaryKey(),
  pageId: text("page_id")
    .notNull()
    .unique()
    .references(() => pages.id, { onDelete: "cascade" }),
  mode: text("mode").notNull().default("all"), // "all" | "selected" | "low_rated"
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// Practice Pool Blocks table (selected blocks for "selected" mode)
export const practicePoolBlocks = sqliteTable(
  "practice_pool_blocks",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    blockId: text("block_id")
      .notNull()
      .references(() => pageBlocks.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("practice_pool_blocks_page_id_idx").on(table.pageId),
    uniqueIndex("practice_pool_blocks_page_block_idx").on(
      table.pageId,
      table.blockId,
    ),
  ],
);

// Practice Sessions table (a single practice session)
export const practiceSessions = sqliteTable(
  "practice_sessions",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"), // "active" | "reviewing" | "completed" | "abandoned"
    startedAt: text("started_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    completedAt: text("completed_at"), // null until session is completed
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index("practice_sessions_page_id_idx").on(table.pageId)],
);

// Practice Answers table (recorded answers within a session)
export const practiceAnswers = sqliteTable(
  "practice_answers",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => practiceSessions.id, { onDelete: "cascade" }),
    blockId: text("block_id")
      .notNull()
      .references(() => pageBlocks.id, { onDelete: "cascade" }),
    durationSeconds: text("duration_seconds").notNull(), // how long the recording was
    transcription: text("transcription"), // null until transcribed
    transcriptionStatus: text("transcription_status")
      .notNull()
      .default("pending"), // "pending" | "processing" | "completed" | "failed"
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("practice_answers_session_id_idx").on(table.sessionId),
    index("practice_answers_block_id_idx").on(table.blockId),
  ],
);

// Practice Answer Ratings table (self-ratings for each answer/criterion)
export const practiceAnswerRatings = sqliteTable(
  "practice_answer_ratings",
  {
    id: text("id").primaryKey(),
    answerId: text("answer_id")
      .notNull()
      .references(() => practiceAnswers.id, { onDelete: "cascade" }),
    criterionId: text("criterion_id")
      .notNull()
      .references(() => practiceCriteria.id, { onDelete: "cascade" }),
    rating: text("rating").notNull(), // "1" | "2" | "3" (Needs Work | OK | Great)
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("practice_answer_ratings_answer_id_idx").on(table.answerId),
    uniqueIndex("practice_answer_ratings_answer_criterion_idx").on(
      table.answerId,
      table.criterionId,
    ),
  ],
);

// === Page Sharing ===

// Page Shares table (collaborators who have access to a page)
export const pageShares = sqliteTable(
  "page_shares",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sharedBy: text("shared_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("page_shares_page_id_idx").on(table.pageId),
    index("page_shares_user_id_idx").on(table.userId),
    uniqueIndex("page_shares_page_user_idx").on(table.pageId, table.userId),
  ],
);

// === Relations ===

export const usersRelations = relations(users, ({ many }) => ({
  pages: many(pages),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  user: one(users, {
    fields: [pages.userId],
    references: [users.id],
  }),
  blocks: many(pageBlocks),
}));

export const pageBlocksRelations = relations(pageBlocks, ({ one, many }) => ({
  page: one(pages, {
    fields: [pageBlocks.pageId],
    references: [pages.id],
  }),
  reviews: many(blockReviews),
}));

export const blockReviewsRelations = relations(blockReviews, ({ one }) => ({
  block: one(pageBlocks, {
    fields: [blockReviews.blockId],
    references: [pageBlocks.id],
  }),
  prompt: one(prompts, {
    fields: [blockReviews.promptId],
    references: [prompts.id],
  }),
}));

export const promptsRelations = relations(prompts, ({ one }) => ({
  user: one(users, {
    fields: [prompts.userId],
    references: [users.id],
  }),
}));

export const pageReviewSettingsRelations = relations(
  pageReviewSettings,
  ({ one }) => ({
    page: one(pages, {
      fields: [pageReviewSettings.pageId],
      references: [pages.id],
    }),
    defaultPrompt: one(prompts, {
      fields: [pageReviewSettings.defaultPromptId],
      references: [prompts.id],
    }),
  }),
);

export const pageOverallReviewSettingsRelations = relations(
  pageOverallReviewSettings,
  ({ one, many }) => ({
    page: one(pages, {
      fields: [pageOverallReviewSettings.pageId],
      references: [pages.id],
    }),
    selectedPrompts: many(pageOverallReviewSelectedPrompts),
  }),
);

export const pageOverallReviewSelectedPromptsRelations = relations(
  pageOverallReviewSelectedPrompts,
  ({ one }) => ({
    settings: one(pageOverallReviewSettings, {
      fields: [pageOverallReviewSelectedPrompts.pageOverallReviewSettingsId],
      references: [pageOverallReviewSettings.id],
    }),
    prompt: one(prompts, {
      fields: [pageOverallReviewSelectedPrompts.promptId],
      references: [prompts.id],
    }),
  }),
);

export const pageOverallReviewsRelations = relations(
  pageOverallReviews,
  ({ one }) => ({
    page: one(pages, {
      fields: [pageOverallReviews.pageId],
      references: [pages.id],
    }),
    prompt: one(prompts, {
      fields: [pageOverallReviews.promptId],
      references: [prompts.id],
    }),
  }),
);

// === Practice Mode Relations ===

export const practiceCriteriaRelations = relations(
  practiceCriteria,
  ({ one }) => ({
    user: one(users, {
      fields: [practiceCriteria.userId],
      references: [users.id],
    }),
  }),
);

export const practicePoolSettingsRelations = relations(
  practicePoolSettings,
  ({ one }) => ({
    page: one(pages, {
      fields: [practicePoolSettings.pageId],
      references: [pages.id],
    }),
  }),
);

export const practicePoolBlocksRelations = relations(
  practicePoolBlocks,
  ({ one }) => ({
    page: one(pages, {
      fields: [practicePoolBlocks.pageId],
      references: [pages.id],
    }),
    block: one(pageBlocks, {
      fields: [practicePoolBlocks.blockId],
      references: [pageBlocks.id],
    }),
  }),
);

export const practiceSessionsRelations = relations(
  practiceSessions,
  ({ one, many }) => ({
    page: one(pages, {
      fields: [practiceSessions.pageId],
      references: [pages.id],
    }),
    answers: many(practiceAnswers),
  }),
);

export const practiceAnswersRelations = relations(
  practiceAnswers,
  ({ one, many }) => ({
    session: one(practiceSessions, {
      fields: [practiceAnswers.sessionId],
      references: [practiceSessions.id],
    }),
    block: one(pageBlocks, {
      fields: [practiceAnswers.blockId],
      references: [pageBlocks.id],
    }),
    ratings: many(practiceAnswerRatings),
  }),
);

export const practiceAnswerRatingsRelations = relations(
  practiceAnswerRatings,
  ({ one }) => ({
    answer: one(practiceAnswers, {
      fields: [practiceAnswerRatings.answerId],
      references: [practiceAnswers.id],
    }),
    criterion: one(practiceCriteria, {
      fields: [practiceAnswerRatings.criterionId],
      references: [practiceCriteria.id],
    }),
  }),
);

// === Page Sharing Relations ===

export const pageSharesRelations = relations(pageShares, ({ one }) => ({
  page: one(pages, {
    fields: [pageShares.pageId],
    references: [pages.id],
  }),
  user: one(users, {
    fields: [pageShares.userId],
    references: [users.id],
  }),
  sharedByUser: one(users, {
    fields: [pageShares.sharedBy],
    references: [users.id],
  }),
}));

// === Type Exports ===

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;

export type PageBlock = typeof pageBlocks.$inferSelect;
export type NewPageBlock = typeof pageBlocks.$inferInsert;

export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;

export type PageReviewSettings = typeof pageReviewSettings.$inferSelect;
export type NewPageReviewSettings = typeof pageReviewSettings.$inferInsert;

export type BlockReview = typeof blockReviews.$inferSelect;
export type NewBlockReview = typeof blockReviews.$inferInsert;

export type PageOverallReviewSettings =
  typeof pageOverallReviewSettings.$inferSelect;
export type NewPageOverallReviewSettings =
  typeof pageOverallReviewSettings.$inferInsert;

export type PageOverallReviewSelectedPrompt =
  typeof pageOverallReviewSelectedPrompts.$inferSelect;
export type NewPageOverallReviewSelectedPrompt =
  typeof pageOverallReviewSelectedPrompts.$inferInsert;

export type PageOverallReview = typeof pageOverallReviews.$inferSelect;
export type NewPageOverallReview = typeof pageOverallReviews.$inferInsert;

// Practice Mode Types
export type PracticeCriterion = typeof practiceCriteria.$inferSelect;
export type NewPracticeCriterion = typeof practiceCriteria.$inferInsert;

export type PracticePoolSetting = typeof practicePoolSettings.$inferSelect;
export type NewPracticePoolSetting = typeof practicePoolSettings.$inferInsert;

export type PracticePoolBlock = typeof practicePoolBlocks.$inferSelect;
export type NewPracticePoolBlock = typeof practicePoolBlocks.$inferInsert;

export type PracticeSession = typeof practiceSessions.$inferSelect;
export type NewPracticeSession = typeof practiceSessions.$inferInsert;

export type PracticeAnswer = typeof practiceAnswers.$inferSelect;
export type NewPracticeAnswer = typeof practiceAnswers.$inferInsert;

export type PracticeAnswerRating = typeof practiceAnswerRatings.$inferSelect;
export type NewPracticeAnswerRating = typeof practiceAnswerRatings.$inferInsert;

// Page Sharing Types
export type PageShare = typeof pageShares.$inferSelect;
export type NewPageShare = typeof pageShares.$inferInsert;
