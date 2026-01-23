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

// Panel shortcuts
const SHORTCUT_CLOSE_PANEL: ShortcutDefinition = {
  keys: ["Esc"],
  description: "Close panel",
  hotkey: "Escape",
};

// Export hotkey strings for use in hooks
export const SHORTCUT_CLOSE_PANEL_HOTKEY = SHORTCUT_CLOSE_PANEL.hotkey;

/**
 * All shortcuts organized by category for display
 */
export const KEYBOARD_SHORTCUTS: ShortcutCategory[] = [
  {
    category: "General",
    items: [SHORTCUT_CLOSE_PANEL],
  },
];
