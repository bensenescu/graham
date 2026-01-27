import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "./queryClient";
import { getSharedPages } from "@/serverFunctions/pageShares";
import { createCollection } from "@tanstack/react-db";
import { lazyInitForWorkers } from "@every-app/sdk/cloudflare";

/**
 * Collection of pages that have been shared with the current user.
 * This is read-only - users cannot modify pages in this collection directly.
 */
export const sharedPageCollection = lazyInitForWorkers(() =>
  createCollection(
    queryCollectionOptions({
      queryKey: ["sharedPages"],
      queryFn: async () => {
        const result = await getSharedPages();
        return result.pages;
      },
      queryClient,
      getKey: (item) => item.id,
      // No insert/update/delete handlers - this is read-only
      // Shared pages are managed by the page owner
    }),
  ),
);
