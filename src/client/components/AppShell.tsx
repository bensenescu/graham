import { useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { useHotkeys } from "react-hotkeys-hook";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { SHORTCUT_SHOW_SHORTCUTS_HOTKEY } from "@/client/lib/keyboard-shortcuts";

/**
 * Mobile navbar right-side actions (route-specific)
 */
function MobileNavbarRight() {
  return null;
}

/**
 * AppShell provides the main layout structure for the app:
 * - Mobile navbar with page title and route-specific actions
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
            <span className="font-semibold">Graham</span>
          </div>
          <div className="flex-none">
            <MobileNavbarRight />
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
 * - Mobile navbar with page title and route-specific actions
 * - Main content area
 */
export function AppShell() {
  return <AppShellContent />;
}
