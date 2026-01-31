import { db } from "@/db";
import { pageReviewSettings } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { getAccessiblePageIdsForUser } from "./helpers/access";

type CreatePageReviewSettings = {
  id: string;
  pageId: string;
  model: string;
  defaultPromptId: string | null;
};

type UpdatePageReviewSettings = {
  model?: string;
  defaultPromptId?: string | null;
  updatedAt?: string;
};

/**
 * Find all review settings for pages accessible by a user (owned + shared).
 */
async function findAllByUserId(userId: string) {
  const pageIds = await getAccessiblePageIdsForUser(userId);

  if (pageIds.length === 0) {
    return [];
  }

  return db.query.pageReviewSettings.findMany({
    where: inArray(pageReviewSettings.pageId, pageIds),
  });
}

/**
 * Find review settings by page ID.
 */
async function findByPageId(pageId: string) {
  return db.query.pageReviewSettings.findFirst({
    where: eq(pageReviewSettings.pageId, pageId),
    with: {
      defaultPrompt: true,
    },
  });
}

/**
 * Create page review settings.
 */
async function create(data: CreatePageReviewSettings) {
  await db.insert(pageReviewSettings).values({
    id: data.id,
    pageId: data.pageId,
    model: data.model,
    defaultPromptId: data.defaultPromptId,
  });
}

/**
 * Update page review settings.
 */
async function update(
  pageId: string,
  userId: string,
  data: UpdatePageReviewSettings,
) {
  const accessiblePageIds = await getAccessiblePageIdsForUser(userId);

  if (accessiblePageIds.length === 0) {
    return;
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.model !== undefined) {
    updateData.model = data.model;
  }
  if (data.defaultPromptId !== undefined) {
    updateData.defaultPromptId = data.defaultPromptId;
  }

  await db
    .update(pageReviewSettings)
    .set(updateData)
    .where(
      and(
        eq(pageReviewSettings.pageId, pageId),
        inArray(pageReviewSettings.pageId, accessiblePageIds),
      ),
    );
}

/**
 * Upsert page review settings (create if not exists, update if exists).
 */
async function upsert(data: CreatePageReviewSettings, userId: string) {
  const existing = await findByPageId(data.pageId);
  if (existing) {
    await update(data.pageId, userId, {
      model: data.model,
      defaultPromptId: data.defaultPromptId,
    });
  } else {
    await create(data);
  }
}

/**
 * Delete page review settings.
 */
async function deleteByPageId(pageId: string, userId: string) {
  const accessiblePageIds = await getAccessiblePageIdsForUser(userId);

  if (accessiblePageIds.length === 0) {
    return;
  }

  await db
    .delete(pageReviewSettings)
    .where(
      and(
        eq(pageReviewSettings.pageId, pageId),
        inArray(pageReviewSettings.pageId, accessiblePageIds),
      ),
    );
}

export const PageReviewSettingsRepository = {
  findAllByUserId,
  findByPageId,
  create,
  update,
  upsert,
  delete: deleteByPageId,
} as const;
