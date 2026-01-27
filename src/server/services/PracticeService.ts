import { PracticeRepository } from "../repositories/PracticeRepository";
import { PageRepository } from "../repositories/PageRepository";
import { PageBlockRepository } from "../repositories/PageBlockRepository";
import type {
  CreatePracticeCriterionInput,
  UpdatePracticeCriterionInput,
  DeletePracticeCriterionInput,
  UpdatePracticePoolSettingsInput,
  CreatePracticeSessionInput,
  UpdatePracticeSessionInput,
  CreatePracticeAnswerInput,
  UpdatePracticeAnswerInput,
  DeletePracticeAnswerInput,
  BatchCreatePracticeAnswerRatingsInput,
  PracticePoolMode,
} from "@/types/schemas/practice";

const DEFAULT_CRITERIA = ["Confidence", "Completeness", "Answer Quality"];

async function getCriteria(userId: string) {
  let criteria = await PracticeRepository.findAllCriteriaByUserId(userId);

  if (criteria.length === 0) {
    const defaultCriteria = DEFAULT_CRITERIA.map((name, index) => ({
      id: crypto.randomUUID(),
      userId,
      name,
      sortOrder: String(index).padStart(10, "0"),
    }));
    await PracticeRepository.batchCreateCriteria(defaultCriteria);
    criteria = await PracticeRepository.findAllCriteriaByUserId(userId);
  }

  return { criteria };
}

async function createCriterion(
  userId: string,
  data: CreatePracticeCriterionInput,
) {
  await PracticeRepository.createCriterion({
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
  const criterion = await PracticeRepository.findCriterionById(data.id);
  if (!criterion || criterion.userId !== userId) {
    throw new Error("Criterion not found");
  }

  await PracticeRepository.updateCriterion(data.id, {
    name: data.name,
    sortOrder: data.sortOrder,
  });
  return { success: true };
}

async function deleteCriterion(
  userId: string,
  data: DeletePracticeCriterionInput,
) {
  const criterion = await PracticeRepository.findCriterionById(data.id);
  if (!criterion || criterion.userId !== userId) {
    throw new Error("Criterion not found");
  }

  const allCriteria = await PracticeRepository.findAllCriteriaByUserId(userId);
  if (allCriteria.length <= 1) {
    throw new Error("Must have at least one criterion");
  }

  await PracticeRepository.deleteCriterion(data.id);
  return { success: true };
}

async function getPoolSettings(userId: string, pageId: string) {
  const page = await PageRepository.findByIdAndUserId(pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }

  const settings = await PracticeRepository.findPoolSettingsByPageId(pageId);
  const selectedBlocks =
    await PracticeRepository.findPoolBlocksByPageId(pageId);

  return {
    settings: settings || { id: "", pageId, mode: "all" as PracticePoolMode },
    selectedBlockIds: selectedBlocks.map((b) => b.blockId),
  };
}

async function updatePoolSettings(
  userId: string,
  data: UpdatePracticePoolSettingsInput,
) {
  const page = await PageRepository.findByIdAndUserId(data.pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }

  await PracticeRepository.upsertPoolSettings({
    id: crypto.randomUUID(),
    pageId: data.pageId,
    mode: data.mode,
  });

  if (data.mode === "selected" && data.selectedBlockIds) {
    await PracticeRepository.setPoolBlocks(data.pageId, data.selectedBlockIds);
  }

  return { success: true };
}

async function getPracticePool(userId: string, pageId: string) {
  const page = await PageRepository.findByIdAndUserId(pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }

  const settings = await PracticeRepository.findPoolSettingsByPageId(pageId);
  const mode = (settings?.mode || "all") as PracticePoolMode;

  const allBlocks = await PageBlockRepository.findAllByPageId(pageId);

  if (mode === "all") {
    return { blockIds: allBlocks.map((b) => b.id), mode };
  }

  if (mode === "selected") {
    const selectedBlocks =
      await PracticeRepository.findPoolBlocksByPageId(pageId);
    const selectedIds = new Set(selectedBlocks.map((b) => b.blockId));
    return {
      blockIds: allBlocks.filter((b) => selectedIds.has(b.id)).map((b) => b.id),
      mode,
    };
  }

  if (mode === "low_rated") {
    const stats = await PracticeRepository.getBlockPracticeStats(pageId);
    const lowRatedIds = new Set<string>();

    for (const stat of stats) {
      const avgRatings = Object.values(stat.averageRatings);
      if (avgRatings.length > 0) {
        const overallAvg =
          avgRatings.reduce((a, b) => a + b, 0) / avgRatings.length;
        if (overallAvg <= 2) {
          lowRatedIds.add(stat.blockId);
        }
      }
    }

    const practicedIds = new Set(stats.map((s) => s.blockId));
    for (const block of allBlocks) {
      if (!practicedIds.has(block.id)) {
        lowRatedIds.add(block.id);
      }
    }

    return {
      blockIds: allBlocks.filter((b) => lowRatedIds.has(b.id)).map((b) => b.id),
      mode,
    };
  }

  return {
    blockIds: allBlocks.map((b) => b.id),
    mode: "all" as PracticePoolMode,
  };
}

async function getIncompleteSession(userId: string, pageId: string) {
  const page = await PageRepository.findByIdAndUserId(pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }

  const session =
    await PracticeRepository.findIncompleteSessionByPageId(pageId);
  return { session };
}

async function getSession(userId: string, sessionId: string) {
  const session = await PracticeRepository.findSessionById(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  const page = await PageRepository.findByIdAndUserId(session.pageId, userId);
  if (!page) {
    throw new Error("Session not found");
  }

  return { session };
}

async function getSessions(userId: string, pageId: string) {
  const page = await PageRepository.findByIdAndUserId(pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }

  const sessions = await PracticeRepository.findSessionsByPageId(pageId);
  return { sessions };
}

async function createSession(userId: string, data: CreatePracticeSessionInput) {
  const page = await PageRepository.findByIdAndUserId(data.pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }

  const existingSession =
    await PracticeRepository.findIncompleteSessionByPageId(data.pageId);
  if (existingSession) {
    await PracticeRepository.updateSession(existingSession.id, {
      status: "abandoned",
    });
  }

  await PracticeRepository.createSession({
    id: data.id,
    pageId: data.pageId,
  });

  return { success: true };
}

async function updateSession(userId: string, data: UpdatePracticeSessionInput) {
  const session = await PracticeRepository.findSessionById(data.id);
  if (!session) {
    throw new Error("Session not found");
  }

  const page = await PageRepository.findByIdAndUserId(session.pageId, userId);
  if (!page) {
    throw new Error("Session not found");
  }

  await PracticeRepository.updateSession(data.id, {
    status: data.status,
    completedAt: data.completedAt,
  });

  return { success: true };
}

async function deleteSession(userId: string, sessionId: string) {
  const session = await PracticeRepository.findSessionById(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  const page = await PageRepository.findByIdAndUserId(session.pageId, userId);
  if (!page) {
    throw new Error("Session not found");
  }

  await PracticeRepository.deleteSession(sessionId);
  return { success: true };
}

async function createAnswer(userId: string, data: CreatePracticeAnswerInput) {
  const session = await PracticeRepository.findSessionById(data.sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  const page = await PageRepository.findByIdAndUserId(session.pageId, userId);
  if (!page) {
    throw new Error("Session not found");
  }

  await PracticeRepository.deleteAnswerBySessionAndBlock(
    data.sessionId,
    data.blockId,
  );

  await PracticeRepository.createAnswer({
    id: data.id,
    sessionId: data.sessionId,
    blockId: data.blockId,
    durationSeconds: String(data.durationSeconds),
  });

  return { success: true };
}

async function updateAnswer(userId: string, data: UpdatePracticeAnswerInput) {
  const answer = await PracticeRepository.findAnswerById(data.id);
  if (!answer) {
    throw new Error("Answer not found");
  }

  const session = await PracticeRepository.findSessionById(answer.sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  const page = await PageRepository.findByIdAndUserId(session.pageId, userId);
  if (!page) {
    throw new Error("Answer not found");
  }

  await PracticeRepository.updateAnswer(data.id, {
    transcription: data.transcription,
    transcriptionStatus: data.transcriptionStatus,
  });

  return { success: true };
}

async function deleteAnswer(userId: string, data: DeletePracticeAnswerInput) {
  const answer = await PracticeRepository.findAnswerById(data.id);
  if (!answer) {
    throw new Error("Answer not found");
  }

  const session = await PracticeRepository.findSessionById(answer.sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  const page = await PageRepository.findByIdAndUserId(session.pageId, userId);
  if (!page) {
    throw new Error("Answer not found");
  }

  await PracticeRepository.deleteAnswer(data.id);
  return { success: true };
}

async function saveRatings(
  userId: string,
  data: BatchCreatePracticeAnswerRatingsInput,
) {
  const answer = await PracticeRepository.findAnswerById(data.answerId);
  if (!answer) {
    throw new Error("Answer not found");
  }

  const session = await PracticeRepository.findSessionById(answer.sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  const page = await PageRepository.findByIdAndUserId(session.pageId, userId);
  if (!page) {
    throw new Error("Answer not found");
  }

  await PracticeRepository.deleteRatingsByAnswerId(data.answerId);
  await PracticeRepository.batchCreateRatings(
    data.ratings.map((r) => ({
      id: r.id,
      answerId: data.answerId,
      criterionId: r.criterionId,
      rating: r.rating,
    })),
  );

  return { success: true };
}

async function getBlockStats(userId: string, pageId: string) {
  const page = await PageRepository.findByIdAndUserId(pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }

  const stats = await PracticeRepository.getBlockPracticeStats(pageId);
  return { stats };
}

async function getLastPracticeDate(userId: string, pageId: string) {
  const page = await PageRepository.findByIdAndUserId(pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }

  const sessions = await PracticeRepository.findSessionsByPageId(pageId, 1);
  const lastSession = sessions[0];

  return {
    lastPracticeDate:
      lastSession?.completedAt || lastSession?.startedAt || null,
  };
}

export const PracticeService = {
  getCriteria,
  createCriterion,
  updateCriterion,
  deleteCriterion,
  getPoolSettings,
  updatePoolSettings,
  getPracticePool,
  getIncompleteSession,
  getSession,
  getSessions,
  createSession,
  updateSession,
  deleteSession,
  createAnswer,
  updateAnswer,
  deleteAnswer,
  saveRatings,
  getBlockStats,
  getLastPracticeDate,
} as const;
