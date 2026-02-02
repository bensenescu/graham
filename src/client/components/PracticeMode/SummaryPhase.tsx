import { useMemo } from "react";
import {
  Trophy,
  AlertTriangle,
  Clock,
  Target,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import type { usePractice } from "@/client/hooks/practice";
import type { PageBlock } from "@/types/schemas/pages";
import type { PracticeCriterion } from "@/types/schemas/practice";
import { formatDuration } from "@/client/lib/date-utils";

export interface SummaryPhaseProps {
  session: ReturnType<typeof usePractice>["currentSession"];
  criteria: PracticeCriterion[];
  blocks: PageBlock[];
  practiceQueue: string[];
  onDone: () => void;
  onPracticeMore: () => Promise<void>;
}

export function SummaryPhase({
  session,
  criteria,
  blocks,
  practiceQueue,
  onDone,
  onPracticeMore,
}: SummaryPhaseProps) {
  const answers = session?.answers ?? [];

  // Get answered block IDs
  const answeredBlockIds = useMemo(
    () => new Set(answers.map((a) => a.blockId)),
    [answers],
  );

  // Find skipped questions (in practiceQueue but not in answers)
  const skippedQuestions = useMemo(() => {
    return practiceQueue
      .filter((blockId) => !answeredBlockIds.has(blockId))
      .map((blockId) => {
        const block = blocks.find((b) => b.id === blockId);
        return block?.question ?? "Unknown question";
      });
  }, [practiceQueue, answeredBlockIds, blocks]);

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
    return formatDuration(diffMs);
  }, [session]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-6 md:p-8 overflow-auto">
        <div className="max-w-lg mx-auto">
          {/* Success header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Session Complete!</h2>
            <p className="text-base-content/60">
              You practiced {answers.length} question
              {answers.length !== 1 ? "s" : ""}
              {skippedQuestions.length > 0 && (
                <span> and skipped {skippedQuestions.length}</span>
              )}
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-base-200 rounded-lg p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-base-300 flex items-center justify-center">
                <Target className="w-5 h-5 text-base-content/70" />
              </div>
              <div>
                <div className="text-xl font-semibold">{answers.length}</div>
                <div className="text-xs text-base-content/60">answered</div>
              </div>
            </div>
            {duration && (
              <div className="bg-base-200 rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-base-300 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-base-content/70" />
                </div>
                <div>
                  <div className="text-xl font-semibold">{duration}</div>
                  <div className="text-xs text-base-content/60">duration</div>
                </div>
              </div>
            )}
          </div>

          {/* Criteria summary - only show if there are rated answers */}
          {answers.length > 0 && averages.some((a) => a.average > 0) && (
            <div className="bg-base-200 rounded-lg p-4 mb-6">
              <div className="text-xs uppercase tracking-wider text-base-content/40 mb-4">
                Performance by Criteria
              </div>
              <div className="space-y-3">
                {averages.map((avg) => (
                  <div key={avg.criterionId}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">{avg.name}</span>
                      <span className="text-sm font-medium tabular-nums">
                        {avg.average.toFixed(1)}/3
                      </span>
                    </div>
                    <div className="h-2 bg-base-300 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          avg.average >= 2.5
                            ? "bg-success"
                            : avg.average >= 1.5
                              ? "bg-info"
                              : "bg-warning"
                        }`}
                        style={{ width: `${(avg.average / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Needs practice section */}
          {needsPractice.length > 0 && (
            <div className="bg-warning/5 border border-warning/20 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium">
                  Needs more practice ({needsPractice.length})
                </span>
              </div>
              <ul className="space-y-2">
                {needsPractice.map((q, i) => (
                  <li
                    key={i}
                    className="text-sm text-base-content/70 pl-4 border-l-2 border-warning/30"
                  >
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Skipped questions section */}
          {skippedQuestions.length > 0 && (
            <div className="bg-base-200/50 border border-base-300 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <SkipForward className="w-4 h-4 text-base-content/50" />
                <span className="text-sm font-medium text-base-content/70">
                  Skipped ({skippedQuestions.length})
                </span>
              </div>
              <ul className="space-y-2">
                {skippedQuestions.map((q, i) => (
                  <li
                    key={i}
                    className="text-sm text-base-content/50 pl-4 border-l-2 border-base-300"
                  >
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 p-4 border-t border-base-300 bg-base-100">
        <div className="max-w-lg mx-auto flex gap-3">
          <button onClick={onDone} className="btn btn-outline flex-1">
            Done
          </button>
          <button
            onClick={onPracticeMore}
            className="btn btn-primary flex-1 gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Practice More
          </button>
        </div>
      </div>
    </div>
  );
}
