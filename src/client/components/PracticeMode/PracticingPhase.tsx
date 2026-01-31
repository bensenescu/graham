import { useEffect, useState } from "react";
import { Mic, Square, SkipForward } from "lucide-react";
import { useAudioRecorder } from "@/client/hooks/useAudioRecorder";
import { useTranscription } from "@/client/hooks/useTranscription";
import type { PageBlock } from "@/types/schemas/pages";

export interface PracticingPhaseProps {
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

export function PracticingPhase({
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
  }, [currentIndex, recorder, transcription]);

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
