import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

interface UsePracticeNavigationOptions {
  setCurrentQuestionIndex: Dispatch<SetStateAction<number>>;
}

export function usePracticeNavigation({
  setCurrentQuestionIndex,
}: UsePracticeNavigationOptions) {
  const nextQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => prev + 1);
  }, [setCurrentQuestionIndex]);

  const skipQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => prev + 1);
  }, [setCurrentQuestionIndex]);

  return {
    nextQuestion,
    skipQuestion,
  };
}
