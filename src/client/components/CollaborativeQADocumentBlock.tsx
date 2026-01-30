import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { GripVertical, Trash2, MoreVertical, Sparkles } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import * as Y from "yjs";
import type { PageBlock } from "@/types/schemas/pages";
import type { BlockReview } from "@/types/schemas/reviews";
import { InlineBlockReview } from "./InlineBlockReview";
import { getBlockItemId } from "@/client/lib/element-ids";
import {
  useBlockCollaboration,
  type BlockAwarenessUser,
} from "../hooks/useBlockCollaboration";
import { BlockPresenceIndicator } from "./BlockPresenceIndicator";
import { type UserInfo } from "../hooks/useYjsWebSocket";

interface CollaborativeQADocumentBlockProps {
  block: PageBlock;
  review?: BlockReview;
  isReviewLoading?: boolean;
  isActive?: boolean;
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
  /** User info for collaboration */
  userInfo: UserInfo;
  /** Whether collaboration is enabled */
  collaborationEnabled?: boolean;
}

/**
 * Collaborative auto-resizing textarea that syncs with Yjs Y.Text
 */
function CollaborativeTextarea({
  yText,
  placeholder,
  className,
  onKeyDown,
  onKeyUp,
  onMouseUp,
  onSelect,
  onFocus,
  onBlur,
  inputRef,
  onChange,
}: {
  yText: Y.Text;
  placeholder: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onKeyUp?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLTextAreaElement>) => void;
  onSelect?: (e: React.SyntheticEvent<HTMLTextAreaElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  onChange?: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resolvedRef = inputRef ?? textareaRef;
  const [value, setValue] = useState(yText.toString());

  // Subscribe to Y.Text changes
  useEffect(() => {
    const observer = () => {
      const newValue = yText.toString();
      setValue(newValue);
      onChange?.(newValue);
    };

    yText.observe(observer);
    return () => yText.unobserve(observer);
  }, [yText, onChange]);

  // Auto-resize on value change
  useEffect(() => {
    const textarea = resolvedRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value, resolvedRef]);

  // Handle local changes
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const oldValue = yText.toString();

      // Calculate the diff and apply to Y.Text
      // For simplicity, we'll use a basic approach: delete all and insert new
      // A more sophisticated approach would use a diff algorithm
      if (newValue !== oldValue) {
        yText.delete(0, oldValue.length);
        yText.insert(0, newValue);
      }
    },
    [yText],
  );

  return (
    <textarea
      ref={resolvedRef}
      value={value}
      onChange={handleChange}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onMouseUp={onMouseUp}
      onSelect={onSelect}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      className={`w-full resize-none overflow-hidden bg-transparent focus:outline-none ${className}`}
      rows={1}
    />
  );
}

/**
 * Regular auto-resizing textarea (non-collaborative fallback)
 */
function AutoResizeTextarea({
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  onKeyDown,
  onKeyUp,
  onMouseUp,
  onSelect,
  onFocus,
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onKeyUp?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLTextAreaElement>) => void;
  onSelect?: (e: React.SyntheticEvent<HTMLTextAreaElement>) => void;
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
      onKeyUp={onKeyUp}
      onMouseUp={onMouseUp}
      onSelect={onSelect}
      onFocus={onFocus}
      placeholder={placeholder}
      className={`w-full resize-none overflow-hidden bg-transparent focus:outline-none ${className}`}
      rows={1}
    />
  );
}

interface CursorOverlay {
  userId: string;
  userName: string;
  userColor: string;
  top: number;
  left: number;
  height: number;
}

function getTextareaCaretCoordinates(
  textarea: HTMLTextAreaElement,
  position: number,
): { top: number; left: number; height: number } {
  const computed = window.getComputedStyle(textarea);
  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.overflow = "hidden";
  div.style.font = computed.font;
  div.style.padding = computed.padding;
  div.style.border = computed.border;
  div.style.boxSizing = computed.boxSizing;
  div.style.width = computed.width;
  div.style.lineHeight = computed.lineHeight;
  div.style.letterSpacing = computed.letterSpacing;
  div.style.textTransform = computed.textTransform;
  div.style.textIndent = computed.textIndent;
  div.style.wordSpacing = computed.wordSpacing;
  div.style.textAlign = computed.textAlign;

  const text = textarea.value.substring(0, position);
  div.textContent = text;
  const span = document.createElement("span");
  span.textContent = textarea.value.substring(position) || ".";
  div.appendChild(span);

  document.body.appendChild(div);
  const top = span.offsetTop - textarea.scrollTop;
  const left = span.offsetLeft - textarea.scrollLeft;
  document.body.removeChild(div);

  const fontSize = parseFloat(computed.fontSize || "16");
  const lineHeight =
    computed.lineHeight === "normal"
      ? Math.round(fontSize * 1.2)
      : parseFloat(computed.lineHeight || String(fontSize * 1.2));

  return { top, left, height: lineHeight };
}

/**
 * Collaborative Q&A block component
 *
 * Uses Yjs for real-time collaborative editing with cursor presence.
 */
export function CollaborativeQADocumentBlock({
  block,
  review,
  isReviewLoading = false,
  isActive = false,
  showInlineReviews = true,
  onQuestionChange,
  onAnswerChange,
  onDelete,
  onReviewRequest,
  onFocus,
  isOnly = false,
  autoFocusQuestion = false,
  onAutoFocusDone,
  userInfo,
  collaborationEnabled = true,
}: CollaborativeQADocumentBlockProps) {
  // Use block collaboration hook
  const {
    questionText,
    answerText,
    connectionState,
    users,
    updateCursor,
    clearCursor,
  } = useBlockCollaboration({
    blockId: block.id,
    userInfo,
    enabled: collaborationEnabled,
  });

  // Local state for non-collaborative mode or as fallback
  const [localQuestion, setLocalQuestion] = useState(block.question);
  const [localAnswer, setLocalAnswer] = useState(block.answer);
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  const answerInputRef = useRef<HTMLTextAreaElement>(null);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);

  // Determine if we're in collaborative mode
  const isCollaborative =
    collaborationEnabled && connectionState === "connected";

  // Sync local state when block changes from parent (for non-collaborative mode)
  useEffect(() => {
    if (!isCollaborative) {
      setLocalQuestion(block.question);
    }
  }, [block.question, isCollaborative]);

  useEffect(() => {
    if (!isCollaborative) {
      setLocalAnswer(block.answer);
    }
  }, [block.answer, isCollaborative]);

  useEffect(() => {
    if (!isCollaborative) return;
    if (questionText.length === 0 && block.question) {
      questionText.insert(0, block.question);
    }
    if (answerText.length === 0 && block.answer) {
      answerText.insert(0, block.answer);
    }
  }, [isCollaborative, questionText, answerText, block.question, block.answer]);

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

  const updateQuestionCursorFromSelection = useCallback(() => {
    if (!isCollaborative) return;
    const textarea = questionInputRef.current;
    if (!textarea) return;
    updateCursor(
      "question",
      textarea.selectionStart ?? 0,
      textarea.selectionEnd ?? 0,
    );
  }, [isCollaborative, updateCursor]);

  const updateAnswerCursorFromSelection = useCallback(() => {
    if (!isCollaborative) return;
    const textarea = answerInputRef.current;
    if (!textarea) return;
    updateCursor(
      "answer",
      textarea.selectionStart ?? 0,
      textarea.selectionEnd ?? 0,
    );
  }, [isCollaborative, updateCursor]);

  // Handle cursor updates for collaborative mode
  const handleQuestionFocus = useCallback(() => {
    handleFocus();
    updateQuestionCursorFromSelection();
  }, [handleFocus, updateQuestionCursorFromSelection]);

  const handleAnswerFocus = useCallback(() => {
    handleFocus();
    updateAnswerCursorFromSelection();
  }, [handleFocus, updateAnswerCursorFromSelection]);

  const handleBlur = useCallback(() => {
    if (isCollaborative) {
      clearCursor();
    }
  }, [isCollaborative, clearCursor]);

  // Save on blur handlers (for non-collaborative mode)
  const handleQuestionBlur = useCallback(() => {
    handleBlur();
    if (!isCollaborative && localQuestion !== block.question) {
      onQuestionChange(block.id, localQuestion);
    }
  }, [
    block.id,
    block.question,
    localQuestion,
    onQuestionChange,
    isCollaborative,
    handleBlur,
  ]);

  const handleAnswerBlur = useCallback(() => {
    handleBlur();
    if (!isCollaborative && localAnswer !== block.answer) {
      onAnswerChange(block.id, localAnswer);
    }
  }, [
    block.id,
    block.answer,
    localAnswer,
    onAnswerChange,
    isCollaborative,
    handleBlur,
  ]);

  // Sync collaborative changes to parent (debounced)
  const handleCollaborativeQuestionChange = useCallback(
    (value: string) => {
      if (isCollaborative) {
        onQuestionChange(block.id, value);
      }
    },
    [block.id, onQuestionChange, isCollaborative],
  );

  const handleCollaborativeAnswerChange = useCallback(
    (value: string) => {
      if (isCollaborative) {
        onAnswerChange(block.id, value);
      }
    },
    [block.id, onAnswerChange, isCollaborative],
  );

  useEffect(() => {
    if (!autoFocusQuestion) return;
    questionInputRef.current?.focus();
    onAutoFocusDone?.(block.id);
  }, [autoFocusQuestion, block.id, onAutoFocusDone]);

  const containerRef = useRef<HTMLDivElement>(null);

  const setCombinedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
    },
    [setNodeRef],
  );

  // Filter users editing this specific block
  const activeUsers = useMemo(() => users, [users]);

  const [questionCursors, setQuestionCursors] = useState<CursorOverlay[]>([]);
  const [answerCursors, setAnswerCursors] = useState<CursorOverlay[]>([]);

  const buildCursorOverlays = useCallback(
    (
      field: "question" | "answer",
      textareaRef: React.RefObject<HTMLTextAreaElement | null>,
    ) => {
      const textarea = textareaRef.current;
      if (!textarea) return [];

      return activeUsers
        .filter((user) => user.cursor?.field === field)
        .map((user) => {
          const position = Math.max(
            0,
            Math.min(textarea.value.length, user.cursor?.head ?? 0),
          );
          const coords = getTextareaCaretCoordinates(textarea, position);
          return {
            userId: user.userId,
            userName: user.userName,
            userColor: user.userColor,
            top: coords.top,
            left: coords.left,
            height: coords.height,
          };
        });
    },
    [activeUsers],
  );

  useEffect(() => {
    if (!isCollaborative) {
      setQuestionCursors([]);
      setAnswerCursors([]);
      return;
    }

    const nextQuestionCursors = buildCursorOverlays(
      "question",
      questionInputRef,
    );
    const nextAnswerCursors = buildCursorOverlays("answer", answerInputRef);
    setQuestionCursors(nextQuestionCursors);
    setAnswerCursors(nextAnswerCursors);
  }, [isCollaborative, buildCursorOverlays]);

  useEffect(() => {
    if (!isCollaborative) return;
    const handleResize = () => {
      setQuestionCursors(buildCursorOverlays("question", questionInputRef));
      setAnswerCursors(buildCursorOverlays("answer", answerInputRef));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isCollaborative, buildCursorOverlays]);

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
        if (e.target === containerRef.current) {
          onFocus?.(block.id);
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setHasFocusWithin(false);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === containerRef.current) {
          e.preventDefault();
          questionInputRef.current?.focus();
        }
        if (e.key === "Escape" && e.target !== containerRef.current) {
          e.preventDefault();
          containerRef.current?.focus();
        }
      }}
    >
      <div className="flex">
        {/* Drag handle */}
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
          <div className="flex items-start gap-2">
            {isCollaborative ? (
              <div className="relative w-full">
                {questionCursors.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none">
                    {questionCursors.map((cursor) => (
                      <div
                        key={cursor.userId}
                        className="absolute"
                        style={{
                          top: cursor.top,
                          left: cursor.left,
                        }}
                      >
                        <div
                          className="w-0.5"
                          style={{
                            height: cursor.height,
                            backgroundColor: cursor.userColor,
                          }}
                        />
                        <div
                          className="absolute -top-6 left-0 -translate-x-1/2 px-1.5 py-0.5 text-[10px] font-medium text-white rounded shadow"
                          style={{ backgroundColor: cursor.userColor }}
                        >
                          {cursor.userName}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <CollaborativeTextarea
                  yText={questionText}
                  placeholder="What question are you exploring?"
                  className="text-base font-semibold text-base-content placeholder:text-base-content/40 leading-relaxed"
                  onFocus={handleQuestionFocus}
                  onBlur={handleQuestionBlur}
                  onKeyUp={updateQuestionCursorFromSelection}
                  onMouseUp={updateQuestionCursorFromSelection}
                  onSelect={updateQuestionCursorFromSelection}
                  inputRef={questionInputRef}
                  onChange={handleCollaborativeQuestionChange}
                />
              </div>
            ) : (
              <AutoResizeTextarea
                value={localQuestion}
                onChange={setLocalQuestion}
                onBlur={handleQuestionBlur}
                onFocus={handleQuestionFocus}
                inputRef={questionInputRef}
                placeholder="What question are you exploring?"
                className="text-base font-semibold text-base-content placeholder:text-base-content/40 leading-relaxed"
              />
            )}
          </div>

          {/* Answer */}
          <div className="mt-2">
            {isCollaborative ? (
              <div className="relative w-full">
                {answerCursors.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none">
                    {answerCursors.map((cursor) => (
                      <div
                        key={cursor.userId}
                        className="absolute"
                        style={{
                          top: cursor.top,
                          left: cursor.left,
                        }}
                      >
                        <div
                          className="w-0.5"
                          style={{
                            height: cursor.height,
                            backgroundColor: cursor.userColor,
                          }}
                        />
                        <div
                          className="absolute -top-6 left-0 -translate-x-1/2 px-1.5 py-0.5 text-[10px] font-medium text-white rounded shadow"
                          style={{ backgroundColor: cursor.userColor }}
                        >
                          {cursor.userName}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <CollaborativeTextarea
                  yText={answerText}
                  placeholder="Write your answer here..."
                  className="text-base text-base-content/80 placeholder:text-base-content/40 leading-relaxed"
                  onFocus={handleAnswerFocus}
                  onBlur={handleAnswerBlur}
                  onKeyUp={updateAnswerCursorFromSelection}
                  onMouseUp={updateAnswerCursorFromSelection}
                  onSelect={updateAnswerCursorFromSelection}
                  inputRef={answerInputRef}
                  onChange={handleCollaborativeAnswerChange}
                />
              </div>
            ) : (
              <AutoResizeTextarea
                value={localAnswer}
                onChange={setLocalAnswer}
                onBlur={handleAnswerBlur}
                onFocus={handleAnswerFocus}
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

        {/* Presence indicator & Actions */}
        <div className="flex-shrink-0 ml-2 flex items-start gap-2">
          {/* Show users editing this block */}
          {activeUsers.length > 0 && (
            <div className="pt-1">
              <BlockPresenceIndicator users={activeUsers} size="sm" />
            </div>
          )}

          {/* Actions dropdown */}
          <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity dropdown dropdown-end">
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
      </div>

      {/* Divider */}
      <div className="mt-4 border-b border-base-300/50" />
    </div>
  );
}
