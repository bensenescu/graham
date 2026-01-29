import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPracticeCriteria,
  getPracticePool,
  getIncompleteSession,
  createPracticeSession,
  updatePracticeSession,
  deletePracticeSession,
  createPracticeAnswer,
  updatePracticeAnswer,
  savePracticeAnswerRatings,
  getLastPracticeDate,
  getPracticeBlockStats,
} from "@/serverFunctions/practice";
import type {
  PracticeCriterion,
  PracticeSession,
  PracticeAnswer,
  PracticeAnswerRating,
  RatingValue,
} from "@/types/schemas/practice";

// Types for session state
export type PracticePhase =
  | "welcome"
  | "practicing"
  | "reviewing"
  | "summary"
  | "pool-settings";

export interface PracticeAnswerWithRatings extends PracticeAnswer {
  ratings: PracticeAnswerRating[];
}

export interface PracticeSessionWithAnswers extends PracticeSession {
  answers: PracticeAnswerWithRatings[];
}

interface UsePracticeOptions {
  pageId: string;
}

interface UsePracticeReturn {
  // State
  isOpen: boolean;
  phase: PracticePhase;
  criteria: PracticeCriterion[];
  poolSize: number;
  lastPracticeDate: string | null;
  incompleteSession: PracticeSessionWithAnswers | null;
  currentSession: PracticeSessionWithAnswers | null;
  currentQuestionIndex: number;
  currentReviewIndex: number;
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
  goToReview: () => void;
  saveRatings: (
    answerId: string,
    ratings: Array<{ criterionId: string; rating: RatingValue }>,
  ) => Promise<void>;
  nextReview: () => void;
  completeSession: () => Promise<void>;
  refetchCriteria: () => void;
  refetchPool: () => void;
}

/**
 * Hook for managing practice mode state and operations.
 */
export function usePractice({ pageId }: UsePracticeOptions): UsePracticeReturn {
  const queryClient = useQueryClient();

  // UI State
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<PracticePhase>("welcome");
  const [currentSession, setCurrentSession] =
    useState<PracticeSessionWithAnswers | null>(null);
  const [practiceQueue, setPracticeQueue] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

  // Fetch criteria
  const { data: criteriaData, refetch: refetchCriteria } = useQuery({
    queryKey: ["practice-criteria"],
    queryFn: () => getPracticeCriteria(),
  });

  // Fetch practice pool
  const { data: poolData, refetch: refetchPool } = useQuery({
    queryKey: ["practice-pool", pageId],
    queryFn: () => getPracticePool({ data: { pageId } }),
    enabled: !!pageId,
  });

  // Fetch incomplete session
  const { data: incompleteData, isLoading: isLoadingIncomplete } = useQuery({
    queryKey: ["practice-incomplete-session", pageId],
    queryFn: () => getIncompleteSession({ data: { pageId } }),
    enabled: !!pageId && isOpen,
  });

  // Fetch last practice date
  const { data: lastPracticeDateData } = useQuery({
    queryKey: ["practice-last-date", pageId],
    queryFn: () => getLastPracticeDate({ data: { pageId } }),
    enabled: !!pageId,
  });

  // Fetch block stats
  const { data: statsData } = useQuery({
    queryKey: ["practice-block-stats", pageId],
    queryFn: () => getPracticeBlockStats({ data: { pageId } }),
    enabled: !!pageId,
  });

  // Mutations
  const createSessionMutation = useMutation({
    mutationFn: createPracticeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["practice-incomplete-session", pageId],
      });
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: updatePracticeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["practice-incomplete-session", pageId],
      });
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: deletePracticeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["practice-incomplete-session", pageId],
      });
    },
  });

  const createAnswerMutation = useMutation({
    mutationFn: createPracticeAnswer,
  });

  const updateAnswerMutation = useMutation({
    mutationFn: updatePracticeAnswer,
  });

  const saveRatingsMutation = useMutation({
    mutationFn: savePracticeAnswerRatings,
  });

  // Derived state
  const criteria = criteriaData?.criteria ?? [];
  const poolSize = poolData?.blockIds.length ?? 0;
  const lastPracticeDate = lastPracticeDateData?.lastPracticeDate ?? null;
  const incompleteSession =
    (incompleteData?.session as PracticeSessionWithAnswers | null) ?? null;
  const isLoading = isLoadingIncomplete;

  // Shuffle array helper
  const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Actions
  const open = useCallback(() => {
    setIsOpen(true);
    setPhase("welcome");
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setPhase("welcome");
    setCurrentSession(null);
    setPracticeQueue([]);
    setCurrentQuestionIndex(0);
    setCurrentReviewIndex(0);
  }, []);

  const startNewSession = useCallback(async () => {
    const sessionId = crypto.randomUUID();
    await createSessionMutation.mutateAsync({
      data: { id: sessionId, pageId },
    });

    // Shuffle the pool for random order
    const shuffledQueue = shuffleArray(poolData?.blockIds ?? []);
    setPracticeQueue(shuffledQueue);
    setCurrentQuestionIndex(0);
    setCurrentReviewIndex(0);
    setCurrentSession({
      id: sessionId,
      pageId,
      status: "active",
      startedAt: new Date().toISOString(),
      completedAt: null,
      answers: [],
    });
    setPhase("practicing");
  }, [createSessionMutation, pageId, poolData?.blockIds]);

  const resumeSession = useCallback(() => {
    if (!incompleteSession) return;

    // Get answered block IDs
    const answeredBlockIds = new Set(
      incompleteSession.answers.map((a) => a.blockId),
    );

    // Build queue: unanswered blocks, shuffled
    const remainingBlocks = (poolData?.blockIds ?? []).filter(
      (id) => !answeredBlockIds.has(id),
    );
    const shuffledRemaining = shuffleArray(remainingBlocks);
    setPracticeQueue(shuffledRemaining);
    setCurrentQuestionIndex(0);
    setCurrentReviewIndex(0);
    setCurrentSession(incompleteSession);

    // Resume at appropriate phase
    if (incompleteSession.status === "reviewing") {
      // Find first unrated answer
      const firstUnrated = incompleteSession.answers.findIndex(
        (a) => a.ratings.length === 0,
      );
      setCurrentReviewIndex(firstUnrated >= 0 ? firstUnrated : 0);
      setPhase("reviewing");
    } else {
      setPhase("practicing");
    }
  }, [incompleteSession, poolData?.blockIds]);

  const discardSession = useCallback(async () => {
    if (incompleteSession) {
      await deleteSessionMutation.mutateAsync({
        data: { sessionId: incompleteSession.id },
      });
    }
    setCurrentSession(null);
    setPhase("welcome");
  }, [incompleteSession, deleteSessionMutation]);

  const recordAnswer = useCallback(
    async (blockId: string, durationSeconds: number): Promise<string> => {
      if (!currentSession) throw new Error("No active session");

      const answerId = crypto.randomUUID();
      await createAnswerMutation.mutateAsync({
        data: {
          id: answerId,
          sessionId: currentSession.id,
          blockId,
          durationSeconds,
        },
      });

      // Update local state
      setCurrentSession((prev) => {
        if (!prev) return prev;
        // Remove existing answer for this block if re-recording
        const filteredAnswers = prev.answers.filter(
          (a) => a.blockId !== blockId,
        );
        return {
          ...prev,
          answers: [
            ...filteredAnswers,
            {
              id: answerId,
              sessionId: prev.id,
              blockId,
              transcription: null,
              transcriptionStatus: "pending",
              durationSeconds: String(durationSeconds),
              ratings: [],
            },
          ],
        };
      });

      return answerId;
    },
    [currentSession, createAnswerMutation],
  );

  const updateTranscription = useCallback(
    async (
      answerId: string,
      transcription: string | null,
      status: "completed" | "failed",
    ) => {
      await updateAnswerMutation.mutateAsync({
        data: {
          id: answerId,
          transcription,
          transcriptionStatus: status,
        },
      });

      // Update local state
      setCurrentSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          answers: prev.answers.map((a) =>
            a.id === answerId
              ? { ...a, transcription, transcriptionStatus: status }
              : a,
          ),
        };
      });
    },
    [updateAnswerMutation],
  );

  const nextQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => prev + 1);
  }, []);

  const skipQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => prev + 1);
  }, []);

  const goToReview = useCallback(async () => {
    if (!currentSession) return;

    // Update session status to reviewing
    await updateSessionMutation.mutateAsync({
      data: {
        id: currentSession.id,
        status: "reviewing",
      },
    });

    setCurrentSession((prev) =>
      prev ? { ...prev, status: "reviewing" } : prev,
    );
    setCurrentReviewIndex(0);
    setPhase("reviewing");
  }, [currentSession, updateSessionMutation]);

  const saveRatings = useCallback(
    async (
      answerId: string,
      ratings: Array<{ criterionId: string; rating: RatingValue }>,
    ) => {
      await saveRatingsMutation.mutateAsync({
        data: {
          answerId,
          ratings: ratings.map((r) => ({
            id: crypto.randomUUID(),
            criterionId: r.criterionId,
            rating: r.rating,
          })),
        },
      });

      // Update local state
      setCurrentSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          answers: prev.answers.map((a) =>
            a.id === answerId
              ? {
                  ...a,
                  ratings: ratings.map((r) => ({
                    id: crypto.randomUUID(),
                    answerId,
                    criterionId: r.criterionId,
                    rating: r.rating,
                  })),
                }
              : a,
          ),
        };
      });
    },
    [saveRatingsMutation],
  );

  const nextReview = useCallback(() => {
    setCurrentReviewIndex((prev) => prev + 1);
  }, []);

  const completeSession = useCallback(async () => {
    if (!currentSession) return;

    await updateSessionMutation.mutateAsync({
      data: {
        id: currentSession.id,
        status: "completed",
        completedAt: new Date().toISOString(),
      },
    });

    setCurrentSession((prev) =>
      prev
        ? {
            ...prev,
            status: "completed",
            completedAt: new Date().toISOString(),
          }
        : prev,
    );
    setPhase("summary");

    // Invalidate queries
    queryClient.invalidateQueries({
      queryKey: ["practice-incomplete-session", pageId],
    });
    queryClient.invalidateQueries({ queryKey: ["practice-last-date", pageId] });
    queryClient.invalidateQueries({
      queryKey: ["practice-block-stats", pageId],
    });
  }, [currentSession, updateSessionMutation, queryClient, pageId]);

  return {
    // State
    isOpen,
    phase,
    criteria,
    poolSize,
    lastPracticeDate,
    incompleteSession,
    currentSession,
    currentQuestionIndex,
    currentReviewIndex,
    practiceQueue,
    isLoading,

    // Actions
    open,
    close,
    setPhase,
    startNewSession,
    resumeSession,
    discardSession,
    recordAnswer,
    updateTranscription,
    nextQuestion,
    skipQuestion,
    goToReview,
    saveRatings,
    nextReview,
    completeSession,
    refetchCriteria,
    refetchPool,
  };
}
