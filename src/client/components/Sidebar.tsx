import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { FileText, Plus, ChevronRight, LayoutTemplate } from "lucide-react";
import { useLiveQuery } from "@tanstack/react-db";
import { pageCollection } from "@/client/tanstack-db";
import { templates } from "@/templates";
import {
  createPageFromTemplate,
  createPageFromTemplateParams,
} from "@/client/actions/createPageFromTemplate";

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
  const navigate = useNavigate();
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
    onNavigate?.();
  };

  const handleNewPageFromTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    // Create params with pre-generated IDs
    const params = createPageFromTemplateParams(template);

    // Execute optimistic action (instant UI update + server sync)
    createPageFromTemplate(params);

    // Navigate immediately - optimistic state is already visible
    navigate({ to: "/page/$pageId", params: { pageId: params.pageId } });
    onNavigate?.();
  };

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
          <button
            onClick={handleNewPage}
            className="btn btn-ghost btn-xs btn-square"
            aria-label="New Page"
          >
            <Plus className="h-4 w-4" />
          </button>
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

        {/* Empty state */}
        {(!recentPages || recentPages.length === 0) && (
          <div className="ml-4 pl-4 border-l border-base-300">
            <button
              onClick={handleNewPage}
              className="flex items-center gap-2 py-2 px-2 text-sm text-base-content/50 hover:text-base-content hover:bg-base-200 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create your first page</span>
            </button>
          </div>
        )}

        {/* Templates Section */}
        <div className="mt-6">
          <div className="flex items-center gap-3 pl-4 pr-4 py-2 text-sm text-base-content/60">
            <LayoutTemplate className="h-5 w-5" />
            Templates
          </div>
          <div className="ml-4 pl-4 border-l border-base-300">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleNewPageFromTemplate(template.id)}
                className="flex items-center gap-2 py-2 px-2 text-sm text-base-content/70 hover:text-base-content hover:bg-base-200 rounded-lg transition-colors w-full text-left"
              >
                <Plus className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{template.name}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}
