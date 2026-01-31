import { PageRepository } from "../../repositories/PageRepository";

export async function ensurePageAccess(pageId: string, userId: string) {
  const page = await PageRepository.findByIdAndUserId(pageId, userId);
  if (!page) {
    throw new Error("Page not found");
  }
  return page;
}

export async function ensurePageAccessWithSharing(
  pageId: string,
  userId: string,
) {
  const { page, isOwner } = await PageRepository.findByIdWithAccess(
    pageId,
    userId,
  );
  if (!page) {
    throw new Error("Page not found");
  }
  return { page, isOwner };
}
