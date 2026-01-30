import { db } from "@/db";
import {
  pageOverallReviewSettings,
  pageOverallReviewSelectedPrompts,
  pages,
  pageShares,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import type { OverallReviewMode } from "@/types/schemas/prompts";

type CreatePageOverallReviewSettings = {
  id: string;
  pageId: string;
  mode: OverallReviewMode;
  selectedPromptIds: string[];
};

type UpdatePageOverallReviewSettings = {
  mode?: OverallReviewMode;
  selectedPromptIds?: string[];
};

/**
 * Find all overall review settings for pages accessible by a user (owned + shared).
 */
async function findAllByUserId(userId: string) {
  // Get all page IDs for pages the user owns
  const userPages = await db.query.pages.findMany({
    where: eq(pages.userId, userId),
    columns: { id: true },
  });

  // Get all page IDs for pages shared with the user
  const sharedPageRecords = await db.query.pageShares.findMany({
    where: eq(pageShares.userId, userId),
    columns: { pageId: true },
  });

  const ownedIds = userPages.map((p) => p.id);
  const sharedIds = sharedPageRecords.map((s) => s.pageId);
  const pageIds = [...new Set([...ownedIds, ...sharedIds])];

  if (pageIds.length === 0) {
    return [];
  }

  const settingsList = await db.query.pageOverallReviewSettings.findMany({
    where: inArray(pageOverallReviewSettings.pageId, pageIds),
    with: {
      selectedPrompts: {
        with: {
          prompt: true,
        },
      },
    },
  });

  // Transform to flatten the selected prompts
  return settingsList.map((settings) => ({
    ...settings,
    selectedPrompts: settings.selectedPrompts.map((sp) => sp.prompt),
  }));
}

/**
 * Find overall review settings by page ID, including selected prompts.
 */
async function findByPageId(pageId: string) {
  const settings = await db.query.pageOverallReviewSettings.findFirst({
    where: eq(pageOverallReviewSettings.pageId, pageId),
    with: {
      selectedPrompts: {
        with: {
          prompt: true,
        },
      },
    },
  });

  if (!settings) {
    return null;
  }

  // Transform to flatten the selected prompts
  return {
    ...settings,
    selectedPrompts: settings.selectedPrompts.map((sp) => sp.prompt),
  };
}

/**
 * Create overall review settings with selected prompts.
 */
async function create(data: CreatePageOverallReviewSettings) {
  const settingsId = crypto.randomUUID();

  // Insert the settings
  await db.insert(pageOverallReviewSettings).values({
    id: settingsId,
    pageId: data.pageId,
    mode: data.mode,
  });

  // Insert selected prompts if any
  if (data.selectedPromptIds.length > 0) {
    await db.insert(pageOverallReviewSelectedPrompts).values(
      data.selectedPromptIds.map((promptId) => ({
        id: crypto.randomUUID(),
        pageOverallReviewSettingsId: settingsId,
        promptId,
      })),
    );
  }

  return settingsId;
}

/**
 * Update overall review settings.
 */
async function update(pageId: string, data: UpdatePageOverallReviewSettings) {
  // First, get the existing settings to get the ID
  const existing = await db.query.pageOverallReviewSettings.findFirst({
    where: eq(pageOverallReviewSettings.pageId, pageId),
  });

  if (!existing) {
    throw new Error("Settings not found");
  }

  // Update the settings
  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (data.mode !== undefined) {
    updateData.mode = data.mode;
  }

  await db
    .update(pageOverallReviewSettings)
    .set(updateData)
    .where(eq(pageOverallReviewSettings.pageId, pageId));

  // Update selected prompts if provided
  if (data.selectedPromptIds !== undefined) {
    // Delete existing selected prompts
    await db
      .delete(pageOverallReviewSelectedPrompts)
      .where(
        eq(
          pageOverallReviewSelectedPrompts.pageOverallReviewSettingsId,
          existing.id,
        ),
      );

    // Insert new selected prompts
    if (data.selectedPromptIds.length > 0) {
      await db.insert(pageOverallReviewSelectedPrompts).values(
        data.selectedPromptIds.map((promptId) => ({
          id: crypto.randomUUID(),
          pageOverallReviewSettingsId: existing.id,
          promptId,
        })),
      );
    }
  }
}

/**
 * Upsert overall review settings (create if not exists, update if exists).
 */
async function upsert(data: CreatePageOverallReviewSettings) {
  const existing = await db.query.pageOverallReviewSettings.findFirst({
    where: eq(pageOverallReviewSettings.pageId, data.pageId),
  });

  if (existing) {
    await update(data.pageId, {
      mode: data.mode,
      selectedPromptIds: data.selectedPromptIds,
    });
    return existing.id;
  } else {
    return await create(data);
  }
}

/**
 * Delete overall review settings by page ID.
 */
async function deleteByPageId(pageId: string) {
  // The junction table entries will be deleted automatically due to CASCADE
  await db
    .delete(pageOverallReviewSettings)
    .where(eq(pageOverallReviewSettings.pageId, pageId));
}

export const PageOverallReviewSettingsRepository = {
  findAllByUserId,
  findByPageId,
  create,
  update,
  upsert,
  delete: deleteByPageId,
} as const;
