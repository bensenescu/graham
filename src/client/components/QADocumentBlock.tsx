import { useRef, useEffect, useCallback, useState } from "react";
import { GripVertical, Trash2, MoreVertical, Sparkles } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PageBlock } from "@/types/schemas/pages";
import type { BlockReview } from "@/types/schemas/reviews";
import { InlineBlockReview } from "./InlineBlockReview";
import { getBlockItemId } from "@/client/lib/element-ids";
import { usePageCollabContext } from "./QADocumentEditor";
import { CollabTextEditor, getFragmentText } from "./CollabTextEditor";

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
  autoFocusQuestion?: boolean;
  onAutoFocusDone?: (id: string) => void;
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
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: () => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resolvedRef = inputRef ?? textareaRef;

  useEffect(() => {
    const textarea = resolvedRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value, resolvedRef]);

  return (
    <textarea
      ref={resolvedRef}
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
  autoFocusQuestion = false,
  onAutoFocusDone,
}: QADocumentBlockProps) {
  // Get collaboration context from parent
  const { collab, isCollabReady } = usePageCollabContext();

  // Local state for editing - only sync to parent on blur (fallback mode)
  const [localQuestion, setLocalQuestion] = useState(block.question);
  const [localAnswer, setLocalAnswer] = useState(block.answer);
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  // Track if block has focus within for accessibility (controls should only be tabbable when block is focused)
  const [hasFocusWithin, setHasFocusWithin] = useState(false);

  // Sync local state when block changes from parent (e.g., from sync) - fallback mode only
  useEffect(() => {
    if (!isCollabReady) {
      setLocalQuestion(block.question);
    }
  }, [block.question, isCollabReady]);

  useEffect(() => {
    if (!isCollabReady) {
      setLocalAnswer(block.answer);
    }
  }, [block.answer, isCollabReady]);

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

  const handleFocus = useCallback(() => {
    onFocus?.(block.id);
  }, [block.id, onFocus]);

  // Save on blur handlers - sync Yjs to DB if collab is ready, otherwise use local state
  const handleQuestionBlur = useCallback(() => {
    if (isCollabReady && collab) {
      const fragment = collab.getBlockQuestionFragment(block.id);
      const yjsContent = getFragmentText(fragment);
      if (yjsContent !== block.question) {
        onQuestionChange(block.id, yjsContent);
      }
    } else if (localQuestion !== block.question) {
      onQuestionChange(block.id, localQuestion);
    }
  }, [
    isCollabReady,
    collab,
    block.id,
    block.question,
    localQuestion,
    onQuestionChange,
  ]);

  const handleAnswerBlur = useCallback(() => {
    if (isCollabReady && collab) {
      const fragment = collab.getBlockAnswerFragment(block.id);
      const yjsContent = getFragmentText(fragment);
      if (yjsContent !== block.answer) {
        onAnswerChange(block.id, yjsContent);
      }
    } else if (localAnswer !== block.answer) {
      onAnswerChange(block.id, localAnswer);
    }
  }, [
    isCollabReady,
    collab,
    block.id,
    block.answer,
    localAnswer,
    onAnswerChange,
  ]);

  useEffect(() => {
    if (!autoFocusQuestion) return;
    questionInputRef.current?.focus();
    onAutoFocusDone?.(block.id);
  }, [autoFocusQuestion, block.id, onAutoFocusDone]);

  // Handle container focus (for keyboard navigation)
  const containerRef = useRef<HTMLDivElement>(null);

  // Combine dnd-kit's setNodeRef with our containerRef
  const setCombinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
    },
    [setNodeRef],
  );

  return (
    <div
      ref={setCombinedRef}
      id={getBlockItemId(block.id)}
      tabIndex={0}
      style={style}
      data-block-id={block.id}
      className={`
        group relative py-4 transition-colors outline-none
        focus:bg-primary/5 focus:-mx-4 focus:px-4 focus:rounded-lg
        ${isActive ? "bg-primary/5 -mx-4 px-4 rounded-lg" : ""}
      `}
      onFocus={(e) => {
        setHasFocusWithin(true);
        // Only call onFocus if we're focusing the container itself (for keyboard nav)
        if (e.target === containerRef.current) {
          onFocus?.(block.id);
        }
      }}
      onBlur={(e) => {
        // Only set false if focus moved outside this block
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setHasFocusWithin(false);
        }
      }}
      onKeyDown={(e) => {
        // Enter to start editing the question
        if (e.key === "Enter" && e.target === containerRef.current) {
          e.preventDefault();
          questionInputRef.current?.focus();
        }
        // Escape to return focus to container from textarea
        if (e.key === "Escape" && e.target !== containerRef.current) {
          e.preventDefault();
          containerRef.current?.focus();
        }
      }}
    >
      <div className="flex">
        {/* Drag handle - appears on hover or focus-within, only tabbable when block has focus */}
        <div className="flex-shrink-0 w-6 flex items-start justify-center pt-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            {...attributes}
            {...listeners}
            tabIndex={hasFocusWithin ? 0 : -1}
            className="cursor-grab active:cursor-grabbing text-base-content/30 hover:text-base-content/50 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Question */}
          <div className="flex items-start gap-2 w-full">
            {isCollabReady && collab?.provider ? (
              <CollabTextEditor
                fragment={collab.getBlockQuestionFragment(block.id)}
                provider={collab.provider}
                userName={collab.userInfo.userName}
                userColor={collab.userInfo.userColor}
                placeholder="What question are you exploring?"
                className="text-base font-semibold text-base-content [&_p]:m-0 leading-relaxed w-full"
                onBlur={handleQuestionBlur}
                onFocus={handleFocus}
                initialContent={block.question}
              />
            ) : (
              <AutoResizeTextarea
                value={localQuestion}
                onChange={setLocalQuestion}
                onBlur={handleQuestionBlur}
                onFocus={handleFocus}
                inputRef={questionInputRef}
                placeholder="What question are you exploring?"
                className="text-base font-semibold text-base-content placeholder:text-base-content/40 leading-relaxed"
              />
            )}
          </div>

          {/* Answer */}
          <div className="mt-2">
            {isCollabReady && collab?.provider ? (
              <CollabTextEditor
                fragment={collab.getBlockAnswerFragment(block.id)}
                provider={collab.provider}
                userName={collab.userInfo.userName}
                userColor={collab.userInfo.userColor}
                placeholder="Write your answer here..."
                className="text-base text-base-content/80 [&_p]:m-0 leading-relaxed w-full"
                onBlur={handleAnswerBlur}
                onFocus={handleFocus}
                initialContent={block.answer}
              />
            ) : (
              <AutoResizeTextarea
                value={localAnswer}
                onChange={setLocalAnswer}
                onBlur={handleAnswerBlur}
                onFocus={handleFocus}
                placeholder="Write your answer here..."
                className="text-base text-base-content/80 placeholder:text-base-content/40 leading-relaxed"
              />
            )}
          </div>

          {/* Inline Review */}
          {showInlineReviews && (
            <InlineBlockReview review={review} isLoading={isReviewLoading} />
          )}
        </div>

        {/* Actions dropdown - appears on hover or focus-within, only tabbable when block has focus */}
        <div className="flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity dropdown dropdown-end">
          <button
            tabIndex={hasFocusWithin ? 0 : -1}
            className="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content"
            aria-label="Question actions"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          <ul
            tabIndex={hasFocusWithin ? 0 : -1}
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
