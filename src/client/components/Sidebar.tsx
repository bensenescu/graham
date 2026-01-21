import { Link, useLocation } from "@tanstack/react-router";
import { FileText, Plus, ChevronRight } from "lucide-react";
import { useLiveQuery } from "@tanstack/react-db";
import { pageCollection } from "@/client/tanstack-db";

interface SidebarNavProps {
  onNavigate?: () => void;
}

/**
 * Sidebar navigation content including:
 * - App header with logo
 * - Pages section with recent pages
 */
export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  // Get recent pages (sorted by updatedAt desc, limited to 10)
  const { data: recentPages } = useLiveQuery((q) =>
    q
      .from({ page: pageCollection })
      .orderBy(({ page }) => page.updatedAt, "desc")
      .limit(10),
  );

  // Get total page count to show "See all" link
  const { data: allPages } = useLiveQuery((q) =>
    q.from({ page: pageCollection }),
  );
  const totalPageCount = allPages?.length ?? 0;

  // Extract page ID from URL if on a page
  const pageMatch = currentPath.match(/^\/page\/([^/]+)/);
  const activePageId = pageMatch ? pageMatch[1] : null;

  const isOnPagesPage = currentPath === "/";
  const isPageSectionActive = isOnPagesPage || currentPath.startsWith("/page/");

  return (
    <div className="bg-base-100 h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-base-300">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
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

      {/* Navigation */}
      <nav className="flex-1 py-4 pl-3 overflow-y-auto">
        {/* Pages Section Header */}
        <div className="flex items-center justify-between pr-3">
          <Link
            to="/"
            onClick={onNavigate}
            className={`relative flex items-center gap-3 pl-4 pr-4 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none flex-1 ${
              isPageSectionActive
                ? "text-base-content font-medium"
                : "text-base-content/60 hover:text-base-content hover:bg-base-200"
            }`}
          >
            <FileText
              className={`h-5 w-5 ${isPageSectionActive ? "text-primary" : ""}`}
            />
            Pages
          </Link>
          {recentPages && recentPages.length > 0 && (
            <Link
              to="/new"
              onClick={onNavigate}
              className="btn btn-ghost btn-xs btn-square"
              aria-label="New Page"
            >
              <Plus className="h-4 w-4" />
            </Link>
          )}
        </div>

        {/* Recent Pages */}
        {recentPages && recentPages.length > 0 && (
          <div className="ml-4 pl-4 border-l border-base-300">
            {recentPages.map((page) => {
              const isActivePage = page.id === activePageId;
              return (
                <Link
                  key={page.id}
                  to="/page/$pageId"
                  params={{ pageId: page.id }}
                  onClick={onNavigate}
                  className={`flex items-center gap-2 py-2 px-2 text-sm rounded-lg transition-colors truncate ${
                    isActivePage
                      ? "bg-base-200 text-base-content font-medium"
                      : "text-base-content/70 hover:text-base-content hover:bg-base-200"
                  }`}
                >
                  <span className="truncate">{page.title || "Untitled"}</span>
                </Link>
              );
            })}

            {/* See All Pages button */}
            {totalPageCount > 10 && (
              <Link
                to="/"
                onClick={onNavigate}
                className="flex items-center gap-2 py-2 px-2 text-sm text-base-content/50 hover:text-base-content hover:bg-base-200 rounded-lg transition-colors mt-1"
              >
                <span>See all pages</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}
      </nav>
    </div>
  );
}
