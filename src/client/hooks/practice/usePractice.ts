import { usePracticeQueries } from "./usePracticeQueries";
import { usePracticeMutations } from "./usePracticeMutations";
import { usePracticeState } from "./usePracticeState";
import { usePracticeSessionActions } from "./usePracticeSessionActions";
import { usePracticeAnswerActions } from "./usePracticeAnswerActions";
import { usePracticeNavigation } from "./usePracticeNavigation";
import type { UsePracticeReturn } from "./types";

interface UsePracticeOptions {
  pageId: string;
}

/**
 * Hook for managing practice mode state and operations.
 * Composes smaller hooks for queries and mutations.
 */
export function usePractice({ pageId }: UsePracticeOptions): UsePracticeReturn {
  const {
    isOpen,
    phase,
    currentSession,
    practiceQueue,
    currentQuestionIndex,
    setPhase,
    setCurrentSession,
    setPracticeQueue,
    setCurrentQuestionIndex,
    open,
    close,
  } = usePracticeState();

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

  const { startNewSession, resumeSession, discardSession, completeSession } =
    usePracticeSessionActions({
      pageId,
      poolBlockIds,
      incompleteSession,
      currentSession,
      setPhase,
      setCurrentSession,
      setPracticeQueue,
      setCurrentQuestionIndex,
      mutations,
    });

  const { recordAnswer, updateTranscription, saveRatings } =
    usePracticeAnswerActions({
      currentSession,
      setCurrentSession,
      mutations,
    });

  const { nextQuestion, skipQuestion } = usePracticeNavigation({
    setCurrentQuestionIndex,
  });

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
    saveRatings,
    completeSession,
    refetchCriteria,
    refetchPool,
  };
}
