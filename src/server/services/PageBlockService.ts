import { PageBlockRepository } from "../repositories/PageBlockRepository";
import { PageRepository } from "../repositories/PageRepository";
import type {
  CreatePageBlockInput,
  UpdatePageBlockInput,
  DeletePageBlockInput,
  BatchCreatePageBlocksInput,
} from "@/types/schemas/pages";

/**
 * Get all blocks for a page.
 * Validates page ownership before returning blocks.
 */
async function getAllByPageId(userId: string, pageId: string) {
  // Verify user owns the page
  const page = await PageRepository.findByIdAndUserId(pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }

  const blocks = await PageBlockRepository.findAllByPageId(pageId);
  return { blocks };
}

/**
 * Create a page block.
 * Validates page ownership before creating.
 */
async function create(userId: string, data: CreatePageBlockInput) {
  // Verify user owns the page
  const page = await PageRepository.findByIdAndUserId(data.pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }

  await PageBlockRepository.create({
    id: data.id,
    pageId: data.pageId,
    question: data.question,
    answer: data.answer ?? "",
    sortKey: data.sortKey,
  });

  // Update page's updatedAt
  await PageRepository.update(data.pageId, userId, {});

  return { success: true };
}

/**
 * Batch create multiple page blocks.
 * Used when creating a page from a template.
 */
async function batchCreate(userId: string, data: BatchCreatePageBlocksInput) {
  // Verify user owns the page
  const page = await PageRepository.findByIdAndUserId(data.pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }

  const blocksToCreate = data.blocks.map((block) => ({
    id: block.id,
    pageId: data.pageId,
    question: block.question,
    answer: block.answer ?? "",
    sortKey: block.sortKey,
  }));

  await PageBlockRepository.batchCreate(blocksToCreate);

  // Update page's updatedAt
  await PageRepository.update(data.pageId, userId, {});

  return { success: true };
}

/**
 * Update a page block.
 * Validates block exists and user owns the parent page.
 */
async function update(userId: string, data: UpdatePageBlockInput) {
  const block = await PageBlockRepository.findById(data.id);
  if (!block) {
    throw new Error("Block not found");
  }

  // Verify user owns the page
  const page = await PageRepository.findByIdAndUserId(block.pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }

  await PageBlockRepository.update(data.id, {
    question: data.question,
    answer: data.answer,
    sortKey: data.sortKey,
  });

  // Update page's updatedAt
  await PageRepository.update(block.pageId, userId, {});

  return { success: true };
}

/**
 * Delete a page block.
 * Validates block exists and user owns the parent page.
 */
async function deleteBlock(userId: string, data: DeletePageBlockInput) {
  const block = await PageBlockRepository.findById(data.id);
  if (!block) {
    throw new Error("Block not found");
  }

  // Verify user owns the page
  const page = await PageRepository.findByIdAndUserId(block.pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }

  await PageBlockRepository.delete(data.id);

  // Update page's updatedAt
  await PageRepository.update(block.pageId, userId, {});

  return { success: true };
}

export const PageBlockService = {
  getAllByPageId,
  create,
  batchCreate,
  update,
  delete: deleteBlock,
} as const;
