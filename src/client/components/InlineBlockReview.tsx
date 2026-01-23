import { Check, AlertTriangle, Lightbulb } from "lucide-react";
import type { BlockReview } from "@/types/schemas/reviews";

interface InlineBlockReviewProps {
  review: BlockReview | undefined;
  isLoading: boolean;
}

/**
 * Inline review display that renders directly below a Q&A answer.
 * Shows loading state or the review content. No empty state - handled by parent.
 */
export function InlineBlockReview({
  review,
  isLoading,
}: InlineBlockReviewProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="mt-3 p-3 rounded-lg bg-base-200/50 border border-base-300/50">
        <div className="flex items-center gap-2 text-sm text-base-content/60">
          <span className="loading loading-spinner loading-xs" />
          <span>Reviewing answer...</span>
        </div>
      </div>
    );
  }

  // No review - don't render anything
  if (!review) {
    return null;
  }

  // Has review - show the feedback
  const hasContent =
    review.strengths.length > 0 ||
    review.improvements.length > 0 ||
    (review.tips && review.tips.length > 0);

  if (!hasContent) {
    return null;
  }

  return (
    <div className="mt-3 p-3 rounded-lg bg-base-200/30 border border-base-300/50 space-y-3">
      {/* Strengths */}
      {review.strengths.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-success">
            <Check className="h-3.5 w-3.5" />
            <span>Strengths</span>
          </div>
          <ul className="space-y-1 pl-5">
            {review.strengths.map((strength: string, i: number) => (
              <li key={i} className="text-xs text-base-content/70 list-disc">
                {strength}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {review.improvements.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-warning">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Areas to Improve</span>
          </div>
          <ul className="space-y-1 pl-5">
            {review.improvements.map((improvement: string, i: number) => (
              <li key={i} className="text-xs text-base-content/70 list-disc">
                {improvement}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tips */}
      {review.tips && review.tips.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-info">
            <Lightbulb className="h-3.5 w-3.5" />
            <span>Tips</span>
          </div>
          <ul className="space-y-1 pl-5">
            {review.tips.map((tip: string, i: number) => (
              <li key={i} className="text-xs text-base-content/70 list-disc">
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
