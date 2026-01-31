import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { RatingValue } from "@/types/schemas/practice";
import type {
  PracticeAnswerWithRatings,
  PracticeSessionWithAnswers,
} from "./types";
import type { UsePracticeMutationsReturn } from "./usePracticeMutations";

interface UsePracticeAnswerActionsOptions {
  currentSession: PracticeSessionWithAnswers | null;
  setCurrentSession: Dispatch<
    SetStateAction<PracticeSessionWithAnswers | null>
  >;
  mutations: UsePracticeMutationsReturn;
}

export function usePracticeAnswerActions({
  currentSession,
  setCurrentSession,
  mutations,
}: UsePracticeAnswerActionsOptions) {
  const { createAnswerMutation, updateAnswerMutation, saveRatingsMutation } =
    mutations;

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

      setCurrentSession((prev) => {
        if (!prev) return prev;
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
    [currentSession, createAnswerMutation, setCurrentSession],
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
    [updateAnswerMutation, setCurrentSession],
  );

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
    [saveRatingsMutation, setCurrentSession],
  );

  return {
    recordAnswer,
    updateTranscription,
    saveRatings,
  };
}
