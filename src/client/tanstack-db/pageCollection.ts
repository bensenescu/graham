import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import {
  createPage,
  deletePage,
  getAllPages,
  updatePage,
} from "@/serverFunctions/pages";
import { createCollection } from "@tanstack/react-db";
import { lazyInitForWorkers } from "@every-app/sdk/cloudflare";

export const pageCollection = lazyInitForWorkers(() =>
  createCollection(
    queryCollectionOptions({
      queryKey: ["pages"],
      queryFn: async () => {
        const result = await getAllPages();
        return result.pages;
      },
      queryClient,
      getKey: (item) => item.id,
      // Handle all CRUD operations
      onInsert: async ({ transaction }) => {
        const { modified: newPage } = transaction.mutations[0];
        await createPage({
          data: newPage,
        });
      },
      onUpdate: async ({ transaction }) => {
        const { modified } = transaction.mutations[0];
        await updatePage({
          data: modified,
        });
      },
      onDelete: async ({ transaction }) => {
        const { original } = transaction.mutations[0];
        await deletePage({ data: original });
      },
    }),
  ),
);
