import { PracticePoolRepository } from "../repositories/PracticePoolRepository";
import { PracticeSessionRepository } from "../repositories/PracticeSessionRepository";
import { PracticeAnswerRepository } from "../repositories/PracticeAnswerRepository";
import { PracticeRatingRepository } from "../repositories/PracticeRatingRepository";
import { PageBlockRepository } from "../repositories/PageBlockRepository";
import { ensurePageAccess } from "./helpers/ensurePageAccess";
import type {
  UpdatePracticePoolSettingsInput,
  CreatePracticeSessionInput,
  UpdatePracticeSessionInput,
  CreatePracticeAnswerInput,
  UpdatePracticeAnswerInput,
  DeletePracticeAnswerInput,
  BatchCreatePracticeAnswerRatingsInput,
  PracticePoolMode,
} from "@/types/schemas/practice";

async function getPoolSettings(userId: string, pageId: string) {
  await ensurePageAccess(pageId, userId);

  const settings =
    await PracticePoolRepository.findPoolSettingsByPageId(pageId);
  const selectedBlocks =
    await PracticePoolRepository.findPoolBlocksByPageId(pageId);

  return {
    settings: settings || { id: "", pageId, mode: "all" as PracticePoolMode },
    selectedBlockIds: selectedBlocks.map((b) => b.blockId),
  };
}

async function updatePoolSettings(
  userId: string,
  data: UpdatePracticePoolSettingsInput,
) {
  await ensurePageAccess(data.pageId, userId);

  await PracticePoolRepository.upsertPoolSettings({
    id: crypto.randomUUID(),
    pageId: data.pageId,
    mode: data.mode,
  });

  if (data.mode === "selected" && data.selectedBlockIds) {
    await PracticePoolRepository.setPoolBlocks(
      data.pageId,
      data.selectedBlockIds,
    );
  }

  return { success: true };
}

async function getPracticePool(userId: string, pageId: string) {
  await ensurePageAccess(pageId, userId);

  const settings =
    await PracticePoolRepository.findPoolSettingsByPageId(pageId);
  const mode = (settings?.mode || "all") as PracticePoolMode;

  const allBlocks = await PageBlockRepository.findAllByPageId(pageId);

  if (mode === "all") {
    return { blockIds: allBlocks.map((b) => b.id), mode };
  }

  if (mode === "selected") {
    const selectedBlocks =
      await PracticePoolRepository.findPoolBlocksByPageId(pageId);
    const selectedIds = new Set(selectedBlocks.map((b) => b.blockId));
    return {
      blockIds: allBlocks.filter((b) => selectedIds.has(b.id)).map((b) => b.id),
      mode,
    };
  }

  if (mode === "low_rated") {
    const stats = await PracticeRatingRepository.getBlockPracticeStats(pageId);
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
  await ensurePageAccess(pageId, userId);

  const session =
    await PracticeSessionRepository.findIncompleteSessionByPageId(pageId);
  return { session };
}

async function getSession(userId: string, sessionId: string) {
  const session = await PracticeSessionRepository.findSessionById(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  await ensurePageAccess(session.pageId, userId);

  return { session };
}

async function getSessions(userId: string, pageId: string) {
  await ensurePageAccess(pageId, userId);

  const sessions = await PracticeSessionRepository.findSessionsByPageId(pageId);
  return { sessions };
}

async function createSession(userId: string, data: CreatePracticeSessionInput) {
  await ensurePageAccess(data.pageId, userId);

  const existingSession =
    await PracticeSessionRepository.findIncompleteSessionByPageId(data.pageId);
  if (existingSession) {
    await PracticeSessionRepository.updateSession(existingSession.id, {
      status: "abandoned",
    });
  }

  await PracticeSessionRepository.createSession({
    id: data.id,
    pageId: data.pageId,
  });

  return { success: true };
}

async function updateSession(userId: string, data: UpdatePracticeSessionInput) {
  const session = await PracticeSessionRepository.findSessionById(data.id);
  if (!session) {
    throw new Error("Session not found");
  }

  await ensurePageAccess(session.pageId, userId);

  await PracticeSessionRepository.updateSession(data.id, {
    status: data.status,
    completedAt: data.completedAt,
  });

  return { success: true };
}

async function deleteSession(userId: string, sessionId: string) {
  const session = await PracticeSessionRepository.findSessionById(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }

  await ensurePageAccess(session.pageId, userId);

  await PracticeSessionRepository.deleteSession(sessionId);
  return { success: true };
}

async function createAnswer(userId: string, data: CreatePracticeAnswerInput) {
  const session = await PracticeSessionRepository.findSessionById(
    data.sessionId,
  );
  if (!session) {
    throw new Error("Session not found");
  }

  await ensurePageAccess(session.pageId, userId);

  await PracticeAnswerRepository.deleteAnswerBySessionAndBlock(
    data.sessionId,
    data.blockId,
  );

  await PracticeAnswerRepository.createAnswer({
    id: data.id,
    sessionId: data.sessionId,
    blockId: data.blockId,
    durationSeconds: String(data.durationSeconds),
  });

  return { success: true };
}

async function updateAnswer(userId: string, data: UpdatePracticeAnswerInput) {
  const answer = await PracticeAnswerRepository.findAnswerById(data.id);
  if (!answer) {
    throw new Error("Answer not found");
  }

  const session = await PracticeSessionRepository.findSessionById(
    answer.sessionId,
  );
  if (!session) {
    throw new Error("Session not found");
  }

  await ensurePageAccess(session.pageId, userId);

  await PracticeAnswerRepository.updateAnswer(data.id, {
    transcription: data.transcription,
    transcriptionStatus: data.transcriptionStatus,
  });

  return { success: true };
}

async function deleteAnswer(userId: string, data: DeletePracticeAnswerInput) {
  const answer = await PracticeAnswerRepository.findAnswerById(data.id);
  if (!answer) {
    throw new Error("Answer not found");
  }

  const session = await PracticeSessionRepository.findSessionById(
    answer.sessionId,
  );
  if (!session) {
    throw new Error("Session not found");
  }

  await ensurePageAccess(session.pageId, userId);

  await PracticeAnswerRepository.deleteAnswer(data.id);
  return { success: true };
}

async function saveRatings(
  userId: string,
  data: BatchCreatePracticeAnswerRatingsInput,
) {
  const answer = await PracticeAnswerRepository.findAnswerById(data.answerId);
  if (!answer) {
    throw new Error("Answer not found");
  }

  const session = await PracticeSessionRepository.findSessionById(
    answer.sessionId,
  );
  if (!session) {
    throw new Error("Session not found");
  }

  await ensurePageAccess(session.pageId, userId);

  await PracticeRatingRepository.deleteRatingsByAnswerId(data.answerId);
  await PracticeRatingRepository.batchCreateRatings(
    data.ratings.map((r) => ({
      id: r.id,
      answerId: data.answerId,
      criterionId: r.criterionId,
      rating: r.rating,
    })),
  );

  return { success: true };
}

export const PracticeSessionService = {
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
} as const;
