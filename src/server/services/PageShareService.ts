import { PageShareRepository } from "../repositories/PageShareRepository";
import { ensurePageAccess } from "./helpers/ensurePageAccess";
import type {
  AddPageShareInput,
  RemovePageShareInput,
  ListPageSharesInput,
} from "@/types/schemas/pageShares";

/**
 * Get all shares for a page.
 * Only the page owner can list shares.
 */
async function getSharesForPage(userId: string, data: ListPageSharesInput) {
  await ensurePageAccess(data.pageId, userId);

  const shares = await PageShareRepository.findAllByPageId(data.pageId);
  return { shares };
}

/**
 * Add collaborators to a page.
 * Only the page owner can add collaborators.
 */
async function addShares(userId: string, data: AddPageShareInput) {
  await ensurePageAccess(data.pageId, userId);

  // Filter out any userIds that are already shared or are the owner
  const existingShares = await PageShareRepository.findAllByPageId(data.pageId);
  const existingUserIds = new Set(existingShares.map((s) => s.userId));
  existingUserIds.add(userId); // Can't share with yourself

  const newUserIds = data.userIds.filter((id) => !existingUserIds.has(id));

  if (newUserIds.length === 0) {
    return { success: true, added: 0 };
  }

  // Create shares for new users
  const shares = newUserIds.map((shareUserId) => ({
    id: crypto.randomUUID(),
    pageId: data.pageId,
    userId: shareUserId,
    sharedBy: userId,
  }));

  await PageShareRepository.createMany(shares);

  return { success: true, added: shares.length };
}

/**
 * Remove a collaborator from a page.
 * Only the page owner can remove collaborators.
 */
async function removeShare(userId: string, data: RemovePageShareInput) {
  await ensurePageAccess(data.pageId, userId);

  await PageShareRepository.deleteByPageAndUser(data.pageId, data.userId);

  return { success: true };
}

/**
 * Get all pages shared with the current user.
 */
async function getSharedPages(userId: string) {
  const pages = await PageShareRepository.findPagesSharedWithUser(userId);
  return { pages };
}

/**
 * Get all users in the workspace (for the dropdown).
 */
async function getAllUsers(currentUserId: string) {
  const users = await PageShareRepository.getAllUsers();
  // Filter out the current user from the list
  const filteredUsers = users.filter((u) => u.id !== currentUserId);
  return { users: filteredUsers };
}

/**
 * Check if user has access to a page (owner or collaborator).
 */
async function checkAccess(pageId: string, userId: string) {
  return PageShareRepository.hasAccess(pageId, userId);
}

export const PageShareService = {
  getSharesForPage,
  addShares,
  removeShare,
  getSharedPages,
  getAllUsers,
  checkAccess,
} as const;
