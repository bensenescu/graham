import type {
  PracticeCriterion,
  PracticeSession,
  PracticeAnswer,
  PracticeAnswerRating,
  RatingValue,
} from "@/types/schemas/practice";

/**
 * Practice phase states.
 */
export type PracticePhase =
  | "welcome"
  | "practicing"
  | "summary"
  | "pool-settings";

/**
 * Practice answer with ratings attached.
 */
export interface PracticeAnswerWithRatings extends PracticeAnswer {
  ratings: PracticeAnswerRating[];
}

/**
 * Practice session with answers attached.
 */
export interface PracticeSessionWithAnswers extends PracticeSession {
  answers: PracticeAnswerWithRatings[];
}

/**
 * Return type for usePractice hook.
 */
export interface UsePracticeReturn {
  // State
  isOpen: boolean;
  phase: PracticePhase;
  criteria: PracticeCriterion[];
  poolSize: number;
  lastPracticeDate: string | null;
  incompleteSession: PracticeSessionWithAnswers | null;
  currentSession: PracticeSessionWithAnswers | null;
  currentQuestionIndex: number;
  practiceQueue: string[]; // blockIds to practice
  isLoading: boolean;

  // Actions
  open: () => void;
  close: () => void;
  setPhase: (phase: PracticePhase) => void;
  startNewSession: () => Promise<void>;
  resumeSession: () => void;
  discardSession: () => Promise<void>;
  recordAnswer: (blockId: string, durationSeconds: number) => Promise<string>; // returns answerId
  updateTranscription: (
    answerId: string,
    transcription: string | null,
    status: "completed" | "failed",
  ) => Promise<void>;
  nextQuestion: () => void;
  skipQuestion: () => void;
  saveRatings: (
    answerId: string,
    ratings: Array<{ criterionId: string; rating: RatingValue }>,
  ) => Promise<void>;
  completeSession: () => Promise<void>;
  refetchCriteria: () => void;
  refetchPool: () => void;
}
