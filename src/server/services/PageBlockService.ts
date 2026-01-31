import { PageBlockRepository } from "../repositories/PageBlockRepository";
import { PageRepository } from "../repositories/PageRepository";
import { ensurePageAccessWithSharing } from "./helpers/ensurePageAccess";
import type {
  CreatePageBlockInput,
  UpdatePageBlockInput,
  DeletePageBlockInput,
  BatchCreatePageBlocksInput,
} from "@/types/schemas/pages";

/**
 * Get all blocks for all the user's accessible pages (owned + shared).
 */
async function getAll(userId: string) {
  const blocks = await PageBlockRepository.findAllByUserId(userId);
  return { blocks };
}

/**
 * Get all blocks for a page.
 * Validates page access (owner or collaborator) before returning blocks.
 */
async function getAllByPageId(userId: string, pageId: string) {
  await ensurePageAccessWithSharing(pageId, userId);

  const blocks = await PageBlockRepository.findAllByPageId(pageId);
  return { blocks };
}

/**
 * Create a page block.
 * Validates page access (owner or collaborator) before creating.
 */
async function create(userId: string, data: CreatePageBlockInput) {
  await ensurePageAccessWithSharing(data.pageId, userId);

  await PageBlockRepository.create({
    id: data.id,
    pageId: data.pageId,
    question: data.question,
    answer: data.answer ?? "",
    sortKey: data.sortKey,
  });

  // Update page's updatedAt
  await PageRepository.updateWithAccess(data.pageId, userId, {});

  return { success: true };
}

/**
 * Batch create multiple page blocks.
 * Used when creating a page from a template.
 */
async function batchCreate(userId: string, data: BatchCreatePageBlocksInput) {
  await ensurePageAccessWithSharing(data.pageId, userId);

  const blocksToCreate = data.blocks.map((block) => ({
    id: block.id,
    pageId: data.pageId,
    question: block.question,
    answer: block.answer ?? "",
    sortKey: block.sortKey,
  }));

  await PageBlockRepository.batchCreate(blocksToCreate);

  // Update page's updatedAt
  await PageRepository.updateWithAccess(data.pageId, userId, {});

  return { success: true };
}

/**
 * Update a page block.
 * Validates block exists and user has access to the parent page (owner or collaborator).
 */
async function update(userId: string, data: UpdatePageBlockInput) {
  const block = await PageBlockRepository.findById(data.id);
  if (!block) {
    throw new Error("Block not found");
  }

  await ensurePageAccessWithSharing(block.pageId, userId);

  await PageBlockRepository.update(data.id, block.pageId, {
    question: data.question,
    answer: data.answer,
    sortKey: data.sortKey,
  });

  // Update page's updatedAt
  await PageRepository.updateWithAccess(block.pageId, userId, {});

  return { success: true };
}

/**
 * Delete a page block.
 * Validates block exists and user has access to the parent page (owner or collaborator).
 */
async function deleteBlock(userId: string, data: DeletePageBlockInput) {
  const block = await PageBlockRepository.findById(data.id);
  if (!block) {
    throw new Error("Block not found");
  }

  await ensurePageAccessWithSharing(block.pageId, userId);

  await PageBlockRepository.delete(data.id, block.pageId);

  // Update page's updatedAt
  await PageRepository.updateWithAccess(block.pageId, userId, {});

  return { success: true };
}

export const PageBlockService = {
  getAll,
  getAllByPageId,
  create,
  batchCreate,
  update,
  delete: deleteBlock,
} as const;
