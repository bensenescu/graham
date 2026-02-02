import { useRef, useState } from "react";
import { Mic, Square, SkipForward, ArrowRight, RotateCcw } from "lucide-react";
import { useAudioRecorder } from "@/client/hooks/useAudioRecorder";
import { useTranscription } from "@/client/hooks/useTranscription";
import type { PageBlock } from "@/types/schemas/pages";
import type { PracticeCriterion, RatingValue } from "@/types/schemas/practice";
import { LoadingSpinner } from "@/client/components/LoadingSpinner";
import { ProgressDots } from "./ProgressDots";

export interface PracticingPhaseProps {
  blocks: PageBlock[];
  practiceQueue: string[];
  currentIndex: number;
  answersCount: number;
  criteria: PracticeCriterion[];
  onRecordAnswer: (blockId: string, durationSeconds: number) => Promise<string>;
  onUpdateTranscription: (
    answerId: string,
    transcription: string | null,
    status: "completed" | "failed",
  ) => Promise<void>;
  onSaveRatings: (
    answerId: string,
    ratings: Array<{ criterionId: string; rating: RatingValue }>,
  ) => Promise<void>;
  onNext: () => void;
  onSkip: () => void;
  onFinish: () => Promise<void>;
}

export function PracticingPhase({
  blocks,
  practiceQueue,
  currentIndex,
  answersCount,
  criteria,
  onRecordAnswer,
  onUpdateTranscription,
  onSaveRatings,
  onNext,
  onSkip,
  onFinish,
}: PracticingPhaseProps) {
  const [hasRecorded, setHasRecorded] = useState(false);
  const [currentAnswerId, setCurrentAnswerId] = useState<string | null>(null);
  const [answeredIndexes, setAnsweredIndexes] = useState<number[]>([]);
  const [ratings, setRatings] = useState<Record<string, RatingValue>>({});
  const [isSavingRatings, setIsSavingRatings] = useState(false);
  const prevIndexRef = useRef(currentIndex);

  const recorder = useAudioRecorder({
    minDuration: 2,
    onTooShort: () => {
      // Error is shown via recorder.error
    },
  });

  const transcription = useTranscription();

  const currentBlockId = practiceQueue[currentIndex];
  const currentBlock = blocks.find((b) => b.id === currentBlockId);
  const isLastQuestion = currentIndex >= practiceQueue.length - 1;
  const hasMoreQuestions = currentIndex < practiceQueue.length;

  // Check if all criteria are rated
  const allRated = criteria.length > 0 && criteria.every((c) => ratings[c.id]);

  // Reset state when moving to a new question
  if (prevIndexRef.current !== currentIndex) {
    prevIndexRef.current = currentIndex;
    setHasRecorded(false);
    setCurrentAnswerId(null);
    setRatings({});
    recorder.reset();
    transcription.reset();
  }

  const handleStartRecording = async () => {
    await recorder.startRecording();
  };

  const handleStopRecording = async () => {
    const blob = await recorder.stopRecording();
    if (blob && currentBlockId) {
      setHasRecorded(true);
      setAnsweredIndexes((prev) => [...prev, currentIndex]);

      // Save the answer
      const answerId = await onRecordAnswer(currentBlockId, recorder.duration);
      setCurrentAnswerId(answerId);

      // Start transcription in background
      const text = await transcription.transcribe(blob);
      await onUpdateTranscription(
        answerId,
        text,
        text ? "completed" : "failed",
      );
    }
  };

  const handleReRecord = () => {
    setHasRecorded(false);
    setCurrentAnswerId(null);
    setRatings({});
    setAnsweredIndexes((prev) => prev.filter((i) => i !== currentIndex));
    recorder.reset();
    transcription.reset();
  };

  const handleRatingChange = (criterionId: string, value: RatingValue) => {
    setRatings((prev) => ({ ...prev, [criterionId]: value }));
  };

  const handleNext = async () => {
    if (!currentAnswerId || !allRated) return;

    setIsSavingRatings(true);
    await onSaveRatings(
      currentAnswerId,
      Object.entries(ratings).map(([criterionId, rating]) => ({
        criterionId,
        rating,
      })),
    );
    setIsSavingRatings(false);
    onNext();
  };

  const handleFinish = async () => {
    // Save ratings if we have an answer and ratings
    if (currentAnswerId && allRated) {
      setIsSavingRatings(true);
      await onSaveRatings(
        currentAnswerId,
        Object.entries(ratings).map(([criterionId, rating]) => ({
          criterionId,
          rating,
        })),
      );
      setIsSavingRatings(false);
    }
    await onFinish();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // No more questions
  if (!hasMoreQuestions) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-6">
            <svg
              className="w-8 h-8 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-2">All questions done!</h2>
          <p className="text-base-content/60 mb-8">
            You've completed all {practiceQueue.length} questions.
          </p>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 p-4 border-t border-base-300 bg-base-100">
          <button
            onClick={handleFinish}
            className="btn btn-primary w-full gap-2"
          >
            View Summary
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!currentBlock) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const isRecording = recorder.state === "recording";

  return (
    <div className="flex flex-col h-full">
      {/* Progress indicator */}
      <div className="p-4 flex justify-center border-b border-base-300/50">
        <ProgressDots
          total={practiceQueue.length}
          current={currentIndex}
          answeredIndexes={answeredIndexes}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col p-6 md:p-8 overflow-auto">
        {/* Question card */}
        <div className="max-w-2xl mx-auto w-full">
          <div className="text-xs uppercase tracking-wider text-base-content/40 mb-3">
            Question {currentIndex + 1}
          </div>

          <blockquote className="text-xl md:text-2xl font-medium leading-relaxed border-l-4 border-primary pl-4 md:pl-6">
            {currentBlock.question}
          </blockquote>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="max-w-2xl mx-auto w-full mt-12">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-error"></span>
                </span>
                <span className="text-3xl font-mono tabular-nums">
                  {formatDuration(recorder.duration)}
                </span>
              </div>
              <span className="text-sm text-base-content/50">Recording...</span>
            </div>
          </div>
        )}

        {/* After recording: show transcription and rating UI */}
        {hasRecorded && (
          <div className="max-w-2xl mx-auto w-full mt-8 space-y-6">
            {/* Transcription card - fixed min-height to prevent layout shift */}
            <div className="bg-base-200 rounded-lg p-4 min-h-[120px]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wider text-base-content/40 mb-2">
                    Your Answer
                  </div>
                  {transcription.state === "transcribing" ? (
                    <div className="flex items-center gap-2 text-base-content/60">
                      <LoadingSpinner size="sm" />
                      Transcribing...
                    </div>
                  ) : transcription.state === "failed" ? (
                    <div className="text-base-content/60 italic">
                      Transcription unavailable
                    </div>
                  ) : transcription.transcription ? (
                    <div className="text-base-content leading-relaxed">
                      {transcription.transcription}
                    </div>
                  ) : (
                    <div className="text-base-content/60 italic">
                      No transcription available
                    </div>
                  )}
                  <div className="text-xs text-base-content/40 mt-2">
                    {formatDuration(recorder.duration)} recorded
                  </div>
                </div>
                <button
                  onClick={handleReRecord}
                  className="btn btn-ghost btn-sm gap-1 flex-shrink-0"
                >
                  <RotateCcw className="w-3 h-3" />
                  Re-record
                </button>
              </div>
            </div>

            {/* Rating section */}
            <div>
              <div className="text-xs uppercase tracking-wider text-base-content/40 mb-4">
                How did that feel?
              </div>
              <div className="space-y-3">
                {criteria.map((criterion) => (
                  <div
                    key={criterion.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                  >
                    <div className="text-sm font-medium sm:w-28 flex-shrink-0">
                      {criterion.name}
                    </div>
                    <div className="flex gap-2 flex-1">
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
          </div>
        )}

        {/* Error message */}
        {recorder.error && (
          <div className="max-w-2xl mx-auto w-full mt-4">
            <div className="bg-error/10 border border-error/20 rounded-lg p-4 text-error text-sm">
              {recorder.error}
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer with actions */}
      <div className="sticky bottom-0 p-4 border-t border-base-300 bg-base-100">
        <div className="max-w-2xl mx-auto w-full">
          {isRecording ? (
            <button
              onClick={handleStopRecording}
              className="btn btn-outline w-full gap-2 border-error/50 text-error hover:bg-error hover:text-error-content hover:border-error"
            >
              <Square className="w-4 h-4" />
              Stop Recording
            </button>
          ) : !hasRecorded ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={handleStartRecording}
                className="btn btn-primary btn-lg gap-2 flex-1 sm:flex-none"
              >
                <Mic className="w-5 h-5" />
                Start Recording
              </button>

              <button
                onClick={onSkip}
                className="btn btn-ghost gap-1 text-base-content/50"
              >
                <SkipForward className="w-4 h-4" />
                Skip Question
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={handleNext}
                disabled={!allRated || isSavingRatings}
                className="btn btn-primary flex-1 gap-2"
              >
                {isSavingRatings ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    {isLastQuestion ? "Finish" : "Next Question"}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {answersCount > 0 && !isLastQuestion && (
                <button
                  onClick={handleFinish}
                  disabled={isSavingRatings}
                  className="btn btn-outline flex-1 sm:flex-none"
                >
                  Finish Early
                </button>
              )}
            </div>
          )}
        </div>
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
  const baseClasses = "btn btn-sm flex-1 transition-all duration-200";

  const styles: Record<string, string> = {
    "1": selected
      ? "bg-warning text-warning-content border-warning hover:bg-warning/90"
      : "btn-outline border-base-300 hover:border-warning hover:bg-warning/10",
    "2": selected
      ? "bg-info text-info-content border-info hover:bg-info/90"
      : "btn-outline border-base-300 hover:border-info hover:bg-info/10",
    "3": selected
      ? "bg-success text-success-content border-success hover:bg-success/90"
      : "btn-outline border-base-300 hover:border-success hover:bg-success/10",
  };

  return (
    <button onClick={onClick} className={`${baseClasses} ${styles[value]}`}>
      {label}
    </button>
  );
}
