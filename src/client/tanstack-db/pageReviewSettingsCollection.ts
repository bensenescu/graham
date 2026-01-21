import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  getPageReviewSettings,
  upsertPageReviewSettings,
  updatePageReviewSettings,
} from "@/serverFunctions/prompts";
import { createCollection } from "@tanstack/react-db";

// Factory function to create a review settings collection for a specific page
export function createPageReviewSettingsCollection(pageId: string) {
  return createCollection(
    queryCollectionOptions({
      queryKey: ["pageReviewSettings", pageId],
      queryFn: async () => {
        const result = await getPageReviewSettings({ data: { pageId } });
        // Return as array for collection (will have 0 or 1 item)
        return result.settings ? [result.settings] : [];
      },
      queryClient,
      getKey: (item) => item.id,
      onInsert: async ({ transaction }) => {
        const { modified: newSettings } = transaction.mutations[0];
        await upsertPageReviewSettings({
          data: {
            id: newSettings.id,
            pageId: newSettings.pageId,
            model: newSettings.model,
            defaultPromptId: newSettings.defaultPromptId,
            customPromptIds: newSettings.customPromptIds,
          },
        });
      },
      onUpdate: async ({ transaction }) => {
        const { modified } = transaction.mutations[0];
        await updatePageReviewSettings({
          data: {
            pageId: modified.pageId,
            model: modified.model,
            defaultPromptId: modified.defaultPromptId,
            customPromptIds: modified.customPromptIds,
          },
        });
      },
    }),
  );
}
