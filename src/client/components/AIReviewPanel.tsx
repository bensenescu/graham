import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import {
  X,
  RefreshCw,
  Check,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  Settings2,
  FileText,
  Plus,
  Trash2,
  Edit2,
} from "lucide-react";
import type { BlockReview } from "@/types/schemas/reviews";
import type { PageBlock } from "@/types/schemas/pages";
import type { Prompt, OverallReviewMode } from "@/types/schemas/prompts";
import { usePageReviewSettings } from "@/client/hooks/usePageReviewSettings";
import { usePageOverallReviewSettings } from "@/client/hooks/usePageOverallReviewSettings";

export type ReviewTab = "settings" | "overall";

interface AIReviewPanelProps {
  pageId: string;
  blocks: PageBlock[];
  reviews: Map<string, BlockReview>;
  isReviewingAll: boolean;
  /** Current active tab - controlled from parent */
  activeTab: ReviewTab;
  /** Called when tab changes */
  onTabChange?: (tab: ReviewTab) => void;
  onClose: () => void;
  onReviewAll: () => void;
  /** Called when delete page is requested */
  onDeletePage: () => void;
  /** If true, header is rendered externally and not inside the panel */
  externalHeader?: boolean;
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
function ConfigureTab({
  pageId,
  onDeletePage,
}: {
  pageId: string;
  onDeletePage: () => void;
}) {
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
  const [isCreatingDefault, setIsCreatingDefault] = useState(false);
  const [defaultPromptText, setDefaultPromptText] = useState("");
  const [isEditingDefaultPrompt, setIsEditingDefaultPrompt] = useState(false);
  const [editedDefaultPromptText, setEditedDefaultPromptText] = useState("");

  const handleCreatePrompt = () => {
    if (!newPromptName.trim() || !newPromptText.trim()) return;
    createPrompt(newPromptName.trim(), newPromptText.trim());
    setNewPromptName("");
    setNewPromptText("");
    setIsCreating(false);
  };

  const handleCreateDefaultPrompt = () => {
    if (!defaultPromptText.trim()) return;
    const id = createPrompt("Default Prompt", defaultPromptText.trim());
    updateDefaultPromptId(id);
    setDefaultPromptText("");
    setIsCreatingDefault(false);
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
    setIsCreatingDefault(false);
    setNewPromptName("");
    setNewPromptText("");
    setDefaultPromptText("");
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
        <textarea
          value={
            isEditingDefaultPrompt
              ? editedDefaultPromptText
              : (defaultPrompt?.prompt ?? defaultPromptText)
          }
          onChange={(e) => {
            if (defaultPrompt) {
              if (!isEditingDefaultPrompt) {
                setIsEditingDefaultPrompt(true);
                setEditedDefaultPromptText(e.target.value);
              } else {
                setEditedDefaultPromptText(e.target.value);
              }
            } else {
              setDefaultPromptText(e.target.value);
              if (!isCreatingDefault) setIsCreatingDefault(true);
            }
          }}
          placeholder="Type default review prompt here..."
          className="textarea textarea-bordered textarea-sm w-full h-20 text-sm"
        />
        {defaultPrompt && isEditingDefaultPrompt && (
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => {
                setIsEditingDefaultPrompt(false);
                setEditedDefaultPromptText("");
              }}
              className="btn btn-ghost btn-xs"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                updatePrompt(defaultPrompt.id, {
                  prompt: editedDefaultPromptText.trim(),
                });
                setIsEditingDefaultPrompt(false);
                setEditedDefaultPromptText("");
                toast("Default prompt updated");
              }}
              className="btn btn-neutral btn-xs"
              disabled={!editedDefaultPromptText.trim()}
            >
              Save
            </button>
          </div>
        )}
        {!defaultPrompt && isCreatingDefault && (
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={cancelEditing} className="btn btn-ghost btn-xs">
              Cancel
            </button>
            <button
              onClick={handleCreateDefaultPrompt}
              className="btn btn-neutral btn-xs"
              disabled={!defaultPromptText.trim()}
            >
              Save
            </button>
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
        <div className="space-y-3">
          {/* Select existing prompt - only shown when creating (not editing) */}
          {isCreating && !editingPrompt && availablePrompts.length > 0 && (
            <>
              <select
                className="select select-bordered select-sm w-full"
                onChange={(e) => {
                  if (e.target.value) {
                    addCustomPrompt(e.target.value);
                    setIsCreating(false);
                  }
                }}
                value=""
              >
                <option value="" disabled>
                  Select an existing prompt...
                </option>
                {availablePrompts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-base-300" />
                <span className="text-xs text-base-content/40">or</span>
                <div className="flex-1 h-px bg-base-300" />
              </div>
            </>
          )}

          <div className="space-y-2">
            <input
              type="text"
              value={newPromptName}
              onChange={(e) => setNewPromptName(e.target.value)}
              placeholder="Prompt name..."
              className="input input-bordered input-sm w-full"
              autoFocus
            />
            <textarea
              value={newPromptText}
              onChange={(e) => setNewPromptText(e.target.value)}
              placeholder="Enter your prompt..."
              className="textarea textarea-bordered textarea-sm w-full h-20 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button onClick={cancelEditing} className="btn btn-ghost btn-xs">
                Cancel
              </button>
              <button
                onClick={
                  editingPrompt ? handleUpdatePrompt : handleCreatePrompt
                }
                className="btn btn-neutral btn-xs"
                disabled={!newPromptName.trim() || !newPromptText.trim()}
              >
                {editingPrompt ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Page */}
      <div className="pt-4 border-t border-base-300">
        <button
          onClick={onDeletePage}
          className="btn btn-ghost btn-sm gap-2 text-base-content/60 hover:text-error"
        >
          <Trash2 className="h-4 w-4" />
          Delete Page
        </button>
      </div>
    </div>
  );
}

/**
 * Overall tab - Holistic feedback on the entire application
 */
function OverallTab({
  pageId,
  blocks,
  reviews,
  onReviewAll,
  isReviewingAll,
}: {
  pageId: string;
  blocks: PageBlock[];
  reviews: Map<string, BlockReview>;
  onReviewAll: () => void;
  isReviewingAll: boolean;
}) {
  const {
    settings,
    prompts,
    selectedPrompts,
    availablePrompts,
    updateMode,
    updateCustomPrompt,
    addSelectedPrompt,
    removeSelectedPrompt,
  } = usePageOverallReviewSettings(pageId);

  const reviewsArray = useMemo(() => Array.from(reviews.values()), [reviews]);

  const hasAnswers = useMemo(() => {
    return blocks.some((b) => b.answer && b.answer.trim().length > 0);
  }, [blocks]);

  // Calculate overall stats
  const stats = useMemo(() => {
    if (reviewsArray.length === 0) return null;
    const totalStrengths = reviewsArray.reduce(
      (sum, r) => sum + r.strengths.length,
      0,
    );
    const totalImprovements = reviewsArray.reduce(
      (sum, r) => sum + r.improvements.length,
      0,
    );
    return {
      totalStrengths,
      totalImprovements,
      reviewed: reviewsArray.length,
      total: blocks.length,
    };
  }, [reviewsArray, blocks.length]);

  const currentMode = (settings?.mode ?? "all_prompts") as OverallReviewMode;

  const modes: { id: OverallReviewMode; label: string }[] = [
    { id: "all_prompts", label: "All" },
    { id: "select_prompts", label: "Select" },
    { id: "custom", label: "Custom" },
  ];

  // Determine context text based on mode
  const getContextText = () => {
    if (currentMode === "all_prompts") {
      return `All ${prompts.length} prompt${prompts.length !== 1 ? "s" : ""} will be used as context for the overall review.`;
    }
    if (currentMode === "select_prompts") {
      if (selectedPrompts.length === 0) {
        return "Select which prompts to use as context.";
      }
      return `${selectedPrompts.length} prompt${selectedPrompts.length !== 1 ? "s" : ""} selected as context.`;
    }
    if (currentMode === "custom") {
      return "Use a custom prompt for the overall review.";
    }
    return "";
  };

  if (!stats) {
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

        {/* Prompts to Consider - Label + Badge Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-base-content">
              Prompts to Consider
            </span>
            <div className="flex rounded-lg border border-base-300 p-0.5 bg-base-200/50">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => updateMode(mode.id)}
                  className={`
                    px-3 py-1 text-xs font-medium rounded-md transition-all
                    ${
                      currentMode === mode.id
                        ? "bg-primary text-primary-content shadow-sm"
                        : "text-base-content/60 hover:text-base-content"
                    }
                  `}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Context text */}
          <p className="text-xs text-base-content/50">{getContextText()}</p>

          {/* Select Prompts Mode - show badges */}
          {currentMode === "select_prompts" && (
            <div className="space-y-2">
              {selectedPrompts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedPrompts.map((prompt: Prompt) => (
                    <div
                      key={prompt.id}
                      className="badge badge-sm bg-base-300 border-base-300 gap-1 pr-0.5"
                    >
                      <span className="truncate max-w-[100px]">
                        {prompt.name}
                      </span>
                      <button
                        onClick={() => removeSelectedPrompt(prompt.id)}
                        className="hover:text-error transition-colors p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {availablePrompts.length > 0 && (
                <div className="dropdown">
                  <button
                    tabIndex={0}
                    className="btn btn-xs btn-ghost gap-1 text-base-content/60 hover:text-primary -ml-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add prompt
                  </button>
                  <ul
                    tabIndex={0}
                    className="dropdown-content z-20 menu p-1 shadow-lg bg-base-100 rounded-lg border border-base-300 w-48 mt-1 max-h-40 overflow-y-auto"
                  >
                    {availablePrompts.map((prompt) => (
                      <li key={prompt.id}>
                        <button
                          onClick={() => addSelectedPrompt(prompt.id)}
                          className="text-sm"
                        >
                          <span className="truncate">{prompt.name}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Custom Mode - show textarea */}
          {currentMode === "custom" && (
            <textarea
              value={settings?.customPrompt ?? ""}
              onChange={(e) => updateCustomPrompt(e.target.value || null)}
              placeholder="Enter your custom overall review prompt..."
              className="textarea textarea-bordered textarea-sm w-full h-20 text-sm"
            />
          )}
        </div>

        {/* CTA */}
        {hasAnswers ? (
          <button
            onClick={onReviewAll}
            disabled={isReviewingAll}
            className="btn btn-primary btn-sm gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isReviewingAll ? "Reviewing..." : "Review All Answers"}
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

  return (
    <div className="p-4 space-y-5">
      {/* Prompts to Consider - Label + Badge Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-base-content">
            Prompts to Consider
          </span>
          <div className="flex rounded-lg border border-base-300 p-0.5 bg-base-200/50">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => updateMode(mode.id)}
                className={`
                  px-3 py-1 text-xs font-medium rounded-md transition-all
                  ${
                    currentMode === mode.id
                      ? "bg-primary text-primary-content shadow-sm"
                      : "text-base-content/60 hover:text-base-content"
                  }
                `}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Context text */}
        <p className="text-xs text-base-content/50">{getContextText()}</p>

        {/* Select Prompts Mode - show badges */}
        {currentMode === "select_prompts" && (
          <div className="space-y-2">
            {selectedPrompts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedPrompts.map((prompt: Prompt) => (
                  <div
                    key={prompt.id}
                    className="badge badge-sm bg-base-300 border-base-300 gap-1 pr-0.5"
                  >
                    <span className="truncate max-w-[100px]">
                      {prompt.name}
                    </span>
                    <button
                      onClick={() => removeSelectedPrompt(prompt.id)}
                      className="hover:text-error transition-colors p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {availablePrompts.length > 0 && (
              <div className="dropdown">
                <button
                  tabIndex={0}
                  className="btn btn-xs btn-ghost gap-1 text-base-content/60 hover:text-primary -ml-1"
                >
                  <Plus className="h-3 w-3" />
                  Add prompt
                </button>
                <ul
                  tabIndex={0}
                  className="dropdown-content z-20 menu p-1 shadow-lg bg-base-100 rounded-lg border border-base-300 w-48 mt-1 max-h-40 overflow-y-auto"
                >
                  {availablePrompts.map((prompt) => (
                    <li key={prompt.id}>
                      <button
                        onClick={() => addSelectedPrompt(prompt.id)}
                        className="text-sm"
                      >
                        <span className="truncate">{prompt.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Custom Mode - show textarea */}
        {currentMode === "custom" && (
          <textarea
            value={settings?.customPrompt ?? ""}
            onChange={(e) => updateCustomPrompt(e.target.value || null)}
            placeholder="Enter your custom overall review prompt..."
            className="textarea textarea-bordered textarea-sm w-full h-20 text-sm"
          />
        )}
      </div>

      {/* Progress */}
      <div className="p-4 rounded-lg bg-base-200/50 border border-base-300">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-base-content">
            Review Progress
          </span>
          <span className="text-lg font-bold text-primary">
            {stats.reviewed}/{stats.total}
          </span>
        </div>
        <div className="w-full bg-base-300 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${(stats.reviewed / stats.total) * 100}%` }}
          />
        </div>
        <p className="text-xs text-base-content/50 mt-2">
          {stats.reviewed} of {stats.total} questions reviewed
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-base-200 border border-base-300">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 rounded bg-success/20">
              <Check className="h-3.5 w-3.5 text-success" />
            </div>
            <span className="text-sm font-medium text-base-content/70">
              Strengths
            </span>
          </div>
          <span className="text-2xl font-bold text-base-content">
            {stats.totalStrengths}
          </span>
        </div>
        <div className="p-3 rounded-lg bg-base-200 border border-base-300">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 rounded bg-warning/20">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            </div>
            <span className="text-sm font-medium text-base-content/70">
              To Improve
            </span>
          </div>
          <span className="text-2xl font-bold text-base-content">
            {stats.totalImprovements}
          </span>
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
 * Header component for the AI Review panel - can be rendered separately
 */
export function BlockReviewPanelHeader({
  activeTab,
  onTabChange,
  onClose,
}: {
  activeTab: ReviewTab;
  onTabChange: (tab: ReviewTab) => void;
  onClose: () => void;
}) {
  const tabs: { id: ReviewTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "settings",
      label: "Settings",
      icon: <Settings2 className="h-4 w-4" />,
    },
    { id: "overall", label: "Overall", icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div className="flex items-center justify-between px-4 py-2 h-full">
      <div className="flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
              ${
                activeTab === tab.id
                  ? "text-primary bg-primary/10"
                  : "text-base-content/60 hover:text-base-content hover:bg-base-200"
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
  );
}

/**
 * AI Review side panel with three tabs:
 * - Configure: Review settings, prompts, model selection
 * - Overall: Holistic feedback on entire application
 * - Detailed: Question by question reviews
 */
export function BlockReviewPanel({
  pageId,
  blocks,
  reviews,
  isReviewingAll,
  activeTab,
  onTabChange,
  onClose,
  onReviewAll,
  onDeletePage,
  externalHeader,
}: AIReviewPanelProps) {
  return (
    <div className="h-full flex flex-col bg-base-100">
      {/* Header - only render inline if not external */}
      {!externalHeader && onTabChange && (
        <div className="flex-shrink-0 border-b border-base-300 bg-base-100">
          <BlockReviewPanelHeader
            activeTab={activeTab}
            onTabChange={onTabChange}
            onClose={onClose}
          />
        </div>
      )}

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
        {activeTab === "settings" && (
          <ConfigureTab pageId={pageId} onDeletePage={onDeletePage} />
        )}
        {activeTab === "overall" && (
          <OverallTab
            pageId={pageId}
            blocks={blocks}
            reviews={reviews}
            onReviewAll={onReviewAll}
            isReviewingAll={isReviewingAll}
          />
        )}
      </div>
    </div>
  );
}

// Keep the old name as an alias for backwards compatibility
export const AIReviewPanel = BlockReviewPanel;
