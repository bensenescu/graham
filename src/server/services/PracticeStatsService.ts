import { PracticeRatingRepository } from "../repositories/PracticeRatingRepository";
import { PracticeSessionRepository } from "../repositories/PracticeSessionRepository";
import { ensurePageAccess } from "./helpers/ensurePageAccess";

async function getBlockStats(userId: string, pageId: string) {
  await ensurePageAccess(pageId, userId);

  const stats = await PracticeRatingRepository.getBlockPracticeStats(pageId);
  return { stats };
}

async function getLastPracticeDate(userId: string, pageId: string) {
  await ensurePageAccess(pageId, userId);

  const sessions = await PracticeSessionRepository.findSessionsByPageId(
    pageId,
    1,
  );
  const lastSession = sessions[0];

  return {
    lastPracticeDate:
      lastSession?.completedAt || lastSession?.startedAt || null,
  };
}

export const PracticeStatsService = {
  getBlockStats,
  getLastPracticeDate,
} as const;
