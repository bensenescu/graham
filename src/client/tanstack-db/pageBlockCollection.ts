import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  getAllPageBlocks,
  createPageBlock,
  updatePageBlock,
  deletePageBlock,
} from "@/serverFunctions/pages";
import { createCollection } from "@tanstack/react-db";
import { lazyInitForWorkers } from "@every-app/sdk/cloudflare";

export const pageBlockCollection = lazyInitForWorkers(() =>
  createCollection(
    queryCollectionOptions({
      queryKey: ["pageBlocks"],
      queryFn: async () => {
        const result = await getAllPageBlocks();
        return result.blocks;
      },
      queryClient,
      getKey: (item) => item.id,
      onInsert: async ({ transaction }) => {
        const { modified: newBlock } = transaction.mutations[0];
        await createPageBlock({
          data: {
            id: newBlock.id,
            pageId: newBlock.pageId,
            question: newBlock.question,
            answer: newBlock.answer,
            sortKey: newBlock.sortKey,
          },
        });
      },
      onUpdate: async ({ transaction }) => {
        const { modified } = transaction.mutations[0];
        await updatePageBlock({
          data: {
            id: modified.id,
            question: modified.question,
            answer: modified.answer,
            sortKey: modified.sortKey,
          },
        });
      },
      onDelete: async ({ transaction }) => {
        const { original } = transaction.mutations[0];
        await deletePageBlock({ data: { id: original.id } });
      },
    }),
  ),
);
