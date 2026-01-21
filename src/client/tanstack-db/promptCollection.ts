import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  getAllPrompts,
  createPrompt,
  updatePrompt,
  deletePrompt,
} from "@/serverFunctions/prompts";
import { createCollection } from "@tanstack/react-db";
import { lazyInitForWorkers } from "@every-app/sdk/cloudflare";

export const promptCollection = lazyInitForWorkers(() =>
  createCollection(
    queryCollectionOptions({
      queryKey: ["prompts"],
      queryFn: async () => {
        const result = await getAllPrompts();
        return result.prompts;
      },
      queryClient,
      getKey: (item) => item.id,
      onInsert: async ({ transaction }) => {
        const { modified: newPrompt } = transaction.mutations[0];
        await createPrompt({
          data: {
            id: newPrompt.id,
            name: newPrompt.name,
            prompt: newPrompt.prompt,
          },
        });
      },
      onUpdate: async ({ transaction }) => {
        const { modified } = transaction.mutations[0];
        await updatePrompt({
          data: {
            id: modified.id,
            name: modified.name,
            prompt: modified.prompt,
          },
        });
      },
      onDelete: async ({ transaction }) => {
        const { original } = transaction.mutations[0];
        await deletePrompt({ data: { id: original.id } });
      },
    }),
  ),
);
