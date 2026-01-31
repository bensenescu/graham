import { PracticeCriteriaService } from "./PracticeCriteriaService";
import { PracticeSessionService } from "./PracticeSessionService";
import { PracticeStatsService } from "./PracticeStatsService";

export const PracticeService = {
  ...PracticeCriteriaService,
  ...PracticeSessionService,
  ...PracticeStatsService,
} as const;
