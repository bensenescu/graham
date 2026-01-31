import { useState, useCallback } from "react";
import { shuffle } from "remeda";
import { usePracticeQueries } from "./usePracticeQueries";
import { usePracticeMutations } from "./usePracticeMutations";
import type { RatingValue } from "@/types/schemas/practice";
import type {
  PracticePhase,
  PracticeSessionWithAnswers,
  PracticeAnswerWithRatings,
  UsePracticeReturn,
} from "./types";

interface UsePracticeOptions {
  pageId: string;
}

/**
 * Hook for managing practice mode state and operations.
 * Composes smaller hooks for queries and mutations.
 */
export function usePractice({ pageId }: UsePracticeOptions): UsePracticeReturn {
  // UI State
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<PracticePhase>("welcome");
  const [currentSession, setCurrentSession] =
    useState<PracticeSessionWithAnswers | null>(null);
  const [practiceQueue, setPracticeQueue] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

  // Queries
  const queries = usePracticeQueries({ pageId, isOpen });
  const {
    criteria,
    poolBlockIds,
    lastPracticeDate,
    incompleteSession,
    isLoading,
    refetchCriteria,
    refetchPool,
  } = queries;

  // Mutations
  const mutations = usePracticeMutations({ pageId });
  const {
    createSessionMutation,
    updateSessionMutation,
    deleteSessionMutation,
    createAnswerMutation,
    updateAnswerMutation,
    saveRatingsMutation,
    invalidateOnComplete,
  } = mutations;

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
    const shuffledQueue = shuffle(poolBlockIds);
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
  }, [createSessionMutation, pageId, poolBlockIds]);

  const resumeSession = useCallback(() => {
    if (!incompleteSession) return;

    // Get answered block IDs
    const answeredBlockIds = new Set(
      incompleteSession.answers.map((a) => a.blockId),
    );

    // Build queue: unanswered blocks, shuffled
    const remainingBlocks = poolBlockIds.filter(
      (id) => !answeredBlockIds.has(id),
    );
    const shuffledRemaining = shuffle(remainingBlocks);
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
  }, [incompleteSession, poolBlockIds]);

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
            } as PracticeAnswerWithRatings,
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
    invalidateOnComplete();
  }, [currentSession, updateSessionMutation, invalidateOnComplete]);

  return {
    // State
    isOpen,
    phase,
    criteria,
    poolSize: poolBlockIds.length,
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
