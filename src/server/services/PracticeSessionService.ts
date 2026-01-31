import { PracticePoolRepository } from "../repositories/PracticePoolRepository";
import { PracticeSessionRepository } from "../repositories/PracticeSessionRepository";
import { PracticeAnswerRepository } from "../repositories/PracticeAnswerRepository";
import { PracticeRatingRepository } from "../repositories/PracticeRatingRepository";
import { PageBlockRepository } from "../repositories/PageBlockRepository";
import { ensurePageAccessWithSharing } from "./helpers/ensurePageAccess";
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

async function getSessionForUser(userId: string, sessionId: string) {
  const session = await PracticeSessionRepository.findSessionById(
    sessionId,
    userId,
  );
  if (!session) {
    throw new Error("Session not found");
  }

  await ensurePageAccessWithSharing(session.pageId, userId);
  return session;
}

async function getAnswerAndSessionForUser(userId: string, answerId: string) {
  const answer = await PracticeAnswerRepository.findAnswerById(
    answerId,
    userId,
  );
  if (!answer) {
    throw new Error("Answer not found");
  }

  const session = await PracticeSessionRepository.findSessionById(
    answer.sessionId,
    userId,
  );
  if (!session) {
    throw new Error("Session not found");
  }

  await ensurePageAccessWithSharing(session.pageId, userId);
  return { answer, session };
}

async function getPoolSettings(userId: string, pageId: string) {
  await ensurePageAccessWithSharing(pageId, userId);

  const settings = await PracticePoolRepository.findPoolSettingsByPageId(
    pageId,
    userId,
  );
  const selectedBlocks = await PracticePoolRepository.findPoolBlocksByPageId(
    pageId,
    userId,
  );

  return {
    settings: settings || { id: "", pageId, mode: "all" as PracticePoolMode },
    selectedBlockIds: selectedBlocks.map((b: { blockId: string }) => b.blockId),
  };
}

async function updatePoolSettings(
  userId: string,
  data: UpdatePracticePoolSettingsInput,
) {
  await ensurePageAccessWithSharing(data.pageId, userId);

  await PracticePoolRepository.upsertPoolSettings(
    {
      id: crypto.randomUUID(),
      pageId: data.pageId,
      mode: data.mode,
    },
    userId,
  );

  if (data.mode === "selected" && data.selectedBlockIds) {
    await PracticePoolRepository.setPoolBlocks(
      data.pageId,
      data.selectedBlockIds,
      userId,
    );
  }

  return { success: true };
}

async function getPracticePool(userId: string, pageId: string) {
  await ensurePageAccessWithSharing(pageId, userId);

  const settings = await PracticePoolRepository.findPoolSettingsByPageId(
    pageId,
    userId,
  );
  const mode = (settings?.mode || "all") as PracticePoolMode;

  const allBlocks = await PageBlockRepository.findAllByPageId(pageId);

  if (mode === "all") {
    return { blockIds: allBlocks.map((b: { id: string }) => b.id), mode };
  }

  if (mode === "selected") {
    const selectedBlocks = await PracticePoolRepository.findPoolBlocksByPageId(
      pageId,
      userId,
    );
    const selectedIds = new Set(
      selectedBlocks.map((b: { blockId: string }) => b.blockId),
    );
    return {
      blockIds: allBlocks
        .filter((b: { id: string }) => selectedIds.has(b.id))
        .map((b: { id: string }) => b.id),
      mode,
    };
  }

  if (mode === "low_rated") {
    const stats = await PracticeRatingRepository.getBlockPracticeStats(
      pageId,
      userId,
    );
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

    const practicedIds = new Set(
      stats.map((s: { blockId: string }) => s.blockId),
    );
    for (const block of allBlocks) {
      if (!practicedIds.has(block.id)) {
        lowRatedIds.add(block.id);
      }
    }

    return {
      blockIds: allBlocks
        .filter((b: { id: string }) => lowRatedIds.has(b.id))
        .map((b: { id: string }) => b.id),
      mode,
    };
  }

  return {
    blockIds: allBlocks.map((b: { id: string }) => b.id),
    mode: "all" as PracticePoolMode,
  };
}

async function getIncompleteSession(userId: string, pageId: string) {
  await ensurePageAccessWithSharing(pageId, userId);

  const session = await PracticeSessionRepository.findIncompleteSessionByPageId(
    pageId,
    userId,
  );
  return { session };
}

async function getSession(userId: string, sessionId: string) {
  const session = await getSessionForUser(userId, sessionId);
  return { session };
}

async function getSessions(userId: string, pageId: string) {
  await ensurePageAccessWithSharing(pageId, userId);

  const sessions = await PracticeSessionRepository.findSessionsByPageId(
    pageId,
    userId,
  );
  return { sessions };
}

async function createSession(userId: string, data: CreatePracticeSessionInput) {
  await ensurePageAccessWithSharing(data.pageId, userId);

  const existingSession =
    await PracticeSessionRepository.findIncompleteSessionByPageId(
      data.pageId,
      userId,
    );
  if (existingSession) {
    await PracticeSessionRepository.updateSession(existingSession.id, userId, {
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
  await getSessionForUser(userId, data.id);

  await PracticeSessionRepository.updateSession(data.id, userId, {
    status: data.status,
    completedAt: data.completedAt,
  });

  return { success: true };
}

async function deleteSession(userId: string, sessionId: string) {
  await getSessionForUser(userId, sessionId);

  await PracticeSessionRepository.deleteSession(sessionId, userId);
  return { success: true };
}

async function createAnswer(userId: string, data: CreatePracticeAnswerInput) {
  await getSessionForUser(userId, data.sessionId);

  await PracticeAnswerRepository.deleteAnswerBySessionAndBlock(
    data.sessionId,
    data.blockId,
    userId,
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
  await getAnswerAndSessionForUser(userId, data.id);

  await PracticeAnswerRepository.updateAnswer(data.id, userId, {
    transcription: data.transcription,
    transcriptionStatus: data.transcriptionStatus,
  });

  return { success: true };
}

async function deleteAnswer(userId: string, data: DeletePracticeAnswerInput) {
  await getAnswerAndSessionForUser(userId, data.id);

  await PracticeAnswerRepository.deleteAnswer(data.id, userId);
  return { success: true };
}

async function saveRatings(
  userId: string,
  data: BatchCreatePracticeAnswerRatingsInput,
) {
  await getAnswerAndSessionForUser(userId, data.answerId);

  await PracticeRatingRepository.deleteRatingsByAnswerId(data.answerId, userId);
  await PracticeRatingRepository.batchCreateRatings(
    data.ratings.map(
      (r: { id: string; criterionId: string; rating: string }) => ({
        id: r.id,
        answerId: data.answerId,
        criterionId: r.criterionId,
        rating: r.rating,
      }),
    ),
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
