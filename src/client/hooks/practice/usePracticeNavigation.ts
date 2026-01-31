import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";

interface UsePracticeNavigationOptions {
  setCurrentQuestionIndex: Dispatch<SetStateAction<number>>;
  setCurrentReviewIndex: Dispatch<SetStateAction<number>>;
}

export function usePracticeNavigation({
  setCurrentQuestionIndex,
  setCurrentReviewIndex,
}: UsePracticeNavigationOptions) {
  const nextQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => prev + 1);
  }, [setCurrentQuestionIndex]);

  const skipQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => prev + 1);
  }, [setCurrentQuestionIndex]);

  const nextReview = useCallback(() => {
    setCurrentReviewIndex((prev) => prev + 1);
  }, [setCurrentReviewIndex]);

  return {
    nextQuestion,
    skipQuestion,
    nextReview,
  };
}
