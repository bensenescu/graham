import { PracticeRatingRepository } from "../repositories/PracticeRatingRepository";
import { PracticeSessionRepository } from "../repositories/PracticeSessionRepository";
import { ensurePageAccessWithSharing } from "./helpers/ensurePageAccess";

async function getBlockStats(userId: string, pageId: string) {
  await ensurePageAccessWithSharing(pageId, userId);

  const stats = await PracticeRatingRepository.getBlockPracticeStats(
    pageId,
    userId,
  );
  return { stats };
}

async function getLastPracticeDate(userId: string, pageId: string) {
  await ensurePageAccessWithSharing(pageId, userId);

  const sessions = await PracticeSessionRepository.findSessionsByPageId(
    pageId,
    userId,
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
