import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  getPageBlocks,
  createPageBlock,
  updatePageBlock,
  deletePageBlock,
} from "@/serverFunctions/pages";
import { createCollection } from "@tanstack/react-db";

// Factory function to create a block collection for a specific page
export function createPageBlockCollection(pageId: string) {
  return createCollection(
    queryCollectionOptions({
      queryKey: ["pageBlocks", pageId],
      queryFn: async () => {
        const result = await getPageBlocks({ data: { pageId } });
        return result.blocks;
      },
      queryClient,
      getKey: (item) => item.id,
      // Handle all CRUD operations
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
  );
}
