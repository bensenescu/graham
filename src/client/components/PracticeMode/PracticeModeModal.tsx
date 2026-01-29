import { useEffect, useCallback, useState, useMemo } from "react";
import { X, Mic, Square, SkipForward, Play, Eye, EyeOff } from "lucide-react";
import { usePractice, type PracticePhase } from "@/client/hooks/usePractice";
import { useAudioRecorder } from "@/client/hooks/useAudioRecorder";
import { useTranscription } from "@/client/hooks/useTranscription";
import type { PageBlock } from "@/types/schemas/pages";
import type { RatingValue, PracticeCriterion } from "@/types/schemas/practice";

interface PracticeModeModalProps {
  pageId: string;
  blocks: PageBlock[];
  isOpen: boolean;
  onClose: () => void;
}

export function PracticeModeModal({
  pageId,
  blocks,
  isOpen,
  onClose,
}: PracticeModeModalProps) {
  const practice = usePractice({ pageId });

  // Sync open state
  useEffect(() => {
    if (isOpen && !practice.isOpen) {
      practice.open();
    } else if (!isOpen && practice.isOpen) {
      practice.close();
    }
  }, [isOpen, practice]);

  const handleClose = useCallback(() => {
    practice.close();
    onClose();
  }, [practice, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-base-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-base-300">
        <h1 className="text-xl font-semibold">Practice Mode</h1>
        <button
          onClick={handleClose}
          className="btn btn-ghost btn-sm btn-square"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {practice.phase === "welcome" && (
          <WelcomePhase
            poolSize={practice.poolSize}
            lastPracticeDate={practice.lastPracticeDate}
            incompleteSession={practice.incompleteSession}
            isLoading={practice.isLoading}
            onStartNew={practice.startNewSession}
            onResume={practice.resumeSession}
            onDiscard={practice.discardSession}
            onManagePool={() => practice.setPhase("pool-settings")}
          />
        )}

        {practice.phase === "practicing" && (
          <PracticingPhase
            blocks={blocks}
            practiceQueue={practice.practiceQueue}
            currentIndex={practice.currentQuestionIndex}
            answersCount={practice.currentSession?.answers.length ?? 0}
            onRecordAnswer={practice.recordAnswer}
            onUpdateTranscription={practice.updateTranscription}
            onNext={practice.nextQuestion}
            onSkip={practice.skipQuestion}
            onGoToReview={async () => {
              await practice.goToReview();
            }}
          />
        )}

        {practice.phase === "reviewing" && (
          <ReviewingPhase
            blocks={blocks}
            session={practice.currentSession}
            criteria={practice.criteria}
            currentIndex={practice.currentReviewIndex}
            onSaveRatings={practice.saveRatings}
            onNext={practice.nextReview}
            onComplete={practice.completeSession}
          />
        )}

        {practice.phase === "summary" && (
          <SummaryPhase
            session={practice.currentSession}
            criteria={practice.criteria}
            blocks={blocks}
            onDone={handleClose}
            onPracticeMore={async () => {
              await practice.startNewSession();
            }}
          />
        )}
      </div>
    </div>
  );
}

// === Welcome Phase ===

interface WelcomePhaseProps {
  poolSize: number;
  lastPracticeDate: string | null;
  incompleteSession: ReturnType<typeof usePractice>["incompleteSession"];
  isLoading: boolean;
  onStartNew: () => Promise<void>;
  onResume: () => void;
  onDiscard: () => Promise<void>;
  onManagePool: () => void;
}

function WelcomePhase({
  poolSize,
  lastPracticeDate,
  incompleteSession,
  isLoading,
  onStartNew,
  onResume,
  onDiscard,
  onManagePool,
}: WelcomePhaseProps) {
  const [isStarting, setIsStarting] = useState(false);

  const handleStartNew = async () => {
    setIsStarting(true);
    await onStartNew();
    setIsStarting(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "just now";
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  // Show resume prompt if incomplete session exists
  if (incompleteSession) {
    const answersCount = incompleteSession.answers.length;
    const ratedCount = incompleteSession.answers.filter(
      (a) => a.ratings.length > 0,
    ).length;

    return (
      <div className="flex flex-col items-center justify-center h-full p-8 max-w-md mx-auto text-center">
        <h2 className="text-2xl font-semibold mb-4">
          You have an unfinished session
        </h2>
        <p className="text-base-content/70 mb-2">
          from {formatDate(incompleteSession.startedAt)}
        </p>
        <ul className="text-sm text-base-content/60 mb-6">
          <li>
            {answersCount} answer{answersCount !== 1 ? "s" : ""} recorded
          </li>
          <li>
            {ratedCount} answer{ratedCount !== 1 ? "s" : ""} rated
          </li>
        </ul>

        <div className="flex gap-3 mb-4">
          <button onClick={onResume} className="btn btn-primary">
            Continue
          </button>
          <button onClick={handleStartNew} className="btn btn-outline">
            Start Fresh
          </button>
        </div>

        <button
          onClick={onDiscard}
          className="btn btn-ghost btn-sm text-base-content/50"
        >
          Discard unfinished session
        </button>
      </div>
    );
  }

  // Normal welcome screen
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 max-w-md mx-auto text-center">
      <h2 className="text-2xl font-semibold mb-4">Practice Mode</h2>
      <p className="text-base-content/70 mb-2">
        {poolSize} question{poolSize !== 1 ? "s" : ""} in your practice pool
      </p>
      {lastPracticeDate && (
        <p className="text-sm text-base-content/50 mb-6">
          Last practiced: {formatDate(lastPracticeDate)}
        </p>
      )}

      {poolSize === 0 ? (
        <div className="text-center">
          <p className="text-base-content/60 mb-4">
            No questions available to practice.
          </p>
          <button onClick={onManagePool} className="btn btn-primary">
            Manage Pool
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            onClick={handleStartNew}
            disabled={isStarting}
            className="btn btn-primary"
          >
            {isStarting ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              "Start Practicing"
            )}
          </button>
          <button onClick={onManagePool} className="btn btn-outline">
            Manage Pool
          </button>
        </div>
      )}
    </div>
  );
}

// === Practicing Phase ===

interface PracticingPhaseProps {
  blocks: PageBlock[];
  practiceQueue: string[];
  currentIndex: number;
  answersCount: number;
  onRecordAnswer: (blockId: string, durationSeconds: number) => Promise<string>;
  onUpdateTranscription: (
    answerId: string,
    transcription: string | null,
    status: "completed" | "failed",
  ) => Promise<void>;
  onNext: () => void;
  onSkip: () => void;
  onGoToReview: () => Promise<void>;
}

function PracticingPhase({
  blocks,
  practiceQueue,
  currentIndex,
  answersCount,
  onRecordAnswer,
  onUpdateTranscription,
  onNext,
  onSkip,
  onGoToReview,
}: PracticingPhaseProps) {
  const [hasRecorded, setHasRecorded] = useState(false);
  const [currentAnswerId, setCurrentAnswerId] = useState<string | null>(null);

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

  // Reset state when moving to a new question
  useEffect(() => {
    setHasRecorded(false);
    setCurrentAnswerId(null);
    recorder.reset();
    transcription.reset();
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStartRecording = async () => {
    await recorder.startRecording();
  };

  const handleStopRecording = async () => {
    const blob = await recorder.stopRecording();
    if (blob && currentBlockId) {
      setHasRecorded(true);

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
    recorder.reset();
    transcription.reset();
  };

  const handleNext = () => {
    onNext();
  };

  const handleGoToReview = async () => {
    await onGoToReview();
  };

  // No more questions
  if (!hasMoreQuestions) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 max-w-md mx-auto text-center">
        <h2 className="text-2xl font-semibold mb-4">All done!</h2>
        <p className="text-base-content/70 mb-6">
          You've gone through all the questions.
        </p>
        <button onClick={handleGoToReview} className="btn btn-primary">
          Review & Finish ({answersCount})
        </button>
      </div>
    );
  }

  if (!currentBlock) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="text-sm text-base-content/60 mb-8">
        Question {currentIndex + 1} of {practiceQueue.length}
      </div>

      {/* Question */}
      <div className="text-xl font-medium text-center mb-12 max-w-lg">
        "{currentBlock.question}"
      </div>

      {/* Recording UI */}
      {!hasRecorded ? (
        <div className="flex flex-col items-center">
          {recorder.state === "idle" && (
            <>
              <button
                onClick={handleStartRecording}
                className="btn btn-primary btn-lg gap-2"
              >
                <Mic className="h-5 w-5" />
                Start Recording
              </button>
              {recorder.error && (
                <p className="text-error text-sm mt-4">{recorder.error}</p>
              )}
            </>
          )}

          {recorder.state === "recording" && (
            <>
              <button
                onClick={handleStopRecording}
                className="btn btn-error btn-lg gap-2"
              >
                <Square className="h-5 w-5" />
                Done ({formatDuration(recorder.duration)})
              </button>
              <p className="text-base-content/60 text-sm mt-4">
                Recording... speak your answer
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="text-success mb-4">
            Answer recorded ({formatDuration(recorder.duration)})
          </div>

          <div className="flex gap-3 mb-4">
            <button onClick={handleNext} className="btn btn-primary">
              {isLastQuestion ? "Finish" : "Next Question"}
            </button>
            {answersCount > 0 && (
              <button onClick={handleGoToReview} className="btn btn-outline">
                Review & Finish ({answersCount})
              </button>
            )}
          </div>

          <button
            onClick={handleReRecord}
            className="btn btn-ghost btn-sm text-base-content/50"
          >
            Re-record
          </button>
        </div>
      )}

      {/* Skip button */}
      {!hasRecorded && recorder.state === "idle" && (
        <button
          onClick={onSkip}
          className="btn btn-ghost btn-sm text-base-content/50 mt-8"
        >
          <SkipForward className="h-4 w-4 mr-1" />
          Skip Question
        </button>
      )}
    </div>
  );
}

// === Reviewing Phase ===

interface ReviewingPhaseProps {
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

function ReviewingPhase({
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
        <span className="loading loading-spinner loading-lg" />
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
            <span className="loading loading-spinner loading-sm" />
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
            <span className="loading loading-spinner loading-sm" />
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

// === Summary Phase ===

interface SummaryPhaseProps {
  session: ReturnType<typeof usePractice>["currentSession"];
  criteria: PracticeCriterion[];
  blocks: PageBlock[];
  onDone: () => void;
  onPracticeMore: () => Promise<void>;
}

function SummaryPhase({
  session,
  criteria,
  blocks,
  onDone,
  onPracticeMore,
}: SummaryPhaseProps) {
  const answers = session?.answers ?? [];

  // Calculate averages per criterion
  const averages = useMemo(() => {
    const result: Record<string, { sum: number; count: number }> = {};
    for (const criterion of criteria) {
      result[criterion.id] = { sum: 0, count: 0 };
    }

    for (const answer of answers) {
      for (const rating of answer.ratings) {
        if (result[rating.criterionId]) {
          result[rating.criterionId].sum += parseInt(rating.rating, 10);
          result[rating.criterionId].count += 1;
        }
      }
    }

    return Object.entries(result).map(([criterionId, { sum, count }]) => ({
      criterionId,
      name: criteria.find((c) => c.id === criterionId)?.name ?? "Unknown",
      average: count > 0 ? sum / count : 0,
    }));
  }, [answers, criteria]);

  // Find answers that need more practice (any rating of 1)
  const needsPractice = useMemo(() => {
    return answers
      .filter((a) => a.ratings.some((r) => r.rating === "1"))
      .map((a) => {
        const block = blocks.find((b) => b.id === a.blockId);
        return block?.question ?? "Unknown question";
      });
  }, [answers, blocks]);

  // Calculate session duration
  const duration = useMemo(() => {
    if (!session?.startedAt || !session?.completedAt) return null;
    const start = new Date(session.startedAt);
    const end = new Date(session.completedAt);
    const diffMs = end.getTime() - start.getTime();
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }, [session]);

  return (
    <div className="flex flex-col items-center p-8 max-w-lg mx-auto">
      <h2 className="text-2xl font-semibold mb-2">
        Practice Session Complete!
      </h2>
      <p className="text-base-content/60 mb-6">
        You practiced {answers.length} question{answers.length !== 1 ? "s" : ""}
        {duration && ` in ${duration}`}
      </p>

      {/* Summary */}
      <div className="w-full bg-base-200 rounded-lg p-4 mb-6">
        <div className="text-sm font-medium mb-3">Summary</div>
        <div className="space-y-2">
          {averages.map((avg) => (
            <div key={avg.criterionId} className="flex items-center gap-3">
              <div className="flex-1 text-sm">{avg.name}</div>
              <div className="w-24 bg-base-300 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    avg.average >= 2.5
                      ? "bg-success"
                      : avg.average >= 1.5
                        ? "bg-info"
                        : "bg-warning"
                  }`}
                  style={{ width: `${(avg.average / 3) * 100}%` }}
                />
              </div>
              <div className="text-sm text-base-content/60 w-12">
                {avg.average.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Needs practice */}
      {needsPractice.length > 0 && (
        <div className="w-full mb-6">
          <div className="text-sm font-medium mb-2">Needs more practice:</div>
          <ul className="text-sm text-base-content/70 space-y-1">
            {needsPractice.map((q, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-warning">•</span>
                <span className="line-clamp-2">"{q}"</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onDone} className="btn btn-outline">
          Done
        </button>
        <button onClick={onPracticeMore} className="btn btn-primary">
          Practice More
        </button>
      </div>
    </div>
  );
}
