import { useEffect, useCallback, useState } from "react";
import { X } from "lucide-react";
import { usePractice } from "@/client/hooks/practice";
import type { PageBlock } from "@/types/schemas/pages";
import { WelcomePhase } from "./WelcomePhase";
import { PracticingPhase } from "./PracticingPhase";
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle mount/unmount animations
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Small delay to trigger enter animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      // Wait for exit animation before unmounting
      const timeout = setTimeout(() => {
        setShouldRender(false);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Sync open state with practice hook
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

  if (!shouldRender) return null;

  const getPhaseTitle = () => {
    switch (practice.phase) {
      case "welcome":
        return "Practice Mode";
      case "practicing":
        return "Practice";
      case "summary":
        return "Summary";
      default:
        return "Practice Mode";
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-base-100 flex flex-col transition-all duration-200 ease-out ${
        isAnimating ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-base-300 bg-base-100/80 backdrop-blur-sm sticky top-0 z-10">
        <h1 className="text-lg font-semibold">{getPhaseTitle()}</h1>
        <button
          onClick={handleClose}
          className="btn btn-ghost btn-sm btn-square hover:bg-base-200"
          aria-label="Close practice mode"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Content with phase transitions */}
      <main className="flex-1 overflow-hidden">
        <div
          className={`h-full transition-opacity duration-150 ${
            isAnimating ? "opacity-100" : "opacity-0"
          }`}
        >
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
              criteria={practice.criteria}
              onRecordAnswer={practice.recordAnswer}
              onUpdateTranscription={practice.updateTranscription}
              onSaveRatings={practice.saveRatings}
              onNext={practice.nextQuestion}
              onSkip={practice.skipQuestion}
              onFinish={practice.completeSession}
            />
          )}

          {practice.phase === "summary" && (
            <SummaryPhase
              session={practice.currentSession}
              criteria={practice.criteria}
              blocks={blocks}
              practiceQueue={practice.practiceQueue}
              onDone={handleClose}
              onPracticeMore={async () => {
                await practice.startNewSession();
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
