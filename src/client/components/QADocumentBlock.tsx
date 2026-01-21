import { useRef, useEffect, useCallback, useState } from "react";
import { GripVertical, Trash2, Sparkles, MoreVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PageBlock } from "@/types/schemas/pages";
import type { AIReview } from "@/types/schemas/reviews";

interface QADocumentBlockProps {
  block: PageBlock;
  review?: AIReview;
  isActive?: boolean;
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
  placeholder,
  className,
  onKeyDown,
  onFocus,
}: {
  value: string;
  onChange: (value: string) => void;
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
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      placeholder={placeholder}
      className={`w-full resize-none overflow-hidden bg-transparent focus:outline-none ${className}`}
      rows={1}
    />
  );
}

/**
 * Grade badge component
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
      <span className="font-semibold">{grade}</span>
      <span className="text-xs opacity-80">{score}</span>
    </div>
  );
}

/**
 * Document-style Q&A block without card wrapper.
 * Clean, minimal design that flows like a document.
 */
export function QADocumentBlock({
  block,
  review,
  isActive = false,
  onQuestionChange,
  onAnswerChange,
  onDelete,
  onAddAfter,
  onReviewRequest,
  onFocus,
  isOnly = false,
}: QADocumentBlockProps) {
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
        {/* Drag handle - appears on hover */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 w-6 flex items-start justify-center pt-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity text-base-content/30 hover:text-base-content/50"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Question */}
          <div className="flex items-start gap-2">
            <AutoResizeTextarea
              value={block.question}
              onChange={(value) => onQuestionChange(block.id, value)}
              onKeyDown={handleQuestionKeyDown}
              onFocus={handleFocus}
              placeholder="What question are you exploring?"
              className="text-base font-semibold text-base-content placeholder:text-base-content/40 leading-relaxed"
            />
            {/* Grade badge if review exists */}
            {review && (
              <div className="flex-shrink-0 mt-1">
                <GradeBadge grade={review.grade} score={review.score} />
              </div>
            )}
          </div>

          {/* Answer */}
          <div className="mt-2">
            <AutoResizeTextarea
              value={block.answer}
              onChange={(value) => onAnswerChange(block.id, value)}
              onKeyDown={handleAnswerKeyDown}
              onFocus={handleFocus}
              placeholder="Write your answer here..."
              className="text-base text-base-content/80 placeholder:text-base-content/40 leading-relaxed"
            />
          </div>
        </div>

        {/* Actions dropdown - appears on hover */}
        <div className="flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity dropdown dropdown-end">
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
                  className="flex items-center gap-2 text-sm"
                >
                  <Sparkles className="h-4 w-4" />
                  Review Question
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
