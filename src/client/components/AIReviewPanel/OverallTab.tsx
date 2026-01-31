import { useCallback, useEffect, useState } from "react";
import { X, RefreshCw, Sparkles, Brain } from "lucide-react";
import type { PageBlock } from "@/types/schemas/pages";
import { usePageReviewSettings } from "@/client/hooks/usePageReviewSettings";
import { useOverallReview } from "@/client/hooks/useOverallReview";
import { formatDateTime } from "@/client/lib/date-utils";

const THINKING_PHRASES = [
  "Analyzing your responses...",
  "Evaluating coherence...",
  "Identifying patterns...",
  "Considering strengths...",
  "Looking for improvements...",
  "Assessing overall quality...",
  "Reviewing key themes...",
  "Synthesizing feedback...",
];

/**
 * Overall tab - Holistic feedback on the entire application
 */
export function OverallTab({
  pageId,
  blocks,
}: {
  pageId: string;
  blocks: PageBlock[];
}) {
  const { defaultPrompt } = usePageReviewSettings(pageId);
  const [thinkingPhraseIndex, setThinkingPhraseIndex] = useState(0);

  const {
    overallReview,
    isLoading,
    isGenerating,
    displayText,
    error,
    hasAnswers,
    generateOverallReview,
    stopGenerating,
  } = useOverallReview({
    pageId,
    blocks,
    customInstructions: defaultPrompt?.prompt,
  });

  // Rotate through thinking phrases while generating
  useEffect(() => {
    if (!isGenerating || displayText) return;

    const interval = setInterval(() => {
      setThinkingPhraseIndex((i) => (i + 1) % THINKING_PHRASES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isGenerating, displayText]);

  // Handle generate button click
  const handleGenerate = useCallback(() => {
    generateOverallReview(
      defaultPrompt?.id ?? null,
      defaultPrompt?.prompt ?? null,
    );
  }, [generateOverallReview, defaultPrompt]);

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <span className="loading loading-spinner loading-sm" />
      </div>
    );
  }

  // No content yet and not generating - show empty state with generate button
  if (!displayText && !isGenerating) {
    return (
      <div className="p-4 space-y-5">
        {/* Header */}
        <div>
          <h3 className="text-sm font-medium text-base-content mb-1">
            Overall Review
          </h3>
          <p className="text-sm text-base-content/60">
            Get holistic feedback on your entire application.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg bg-error/10 border border-error/20">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        {/* CTA */}
        {hasAnswers ? (
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="btn btn-primary btn-sm gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Generate Overall Review
          </button>
        ) : (
          <div className="p-3 rounded-lg bg-base-200/50 border border-base-300/50">
            <p className="text-sm text-base-content/50 text-center">
              Add some answers to your questions to get started.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Has content (either streaming or saved) - show the summary
  return (
    <div className="p-4 space-y-5">
      {/* Header with regenerate/stop */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-base-content mb-1">
            Overall Review
          </h3>
          {overallReview?.updatedAt && !isGenerating ? (
            <p className="text-xs text-base-content/50">
              Generated {formatDateTime(overallReview.updatedAt)}
            </p>
          ) : null}
        </div>
        {isGenerating ? (
          <button
            onClick={stopGenerating}
            className="btn btn-ghost btn-xs gap-1 text-error"
            title="Stop generating"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            className="btn btn-ghost btn-xs gap-1"
            title="Regenerate review"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="p-3 rounded-lg bg-error/10 border border-error/20">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* Summary content */}
      <div className="p-4 rounded-lg bg-base-200/50 border border-base-300">
        <div className="prose prose-sm max-w-none text-base-content/80">
          {displayText ? (
            displayText
              .split("\n\n")
              .map((paragraph: string, index: number) => (
                <p key={index} className="mb-3 last:mb-0">
                  {paragraph}
                </p>
              ))
          ) : isGenerating ? (
            <p className="text-base-content/50 italic flex items-center gap-2">
              <Brain className="h-4 w-4 animate-pulse" />
              {THINKING_PHRASES[thinkingPhraseIndex]}
            </p>
          ) : (
            <p className="text-base-content/50 italic">No review yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
