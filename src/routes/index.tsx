import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { Plus, FileText, Trash2 } from "lucide-react";
import { pageCollection } from "@/client/tanstack-db";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const navigate = useNavigate();

  // Live query that updates automatically when data changes (sorted by updatedAt desc)
  const {
    data: pages,
    isLoading,
    isError,
  } = useLiveQuery((q) =>
    q
      .from({ page: pageCollection })
      .orderBy(({ page }) => page.updatedAt, "desc"),
  );

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

  const handleDeletePage = (e: React.MouseEvent, pageId: string) => {
    e.preventDefault();
    e.stopPropagation();
    pageCollection.delete(pageId);
  };

  if (isLoading) {
    return null;
  }

  if (isError) {
    return (
      <div className="p-4">
        <p className="text-error">Failed to load pages.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="px-4 pb-24 md:pt-4 md:pb-4 max-w-4xl mx-auto">
        {/* Header - desktop only */}
        <div className="hidden md:flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold text-base-content">Pages</h1>
          <button onClick={handleNewPage} className="btn btn-primary gap-2">
            <Plus className="h-4 w-4" />
            New Page
          </button>
        </div>

        {/* Page list */}
        {!pages || pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-16 w-16 text-base-content/30 mb-4" />
            <h2 className="text-xl font-semibold text-base-content mb-2">
              No pages yet
            </h2>
            <p className="text-base-content/60 mb-6">
              Create your first page to get started writing.
            </p>
            <button onClick={handleNewPage} className="btn btn-primary gap-2">
              <Plus className="h-4 w-4" />
              Create Page
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {pages.map((page) => (
              <Link
                key={page.id}
                to="/page/$pageId"
                params={{ pageId: page.id }}
                className="block bg-base-100 rounded-lg border border-base-300 p-4 hover:border-primary/50 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-base-content truncate">
                      {page.title || "Untitled"}
                    </h3>
                    <p className="text-sm text-base-content/60 mt-1">
                      {new Date(page.updatedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year:
                          new Date(page.updatedAt).getFullYear() !==
                          new Date().getFullYear()
                            ? "numeric"
                            : undefined,
                      })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeletePage(e, page.id)}
                    className="btn btn-ghost btn-sm btn-square opacity-0 group-hover:opacity-100 transition-opacity text-error"
                    aria-label="Delete page"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Mobile: FAB for creating pages */}
      <button
        onClick={handleNewPage}
        className="md:hidden fixed bottom-24 right-4 z-40 w-14 h-14 bg-primary text-primary-content rounded-xl flex items-center justify-center shadow-lg border border-base-content/10"
        aria-label="Create new page"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
