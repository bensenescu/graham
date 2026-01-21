import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { templates, type Template } from "@/templates";
import {
  createPageFromTemplate,
  createPageFromTemplateParams,
} from "@/client/actions/createPageFromTemplate";
import { TemplatePreviewModal } from "@/client/components/TemplatePreviewModal";
import { TemplateCard } from "@/client/components/TemplateCard";
import { pageCollection } from "@/client/tanstack-db";

/**
 * Shared component for creating a new page - either from a template or blank.
 * Used in both the empty state on the index page and the /new route.
 */
export function NewPageOptions() {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );

  const handleUseTemplate = (template: Template) => {
    const params = createPageFromTemplateParams(template);
    createPageFromTemplate(params);
    setSelectedTemplate(null);
    navigate({ to: "/page/$pageId", params: { pageId: params.pageId } });
  };

  const handleNewBlankPage = () => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    pageCollection.insert({
      id,
      title: "Untitled",
      createdAt: now,
      updatedAt: now,
    });
    navigate({ to: "/page/$pageId", params: { pageId: id } });
  };

  return (
    <>
      {/* Templates section */}
      {templates.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-medium text-base-content/60 uppercase tracking-wide mb-4">
            Start with a template
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onClick={() => setSelectedTemplate(template)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-base-300" />
        <span className="text-sm text-base-content/40">or</span>
        <div className="flex-1 h-px bg-base-300" />
      </div>

      {/* Create blank page option */}
      <button
        onClick={handleNewBlankPage}
        className="w-full btn btn-ghost justify-start gap-3 h-auto py-4 px-4 border border-base-300 hover:border-primary/50"
      >
        <div className="w-10 h-10 rounded-lg bg-base-200 flex items-center justify-center flex-shrink-0">
          <Plus className="h-5 w-5 text-base-content/60" />
        </div>
        <div className="text-left">
          <div className="font-semibold text-base-content">Blank page</div>
          <div className="text-sm text-base-content/60">Start from scratch</div>
        </div>
      </button>

      {/* Template Preview Modal */}
      <TemplatePreviewModal
        template={selectedTemplate}
        onClose={() => setSelectedTemplate(null)}
        onUseTemplate={handleUseTemplate}
      />
    </>
  );
}
