import { PracticeCriteriaRepository } from "../repositories/PracticeCriteriaRepository";
import { DEFAULT_PRACTICE_CRITERIA } from "@/constants/defaults";
import type {
  CreatePracticeCriterionInput,
  UpdatePracticeCriterionInput,
  DeletePracticeCriterionInput,
} from "@/types/schemas/practice";

async function getCriteria(userId: string) {
  let criteria =
    await PracticeCriteriaRepository.findAllCriteriaByUserId(userId);

  if (criteria.length === 0) {
    const defaultCriteria = DEFAULT_PRACTICE_CRITERIA.map((name, index) => ({
      id: crypto.randomUUID(),
      userId,
      name,
      sortOrder: String(index).padStart(10, "0"),
    }));
    await PracticeCriteriaRepository.batchCreateCriteria(defaultCriteria);
    criteria = await PracticeCriteriaRepository.findAllCriteriaByUserId(userId);
  }

  return { criteria };
}

async function createCriterion(
  userId: string,
  data: CreatePracticeCriterionInput,
) {
  await PracticeCriteriaRepository.createCriterion({
    id: data.id,
    userId,
    name: data.name,
    sortOrder: data.sortOrder,
  });
  return { success: true };
}

async function updateCriterion(
  userId: string,
  data: UpdatePracticeCriterionInput,
) {
  const criterion = await PracticeCriteriaRepository.findCriterionById(data.id);
  if (!criterion || criterion.userId !== userId) {
    throw new Error("Criterion not found");
  }

  await PracticeCriteriaRepository.updateCriterion(data.id, userId, {
    name: data.name,
    sortOrder: data.sortOrder,
  });
  return { success: true };
}

async function deleteCriterion(
  userId: string,
  data: DeletePracticeCriterionInput,
) {
  const criterion = await PracticeCriteriaRepository.findCriterionById(data.id);
  if (!criterion || criterion.userId !== userId) {
    throw new Error("Criterion not found");
  }

  const allCriteria =
    await PracticeCriteriaRepository.findAllCriteriaByUserId(userId);
  if (allCriteria.length <= 1) {
    throw new Error("Must have at least one criterion");
  }

  await PracticeCriteriaRepository.deleteCriterion(data.id, userId);
  return { success: true };
}

export const PracticeCriteriaService = {
  getCriteria,
  createCriterion,
  updateCriterion,
  deleteCriterion,
} as const;
