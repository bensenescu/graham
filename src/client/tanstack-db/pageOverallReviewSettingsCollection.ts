import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  getAllPageOverallReviewSettings,
  updatePageOverallReviewSettings,
} from "@/serverFunctions/prompts";
import { createCollection } from "@tanstack/react-db";
import { lazyInitForWorkers } from "@every-app/sdk/cloudflare";

export const pageOverallReviewSettingsCollection = lazyInitForWorkers(() =>
  createCollection(
    queryCollectionOptions({
      queryKey: ["pageOverallReviewSettings"],
      queryFn: async () => {
        const result = await getAllPageOverallReviewSettings();
        return result.settings;
      },
      queryClient,
      getKey: (item) => item.id,
      onUpdate: async ({ transaction }) => {
        const { modified } = transaction.mutations[0];
        await updatePageOverallReviewSettings({
          data: {
            pageId: modified.pageId,
            mode: modified.mode,
            selectedPromptIds: modified.selectedPrompts?.map(
              (p: { id: string }) => p.id,
            ),
          },
        });
      },
    }),
  ),
);
