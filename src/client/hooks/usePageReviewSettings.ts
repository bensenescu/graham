import { useMemo, useCallback } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import {
  promptCollection,
  createPageReviewSettingsCollection,
} from "@/client/tanstack-db";
import { aiModels } from "@/types/schemas/prompts";

/**
 * Hook for managing page review settings and prompts.
 */
export function usePageReviewSettings(pageId: string) {
  // Create the settings collection for this page
  const settingsCollection = useMemo(
    () => createPageReviewSettingsCollection(pageId),
    [pageId],
  );

  // Get all prompts for the user
  const { data: prompts, isLoading: isLoadingPrompts } = useLiveQuery((q) =>
    q.from({ prompt: promptCollection }),
  );

  // Get review settings for this page
  const { data: settingsArray, isLoading: isLoadingSettings } = useLiveQuery(
    (q) => q.from({ settings: settingsCollection }),
  );

  const settings = settingsArray?.[0] ?? null;
  const isLoading = isLoadingPrompts || isLoadingSettings;

  // Get the default prompt
  const defaultPrompt = useMemo(() => {
    if (!settings?.defaultPromptId || !prompts) return null;
    return prompts.find((p) => p.id === settings.defaultPromptId) ?? null;
  }, [settings?.defaultPromptId, prompts]);

  // Get custom prompts
  const customPrompts = useMemo(() => {
    if (!settings?.customPromptIds || !prompts) return [];
    const customIds = settings.customPromptIds;
    return prompts.filter((p) => customIds.includes(p.id));
  }, [settings?.customPromptIds, prompts]);

  // Get available prompts (not already selected as default or custom)
  const availablePrompts = useMemo(() => {
    if (!prompts) return [];
    const usedIds = new Set(
      [settings?.defaultPromptId, ...(settings?.customPromptIds ?? [])].filter(
        Boolean,
      ),
    );
    return prompts.filter((p) => !usedIds.has(p.id));
  }, [prompts, settings?.defaultPromptId, settings?.customPromptIds]);

  // Update model
  const updateModel = useCallback(
    (model: string) => {
      if (!settings) return;
      settingsCollection.update(settings.id, (draft) => {
        draft.model = model;
      });
    },
    [settings, settingsCollection],
  );

  // Update default prompt
  const updateDefaultPromptId = useCallback(
    (promptId: string | null) => {
      if (!settings) return;
      settingsCollection.update(settings.id, (draft) => {
        draft.defaultPromptId = promptId;
      });
    },
    [settings, settingsCollection],
  );

  // Add custom prompt
  const addCustomPrompt = useCallback(
    (promptId: string) => {
      if (!settings) return;
      settingsCollection.update(settings.id, (draft) => {
        if (!draft.customPromptIds.includes(promptId)) {
          draft.customPromptIds = [...draft.customPromptIds, promptId];
        }
      });
    },
    [settings, settingsCollection],
  );

  // Remove custom prompt
  const removeCustomPrompt = useCallback(
    (promptId: string) => {
      if (!settings) return;
      settingsCollection.update(settings.id, (draft) => {
        draft.customPromptIds = draft.customPromptIds.filter(
          (id) => id !== promptId,
        );
      });
    },
    [settings, settingsCollection],
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
    customPrompts,
    availablePrompts,
    aiModels,
    isLoading,

    // Actions
    updateModel,
    updateDefaultPromptId,
    addCustomPrompt,
    removeCustomPrompt,
    createPrompt,
    updatePrompt,
    deletePrompt,
  };
}
