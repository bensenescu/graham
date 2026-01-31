import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { usePageReviewSettings } from "@/client/hooks/usePageReviewSettings";
import { usePageSharing } from "@/client/hooks/usePageSharing";
import { ShareSettings } from "../ShareSettings";
import { AutoResizeTextarea } from "./AutoResizeTextarea";
import { LoadingSpinner } from "@/client/components/LoadingSpinner";

/**
 * Configure tab - Review settings, prompts, and model selection
 */
export function ConfigureTab({
  pageId,
  onDeletePage,
}: {
  pageId: string;
  onDeletePage?: () => void;
}) {
  const {
    settings,
    defaultPrompt,
    aiModels,
    isLoading,
    updateModel,
    updatePrompt,
  } = usePageReviewSettings(pageId);
  const { isOwner } = usePageSharing(pageId);
  const [isEditingDefaultPrompt, setIsEditingDefaultPrompt] = useState(false);
  const [editedDefaultPromptText, setEditedDefaultPromptText] = useState("");

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <LoadingSpinner size="sm" />
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

      {/* Sharing - only visible to page owner */}
      <div className="pt-4 border-t border-base-300">
        <ShareSettings pageId={pageId} />
      </div>

      {/* Delete Page - only visible to page owner */}
      {isOwner && onDeletePage && (
        <div className="pt-4 border-t border-base-300">
          <button
            onClick={onDeletePage}
            className="btn btn-ghost btn-sm gap-2 text-base-content/60 hover:text-error"
          >
            <Trash2 className="h-4 w-4" />
            Delete Page
          </button>
        </div>
      )}
    </div>
  );
}
