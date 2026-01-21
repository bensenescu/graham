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
export const pageReviewSettings = sqliteTable(
  "page_review_settings",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .unique()
      .references(() => pages.id, { onDelete: "cascade" }),
    model: text("model").notNull().default("openai-gpt-5.2-high"),
    defaultPromptId: text("default_prompt_id").references(() => prompts.id, {
      onDelete: "set null",
    }),
    customPromptIds: text("custom_prompt_ids").notNull().default("[]"), // JSON array of prompt IDs
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [index("page_review_settings_page_id_idx").on(table.pageId)],
);

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
    customPrompt: text("custom_prompt"), // used when mode is "custom"
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    index("page_overall_review_settings_page_id_idx").on(table.pageId),
  ],
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
    strengths: text("strengths").notNull(), // JSON array
    improvements: text("improvements").notNull(), // JSON array
    tips: text("tips"), // JSON array, nullable
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
