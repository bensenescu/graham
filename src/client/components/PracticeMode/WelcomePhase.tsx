import { useState } from "react";
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
      <div className="flex flex-col items-center justify-center h-full p-8 max-w-md mx-auto text-center">
        <h2 className="text-2xl font-semibold mb-4">
          You have an unfinished session
        </h2>
        <p className="text-base-content/70 mb-2">
          from {formatRelativeDate(incompleteSession.startedAt)}
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
          Last practiced: {formatRelativeDate(lastPracticeDate)}
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
            {isStarting ? <LoadingSpinner size="sm" /> : "Start Practicing"}
          </button>
          <button onClick={onManagePool} className="btn btn-outline">
            Manage Pool
          </button>
        </div>
      )}
    </div>
  );
}
