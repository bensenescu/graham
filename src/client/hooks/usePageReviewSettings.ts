import { useMemo, useCallback } from "react";
import { useLiveQuery, eq } from "@tanstack/react-db";
import {
  promptCollection,
  pageReviewSettingsCollection,
} from "@/client/tanstack-db";
import { aiModels } from "@/types/schemas/prompts";

/**
 * Hook for managing page review settings and prompts.
 */
export function usePageReviewSettings(pageId: string) {
  // Get all prompts for the user
  const { data: prompts, isLoading: isLoadingPrompts } = useLiveQuery((q) =>
    q.from({ prompt: promptCollection }),
  );

  // Get review settings for this page (filtered from the singleton collection)
  const { data: settingsArray, isLoading: isLoadingSettings } = useLiveQuery(
    (q) =>
      q
        .from({ settings: pageReviewSettingsCollection })
        .where(({ settings }) => eq(settings.pageId, pageId)),
  );

  const settings = settingsArray?.[0] ?? null;
  const isLoading = isLoadingPrompts || isLoadingSettings;

  // Get the default prompt
  const defaultPrompt = useMemo(() => {
    if (!settings?.defaultPromptId || !prompts) return null;
    return prompts.find((p) => p.id === settings.defaultPromptId) ?? null;
  }, [settings?.defaultPromptId, prompts]);

  // Update model
  const updateModel = useCallback(
    (model: string) => {
      if (!settings) return;
      pageReviewSettingsCollection.update(settings.id, (draft) => {
        draft.model = model;
      });
    },
    [settings],
  );

  // Update default prompt
  const updateDefaultPromptId = useCallback(
    (promptId: string | null) => {
      if (!settings) return;
      pageReviewSettingsCollection.update(settings.id, (draft) => {
        draft.defaultPromptId = promptId;
      });
    },
    [settings],
  );

  // Create a new prompt
  const createPrompt = useCallback((name: string, prompt: string) => {
    const id = crypto.randomUUID();
    promptCollection.insert({
      id,
      userId: "", // Will be set by server
      name,
      prompt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return id;
  }, []);

  // Update an existing prompt
  const updatePrompt = useCallback(
    (promptId: string, updates: { name?: string; prompt?: string }) => {
      promptCollection.update(promptId, (draft) => {
        if (updates.name !== undefined) draft.name = updates.name;
        if (updates.prompt !== undefined) draft.prompt = updates.prompt;
        draft.updatedAt = new Date().toISOString();
      });
    },
    [],
  );

  // Delete a prompt
  const deletePrompt = useCallback((promptId: string) => {
    promptCollection.delete(promptId);
  }, []);

  return {
    // Data
    settings,
    prompts: prompts ?? [],
    defaultPrompt,
    aiModels,
    isLoading,

    // Actions
    updateModel,
    updateDefaultPromptId,
    createPrompt,
    updatePrompt,
    deletePrompt,
  };
}
