import { useEffect, useRef } from "react";
import { X, FileText, Plus } from "lucide-react";
import type { Template } from "@/templates";

interface TemplatePreviewModalProps {
  template: Template | null;
  onClose: () => void;
  onUseTemplate: (template: Template) => void;
}

export function TemplatePreviewModal({
  template,
  onClose,
  onUseTemplate,
}: TemplatePreviewModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (template) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [template]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (rect) {
      const isInDialog =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!isInDialog) {
        onClose();
      }
    }
  };

  // Handle escape key
  const handleCancel = (e: React.SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault();
    onClose();
  };

  if (!template) return null;

  // Group questions by section
  const questionsBySection = template.questions.reduce(
    (acc, question) => {
      const section = question.section || "General";
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(question);
      return acc;
    },
    {} as Record<string, typeof template.questions>,
  );

  const sections = Object.keys(questionsBySection);

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onClick={handleBackdropClick}
      onCancel={handleCancel}
    >
      <div className="modal-box max-w-2xl max-h-[85vh] flex flex-col p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-base-content">
                {template.name}
              </h3>
              <p className="text-sm text-base-content/60">
                {template.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Questions Preview */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {sections.map((section) => (
              <div
                key={section}
                className="bg-base-200 rounded-lg p-4 border border-base-300"
              >
                <h4 className="text-sm font-medium text-base-content/60 uppercase tracking-wide mb-3">
                  {section}
                </h4>
                <div className="space-y-2">
                  {questionsBySection[section].map((q, idx) => (
                    <p key={idx} className="text-sm text-base-content">
                      {q.question}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-base-300 bg-base-100 flex-shrink-0">
          <span className="text-sm text-base-content/60">
            {template.questions.length} questions
          </span>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button
              onClick={() => onUseTemplate(template)}
              className="btn btn-primary gap-2"
            >
              <Plus className="h-4 w-4" />
              Use Template
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
