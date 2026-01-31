import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { usePractice } from "@/client/hooks/practice";
import type { PageBlock } from "@/types/schemas/pages";
import { WelcomePhase } from "./WelcomePhase";
import { PracticingPhase } from "./PracticingPhase";
import { ReviewingPhase } from "./ReviewingPhase";
import { SummaryPhase } from "./SummaryPhase";

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
