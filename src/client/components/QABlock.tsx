import { useRef, useEffect, useCallback } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PageBlock } from "@/types/schemas/pages";

interface QABlockProps {
  block: PageBlock;
  onQuestionChange: (id: string, question: string) => void;
  onAnswerChange: (id: string, answer: string) => void;
  onDelete: (id: string) => void;
  onAddAfter?: (id: string) => void;
  isOnly?: boolean; // If this is the only block, prevent deletion
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
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize on content change
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
      placeholder={placeholder}
      className={`w-full resize-none overflow-hidden bg-transparent focus:outline-none ${className}`}
      rows={1}
    />
  );
}

export function QABlock({
  block,
  onQuestionChange,
  onAnswerChange,
  onDelete,
  onAddAfter,
  isOnly = false,
}: QABlockProps) {
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

  // Handle keyboard shortcuts
  const handleQuestionKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd/Ctrl + Enter to add new block after this one
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onAddAfter?.(block.id);
      }
    },
    [block.id, onAddAfter],
  );

  const handleAnswerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd/Ctrl + Enter to add new block after this one
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        onAddAfter?.(block.id);
      }
    },
    [block.id, onAddAfter],
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative bg-base-100 rounded-lg border border-base-300 hover:border-base-content/20 transition-colors"
    >
      <div className="flex">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 w-8 flex items-start justify-center pt-4 cursor-grab active:cursor-grabbing text-base-content/30 hover:text-base-content/50 transition-colors"
        >
          <GripVertical className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 py-4 pr-4">
          {/* Question - H2 style */}
          <AutoResizeTextarea
            value={block.question}
            onChange={(value) => onQuestionChange(block.id, value)}
            onKeyDown={handleQuestionKeyDown}
            placeholder="What question are you exploring?"
            className="text-xl font-semibold text-base-content placeholder:text-base-content/40"
          />

          {/* Answer - normal text */}
          <AutoResizeTextarea
            value={block.answer}
            onChange={(value) => onAnswerChange(block.id, value)}
            onKeyDown={handleAnswerKeyDown}
            placeholder="Write your answer here..."
            className="mt-3 text-base text-base-content/80 placeholder:text-base-content/40 leading-relaxed"
          />
        </div>

        {/* Delete button - appears on hover or focus-within */}
        {!isOnly && (
          <button
            onClick={() => onDelete(block.id)}
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity btn btn-ghost btn-xs btn-square text-error"
            aria-label="Delete Q&A block"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
