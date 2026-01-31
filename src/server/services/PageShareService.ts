import { PageShareRepository } from "../repositories/PageShareRepository";
import { ensurePageAccessWithSharing } from "./helpers/ensurePageAccess";
import type {
  AddPageShareInput,
  RemovePageShareInput,
  ListPageSharesInput,
} from "@/types/schemas/pageShares";

/**
 * Get all shares for a page.
 * Any user with access can list shares.
 */
async function getSharesForPage(userId: string, data: ListPageSharesInput) {
  await ensurePageAccessWithSharing(data.pageId, userId);

  const shares = await PageShareRepository.findAllByPageId(data.pageId, userId);
  return { shares };
}

/**
 * Add collaborators to a page.
 * Any user with access can add collaborators.
 */
async function addShares(userId: string, data: AddPageShareInput) {
  await ensurePageAccessWithSharing(data.pageId, userId);

  // Filter out any userIds that are already shared or are the owner
  const existingShares = await PageShareRepository.findAllByPageId(
    data.pageId,
    userId,
  );
  const existingUserIds = new Set(
    existingShares.map((s: { userId: string }) => s.userId),
  );
  existingUserIds.add(userId); // Can't share with yourself

  const newUserIds = data.userIds.filter(
    (id: string) => !existingUserIds.has(id),
  );

  if (newUserIds.length === 0) {
    return { success: true, added: 0 };
  }

  // Create shares for new users
  const shares = newUserIds.map((shareUserId: string) => ({
    id: crypto.randomUUID(),
    pageId: data.pageId,
    userId: shareUserId,
    sharedBy: userId,
  }));

  await PageShareRepository.createMany(shares, userId);

  return { success: true, added: shares.length };
}

/**
 * Remove a collaborator from a page.
 * Any user with access can remove collaborators.
 */
async function removeShare(userId: string, data: RemovePageShareInput) {
  await ensurePageAccessWithSharing(data.pageId, userId);

  await PageShareRepository.deleteByPageAndUser(
    data.pageId,
    data.userId,
    userId,
  );

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
  const filteredUsers = users.filter(
    (u: { id: string }) => u.id !== currentUserId,
  );
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
