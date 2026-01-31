import { db } from "@/db";
import { practiceSessions } from "@/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import {
  getAccessiblePageIdsForUser,
  getAccessibleSessionIdsForUser,
} from "./helpers/access";

export async function findIncompleteSessionByPageId(
  pageId: string,
  userId: string,
) {
  const pageIds = await getAccessiblePageIdsForUser(userId);

  if (pageIds.length === 0) {
    return null;
  }

  return db.query.practiceSessions.findFirst({
    where: and(
      eq(practiceSessions.pageId, pageId),
      inArray(practiceSessions.pageId, pageIds),
      or(
        eq(practiceSessions.status, "active"),
        eq(practiceSessions.status, "reviewing"),
      ),
    ),
    with: {
      answers: {
        with: {
          ratings: true,
        },
      },
    },
  });
}

export async function findSessionById(id: string, userId: string) {
  const sessionIds = await getAccessibleSessionIdsForUser(userId);

  if (sessionIds.length === 0) {
    return null;
  }

  return db.query.practiceSessions.findFirst({
    where: and(
      eq(practiceSessions.id, id),
      inArray(practiceSessions.id, sessionIds),
    ),
    with: {
      answers: {
        with: {
          ratings: true,
        },
      },
    },
  });
}

export async function findSessionsByPageId(
  pageId: string,
  userId: string,
  limit = 50,
) {
  const pageIds = await getAccessiblePageIdsForUser(userId);

  if (pageIds.length === 0) {
    return [];
  }

  return db.query.practiceSessions.findMany({
    where: and(
      eq(practiceSessions.pageId, pageId),
      inArray(practiceSessions.pageId, pageIds),
    ),
    orderBy: (fields, { desc }) => [desc(fields.createdAt)],
    limit,
    with: {
      answers: {
        with: {
          ratings: true,
        },
      },
    },
  });
}

export async function createSession(data: { id: string; pageId: string }) {
  const now = new Date().toISOString();
  await db.insert(practiceSessions).values({
    ...data,
    status: "active",
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateSession(
  id: string,
  userId: string,
  data: { status?: string; completedAt?: string | null },
) {
  const sessionIds = await getAccessibleSessionIdsForUser(userId);

  if (sessionIds.length === 0) {
    return;
  }

  await db
    .update(practiceSessions)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(practiceSessions.id, id),
        inArray(practiceSessions.id, sessionIds),
      ),
    );
}

export async function deleteSession(id: string, userId: string) {
  const sessionIds = await getAccessibleSessionIdsForUser(userId);

  if (sessionIds.length === 0) {
    return;
  }

  await db
    .delete(practiceSessions)
    .where(
      and(
        eq(practiceSessions.id, id),
        inArray(practiceSessions.id, sessionIds),
      ),
    );
}

export const PracticeSessionRepository = {
  findIncompleteSessionByPageId,
  findSessionById,
  findSessionsByPageId,
  createSession,
  updateSession,
  deleteSession,
} as const;
