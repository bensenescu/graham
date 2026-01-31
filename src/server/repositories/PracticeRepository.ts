import { PracticeCriteriaRepository } from "./PracticeCriteriaRepository";
import { PracticePoolRepository } from "./PracticePoolRepository";
import { PracticeSessionRepository } from "./PracticeSessionRepository";
import { PracticeAnswerRepository } from "./PracticeAnswerRepository";
import { PracticeRatingRepository } from "./PracticeRatingRepository";

export const PracticeRepository = {
  ...PracticeCriteriaRepository,
  ...PracticePoolRepository,
  ...PracticeSessionRepository,
  ...PracticeAnswerRepository,
  ...PracticeRatingRepository,
} as const;
