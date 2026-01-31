import { createOptimisticAction } from "@tanstack/react-db";
import {
  pageCollection,
  promptCollection,
  pageReviewSettingsCollection,
} from "@/client/tanstack-db";
import { createPage as createPageOnServer } from "@/serverFunctions/pages";

type CreatePageParams = {
  pageId: string;
  title?: string;
};

/**
 * Action to create a blank page.
 * Optimistically creates the page, then syncs with server.
 */
export const createPage = createOptimisticAction<CreatePageParams>({
  onMutate: ({ pageId, title = "Untitled" }) => {
    const now = new Date().toISOString();

    // Optimistically insert the page
    pageCollection.insert({
      id: pageId,
      title,
      createdAt: now,
      updatedAt: now,
    });
  },
  mutationFn: async ({ pageId, title = "Untitled" }) => {
    // Create the page on the server (also creates default review settings)
    await createPageOnServer({
      data: {
        id: pageId,
        title,
      },
    });

    // Refetch to sync optimistic state with server
    await pageCollection.utils.refetch();
    // Also refetch prompts and settings since a new default prompt was created
    await promptCollection.utils.refetch();
    await pageReviewSettingsCollection.utils.refetch();
  },
});

/**
 * Helper to create a new blank page and return the ID.
 * Use this when you need to navigate after creation.
 */
export function createBlankPage(title: string = "Untitled"): string {
  const pageId = crypto.randomUUID();
  createPage({ pageId, title });
  return pageId;
}
