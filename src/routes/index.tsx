import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { Plus, Trash2, Users } from "lucide-react";
import { pageCollection, sharedPageCollection } from "@/client/tanstack-db";
import { NewPageOptions } from "@/client/components/NewPageOptions";
import { DeleteConfirmationModal } from "@/client/components/DeleteConfirmationModal";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    pageId: string | null;
    pageTitle: string;
  }>({ isOpen: false, pageId: null, pageTitle: "" });

  // Live query for owned pages (sorted by updatedAt desc)
  const {
    data: ownedPages,
    isLoading: isLoadingOwned,
    isError: isErrorOwned,
  } = useLiveQuery((q) =>
    q
      .from({ page: pageCollection })
      .orderBy(({ page }) => page.updatedAt, "desc"),
  );

  // Live query for shared pages (sorted by updatedAt desc)
  const {
    data: sharedPages,
    isLoading: isLoadingShared,
    isError: isErrorShared,
  } = useLiveQuery((q) =>
    q
      .from({ page: sharedPageCollection })
      .orderBy(({ page }) => page.updatedAt, "desc"),
  );

  const isLoading = isLoadingOwned || isLoadingShared;
  const isError = isErrorOwned || isErrorShared;

  // Combine and sort all pages by updatedAt
  const pages = [...(ownedPages ?? []), ...(sharedPages ?? [])].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  // Track which pages are shared (not owned by user)
  const sharedPageIds = new Set(sharedPages?.map((p) => p.id) ?? []);

  const handleDeleteClick = (
    e: React.MouseEvent,
    pageId: string,
    pageTitle: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteModal({ isOpen: true, pageId, pageTitle });
  };

  const handleConfirmDelete = () => {
    if (deleteModal.pageId) {
      pageCollection.delete(deleteModal.pageId);
    }
    setDeleteModal({ isOpen: false, pageId: null, pageTitle: "" });
  };

  const handleCloseModal = () => {
    setDeleteModal({ isOpen: false, pageId: null, pageTitle: "" });
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
      <div className="px-4 pt-4 pb-24 md:pb-4 max-w-4xl mx-auto">
        {/* Header - desktop only */}
        <div className="hidden md:flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold text-base-content">Pages</h1>
          {pages && pages.length > 0 && (
            <Link to="/new" className="btn btn-primary gap-2">
              <Plus className="h-4 w-4" />
              New Page
            </Link>
          )}
        </div>

        {/* Page list */}
        {!pages || pages.length === 0 ? (
          <div className="py-8">
            <NewPageOptions />
          </div>
        ) : (
          <div className="space-y-2">
            {pages.map((page) => {
              const isShared = sharedPageIds.has(page.id);
              return (
                <Link
                  key={page.id}
                  to="/page/$pageId"
                  params={{ pageId: page.id }}
                  className="block bg-base-100 rounded-lg border border-base-300 p-4 hover:border-primary/50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-base-content truncate">
                          {page.title || "Untitled"}
                        </h3>
                        {isShared && (
                          <span
                            className="flex-shrink-0 text-base-content/50"
                            title="Shared with you"
                          >
                            <Users className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-base-content/60 mt-1">
                        {new Date(page.updatedAt).toLocaleDateString(
                          undefined,
                          {
                            month: "short",
                            day: "numeric",
                            year:
                              new Date(page.updatedAt).getFullYear() !==
                              new Date().getFullYear()
                                ? "numeric"
                                : undefined,
                          },
                        )}
                      </p>
                    </div>
                    {!isShared && (
                      <button
                        onClick={(e) =>
                          handleDeleteClick(
                            e,
                            page.id,
                            page.title || "Untitled",
                          )
                        }
                        className="btn btn-ghost btn-sm btn-square opacity-0 group-hover:opacity-100 transition-opacity text-error"
                        aria-label="Delete page"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile: FAB for creating pages */}
      <Link
        to="/new"
        className="md:hidden fixed bottom-24 right-4 z-40 w-14 h-14 bg-primary text-primary-content rounded-xl flex items-center justify-center shadow-lg border border-base-content/10"
        aria-label="Create new page"
      >
        <Plus className="w-6 h-6" />
      </Link>

      {/* Delete confirmation modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        title="Delete Page"
        description={`Are you sure you want to delete "${deleteModal.pageTitle}"? This action cannot be undone.`}
        confirmText="Delete Page"
      />
    </div>
  );
}
