import { useState, useCallback, useEffect, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { toast } from "sonner";
import {
  X,
  RefreshCw,
  Sparkles,
  Settings2,
  FileText,
  Trash2,
  Brain,
} from "lucide-react";
import type { PageBlock } from "@/types/schemas/pages";
import { usePageReviewSettings } from "@/client/hooks/usePageReviewSettings";
import { useOverallReview } from "@/client/hooks/useOverallReview";
import { SHORTCUT_CLOSE_PANEL_HOTKEY } from "@/client/lib/keyboard-shortcuts";

/**
 * Auto-resizing textarea that matches Q&A answer styling
 */
function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`textarea textarea-bordered w-full resize-none overflow-hidden ${className}`}
      rows={1}
    />
  );
}

export type ReviewTab = "settings" | "overall";

interface BlockReviewPanelProps {
  pageId: string;
  blocks: PageBlock[];
  /** Current active tab - controlled from parent */
  activeTab: ReviewTab;
  /** Called when tab changes */
  onTabChange?: (tab: ReviewTab) => void;
  onClose: () => void;
  /** Called when delete page is requested */
  onDeletePage: () => void;
  /** If true, header is rendered externally and not inside the panel */
  externalHeader?: boolean;
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
    aiModels,
    isLoading,
    updateModel,
    updatePrompt,
  } = usePageReviewSettings(pageId);
  const [isEditingDefaultPrompt, setIsEditingDefaultPrompt] = useState(false);
  const [editedDefaultPromptText, setEditedDefaultPromptText] = useState("");

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
        <AutoResizeTextarea
          value={
            isEditingDefaultPrompt
              ? editedDefaultPromptText
              : (defaultPrompt?.prompt ?? "")
          }
          onChange={(value) => {
            if (defaultPrompt) {
              if (!isEditingDefaultPrompt) {
                setIsEditingDefaultPrompt(true);
                setEditedDefaultPromptText(value);
              } else {
                setEditedDefaultPromptText(value);
              }
            }
          }}
          placeholder="Type default review prompt here..."
          className="textarea-sm text-sm"
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
      </div>

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

function OverallTab({
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

  // Format the date for display
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

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
              Generated {formatDate(overallReview.updatedAt)}
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
  // Close panel on Escape key
  useHotkeys(SHORTCUT_CLOSE_PANEL_HOTKEY, onClose, { enableOnFormTags: true }, [
    onClose,
  ]);

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
  activeTab,
  onTabChange,
  onClose,
  onDeletePage,
  externalHeader,
}: BlockReviewPanelProps) {
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

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "settings" && (
          <ConfigureTab pageId={pageId} onDeletePage={onDeletePage} />
        )}
        {activeTab === "overall" && (
          <OverallTab pageId={pageId} blocks={blocks} />
        )}
      </div>
    </div>
  );
}
