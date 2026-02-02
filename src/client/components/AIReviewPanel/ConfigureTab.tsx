import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { usePageReviewSettings } from "@/client/hooks/usePageReviewSettings";
import { usePageSharing } from "@/client/hooks/usePageSharing";
import { ShareSettings } from "../ShareSettings";
import { AutoResizeTextarea } from "./AutoResizeTextarea";
import { LoadingSpinner } from "@/client/components/LoadingSpinner";
import { DeleteConfirmationModal } from "@/client/components/DeleteConfirmationModal";

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
  const { defaultPrompt, isLoading, updatePrompt } =
    usePageReviewSettings(pageId);
  const { isOwner } = usePageSharing(pageId);
  const [isEditingDefaultPrompt, setIsEditingDefaultPrompt] = useState(false);
  const [editedDefaultPromptText, setEditedDefaultPromptText] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteModal(false);
    onDeletePage?.();
  };

  return (
    <div className="p-4 space-y-6">
      {/* AI Model indicator */}
      <div>
        <label className="text-sm font-medium text-base-content mb-2 block">
          AI Model
        </label>
        <div className="text-sm text-base-content/70">
          OpenAI - GPT 5.2 High
        </div>
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
            onClick={handleDeleteClick}
            className="btn btn-ghost btn-sm gap-2 text-base-content/60 hover:text-error"
          >
            <Trash2 className="h-4 w-4" />
            Delete Page
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Page"
        description="Are you sure you want to delete this page? This action cannot be undone."
        confirmText="Delete Page"
      />
    </div>
  );
}
