import { db } from "@/db";
import { practiceAnswerRatings, practiceSessions } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  getAccessibleAnswerIdsForUser,
  getAccessiblePageIdsForUser,
} from "./helpers/access";

export async function createRating(data: {
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

export async function batchCreateRatings(
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

export async function deleteRatingsByAnswerId(
  answerId: string,
  userId: string,
) {
  const answerIds = await getAccessibleAnswerIdsForUser(userId);

  if (answerIds.length === 0) {
    return;
  }

  await db
    .delete(practiceAnswerRatings)
    .where(
      and(
        eq(practiceAnswerRatings.answerId, answerId),
        inArray(practiceAnswerRatings.answerId, answerIds),
      ),
    );
}

export async function getBlockPracticeStats(pageId: string, userId: string) {
  const pageIds = await getAccessiblePageIdsForUser(userId);

  if (!pageIds.includes(pageId)) {
    return [];
  }

  const sessions = await db.query.practiceSessions.findMany({
    where: and(
      eq(practiceSessions.pageId, pageId),
      inArray(practiceSessions.pageId, pageIds),
    ),
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

export const PracticeRatingRepository = {
  createRating,
  batchCreateRatings,
  deleteRatingsByAnswerId,
  getBlockPracticeStats,
} as const;
