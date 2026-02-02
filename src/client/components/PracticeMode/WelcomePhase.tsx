import { useState } from "react";
import { Mic, Clock, ListChecks, Settings } from "lucide-react";
import type { usePractice } from "@/client/hooks/practice";
import { formatRelativeDate } from "@/client/lib/date-utils";
import { LoadingSpinner } from "@/client/components/LoadingSpinner";

export interface WelcomePhaseProps {
  poolSize: number;
  lastPracticeDate: string | null;
  incompleteSession: ReturnType<typeof usePractice>["incompleteSession"];
  isLoading: boolean;
  onStartNew: () => Promise<void>;
  onResume: () => void;
  onDiscard: () => Promise<void>;
  onManagePool: () => void;
}

export function WelcomePhase({
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" />
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
      <div className="flex flex-col h-full">
        <div className="flex-1 p-6 md:p-8">
          <div className="max-w-lg mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Unfinished session</h2>
                <p className="text-sm text-base-content/60">
                  from {formatRelativeDate(incompleteSession.startedAt)}
                </p>
              </div>
            </div>

            {/* Session stats */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-base-200 rounded-lg p-4">
                <div className="text-2xl font-semibold">{answersCount}</div>
                <div className="text-sm text-base-content/60">
                  {answersCount === 1 ? "answer" : "answers"} recorded
                </div>
              </div>
              <div className="bg-base-200 rounded-lg p-4">
                <div className="text-2xl font-semibold">{ratedCount}</div>
                <div className="text-sm text-base-content/60">
                  {ratedCount === 1 ? "answer" : "answers"} rated
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky footer */}
        <div className="sticky bottom-0 p-4 border-t border-base-300 bg-base-100">
          <div className="max-w-lg mx-auto flex flex-col gap-3">
            <div className="flex gap-3">
              <button onClick={onResume} className="btn btn-primary flex-1">
                Continue Session
              </button>
              <button
                onClick={handleStartNew}
                disabled={isStarting}
                className="btn btn-outline flex-1"
              >
                {isStarting ? <LoadingSpinner size="sm" /> : "Start Fresh"}
              </button>
            </div>
            <button
              onClick={onDiscard}
              className="btn btn-ghost btn-sm text-base-content/50"
            >
              Discard unfinished session
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Normal welcome screen
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 md:p-8">
        <div className="max-w-lg mx-auto">
          {/* Header with icon */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Mic className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold">Practice Mode</h2>
              <p className="text-base-content/60">
                Record and review your answers
              </p>
            </div>
          </div>

          {/* Stats cards */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-4 bg-base-200 rounded-lg p-4">
              <div className="w-10 h-10 rounded-lg bg-base-300 flex items-center justify-center">
                <ListChecks className="w-5 h-5 text-base-content/70" />
              </div>
              <div className="flex-1">
                <div className="font-medium">
                  {poolSize} question{poolSize !== 1 ? "s" : ""}
                </div>
                <div className="text-sm text-base-content/60">
                  in your practice pool
                </div>
              </div>
            </div>

            {lastPracticeDate && (
              <div className="flex items-center gap-4 bg-base-200 rounded-lg p-4">
                <div className="w-10 h-10 rounded-lg bg-base-300 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-base-content/70" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">
                    {formatRelativeDate(lastPracticeDate)}
                  </div>
                  <div className="text-sm text-base-content/60">
                    last practiced
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Empty state */}
          {poolSize === 0 && (
            <div className="bg-base-200 rounded-lg p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-base-300 flex items-center justify-center mx-auto mb-3">
                <ListChecks className="w-6 h-6 text-base-content/40" />
              </div>
              <p className="text-base-content/60 mb-4">
                No questions available to practice. Add questions to your
                practice pool to get started.
              </p>
              <button onClick={onManagePool} className="btn btn-primary btn-sm">
                <Settings className="w-4 h-4" />
                Manage Pool
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      {poolSize > 0 && (
        <div className="sticky bottom-0 p-4 border-t border-base-300 bg-base-100">
          <div className="max-w-lg mx-auto flex gap-3">
            <button
              onClick={handleStartNew}
              disabled={isStarting}
              className="btn btn-primary flex-1"
            >
              {isStarting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  Start Practicing
                </>
              )}
            </button>
            <button onClick={onManagePool} className="btn btn-outline">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Manage Pool</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
