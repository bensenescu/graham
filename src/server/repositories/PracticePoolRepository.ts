import { db } from "@/db";
import { practicePoolSettings, practicePoolBlocks } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { getAccessiblePageIdsForUser } from "./helpers/access";

export async function findPoolSettingsByPageId(pageId: string, userId: string) {
  const pageIds = await getAccessiblePageIdsForUser(userId);

  if (pageIds.length === 0) {
    return null;
  }

  return db.query.practicePoolSettings.findFirst({
    where: and(
      eq(practicePoolSettings.pageId, pageId),
      inArray(practicePoolSettings.pageId, pageIds),
    ),
  });
}

export async function upsertPoolSettings(
  data: {
    id: string;
    pageId: string;
    mode: string;
  },
  userId: string,
) {
  const pageIds = await getAccessiblePageIdsForUser(userId);

  if (!pageIds.includes(data.pageId)) {
    return;
  }

  await db
    .insert(practicePoolSettings)
    .values(data)
    .onConflictDoUpdate({
      target: practicePoolSettings.pageId,
      set: {
        mode: data.mode,
        updatedAt: new Date().toISOString(),
      },
    });
}

export async function findPoolBlocksByPageId(pageId: string, userId: string) {
  const pageIds = await getAccessiblePageIdsForUser(userId);

  if (pageIds.length === 0) {
    return [];
  }

  return db.query.practicePoolBlocks.findMany({
    where: and(
      eq(practicePoolBlocks.pageId, pageId),
      inArray(practicePoolBlocks.pageId, pageIds),
    ),
  });
}

export async function setPoolBlocks(
  pageId: string,
  blockIds: string[],
  userId: string,
) {
  const pageIds = await getAccessiblePageIdsForUser(userId);

  if (!pageIds.includes(pageId)) {
    return;
  }

  await db
    .delete(practicePoolBlocks)
    .where(
      and(
        eq(practicePoolBlocks.pageId, pageId),
        inArray(practicePoolBlocks.pageId, pageIds),
      ),
    );

  if (blockIds.length === 0) return;

  const now = new Date().toISOString();
  const insertStatements = blockIds.map((blockId) =>
    db.insert(practicePoolBlocks).values({
      id: crypto.randomUUID(),
      pageId,
      blockId,
      createdAt: now,
    }),
  );
  const [first, ...rest] = insertStatements;
  await db.batch([first, ...rest]);
}

export const PracticePoolRepository = {
  findPoolSettingsByPageId,
  upsertPoolSettings,
  findPoolBlocksByPageId,
  setPoolBlocks,
} as const;
