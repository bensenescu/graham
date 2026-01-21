import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  X,
  RefreshCw,
  Check,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Settings2,
  FileText,
  List,
} from "lucide-react";
import type { AIReview } from "@/types/schemas/reviews";
import type { PageBlock } from "@/types/schemas/pages";
import {
  type BlockPosition,
  calculateCardPositions,
} from "@/client/hooks/useBlockPositions";

type ReviewTab = "configure" | "overall" | "detailed";

interface AIReviewPanelProps {
  blocks: PageBlock[];
  reviews: Map<string, AIReview>;
  blockPositions: Map<string, BlockPosition>;
  activeBlockId: string | null;
  isReviewingAll: boolean;
  onClose: () => void;
  onBlockClick: (blockId: string) => void;
  onReReview: (blockId: string) => void;
  onReviewAll: () => void;
}

/**
 * Configure tab - Review settings, prompts, and model selection
 */
function ConfigureTab() {
  const [model, setModel] = useState("openai-gpt-5.2-high");
  const [defaultPrompt, setDefaultPrompt] = useState(
    "Review this YC application answer. Evaluate clarity, specificity, and persuasiveness. Provide actionable feedback.",
  );

  const models = [
    {
      id: "openai-gpt-5.2-xhigh",
      name: "OpenAI - GPT 5.2 xhigh",
      description: "Highest quality, slower",
    },
    {
      id: "openai-gpt-5.2-high",
      name: "OpenAI - GPT 5.2 high",
      description: "Balanced quality and speed",
    },
    {
      id: "anthropic-opus-4.5",
      name: "Anthropic - Opus 4.5",
      description: "Strong reasoning",
    },
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Model Selection */}
      <div>
        <label className="text-sm font-medium text-base-content mb-2 block">
          AI Model
        </label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="select select-bordered select-sm w-full"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-base-content/50 mt-1">
          {models.find((m) => m.id === model)?.description}
        </p>
      </div>

      {/* Default Review Prompt */}
      <div>
        <label className="text-sm font-medium text-base-content mb-2 block">
          Default Review Prompt
        </label>
        <textarea
          value={defaultPrompt}
          onChange={(e) => setDefaultPrompt(e.target.value)}
          className="textarea textarea-bordered textarea-sm w-full h-24 text-sm"
          placeholder="Enter your default review prompt..."
        />
        <p className="text-xs text-base-content/50 mt-1">
          This prompt will be used when reviewing all answers.
        </p>
      </div>

      {/* Custom Prompts */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-base-content">
            Custom Prompts
          </label>
          <button className="btn btn-ghost btn-xs">+ Add</button>
        </div>
        <div className="space-y-2">
          <div className="p-2 rounded border border-base-300 bg-base-200/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Conciseness Check</span>
              <button className="btn btn-ghost btn-xs text-base-content/50">
                Edit
              </button>
            </div>
            <p className="text-xs text-base-content/50 mt-1 line-clamp-1">
              Check if the answer is concise and under the character limit...
            </p>
          </div>
          <div className="p-2 rounded border border-base-300 bg-base-200/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                YC Partner Perspective
              </span>
              <button className="btn btn-ghost btn-xs text-base-content/50">
                Edit
              </button>
            </div>
            <p className="text-xs text-base-content/50 mt-1 line-clamp-1">
              Review from the perspective of a YC partner looking for...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Overall tab - Holistic feedback on the entire application
 */
function OverallTab({
  blocks,
  reviews,
  onReviewAll,
  isReviewingAll,
}: {
  blocks: PageBlock[];
  reviews: Map<string, AIReview>;
  onReviewAll: () => void;
  isReviewingAll: boolean;
}) {
  const completedReviews = useMemo(() => {
    return Array.from(reviews.values()).filter((r) => r.status === "completed");
  }, [reviews]);

  const hasAnswers = useMemo(() => {
    return blocks.some((b) => b.answer && b.answer.trim().length > 0);
  }, [blocks]);

  // Calculate overall stats
  const stats = useMemo(() => {
    if (completedReviews.length === 0) return null;
    const avgScore = Math.round(
      completedReviews.reduce((sum, r) => sum + r.score, 0) /
        completedReviews.length,
    );
    const totalStrengths = completedReviews.reduce(
      (sum, r) => sum + r.strengths.length,
      0,
    );
    const totalImprovements = completedReviews.reduce(
      (sum, r) => sum + r.improvements.length,
      0,
    );
    return {
      avgScore,
      totalStrengths,
      totalImprovements,
      reviewed: completedReviews.length,
      total: blocks.length,
    };
  }, [completedReviews, blocks.length]);

  if (!stats) {
    return (
      <div className="p-4">
        <div className="flex items-start gap-3 mb-5">
          <div>
            <h3 className="text-sm font-medium text-base-content mb-1">
              No reviews yet
            </h3>
            <p className="text-sm text-base-content/60">
              Get holistic feedback on your entire application.
            </p>
          </div>
        </div>

        {hasAnswers ? (
          <div className="space-y-4">
            <button
              onClick={onReviewAll}
              disabled={isReviewingAll}
              className="btn btn-primary btn-sm gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {isReviewingAll ? "Reviewing..." : "Review All Answers"}
            </button>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-base-200/50 border border-base-300/50">
            <p className="text-sm text-base-content/50">
              Add some answers to your questions to get started.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Overall Score */}
      <div className="p-4 rounded-lg bg-base-200/50 border border-base-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-base-content">
            Overall Score
          </span>
          <span className="text-2xl font-bold text-primary">
            {stats.avgScore}
          </span>
        </div>
        <div className="w-full bg-base-300 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${stats.avgScore}%` }}
          />
        </div>
        <p className="text-xs text-base-content/50 mt-2">
          Based on {stats.reviewed} of {stats.total} questions reviewed
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-success/10 border border-success/20">
          <div className="flex items-center gap-2 mb-1">
            <Check className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-success">Strengths</span>
          </div>
          <span className="text-xl font-bold text-success">
            {stats.totalStrengths}
          </span>
        </div>
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium text-warning">To Improve</span>
          </div>
          <span className="text-xl font-bold text-warning">
            {stats.totalImprovements}
          </span>
        </div>
      </div>

      {/* Overall Feedback */}
      <div>
        <h4 className="text-sm font-medium text-base-content mb-2">Summary</h4>
        <div className="p-3 rounded-lg bg-base-200/50 border border-base-300 text-sm text-base-content/80">
          <p>
            Your application shows promise with clear technical capabilities.
            Focus on adding more specific metrics and concrete examples to
            strengthen your answers. Consider being more concise in longer
            responses.
          </p>
        </div>
      </div>

      {/* Re-review button */}
      <button
        onClick={onReviewAll}
        disabled={isReviewingAll}
        className="btn btn-ghost btn-sm gap-2 w-full"
      >
        <RefreshCw className="h-4 w-4" />
        {isReviewingAll ? "Reviewing..." : "Re-review All"}
      </button>
    </div>
  );
}

/**
 * Grade badge component with appropriate styling
 */
function GradeBadge({ grade, score }: { grade: string; score: number }) {
  const badgeClass =
    {
      A: "badge-success",
      B: "badge-info",
      C: "badge-warning",
      D: "badge-error",
      F: "badge-error",
    }[grade] || "badge-ghost";

  return (
    <div className={`badge ${badgeClass} badge-sm gap-1`}>
      <span className="font-bold">{grade}</span>
      <span className="opacity-80">{score}</span>
    </div>
  );
}

/**
 * Loading state for a review in progress
 */
function ReviewLoading() {
  return (
    <div className="p-3 border border-base-300 rounded-lg bg-base-200/50">
      <div className="flex items-center gap-2">
        <span className="loading loading-spinner loading-xs" />
        <span className="text-sm text-base-content/60">Analyzing...</span>
      </div>
    </div>
  );
}

/**
 * Compact review card without question title.
 * Designed to be positioned alongside the corresponding Q&A block.
 */
function CompactReviewCard({
  block,
  review,
  isActive,
  onClick,
  onReReview,
  onHeightChange,
}: {
  block: PageBlock;
  review: AIReview | undefined;
  isActive: boolean;
  onClick: () => void;
  onReReview: () => void;
  onHeightChange: (height: number) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Report height changes
  useEffect(() => {
    if (cardRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          onHeightChange(entry.contentRect.height);
        }
      });
      observer.observe(cardRef.current);
      return () => observer.disconnect();
    }
  }, [onHeightChange]);

  // Loading state
  if (review?.status === "loading") {
    return (
      <div ref={cardRef}>
        <ReviewLoading />
      </div>
    );
  }

  // No review yet - show placeholder only if there's an answer
  if (!review) {
    if (!block.answer) {
      // No answer - don't show anything
      return <div ref={cardRef} />;
    }
    // Has answer but no review - show review button with dotted border
    return (
      <div
        ref={cardRef}
        onClick={onClick}
        className={`
          p-3 border border-dashed rounded-lg cursor-pointer transition-all
          flex items-center justify-center
          ${isActive ? "border-primary bg-primary/5" : "border-base-content/20 hover:border-primary/50 hover:bg-primary/5"}
        `}
      >
        <span
          className={`text-sm ${isActive ? "text-primary" : "text-base-content/50 hover:text-primary"}`}
        >
          Review
        </span>
      </div>
    );
  }

  // Error state
  if (review.status === "error") {
    return (
      <div
        ref={cardRef}
        className={`
          p-3 border rounded-lg
          ${isActive ? "border-error bg-error/5" : "border-base-300"}
        `}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="badge badge-error badge-xs">Error</div>
        </div>
        <p className="text-xs text-error/80">
          {review.error || "Review failed"}
        </p>
        <button
          onClick={onReReview}
          className="mt-1 btn btn-ghost btn-xs gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    );
  }

  // Completed review - compact display
  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={`
        p-3 border rounded-lg cursor-pointer transition-all
        ${isActive ? "border-primary bg-primary/5" : "border-base-300 hover:border-base-content/30"}
      `}
    >
      {/* Grade badge */}
      <div className="flex items-center justify-between mb-2">
        <GradeBadge grade={review.grade} score={review.score} />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReReview();
          }}
          className="btn btn-ghost btn-xs gap-1 text-base-content/40 hover:text-base-content"
          title="Re-review"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      </div>

      {/* Strengths */}
      {review.strengths.length > 0 && (
        <div className="space-y-1 mb-2">
          {review.strengths.map((strength, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 text-xs text-success/90"
            >
              <Check className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <span>{strength}</span>
            </div>
          ))}
        </div>
      )}

      {/* Improvements */}
      {review.improvements.length > 0 && (
        <div className="space-y-1 mb-2">
          {review.improvements.map((improvement, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 text-xs text-warning/90"
            >
              <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <span>{improvement}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      {review.tips && review.tips.length > 0 && (
        <div className="space-y-1">
          {review.tips.map((tip, i) => (
            <div
              key={i}
              className="flex items-start gap-1.5 text-xs text-info/90"
            >
              <Lightbulb className="h-3 w-3 flex-shrink-0 mt-0.5" />
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Detailed tab - Question by question reviews
 */
function DetailedTab({
  blocks,
  reviews,
  blockPositions,
  activeBlockId,
  isReviewingAll,
  onBlockClick,
  onReReview,
  onReviewAll,
}: {
  blocks: PageBlock[];
  reviews: Map<string, AIReview>;
  blockPositions: Map<string, BlockPosition>;
  activeBlockId: string | null;
  isReviewingAll: boolean;
  onBlockClick: (blockId: string) => void;
  onReReview: (blockId: string) => void;
  onReviewAll: () => void;
}) {
  // Track measured heights of each card
  const [cardHeights, setCardHeights] = useState<Map<string, number>>(
    () => new Map(),
  );

  const handleCardHeightChange = useCallback(
    (blockId: string, height: number) => {
      setCardHeights((prev) => {
        const next = new Map(prev);
        next.set(blockId, height);
        return next;
      });
    },
    [],
  );

  // Calculate card positions with collision detection
  const cardPositions = useMemo(() => {
    const blockIds = blocks.map((b) => b.id);
    return calculateCardPositions(blockIds, blockPositions, cardHeights, 8);
  }, [blocks, blockPositions, cardHeights]);

  // Calculate total height needed for the container
  const totalHeight = useMemo(() => {
    let maxBottom = 0;
    for (const block of blocks) {
      const top = cardPositions.get(block.id) ?? 0;
      const height = cardHeights.get(block.id) ?? 80;
      maxBottom = Math.max(maxBottom, top + height);
    }
    return maxBottom + 24;
  }, [blocks, cardPositions, cardHeights]);

  // Check if there are any completed reviews
  const hasReviews = useMemo(() => {
    return Array.from(reviews.values()).some(
      (r) => r.status === "completed" || r.status === "loading",
    );
  }, [reviews]);

  // Check if there are any blocks with answers (reviewable)
  const hasAnswers = useMemo(() => {
    return blocks.some((b) => b.answer && b.answer.trim().length > 0);
  }, [blocks]);

  // Empty state
  if (!hasReviews && !isReviewingAll) {
    return (
      <div className="p-4">
        <div className="flex items-start gap-3 mb-5">
          <div>
            <h3 className="text-sm font-medium text-base-content mb-1">
              No reviews yet
            </h3>
            <p className="text-sm text-base-content/60">
              Get question-by-question feedback on your answers.
            </p>
          </div>
        </div>

        {hasAnswers ? (
          <div className="space-y-4">
            <button
              onClick={onReviewAll}
              disabled={isReviewingAll}
              className="btn btn-primary btn-sm gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Review All Answers
            </button>
            <p className="text-xs text-base-content/50 leading-relaxed">
              You can also review individual questions from the{" "}
              <span className="font-medium text-base-content/70">menu</span> on
              each question.
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-base-200/50 border border-base-300/50">
            <p className="text-sm text-base-content/50">
              Add some answers to your questions to get started.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative px-4 pt-2" style={{ minHeight: totalHeight }}>
      {blocks.length === 0 ? (
        <div className="text-center py-8 text-base-content/50 text-sm">
          No questions to review yet.
        </div>
      ) : (
        blocks.map((block) => {
          const top = cardPositions.get(block.id) ?? 0;
          return (
            <div
              key={block.id}
              className="absolute left-4 right-4 transition-all duration-150"
              style={{ top }}
            >
              <CompactReviewCard
                block={block}
                review={reviews.get(block.id)}
                isActive={activeBlockId === block.id}
                onClick={() => onBlockClick(block.id)}
                onReReview={() => onReReview(block.id)}
                onHeightChange={(height) =>
                  handleCardHeightChange(block.id, height)
                }
              />
            </div>
          );
        })
      )}
    </div>
  );
}

/**
 * AI Review side panel with three tabs:
 * - Configure: Review settings, prompts, model selection
 * - Overall: Holistic feedback on entire application
 * - Detailed: Question by question reviews
 */
export function AIReviewPanel({
  blocks,
  reviews,
  blockPositions,
  activeBlockId,
  isReviewingAll,
  onClose,
  onBlockClick,
  onReReview,
  onReviewAll,
}: AIReviewPanelProps) {
  const [activeTab, setActiveTab] = useState<ReviewTab>("detailed");

  const tabs: { id: ReviewTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "configure",
      label: "Configure",
      icon: <Settings2 className="h-4 w-4" />,
    },
    { id: "overall", label: "Overall", icon: <FileText className="h-4 w-4" /> },
    { id: "detailed", label: "Detailed", icon: <List className="h-4 w-4" /> },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header with tabs */}
      <div className="flex-shrink-0 border-b border-base-300">
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors
                  ${
                    activeTab === tab.id
                      ? "text-primary border-b-2 border-primary -mb-[1px] bg-base-100"
                      : "text-base-content/60 hover:text-base-content"
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Close review panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Loading indicator for review all */}
      {isReviewingAll && (
        <div className="flex-shrink-0 px-4 py-2 bg-primary/10 border-b border-primary/20">
          <div className="flex items-center gap-2 text-sm text-primary">
            <span className="loading loading-spinner loading-xs" />
            <span>Reviewing all answers...</span>
          </div>
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "configure" && <ConfigureTab />}
        {activeTab === "overall" && (
          <OverallTab
            blocks={blocks}
            reviews={reviews}
            onReviewAll={onReviewAll}
            isReviewingAll={isReviewingAll}
          />
        )}
        {activeTab === "detailed" && (
          <DetailedTab
            blocks={blocks}
            reviews={reviews}
            blockPositions={blockPositions}
            activeBlockId={activeBlockId}
            isReviewingAll={isReviewingAll}
            onBlockClick={onBlockClick}
            onReReview={onReReview}
            onReviewAll={onReviewAll}
          />
        )}
      </div>
    </div>
  );
}
