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
  Plus,
  Trash2,
  Edit2,
} from "lucide-react";
import type { AIReview } from "@/types/schemas/reviews";
import type { PageBlock } from "@/types/schemas/pages";
import type { Prompt } from "@/types/schemas/prompts";
import {
  type BlockPosition,
  calculateCardPositions,
} from "@/client/hooks/useBlockPositions";
import { usePageReviewSettings } from "@/client/hooks/usePageReviewSettings";

type ReviewTab = "configure" | "overall" | "detailed";

interface AIReviewPanelProps {
  pageId: string;
  blocks: PageBlock[];
  reviews: Map<string, AIReview>;
  blockPositions: Map<string, BlockPosition>;
  activeBlockId: string | null;
  isReviewingAll: boolean;
  initialTab?: ReviewTab;
  onClose: () => void;
  onBlockClick: (blockId: string) => void;
  onReReview: (blockId: string) => void;
  onReviewAll: () => void;
}

/**
 * Prompt card component
 */
function PromptCard({
  prompt,
  isDefault,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  prompt: Prompt;
  isDefault?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault?: () => void;
}) {
  return (
    <div className="p-3 rounded-lg border border-base-300 bg-base-200/30">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{prompt.name}</span>
            {isDefault && (
              <span className="badge badge-primary badge-xs">Default</span>
            )}
          </div>
          <p className="text-xs text-base-content/50 mt-1 line-clamp-2">
            {prompt.prompt}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isDefault && onSetDefault && (
            <button
              onClick={onSetDefault}
              className="btn btn-ghost btn-xs text-base-content/50"
              title="Set as default"
            >
              <Sparkles className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={onEdit}
            className="btn btn-ghost btn-xs text-base-content/50"
            title="Edit prompt"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            onClick={onDelete}
            className="btn btn-ghost btn-xs text-error/50 hover:text-error"
            title="Delete prompt"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Configure tab - Review settings, prompts, and model selection
 */
function ConfigureTab({ pageId }: { pageId: string }) {
  const {
    settings,
    defaultPrompt,
    customPrompts,
    availablePrompts,
    prompts,
    aiModels,
    isLoading,
    updateModel,
    updateDefaultPromptId,
    addCustomPrompt,
    removeCustomPrompt,
    createPrompt,
    updatePrompt,
    deletePrompt,
  } = usePageReviewSettings(pageId);

  const [isCreating, setIsCreating] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptText, setNewPromptText] = useState("");

  const handleCreatePrompt = () => {
    if (!newPromptName.trim() || !newPromptText.trim()) return;
    createPrompt(newPromptName.trim(), newPromptText.trim());
    setNewPromptName("");
    setNewPromptText("");
    setIsCreating(false);
  };

  const handleUpdatePrompt = () => {
    if (!editingPrompt || !newPromptName.trim() || !newPromptText.trim())
      return;
    updatePrompt(editingPrompt.id, {
      name: newPromptName.trim(),
      prompt: newPromptText.trim(),
    });
    setEditingPrompt(null);
    setNewPromptName("");
    setNewPromptText("");
  };

  const startEditing = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setNewPromptName(prompt.name);
    setNewPromptText(prompt.prompt);
    setIsCreating(false);
  };

  const cancelEditing = () => {
    setEditingPrompt(null);
    setIsCreating(false);
    setNewPromptName("");
    setNewPromptText("");
  };

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <span className="loading loading-spinner loading-sm" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Model Selection */}
      <div>
        <label className="text-sm font-medium text-base-content mb-2 block">
          AI Model
        </label>
        <select
          value={settings?.model ?? "openai-gpt-5.2-high"}
          onChange={(e) => updateModel(e.target.value)}
          className="select select-bordered select-sm w-full"
        >
          {aiModels.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-base-content/50 mt-1">
          {aiModels.find((m) => m.id === settings?.model)?.description}
        </p>
      </div>

      {/* Default Prompt */}
      <div>
        <label className="text-sm font-medium text-base-content mb-2 block">
          Default Prompt
        </label>
        {defaultPrompt ? (
          <PromptCard
            prompt={defaultPrompt}
            isDefault
            onEdit={() => startEditing(defaultPrompt)}
            onDelete={() => {
              deletePrompt(defaultPrompt.id);
              updateDefaultPromptId(null);
            }}
          />
        ) : (
          <div className="p-3 rounded-lg border border-dashed border-base-content/20 text-center">
            <p className="text-sm text-base-content/50">
              No default prompt set
            </p>
            {availablePrompts.length > 0 && (
              <select
                className="select select-bordered select-xs mt-2"
                onChange={(e) => {
                  if (e.target.value) updateDefaultPromptId(e.target.value);
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  Select a prompt...
                </option>
                {availablePrompts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Custom Prompts */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-base-content">
            Custom Prompts
          </label>
          <button
            onClick={() => {
              setIsCreating(true);
              setEditingPrompt(null);
              setNewPromptName("");
              setNewPromptText("");
            }}
            className="btn btn-ghost btn-xs gap-1"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>

        <div className="space-y-2">
          {customPrompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onEdit={() => startEditing(prompt)}
              onDelete={() => {
                removeCustomPrompt(prompt.id);
                deletePrompt(prompt.id);
              }}
              onSetDefault={() => {
                if (defaultPrompt) {
                  addCustomPrompt(defaultPrompt.id);
                }
                removeCustomPrompt(prompt.id);
                updateDefaultPromptId(prompt.id);
              }}
            />
          ))}

          {customPrompts.length === 0 && !isCreating && (
            <p className="text-xs text-base-content/50 text-center py-2">
              No custom prompts yet
            </p>
          )}
        </div>
      </div>

      {/* Create/Edit Prompt Form */}
      {(isCreating || editingPrompt) && (
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
          <h4 className="text-sm font-medium">
            {editingPrompt ? "Edit Prompt" : "New Prompt"}
          </h4>
          <input
            type="text"
            value={newPromptName}
            onChange={(e) => setNewPromptName(e.target.value)}
            placeholder="Prompt name..."
            className="input input-bordered input-sm w-full"
          />
          <textarea
            value={newPromptText}
            onChange={(e) => setNewPromptText(e.target.value)}
            placeholder="Enter your prompt..."
            className="textarea textarea-bordered textarea-sm w-full h-24 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button onClick={cancelEditing} className="btn btn-ghost btn-xs">
              Cancel
            </button>
            <button
              onClick={editingPrompt ? handleUpdatePrompt : handleCreatePrompt}
              className="btn btn-primary btn-xs"
              disabled={!newPromptName.trim() || !newPromptText.trim()}
            >
              {editingPrompt ? "Save" : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* Add existing prompt */}
      {availablePrompts.length > 0 && !isCreating && !editingPrompt && (
        <div>
          <label className="text-sm font-medium text-base-content mb-2 block">
            Add Existing Prompt
          </label>
          <select
            className="select select-bordered select-sm w-full"
            onChange={(e) => {
              if (e.target.value) addCustomPrompt(e.target.value);
            }}
            value=""
          >
            <option value="" disabled>
              Select a prompt to add...
            </option>
            {availablePrompts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
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
  pageId,
  blocks,
  reviews,
  blockPositions,
  activeBlockId,
  isReviewingAll,
  initialTab,
  onClose,
  onBlockClick,
  onReReview,
  onReviewAll,
}: AIReviewPanelProps) {
  // Load initial tab from: query param > localStorage > default ("configure")
  const [activeTab, setActiveTab] = useState<ReviewTab>(() => {
    // Query param takes highest priority
    if (initialTab) return initialTab;

    // Then check localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`review-panel-tab-${pageId}`);
      if (
        stored === "configure" ||
        stored === "overall" ||
        stored === "detailed"
      ) {
        return stored;
      }
    }

    // Default to configure
    return "configure";
  });

  // Persist tab selection to localStorage
  const handleTabChange = (tab: ReviewTab) => {
    setActiveTab(tab);
    localStorage.setItem(`review-panel-tab-${pageId}`, tab);
  };

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
                onClick={() => handleTabChange(tab.id)}
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
        {activeTab === "configure" && <ConfigureTab pageId={pageId} />}
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
