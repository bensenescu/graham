import { useRef, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { Plus, Menu } from "lucide-react";
import { SidebarNav } from "./Sidebar";
import { pageCollection } from "@/client/tanstack-db";
import { DrawerProvider, useDrawer } from "@/client/contexts/DrawerContext";

/**
 * Mobile navbar right-side actions (route-specific)
 */
function MobileNavbarRight() {
  const location = useLocation();
  const navigate = useNavigate();

  const isOnPagesPage = location.pathname === "/";

  // Pages: New Page button
  if (isOnPagesPage) {
    const handleNewPage = () => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      pageCollection.insert({
        id,
        title: "Untitled",
        createdAt: now,
        updatedAt: now,
      });
      navigate({ to: "/page/$pageId", params: { pageId: id } });
    };

    return (
      <button
        onClick={handleNewPage}
        className="btn btn-primary btn-sm btn-square"
        aria-label="New Page"
      >
        <Plus className="h-4 w-4" />
      </button>
    );
  }

  return null;
}

/**
 * AppShell provides the main layout structure for the app:
 * - Drawer that opens on hover (desktop) or hamburger tap (mobile)
 * - Mobile navbar with page title and route-specific actions
 * - Main content area
 */
function AppShellContent() {
  const {
    isOpen: isDrawerOpen,
    open: openDrawer,
    close: closeDrawer,
  } = useDrawer();
  const hoverZoneRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle hover behavior for desktop
  useEffect(() => {
    const hoverZone = hoverZoneRef.current;
    const sidebar = sidebarRef.current;

    if (!hoverZone || !sidebar) return;

    const handleMouseEnter = () => {
      // Clear any pending close timeout
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      openDrawer();
    };

    const handleMouseLeave = () => {
      // Delay closing to allow mouse to move to sidebar
      closeTimeoutRef.current = setTimeout(() => {
        closeDrawer();
      }, 150);
    };

    const handleSidebarEnter = () => {
      // Clear close timeout when entering sidebar
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };

    const handleSidebarLeave = () => {
      // Close when leaving sidebar
      closeTimeoutRef.current = setTimeout(() => {
        closeDrawer();
      }, 150);
    };

    hoverZone.addEventListener("mouseenter", handleMouseEnter);
    hoverZone.addEventListener("mouseleave", handleMouseLeave);
    sidebar.addEventListener("mouseenter", handleSidebarEnter);
    sidebar.addEventListener("mouseleave", handleSidebarLeave);

    return () => {
      hoverZone.removeEventListener("mouseenter", handleMouseEnter);
      hoverZone.removeEventListener("mouseleave", handleMouseLeave);
      sidebar.removeEventListener("mouseenter", handleSidebarEnter);
      sidebar.removeEventListener("mouseleave", handleSidebarLeave);
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isDrawerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const activeElement = document.activeElement;
      if (activeElement && sidebarRef.current?.contains(activeElement)) {
        closeDrawer();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDrawerOpen, closeDrawer]);

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Hover zone - invisible area on left edge to trigger sidebar (desktop only) */}
      <div
        ref={hoverZoneRef}
        className="hidden md:block fixed left-0 top-0 w-3 h-full z-40"
      />

      {/* Main content area */}
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Navbar */}
        <div className="navbar bg-base-100 border-b border-base-300 px-4 min-h-14 flex-shrink-0">
          <div className="flex-none">
            <button
              onClick={openDrawer}
              aria-label="open sidebar"
              className="btn btn-square btn-ghost btn-sm focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-base-100"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 pl-2">
            <span className="font-semibold">Graham</span>
          </div>
          <div className="flex-none">
            <MobileNavbarRight />
          </div>
        </div>

        {/* Sidebar drawer with extended hover area */}
        <div
          ref={sidebarRef}
          className={`fixed top-0 left-0 h-full z-50 transform transition-transform duration-200 ease-out ${
            isDrawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          // Remove from tab order and accessibility tree when closed
          inert={!isDrawerOpen ? true : undefined}
        >
          <div className="flex h-full">
            {/* Actual sidebar */}
            <div className="w-72 h-full bg-base-100 border-r border-base-300">
              <SidebarNav onNavigate={closeDrawer} />
            </div>
            {/* Invisible extended hover area (desktop only) */}
            <div className="hidden md:block w-8 h-full" />
          </div>
        </div>

        {/* Overlay - shown when drawer is open on mobile */}
        {isDrawerOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={closeDrawer}
          />
        )}

        {/* Page content */}
        <div className="main-content flex-1 overflow-hidden min-h-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

/**
 * AppShell provides the main layout structure for the app:
 * - Drawer that opens on hover (desktop) or hamburger tap (mobile)
 * - Mobile navbar with page title and route-specific actions
 * - Main content area
 */
export function AppShell() {
  return (
    <DrawerProvider>
      <AppShellContent />
    </DrawerProvider>
  );
}
