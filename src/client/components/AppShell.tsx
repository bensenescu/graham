import { useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { useHotkeys } from "react-hotkeys-hook";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { SHORTCUT_SHOW_SHORTCUTS_HOTKEY } from "@/client/lib/keyboard-shortcuts";

/**
 * AppShell provides the main layout structure for the app:
 * - Header with app name and Every App link
 * - Main content area
 */
function AppShellContent() {
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  // Global keyboard shortcut to show shortcuts modal
  useHotkeys(
    SHORTCUT_SHOW_SHORTCUTS_HOTKEY,
    () => setIsShortcutsModalOpen(true),
    { preventDefault: true },
  );

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Main content area */}
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Navbar */}
        <div className="navbar bg-base-100 border-b border-base-300 px-4 min-h-14 flex-shrink-0">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base-content">Graham</span>
              <span className="text-base-content/40">-</span>
              <a
                href={import.meta.env.VITE_GATEWAY_URL}
                target="_top"
                className="text-base-content/60 hover:text-primary transition-colors text-sm"
              >
                Every App
              </a>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="main-content flex-1 overflow-hidden min-h-0">
          <Outlet />
        </div>
      </div>

      {/* Keyboard shortcuts modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
}

/**
 * AppShell provides the main layout structure for the app:
 * - Header with app name and Every App link
 * - Main content area
 */
export function AppShell() {
  return <AppShellContent />;
}
