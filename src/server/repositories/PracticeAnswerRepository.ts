import { db } from "@/db";
import { practiceAnswers } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  getAccessibleAnswerIdsForUser,
  getAccessibleSessionIdsForUser,
} from "./helpers/access";

export async function findAnswerById(id: string, userId: string) {
  const answerIds = await getAccessibleAnswerIdsForUser(userId);

  if (answerIds.length === 0) {
    return null;
  }

  return db.query.practiceAnswers.findFirst({
    where: and(
      eq(practiceAnswers.id, id),
      inArray(practiceAnswers.id, answerIds),
    ),
    with: {
      ratings: true,
    },
  });
}

export async function findAnswersBySessionId(
  sessionId: string,
  userId: string,
) {
  const sessionIds = await getAccessibleSessionIdsForUser(userId);

  if (sessionIds.length === 0) {
    return [];
  }

  return db.query.practiceAnswers.findMany({
    where: and(
      eq(practiceAnswers.sessionId, sessionId),
      inArray(practiceAnswers.sessionId, sessionIds),
    ),
    with: {
      ratings: true,
    },
  });
}

export async function createAnswer(data: {
  id: string;
  sessionId: string;
  blockId: string;
  durationSeconds: string;
}) {
  const now = new Date().toISOString();
  await db.insert(practiceAnswers).values({
    ...data,
    transcriptionStatus: "pending",
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateAnswer(
  id: string,
  userId: string,
  data: { transcription?: string | null; transcriptionStatus?: string },
) {
  const answerIds = await getAccessibleAnswerIdsForUser(userId);

  if (answerIds.length === 0) {
    return;
  }

  await db
    .update(practiceAnswers)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(eq(practiceAnswers.id, id), inArray(practiceAnswers.id, answerIds)),
    );
}

export async function deleteAnswer(id: string, userId: string) {
  const answerIds = await getAccessibleAnswerIdsForUser(userId);

  if (answerIds.length === 0) {
    return;
  }

  await db
    .delete(practiceAnswers)
    .where(
      and(eq(practiceAnswers.id, id), inArray(practiceAnswers.id, answerIds)),
    );
}

export async function deleteAnswerBySessionAndBlock(
  sessionId: string,
  blockId: string,
  userId: string,
) {
  const sessionIds = await getAccessibleSessionIdsForUser(userId);

  if (sessionIds.length === 0) {
    return;
  }

  await db
    .delete(practiceAnswers)
    .where(
      and(
        eq(practiceAnswers.sessionId, sessionId),
        eq(practiceAnswers.blockId, blockId),
        inArray(practiceAnswers.sessionId, sessionIds),
      ),
    );
}

export const PracticeAnswerRepository = {
  findAnswerById,
  findAnswersBySessionId,
  createAnswer,
  updateAnswer,
  deleteAnswer,
  deleteAnswerBySessionAndBlock,
} as const;
