/**
 * Centralized element ID generation for keyboard navigation.
 * Ensures consistent IDs between components and navigation hooks.
 */

export function getBlockItemId(blockId: string): string {
  return `block-item-${blockId}`;
}

export function getBlockQuestionId(blockId: string): string {
  return `block-question-${blockId}`;
}

export const PAGE_TITLE_CONTAINER_ID = "page-title-container";
export const ADD_QUESTION_BUTTON_ID = "add-question-button";
