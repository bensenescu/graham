import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
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

export const pageBlocksRelations = relations(pageBlocks, ({ one }) => ({
  page: one(pages, {
    fields: [pageBlocks.pageId],
    references: [pages.id],
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
