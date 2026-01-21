import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  getPageOverallReviewSettings,
  updatePageOverallReviewSettings,
} from "@/serverFunctions/prompts";
import { createCollection } from "@tanstack/react-db";

// Factory function to create an overall review settings collection for a specific page
export function createPageOverallReviewSettingsCollection(pageId: string) {
  return createCollection(
    queryCollectionOptions({
      queryKey: ["pageOverallReviewSettings", pageId],
      queryFn: async () => {
        const result = await getPageOverallReviewSettings({ data: { pageId } });
        // Return as array for collection (will have 0 or 1 item)
        return result.settings ? [result.settings] : [];
      },
      queryClient,
      getKey: (item) => item.id,
      onUpdate: async ({ transaction }) => {
        const { modified } = transaction.mutations[0];
        await updatePageOverallReviewSettings({
          data: {
            pageId: modified.pageId,
            mode: modified.mode,
            customPrompt: modified.customPrompt,
            selectedPromptIds: modified.selectedPrompts?.map(
              (p: { id: string }) => p.id,
            ),
          },
        });
      },
    }),
  );
}
