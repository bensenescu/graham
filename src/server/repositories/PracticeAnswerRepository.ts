import { db } from "@/db";
import { practiceAnswers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function findAnswerById(id: string) {
  return db.query.practiceAnswers.findFirst({
    where: eq(practiceAnswers.id, id),
    with: {
      ratings: true,
    },
  });
}

export async function findAnswersBySessionId(sessionId: string) {
  return db.query.practiceAnswers.findMany({
    where: eq(practiceAnswers.sessionId, sessionId),
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
  data: { transcription?: string | null; transcriptionStatus?: string },
) {
  await db
    .update(practiceAnswers)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(practiceAnswers.id, id));
}

export async function deleteAnswer(id: string) {
  await db.delete(practiceAnswers).where(eq(practiceAnswers.id, id));
}

export async function deleteAnswerBySessionAndBlock(
  sessionId: string,
  blockId: string,
) {
  await db
    .delete(practiceAnswers)
    .where(
      and(
        eq(practiceAnswers.sessionId, sessionId),
        eq(practiceAnswers.blockId, blockId),
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
