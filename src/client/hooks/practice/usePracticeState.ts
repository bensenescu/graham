import { useCallback, useState } from "react";
import type { PracticePhase, PracticeSessionWithAnswers } from "./types";

export function usePracticeState() {
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<PracticePhase>("welcome");
  const [currentSession, setCurrentSession] =
    useState<PracticeSessionWithAnswers | null>(null);
  const [practiceQueue, setPracticeQueue] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const resetSessionState = useCallback(() => {
    setCurrentSession(null);
    setPracticeQueue([]);
    setCurrentQuestionIndex(0);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
    setPhase("welcome");
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setPhase("welcome");
    resetSessionState();
  }, [resetSessionState]);

  return {
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
    resetSessionState,
  };
}
