import { FileText } from "lucide-react";
import type { Template } from "@/templates";

interface TemplateCardProps {
  template: Template;
  onClick: () => void;
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-base-100 rounded-lg border border-base-300 p-5 hover:border-primary/50 hover:shadow-md transition-all text-left group"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base-content group-hover:text-primary transition-colors">
            {template.name}
          </h3>
          <p className="text-sm text-base-content/60 mt-1">
            {template.description}
          </p>
          <p className="text-xs text-base-content/40 mt-2">
            {template.questions.length} questions
          </p>
        </div>
      </div>
    </button>
  );
}
