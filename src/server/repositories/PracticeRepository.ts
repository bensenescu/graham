import { db } from "@/db";
import {
  practiceCriteria,
  practicePoolSettings,
  practicePoolBlocks,
  practiceSessions,
  practiceAnswers,
  practiceAnswerRatings,
} from "@/db/schema";
import { eq, and, or } from "drizzle-orm";

// === Practice Criteria ===

async function findAllCriteriaByUserId(userId: string) {
  return db.query.practiceCriteria.findMany({
    where: eq(practiceCriteria.userId, userId),
    orderBy: (criteria, { asc }) => [asc(criteria.sortOrder)],
  });
}

async function findCriterionById(id: string) {
  return db.query.practiceCriteria.findFirst({
    where: eq(practiceCriteria.id, id),
  });
}

async function createCriterion(data: {
  id: string;
  userId: string;
  name: string;
  sortOrder: string;
}) {
  await db.insert(practiceCriteria).values(data);
}

async function batchCreateCriteria(
  criteria: Array<{
    id: string;
    userId: string;
    name: string;
    sortOrder: string;
  }>,
) {
  if (criteria.length === 0) return;
  const now = new Date().toISOString();
  const insertStatements = criteria.map((c) =>
    db.insert(practiceCriteria).values({
      ...c,
      createdAt: now,
      updatedAt: now,
    }),
  );
  const [first, ...rest] = insertStatements;
  await db.batch([first, ...rest]);
}

async function updateCriterion(
  id: string,
  data: { name?: string; sortOrder?: string },
) {
  await db
    .update(practiceCriteria)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(practiceCriteria.id, id));
}

async function deleteCriterion(id: string) {
  await db.delete(practiceCriteria).where(eq(practiceCriteria.id, id));
}

// === Practice Pool Settings ===

async function findPoolSettingsByPageId(pageId: string) {
  return db.query.practicePoolSettings.findFirst({
    where: eq(practicePoolSettings.pageId, pageId),
  });
}

async function upsertPoolSettings(data: {
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

// === Practice Pool Blocks ===

async function findPoolBlocksByPageId(pageId: string) {
  return db.query.practicePoolBlocks.findMany({
    where: eq(practicePoolBlocks.pageId, pageId),
  });
}

async function setPoolBlocks(pageId: string, blockIds: string[]) {
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

// === Practice Sessions ===

async function findIncompleteSessionByPageId(pageId: string) {
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

async function findSessionById(id: string) {
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

async function findSessionsByPageId(pageId: string, limit = 50) {
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

async function createSession(data: { id: string; pageId: string }) {
  const now = new Date().toISOString();
  await db.insert(practiceSessions).values({
    ...data,
    status: "active",
    startedAt: now,
    createdAt: now,
    updatedAt: now,
  });
}

async function updateSession(
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

async function deleteSession(id: string) {
  await db.delete(practiceSessions).where(eq(practiceSessions.id, id));
}

// === Practice Answers ===

async function findAnswerById(id: string) {
  return db.query.practiceAnswers.findFirst({
    where: eq(practiceAnswers.id, id),
    with: {
      ratings: true,
    },
  });
}

async function findAnswersBySessionId(sessionId: string) {
  return db.query.practiceAnswers.findMany({
    where: eq(practiceAnswers.sessionId, sessionId),
    with: {
      ratings: true,
    },
  });
}

async function createAnswer(data: {
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

async function updateAnswer(
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

async function deleteAnswer(id: string) {
  await db.delete(practiceAnswers).where(eq(practiceAnswers.id, id));
}

async function deleteAnswerBySessionAndBlock(
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

// === Practice Answer Ratings ===

async function createRating(data: {
  id: string;
  answerId: string;
  criterionId: string;
  rating: string;
}) {
  await db.insert(practiceAnswerRatings).values({
    ...data,
    createdAt: new Date().toISOString(),
  });
}

async function batchCreateRatings(
  ratings: Array<{
    id: string;
    answerId: string;
    criterionId: string;
    rating: string;
  }>,
) {
  if (ratings.length === 0) return;
  const now = new Date().toISOString();
  const insertStatements = ratings.map((r) =>
    db.insert(practiceAnswerRatings).values({
      ...r,
      createdAt: now,
    }),
  );
  const [first, ...rest] = insertStatements;
  await db.batch([first, ...rest]);
}

async function deleteRatingsByAnswerId(answerId: string) {
  await db
    .delete(practiceAnswerRatings)
    .where(eq(practiceAnswerRatings.answerId, answerId));
}

// === Statistics ===

async function getBlockPracticeStats(pageId: string) {
  const sessions = await db.query.practiceSessions.findMany({
    where: eq(practiceSessions.pageId, pageId),
    with: {
      answers: {
        with: {
          ratings: true,
        },
      },
    },
  });

  const statsMap = new Map<
    string,
    {
      practiceCount: number;
      ratingsByCriterion: Map<string, number[]>;
      lastPracticedAt: string | null;
    }
  >();

  for (const session of sessions) {
    for (const answer of session.answers) {
      const existing = statsMap.get(answer.blockId) || {
        practiceCount: 0,
        ratingsByCriterion: new Map(),
        lastPracticedAt: null,
      };

      existing.practiceCount++;

      if (
        !existing.lastPracticedAt ||
        answer.createdAt! > existing.lastPracticedAt
      ) {
        existing.lastPracticedAt = answer.createdAt!;
      }

      for (const rating of answer.ratings) {
        const ratings =
          existing.ratingsByCriterion.get(rating.criterionId) || [];
        ratings.push(parseInt(rating.rating, 10));
        existing.ratingsByCriterion.set(rating.criterionId, ratings);
      }

      statsMap.set(answer.blockId, existing);
    }
  }

  const result: Array<{
    blockId: string;
    practiceCount: number;
    averageRatings: Record<string, number>;
    lastPracticedAt: string | null;
  }> = [];

  for (const [blockId, stats] of statsMap) {
    const averageRatings: Record<string, number> = {};
    for (const [criterionId, ratings] of stats.ratingsByCriterion) {
      averageRatings[criterionId] =
        ratings.reduce((a, b) => a + b, 0) / ratings.length;
    }
    result.push({
      blockId,
      practiceCount: stats.practiceCount,
      averageRatings,
      lastPracticedAt: stats.lastPracticedAt,
    });
  }

  return result;
}

export const PracticeRepository = {
  findAllCriteriaByUserId,
  findCriterionById,
  createCriterion,
  batchCreateCriteria,
  updateCriterion,
  deleteCriterion,
  findPoolSettingsByPageId,
  upsertPoolSettings,
  findPoolBlocksByPageId,
  setPoolBlocks,
  findIncompleteSessionByPageId,
  findSessionById,
  findSessionsByPageId,
  createSession,
  updateSession,
  deleteSession,
  findAnswerById,
  findAnswersBySessionId,
  createAnswer,
  updateAnswer,
  deleteAnswer,
  deleteAnswerBySessionAndBlock,
  createRating,
  batchCreateRatings,
  deleteRatingsByAnswerId,
  getBlockPracticeStats,
} as const;
