import { db } from "@/db";
import {
  pages,
  pageShares,
  pageBlocks,
  practiceSessions,
  practiceAnswers,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function getAccessiblePageIdsForUser(userId: string) {
  const ownedPages = await db.query.pages.findMany({
    where: eq(pages.userId, userId),
    columns: { id: true },
  });

  const sharedPageRecords = await db.query.pageShares.findMany({
    where: eq(pageShares.userId, userId),
    columns: { pageId: true },
  });

  const ownedIds = ownedPages.map((p: { id: string }) => p.id);
  const sharedIds = sharedPageRecords.map((s: { pageId: string }) => s.pageId);

  return [...new Set([...ownedIds, ...sharedIds])];
}

export async function getAccessibleBlockIdsForUser(userId: string) {
  const pageIds = await getAccessiblePageIdsForUser(userId);

  if (pageIds.length === 0) {
    return [];
  }

  const blocks = await db.query.pageBlocks.findMany({
    where: inArray(pageBlocks.pageId, pageIds),
    columns: { id: true },
  });

  return blocks.map((b: { id: string }) => b.id);
}

export async function getAccessibleSessionIdsForUser(userId: string) {
  const pageIds = await getAccessiblePageIdsForUser(userId);

  if (pageIds.length === 0) {
    return [];
  }

  const sessions = await db.query.practiceSessions.findMany({
    where: inArray(practiceSessions.pageId, pageIds),
    columns: { id: true },
  });

  return sessions.map((s: { id: string }) => s.id);
}

export async function getAccessibleAnswerIdsForUser(userId: string) {
  const sessionIds = await getAccessibleSessionIdsForUser(userId);

  if (sessionIds.length === 0) {
    return [];
  }

  const answers = await db.query.practiceAnswers.findMany({
    where: inArray(practiceAnswers.sessionId, sessionIds),
    columns: { id: true },
  });

  return answers.map((a: { id: string }) => a.id);
}
