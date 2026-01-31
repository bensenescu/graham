import { useMemo } from "react";
import type { usePractice } from "@/client/hooks/practice";
import type { PageBlock } from "@/types/schemas/pages";
import type { PracticeCriterion } from "@/types/schemas/practice";
import { formatDuration } from "@/client/lib/date-utils";

export interface SummaryPhaseProps {
  session: ReturnType<typeof usePractice>["currentSession"];
  criteria: PracticeCriterion[];
  blocks: PageBlock[];
  onDone: () => void;
  onPracticeMore: () => Promise<void>;
}

export function SummaryPhase({
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
    return formatDuration(diffMs);
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
                <span className="text-warning">*</span>
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
