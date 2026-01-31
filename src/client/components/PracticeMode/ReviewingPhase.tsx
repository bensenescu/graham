import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { usePractice } from "@/client/hooks/practice";
import type { PageBlock } from "@/types/schemas/pages";
import type { RatingValue, PracticeCriterion } from "@/types/schemas/practice";
import { LoadingSpinner } from "@/client/components/LoadingSpinner";

export interface ReviewingPhaseProps {
  blocks: PageBlock[];
  session: ReturnType<typeof usePractice>["currentSession"];
  criteria: PracticeCriterion[];
  currentIndex: number;
  onSaveRatings: (
    answerId: string,
    ratings: Array<{ criterionId: string; rating: RatingValue }>,
  ) => Promise<void>;
  onNext: () => void;
  onComplete: () => Promise<void>;
}

export function ReviewingPhase({
  blocks,
  session,
  criteria,
  currentIndex,
  onSaveRatings,
  onNext,
  onComplete,
}: ReviewingPhaseProps) {
  const [ratings, setRatings] = useState<Record<string, RatingValue>>({});
  const [showWrittenAnswer, setShowWrittenAnswer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const answers = session?.answers ?? [];
  const currentAnswer = answers[currentIndex];
  const currentBlock = currentAnswer
    ? blocks.find((b) => b.id === currentAnswer.blockId)
    : null;
  const isLastReview = currentIndex >= answers.length - 1;

  // Reset ratings when moving to a new answer
  useEffect(() => {
    setRatings({});
    setShowWrittenAnswer(false);
  }, [currentIndex]);

  const allRated = criteria.every((c) => ratings[c.id]);

  const handleRatingChange = (criterionId: string, value: RatingValue) => {
    setRatings((prev) => ({ ...prev, [criterionId]: value }));
  };

  const handleNext = async () => {
    if (!currentAnswer || !allRated) return;

    setIsSaving(true);
    await onSaveRatings(
      currentAnswer.id,
      Object.entries(ratings).map(([criterionId, rating]) => ({
        criterionId,
        rating,
      })),
    );
    setIsSaving(false);

    if (isLastReview) {
      await onComplete();
    } else {
      onNext();
    }
  };

  if (!currentAnswer || !currentBlock) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-8 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="text-sm text-base-content/60 mb-4 text-center">
        Review {currentIndex + 1} of {answers.length}
      </div>

      {/* Question */}
      <div className="text-lg font-medium mb-4">"{currentBlock.question}"</div>

      {/* Transcription */}
      <div className="bg-base-200 rounded-lg p-4 mb-4">
        <div className="text-sm text-base-content/60 mb-2">Your answer:</div>
        {currentAnswer.transcriptionStatus === "pending" ? (
          <div className="flex items-center gap-2 text-base-content/60">
            <LoadingSpinner size="sm" />
            Transcribing...
          </div>
        ) : currentAnswer.transcriptionStatus === "failed" ? (
          <div className="text-warning">
            Transcription failed. Rate based on how you felt about your answer.
          </div>
        ) : (
          <div className="text-base-content">
            "{currentAnswer.transcription}"
          </div>
        )}
      </div>

      {/* Show written answer toggle */}
      <button
        onClick={() => setShowWrittenAnswer(!showWrittenAnswer)}
        className="btn btn-ghost btn-sm self-start mb-4"
      >
        {showWrittenAnswer ? (
          <EyeOff className="h-4 w-4 mr-1" />
        ) : (
          <Eye className="h-4 w-4 mr-1" />
        )}
        {showWrittenAnswer ? "Hide" : "Show"} written answer
      </button>

      {showWrittenAnswer && currentBlock.answer && (
        <div className="bg-base-200 rounded-lg p-4 mb-4 border-l-4 border-primary">
          <div className="text-sm text-base-content/60 mb-2">
            Written answer:
          </div>
          <div className="text-base-content">{currentBlock.answer}</div>
        </div>
      )}

      {/* Ratings */}
      <div className="border-t border-base-300 pt-4 mb-6">
        <div className="text-sm font-medium mb-4">Rate your response:</div>
        <div className="space-y-4">
          {criteria.map((criterion) => (
            <div key={criterion.id} className="flex items-center gap-4">
              <div className="w-32 text-sm">{criterion.name}</div>
              <div className="flex gap-2">
                <RatingButton
                  label="Needs Work"
                  value="1"
                  selected={ratings[criterion.id] === "1"}
                  onClick={() => handleRatingChange(criterion.id, "1")}
                />
                <RatingButton
                  label="OK"
                  value="2"
                  selected={ratings[criterion.id] === "2"}
                  onClick={() => handleRatingChange(criterion.id, "2")}
                />
                <RatingButton
                  label="Great"
                  value="3"
                  selected={ratings[criterion.id] === "3"}
                  onClick={() => handleRatingChange(criterion.id, "3")}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next button */}
      <div className="mt-auto">
        <button
          onClick={handleNext}
          disabled={!allRated || isSaving}
          className="btn btn-primary w-full"
        >
          {isSaving ? (
            <LoadingSpinner size="sm" />
          ) : isLastReview ? (
            "Complete Session"
          ) : (
            "Next Review"
          )}
        </button>
      </div>
    </div>
  );
}

function RatingButton({
  label,
  value,
  selected,
  onClick,
}: {
  label: string;
  value: string;
  selected: boolean;
  onClick: () => void;
}) {
  const colors: Record<string, string> = {
    "1": selected ? "btn-warning" : "btn-outline",
    "2": selected ? "btn-info" : "btn-outline",
    "3": selected ? "btn-success" : "btn-outline",
  };

  return (
    <button onClick={onClick} className={`btn btn-sm ${colors[value]}`}>
      {label}
    </button>
  );
}
