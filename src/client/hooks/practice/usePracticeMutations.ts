import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPracticeSession,
  updatePracticeSession,
  deletePracticeSession,
  createPracticeAnswer,
  updatePracticeAnswer,
  savePracticeAnswerRatings,
} from "@/serverFunctions/practice";

interface UsePracticeMutationsOptions {
  pageId: string;
}

/**
 * Hook for practice-related mutations.
 */
export function usePracticeMutations({ pageId }: UsePracticeMutationsOptions) {
  const queryClient = useQueryClient();

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

  const invalidateOnComplete = () => {
    queryClient.invalidateQueries({
      queryKey: ["practice-incomplete-session", pageId],
    });
    queryClient.invalidateQueries({ queryKey: ["practice-last-date", pageId] });
    queryClient.invalidateQueries({
      queryKey: ["practice-block-stats", pageId],
    });
  };

  return {
    createSessionMutation,
    updateSessionMutation,
    deleteSessionMutation,
    createAnswerMutation,
    updateAnswerMutation,
    saveRatingsMutation,
    invalidateOnComplete,
  };
}

export type UsePracticeMutationsReturn = ReturnType<
  typeof usePracticeMutations
>;
