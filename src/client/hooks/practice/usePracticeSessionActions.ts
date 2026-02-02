import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { shuffle } from "remeda";
import type { PracticePhase, PracticeSessionWithAnswers } from "./types";
import type { UsePracticeMutationsReturn } from "./usePracticeMutations";

interface UsePracticeSessionActionsOptions {
  pageId: string;
  poolBlockIds: string[];
  incompleteSession: PracticeSessionWithAnswers | null;
  currentSession: PracticeSessionWithAnswers | null;
  setPhase: (phase: PracticePhase) => void;
  setCurrentSession: Dispatch<
    SetStateAction<PracticeSessionWithAnswers | null>
  >;
  setPracticeQueue: Dispatch<SetStateAction<string[]>>;
  setCurrentQuestionIndex: Dispatch<SetStateAction<number>>;
  mutations: UsePracticeMutationsReturn;
}

export function usePracticeSessionActions({
  pageId,
  poolBlockIds,
  incompleteSession,
  currentSession,
  setPhase,
  setCurrentSession,
  setPracticeQueue,
  setCurrentQuestionIndex,
  mutations,
}: UsePracticeSessionActionsOptions) {
  const {
    createSessionMutation,
    updateSessionMutation,
    deleteSessionMutation,
    invalidateOnComplete,
  } = mutations;

  const startNewSession = useCallback(async () => {
    const sessionId = crypto.randomUUID();
    await createSessionMutation.mutateAsync({
      data: { id: sessionId, pageId },
    });

    const shuffledQueue = shuffle(poolBlockIds);
    setPracticeQueue(shuffledQueue);
    setCurrentQuestionIndex(0);
    setCurrentSession({
      id: sessionId,
      pageId,
      status: "active",
      startedAt: new Date().toISOString(),
      completedAt: null,
      answers: [],
    });
    setPhase("practicing");
  }, [
    createSessionMutation,
    pageId,
    poolBlockIds,
    setPracticeQueue,
    setCurrentQuestionIndex,
    setCurrentSession,
    setPhase,
  ]);

  const resumeSession = useCallback(() => {
    if (!incompleteSession) return;

    const answeredBlockIds = new Set(
      incompleteSession.answers.map((a) => a.blockId),
    );
    const remainingBlocks = poolBlockIds.filter(
      (id) => !answeredBlockIds.has(id),
    );
    const shuffledRemaining = shuffle(remainingBlocks);
    setPracticeQueue(shuffledRemaining);
    setCurrentQuestionIndex(0);
    setCurrentSession(incompleteSession);
    setPhase("practicing");
  }, [
    incompleteSession,
    poolBlockIds,
    setPracticeQueue,
    setCurrentQuestionIndex,
    setCurrentSession,
    setPhase,
  ]);

  const discardSession = useCallback(async () => {
    if (incompleteSession) {
      await deleteSessionMutation.mutateAsync({
        data: { sessionId: incompleteSession.id },
      });
    }
    setCurrentSession(null);
    setPhase("welcome");
  }, [incompleteSession, deleteSessionMutation, setCurrentSession, setPhase]);

  const completeSession = useCallback(async () => {
    if (!currentSession) return;

    const completedAt = new Date().toISOString();

    await updateSessionMutation.mutateAsync({
      data: {
        id: currentSession.id,
        status: "completed",
        completedAt,
      },
    });

    setCurrentSession((prev) =>
      prev
        ? {
            ...prev,
            status: "completed",
            completedAt,
          }
        : prev,
    );
    setPhase("summary");
    invalidateOnComplete();
  }, [
    currentSession,
    updateSessionMutation,
    setCurrentSession,
    setPhase,
    invalidateOnComplete,
  ]);

  return {
    startNewSession,
    resumeSession,
    discardSession,
    completeSession,
  };
}
