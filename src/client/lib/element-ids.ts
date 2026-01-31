/**
 * Centralized element ID generation for keyboard navigation.
 * Ensures consistent IDs between components and navigation hooks.
 */

export function getBlockItemId(blockId: string): string {
  return `block-item-${blockId}`;
}

export const ADD_QUESTION_BUTTON_ID = "add-question-button";
