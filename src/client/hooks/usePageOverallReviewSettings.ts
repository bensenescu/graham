import { useMemo, useCallback } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import {
  promptCollection,
  createPageOverallReviewSettingsCollection,
} from "@/client/tanstack-db";
import type { OverallReviewMode, Prompt } from "@/types/schemas/prompts";

/**
 * Hook for managing page overall review settings.
 */
export function usePageOverallReviewSettings(pageId: string) {
  // Create the settings collection for this page
  const settingsCollection = useMemo(
    () => createPageOverallReviewSettingsCollection(pageId),
    [pageId],
  );

  // Get all prompts for the user
  const { data: prompts, isLoading: isLoadingPrompts } = useLiveQuery((q) =>
    q.from({ prompt: promptCollection }),
  );

  // Get overall review settings for this page
  const { data: settingsArray, isLoading: isLoadingSettings } = useLiveQuery(
    (q) => q.from({ settings: settingsCollection }),
  );

  const settings = settingsArray?.[0] ?? null;
  const isLoading = isLoadingPrompts || isLoadingSettings;

  // Get the selected prompts (for select_prompts mode)
  const selectedPrompts = useMemo(() => {
    return settings?.selectedPrompts ?? [];
  }, [settings?.selectedPrompts]);

  // Get available prompts (not already selected)
  const availablePrompts = useMemo(() => {
    if (!prompts) return [];
    const selectedIds = new Set(selectedPrompts.map((p: Prompt) => p.id));
    return prompts.filter((p) => !selectedIds.has(p.id));
  }, [prompts, selectedPrompts]);

  // Update mode
  const updateMode = useCallback(
    (mode: OverallReviewMode) => {
      if (!settings) return;
      settingsCollection.update(settings.id, (draft) => {
        draft.mode = mode;
      });
    },
    [settings, settingsCollection],
  );

  // Update custom prompt
  const updateCustomPrompt = useCallback(
    (customPrompt: string | null) => {
      if (!settings) return;
      settingsCollection.update(settings.id, (draft) => {
        draft.customPrompt = customPrompt;
      });
    },
    [settings, settingsCollection],
  );

  // Add a prompt to selected prompts
  const addSelectedPrompt = useCallback(
    (promptId: string) => {
      if (!settings || !prompts) return;
      const promptToAdd = prompts.find((p) => p.id === promptId);
      if (!promptToAdd) return;

      settingsCollection.update(settings.id, (draft) => {
        const existing = draft.selectedPrompts ?? [];
        if (!existing.some((p: Prompt) => p.id === promptId)) {
          draft.selectedPrompts = [...existing, promptToAdd];
        }
      });
    },
    [settings, settingsCollection, prompts],
  );

  // Remove a prompt from selected prompts
  const removeSelectedPrompt = useCallback(
    (promptId: string) => {
      if (!settings) return;
      settingsCollection.update(settings.id, (draft) => {
        draft.selectedPrompts = (draft.selectedPrompts ?? []).filter(
          (p: Prompt) => p.id !== promptId,
        );
      });
    },
    [settings, settingsCollection],
  );

  return {
    // Data
    settings,
    prompts: prompts ?? [],
    selectedPrompts,
    availablePrompts,
    isLoading,

    // Actions
    updateMode,
    updateCustomPrompt,
    addSelectedPrompt,
    removeSelectedPrompt,
  };
}
