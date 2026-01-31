import { db } from "@/db";
import { practicePoolSettings, practicePoolBlocks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function findPoolSettingsByPageId(pageId: string) {
  return db.query.practicePoolSettings.findFirst({
    where: eq(practicePoolSettings.pageId, pageId),
  });
}

export async function upsertPoolSettings(data: {
  id: string;
  pageId: string;
  mode: string;
}) {
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

export async function findPoolBlocksByPageId(pageId: string) {
  return db.query.practicePoolBlocks.findMany({
    where: eq(practicePoolBlocks.pageId, pageId),
  });
}

export async function setPoolBlocks(pageId: string, blockIds: string[]) {
  await db
    .delete(practicePoolBlocks)
    .where(eq(practicePoolBlocks.pageId, pageId));

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
