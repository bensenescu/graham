import { createOptimisticAction } from "@tanstack/react-db";
import {
  pageCollection,
  pageBlockCollection,
  promptCollection,
  pageReviewSettingsCollection,
} from "@/client/tanstack-db";
import { createPage, batchCreatePageBlocks } from "@/serverFunctions/pages";
import type { Template } from "@/templates";
import { templateToBlocks } from "@/templates";

type CreatePageFromTemplateParams = {
  template: Template;
  pageId: string;
  // Pre-generated block data with IDs
  blocks: Array<{
    id: string;
    question: string;
    answer: string;
    sortKey: string;
  }>;
};

/**
 * Action to create a page from a template.
 * Optimistically creates the page and all blocks, then syncs with server.
 */
export const createPageFromTemplate =
  createOptimisticAction<CreatePageFromTemplateParams>({
    onMutate: ({ template, pageId, blocks }) => {
      const now = new Date().toISOString();

      // Optimistically insert the page
      pageCollection.insert({
        id: pageId,
        title: template.name,
        createdAt: now,
        updatedAt: now,
      });

      // Optimistically insert all blocks into the singleton collection
      blocks.forEach((block) => {
        pageBlockCollection.insert({
          id: block.id,
          pageId,
          question: block.question,
          answer: block.answer,
          sortKey: block.sortKey,
          createdAt: now,
          updatedAt: now,
        });
      });
    },
    mutationFn: async ({ template, pageId, blocks }) => {
      // Create the page on the server first (also creates default review settings)
      // (onInsert is skipped because we're in an optimistic action)
      await createPage({
        data: {
          id: pageId,
          title: template.name,
        },
      });

      // Now create all the blocks
      await batchCreatePageBlocks({
        data: {
          pageId,
          blocks,
        },
      });

      // Refetch to sync optimistic state with server
      await pageCollection.utils.refetch();
      await pageBlockCollection.utils.refetch();
      // Also refetch prompts and settings since a new default prompt was created
      await promptCollection.utils.refetch();
      await pageReviewSettingsCollection.utils.refetch();
    },
  });

/**
 * Helper to create the params with pre-generated IDs
 */
export function createPageFromTemplateParams(
  template: Template,
): CreatePageFromTemplateParams {
  const pageId = crypto.randomUUID();
  const blocks = templateToBlocks(template);

  return {
    template,
    pageId,
    blocks,
  };
}
