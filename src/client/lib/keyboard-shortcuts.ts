/**
 * Centralized keyboard shortcuts configuration.
 * Single source of truth for both implementation and display.
 */

type ShortcutSeparator = "then" | "or" | "plus";

interface ShortcutDefinition {
  /** Keys that trigger this shortcut (for display) */
  keys: string[];
  /** Human-readable description */
  description: string;
  /** How to display the keys (default: sequential) */
  separator?: ShortcutSeparator;
  /** The hotkey string for react-hotkeys-hook */
  hotkey: string;
}

interface ShortcutCategory {
  category: string;
  items: ShortcutDefinition[];
}

// Navigation shortcuts
const SHORTCUT_MOVE_DOWN: ShortcutDefinition = {
  keys: ["j", "↓"],
  description: "Move to next question",
  separator: "or",
  hotkey: "j, ArrowDown",
};

const SHORTCUT_MOVE_UP: ShortcutDefinition = {
  keys: ["k", "↑"],
  description: "Move to previous question",
  separator: "or",
  hotkey: "k, ArrowUp",
};

// Action shortcuts
const SHORTCUT_ADD_QUESTION: ShortcutDefinition = {
  keys: ["a"],
  description: "Add new question",
  hotkey: "a",
};

const SHORTCUT_DELETE_QUESTION: ShortcutDefinition = {
  keys: ["x"],
  description: "Delete question",
  hotkey: "x",
};

const SHORTCUT_EDIT_QUESTION: ShortcutDefinition = {
  keys: ["e"],
  description: "Edit question",
  hotkey: "e",
};

const SHORTCUT_REVIEW_QUESTION: ShortcutDefinition = {
  keys: ["r"],
  description: "Request AI review",
  hotkey: "r",
};

// Panel shortcuts
const SHORTCUT_CLOSE_PANEL: ShortcutDefinition = {
  keys: ["Esc"],
  description: "Close panel / Exit edit mode",
  hotkey: "Escape",
};

// General shortcuts
const SHORTCUT_SHOW_SHORTCUTS: ShortcutDefinition = {
  keys: ["?"],
  description: "Show keyboard shortcuts",
  hotkey: "shift+slash",
};

// Export hotkey strings for use in hooks
export const SHORTCUT_MOVE_DOWN_HOTKEY = SHORTCUT_MOVE_DOWN.hotkey;
export const SHORTCUT_MOVE_UP_HOTKEY = SHORTCUT_MOVE_UP.hotkey;
export const SHORTCUT_ADD_QUESTION_HOTKEY = SHORTCUT_ADD_QUESTION.hotkey;
export const SHORTCUT_DELETE_QUESTION_HOTKEY = SHORTCUT_DELETE_QUESTION.hotkey;
export const SHORTCUT_EDIT_QUESTION_HOTKEY = SHORTCUT_EDIT_QUESTION.hotkey;
export const SHORTCUT_REVIEW_QUESTION_HOTKEY = SHORTCUT_REVIEW_QUESTION.hotkey;
export const SHORTCUT_CLOSE_PANEL_HOTKEY = SHORTCUT_CLOSE_PANEL.hotkey;
export const SHORTCUT_SHOW_SHORTCUTS_HOTKEY = SHORTCUT_SHOW_SHORTCUTS.hotkey;

/**
 * All shortcuts organized by category for display
 */
export const KEYBOARD_SHORTCUTS: ShortcutCategory[] = [
  {
    category: "Navigation",
    items: [SHORTCUT_MOVE_DOWN, SHORTCUT_MOVE_UP],
  },
  {
    category: "Actions",
    items: [
      SHORTCUT_ADD_QUESTION,
      SHORTCUT_EDIT_QUESTION,
      SHORTCUT_DELETE_QUESTION,
      SHORTCUT_REVIEW_QUESTION,
    ],
  },
  {
    category: "General",
    items: [SHORTCUT_CLOSE_PANEL, SHORTCUT_SHOW_SHORTCUTS],
  },
];
