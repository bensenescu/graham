import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

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

// === Type Exports ===

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Page = typeof pages.$inferSelect;
export type NewPage = typeof pages.$inferInsert;

export type PageBlock = typeof pageBlocks.$inferSelect;
export type NewPageBlock = typeof pageBlocks.$inferInsert;
