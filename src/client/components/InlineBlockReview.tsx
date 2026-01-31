import { MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { BlockReview } from "@/types/schemas/reviews";
import { LoadingSpinner } from "@/client/components/LoadingSpinner";

interface InlineBlockReviewProps {
  review: BlockReview | undefined;
  isLoading: boolean;
}

/**
 * Inline review display that renders directly below a Q&A answer.
 * Shows loading state or the review content as markdown.
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
          <LoadingSpinner size="xs" />
          <span>Reviewing answer...</span>
        </div>
      </div>
    );
  }

  // No review or no suggestion - don't render anything
  if (!review || !review.suggestion) {
    return null;
  }

  return (
    <div className="mt-3 p-3 rounded-lg bg-base-200/30 border border-base-300/50">
      <div className="flex gap-2">
        <MessageSquare className="h-4 w-4 text-base-content/40 mt-0.5 flex-shrink-0" />
        <div className="prose prose-sm max-w-none text-base-content/70 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          <ReactMarkdown>{review.suggestion}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
