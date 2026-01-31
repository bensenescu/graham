import { db } from "@/db";
import { practiceSessions } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

export async function findIncompleteSessionByPageId(pageId: string) {
  return db.query.practiceSessions.findFirst({
    where: and(
      eq(practiceSessions.pageId, pageId),
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

export async function findSessionById(id: string) {
  return db.query.practiceSessions.findFirst({
    where: eq(practiceSessions.id, id),
    with: {
      answers: {
        with: {
          ratings: true,
        },
      },
    },
  });
}

export async function findSessionsByPageId(pageId: string, limit = 50) {
  return db.query.practiceSessions.findMany({
    where: eq(practiceSessions.pageId, pageId),
    orderBy: (sessions, { desc }) => [desc(sessions.createdAt)],
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
  data: { status?: string; completedAt?: string | null },
) {
  await db
    .update(practiceSessions)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(practiceSessions.id, id));
}

export async function deleteSession(id: string) {
  await db.delete(practiceSessions).where(eq(practiceSessions.id, id));
}

export const PracticeSessionRepository = {
  findIncompleteSessionByPageId,
  findSessionById,
  findSessionsByPageId,
  createSession,
  updateSession,
  deleteSession,
} as const;
