import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  getAllPageReviewSettings,
  upsertPageReviewSettings,
  updatePageReviewSettings,
} from "@/serverFunctions/prompts";
import { createCollection } from "@tanstack/react-db";
import { lazyInitForWorkers } from "@every-app/sdk/cloudflare";

export const pageReviewSettingsCollection = lazyInitForWorkers(() =>
  createCollection(
    queryCollectionOptions({
      queryKey: ["pageReviewSettings"],
      queryFn: async () => {
        const result = await getAllPageReviewSettings();
        return result.settings;
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
          },
        });
      },
    }),
  ),
);
