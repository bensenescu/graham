import { useMemo, useCallback } from "react";
import { useLiveQuery, eq } from "@tanstack/react-db";
import {
  promptCollection,
  pageOverallReviewSettingsCollection,
} from "@/client/tanstack-db";
import type { OverallReviewMode, Prompt } from "@/types/schemas/prompts";

/**
 * Hook for managing page overall review settings.
 */
export function usePageOverallReviewSettings(pageId: string) {
  // Get all prompts for the user
  const { data: prompts, isLoading: isLoadingPrompts } = useLiveQuery((q) =>
    q.from({ prompt: promptCollection }),
  );

  // Get overall review settings for this page (filtered from the singleton collection)
  const { data: settingsArray, isLoading: isLoadingSettings } = useLiveQuery(
    (q) =>
      q
        .from({ settings: pageOverallReviewSettingsCollection })
        .where(({ settings }) => eq(settings.pageId, pageId)),
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
      pageOverallReviewSettingsCollection.update(settings.id, (draft) => {
        draft.mode = mode;
      });
    },
    [settings],
  );

  // Add a prompt to selected prompts
  const addSelectedPrompt = useCallback(
    (promptId: string) => {
      if (!settings || !prompts) return;
      const promptToAdd = prompts.find((p) => p.id === promptId);
      if (!promptToAdd) return;

      pageOverallReviewSettingsCollection.update(settings.id, (draft) => {
        const existing = draft.selectedPrompts ?? [];
        if (!existing.some((p: Prompt) => p.id === promptId)) {
          draft.selectedPrompts = [...existing, promptToAdd];
        }
      });
    },
    [settings, prompts],
  );

  // Remove a prompt from selected prompts
  const removeSelectedPrompt = useCallback(
    (promptId: string) => {
      if (!settings) return;
      pageOverallReviewSettingsCollection.update(settings.id, (draft) => {
        draft.selectedPrompts = (draft.selectedPrompts ?? []).filter(
          (p: Prompt) => p.id !== promptId,
        );
      });
    },
    [settings],
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
    addSelectedPrompt,
    removeSelectedPrompt,
  };
}
