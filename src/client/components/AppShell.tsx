import { useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "@tanstack/react-router";
import { Plus, Menu, FileText } from "lucide-react";
import { SidebarNav } from "./Sidebar";
import { pageCollection } from "@/client/tanstack-db";

/**
 * Hook to determine the page title based on current route
 */
function usePageTitle() {
  const location = useLocation();

  if (location.pathname === "/") {
    return "Pages";
  }
  if (location.pathname.startsWith("/page/")) {
    return "Editor";
  }
  return "Graham";
}

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
 * - Responsive drawer (hamburger on mobile, always-open sidebar on desktop)
 * - Mobile navbar with page title and route-specific actions
 * - Main content area
 */
export function AppShell() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pageTitle = usePageTitle();

  return (
    <div className="drawer md:drawer-open h-screen overflow-hidden">
      <input
        id="mobile-drawer"
        type="checkbox"
        className="drawer-toggle"
        checked={isDrawerOpen}
        onChange={(e) => setIsDrawerOpen(e.target.checked)}
      />
      <div className="drawer-content flex flex-col h-screen overflow-hidden">
        {/* Mobile navbar - hidden on desktop */}
        <div className="navbar bg-base-100 border-b border-base-300 px-4 min-h-14 flex-shrink-0 md:hidden">
          <div className="flex-none">
            <button
              onClick={() => setIsDrawerOpen(true)}
              aria-label="open sidebar"
              className="btn btn-square btn-ghost btn-sm"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 pl-2">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-semibold">{pageTitle}</span>
            </div>
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

      <div className="drawer-side z-50">
        <label
          htmlFor="mobile-drawer"
          aria-label="close sidebar"
          className="drawer-overlay"
        />
        <div className="sidebar w-72 min-h-full bg-base-100 border-r border-base-300">
          <SidebarNav onNavigate={() => setIsDrawerOpen(false)} />
        </div>
      </div>
    </div>
  );
}
