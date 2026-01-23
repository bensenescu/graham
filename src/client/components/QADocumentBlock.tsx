import { useRef, useEffect, useCallback, useState } from "react";
import { GripVertical, Trash2, MoreVertical, Sparkles } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PageBlock } from "@/types/schemas/pages";
import type { BlockReview } from "@/types/schemas/reviews";
import { InlineBlockReview } from "./InlineBlockReview";

interface QADocumentBlockProps {
  block: PageBlock;
  review?: BlockReview;
  isReviewLoading?: boolean;
  isActive?: boolean;
  /** Whether to show inline reviews */
  showInlineReviews?: boolean;
  onQuestionChange: (id: string, question: string) => void;
  onAnswerChange: (id: string, answer: string) => void;
  onDelete: (id: string) => void;
  onAddAfter?: (id: string) => void;
  onReviewRequest?: (id: string) => void;
  onFocus?: (id: string) => void;
  isOnly?: boolean;
}

/**
 * Auto-resizing textarea that grows with content
 */
function AutoResizeTextarea({
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  onKeyDown,
  onFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: () => void;
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
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      placeholder={placeholder}
      className={`w-full resize-none overflow-hidden bg-transparent focus:outline-none ${className}`}
      rows={1}
    />
  );
}

/**
 * Document-style Q&A block without card wrapper.
 * Clean, minimal design that flows like a document.
 */
export function QADocumentBlock({
  block,
  review,
  isReviewLoading = false,
  isActive = false,
  showInlineReviews = true,
  onQuestionChange,
  onAnswerChange,
  onDelete,
  onAddAfter,
  onReviewRequest,
  onFocus,
  isOnly = false,
}: QADocumentBlockProps) {
  // Local state for editing - only sync to parent on blur
  const [localQuestion, setLocalQuestion] = useState(block.question);
  const [localAnswer, setLocalAnswer] = useState(block.answer);

  // Sync local state when block changes from parent (e.g., from sync)
  useEffect(() => {
    setLocalQuestion(block.question);
  }, [block.question]);

  useEffect(() => {
    setLocalAnswer(block.answer);
  }, [block.answer]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleQuestionKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onAddAfter?.(block.id);
      }
    },
    [block.id, onAddAfter],
  );

  const handleAnswerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onAddAfter?.(block.id);
      }
    },
    [block.id, onAddAfter],
  );

  const handleFocus = useCallback(() => {
    onFocus?.(block.id);
  }, [block.id, onFocus]);

  // Save on blur handlers
  const handleQuestionBlur = useCallback(() => {
    if (localQuestion !== block.question) {
      onQuestionChange(block.id, localQuestion);
    }
  }, [block.id, block.question, localQuestion, onQuestionChange]);

  const handleAnswerBlur = useCallback(() => {
    if (localAnswer !== block.answer) {
      onAnswerChange(block.id, localAnswer);
    }
  }, [block.id, block.answer, localAnswer, onAnswerChange]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-block-id={block.id}
      className={`
        group relative py-4 transition-colors
        ${isActive ? "bg-primary/5 -mx-4 px-4 rounded-lg" : ""}
      `}
    >
      <div className="flex">
        {/* Drag handle - appears on hover or focus-within */}
        <div className="flex-shrink-0 w-6 flex items-start justify-center pt-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-base-content/30 hover:text-base-content/50 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Question */}
          <div className="flex items-start gap-2">
            <AutoResizeTextarea
              value={localQuestion}
              onChange={setLocalQuestion}
              onBlur={handleQuestionBlur}
              onKeyDown={handleQuestionKeyDown}
              onFocus={handleFocus}
              placeholder="What question are you exploring?"
              className="text-base font-semibold text-base-content placeholder:text-base-content/40 leading-relaxed"
            />
          </div>

          {/* Answer */}
          <div className="mt-2">
            <AutoResizeTextarea
              value={localAnswer}
              onChange={setLocalAnswer}
              onBlur={handleAnswerBlur}
              onKeyDown={handleAnswerKeyDown}
              onFocus={handleFocus}
              placeholder="Write your answer here..."
              className="text-base text-base-content/80 placeholder:text-base-content/40 leading-relaxed"
            />
          </div>

          {/* Inline Review */}
          {showInlineReviews && (
            <InlineBlockReview review={review} isLoading={isReviewLoading} />
          )}
        </div>

        {/* Actions dropdown - appears on hover or focus-within */}
        <div className="flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity dropdown dropdown-end">
          <button
            tabIndex={0}
            className="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content"
            aria-label="Question actions"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          <ul
            tabIndex={0}
            className="dropdown-content z-20 menu p-1 shadow-lg bg-base-100 rounded-lg border border-base-300 w-44"
          >
            {onReviewRequest && (
              <li>
                <button
                  onClick={() => onReviewRequest(block.id)}
                  disabled={isReviewLoading}
                  className="flex items-center gap-2 text-sm"
                >
                  {isReviewLoading ? (
                    <>
                      <span className="loading loading-spinner loading-xs" />
                      Reviewing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {review ? "Re-review" : "Review"}
                    </>
                  )}
                </button>
              </li>
            )}
            {!isOnly && (
              <li>
                <button
                  onClick={() => onDelete(block.id)}
                  className="flex items-center gap-2 text-sm text-error"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Divider */}
      <div className="mt-4 border-b border-base-300/50" />
    </div>
  );
}
