import { db } from "@/db";
import { practiceCriteria } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function findAllCriteriaByUserId(userId: string) {
  return db.query.practiceCriteria.findMany({
    where: eq(practiceCriteria.userId, userId),
    orderBy: (criteria, { asc }) => [asc(criteria.sortOrder)],
  });
}

export async function findCriterionById(id: string) {
  return db.query.practiceCriteria.findFirst({
    where: eq(practiceCriteria.id, id),
  });
}

export async function createCriterion(data: {
  id: string;
  userId: string;
  name: string;
  sortOrder: string;
}) {
  await db.insert(practiceCriteria).values(data);
}

export async function batchCreateCriteria(
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

/**
 * Update a practice criterion.
 * Defense-in-depth: includes userId in WHERE clause.
 */
export async function updateCriterion(
  id: string,
  userId: string,
  data: { name?: string; sortOrder?: string },
) {
  await db
    .update(practiceCriteria)
    .set({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(eq(practiceCriteria.id, id), eq(practiceCriteria.userId, userId)),
    );
}

/**
 * Delete a practice criterion.
 * Defense-in-depth: includes userId in WHERE clause.
 */
export async function deleteCriterion(id: string, userId: string) {
  await db
    .delete(practiceCriteria)
    .where(
      and(eq(practiceCriteria.id, id), eq(practiceCriteria.userId, userId)),
    );
}

export const PracticeCriteriaRepository = {
  findAllCriteriaByUserId,
  findCriterionById,
  createCriterion,
  batchCreateCriteria,
  updateCriterion,
  deleteCriterion,
} as const;
