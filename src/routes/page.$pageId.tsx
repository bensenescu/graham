import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery } from "@tanstack/react-db";
import { useState, useCallback, useMemo } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { pageCollection } from "@/client/tanstack-db";
import { QAEditor } from "@/client/components/QAEditor";
import {
  parsePageContent,
  stringifyPageContent,
  type PageContent,
} from "@/types/schemas/pages";

export const Route = createFileRoute("/page/$pageId")({
  component: PageEditor,
});

function PageEditor() {
  const { pageId } = Route.useParams();
  const navigate = useNavigate();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");

  // Live query for this specific page
  const { data: pages, isLoading } = useLiveQuery((q) =>
    q.from({ page: pageCollection }),
  );

  const page = useMemo(
    () => pages?.find((p) => p.id === pageId),
    [pages, pageId],
  );

  // Parse the content JSON
  const content = useMemo(() => {
    return parsePageContent(page?.content || "");
  }, [page?.content]);

  const handleTitleClick = useCallback(() => {
    if (page) {
      setTitleInput(page.title || "");
      setIsEditingTitle(true);
    }
  }, [page]);

  const handleTitleSubmit = useCallback(() => {
    if (page && titleInput.trim()) {
      pageCollection.update(pageId, (draft) => {
        draft.title = titleInput.trim();
        draft.updatedAt = new Date().toISOString();
      });
    }
    setIsEditingTitle(false);
  }, [page, pageId, titleInput]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleTitleSubmit();
      } else if (e.key === "Escape") {
        setIsEditingTitle(false);
      }
    },
    [handleTitleSubmit],
  );

  const handleContentChange = useCallback(
    (newContent: PageContent) => {
      if (page) {
        pageCollection.update(pageId, (draft) => {
          draft.content = stringifyPageContent(newContent);
          draft.updatedAt = new Date().toISOString();
        });
      }
    },
    [page, pageId],
  );

  const handleDelete = useCallback(() => {
    pageCollection.delete(pageId);
    navigate({ to: "/" });
  }, [pageId, navigate]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-semibold text-base-content mb-2">
          Page not found
        </h2>
        <p className="text-base-content/60 mb-4">
          This page may have been deleted.
        </p>
        <button
          onClick={() => navigate({ to: "/" })}
          className="btn btn-primary"
        >
          Go to Pages
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-base-200">
      {/* Header */}
      <div className="border-b border-base-300 bg-base-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/" })}
          className="btn btn-ghost btn-sm btn-square md:hidden"
          aria-label="Back to pages"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {isEditingTitle ? (
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={handleTitleKeyDown}
            autoFocus
            className="input input-sm flex-1 font-semibold text-lg"
          />
        ) : (
          <h1
            onClick={handleTitleClick}
            className="flex-1 font-semibold text-lg text-base-content cursor-pointer hover:text-primary transition-colors truncate"
            title="Click to edit title"
          >
            {page.title || "Untitled"}
          </h1>
        )}

        <button
          onClick={handleDelete}
          className="btn btn-ghost btn-sm btn-square text-error"
          aria-label="Delete page"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Q&A Editor */}
      <div className="flex-1 overflow-hidden">
        <QAEditor content={content} onContentChange={handleContentChange} />
      </div>
    </div>
  );
}
