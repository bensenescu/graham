import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery, eq } from "@tanstack/react-db";
import { useCallback, useMemo, useRef } from "react";
import { Menu, Trash2, Sparkles, MoreVertical } from "lucide-react";
import { useDrawer } from "@/client/contexts/DrawerContext";
import {
  pageCollection,
  createPageBlockCollection,
} from "@/client/tanstack-db";
import { QADocumentEditor } from "@/client/components/QADocumentEditor";
import { AIReviewPanel } from "@/client/components/AIReviewPanel";
import { ResizablePanelLayout } from "@/client/components/ResizablePanelLayout";
import { useAIReview } from "@/client/hooks/useAIReview";
import { useBlockPositions } from "@/client/hooks/useBlockPositions";
import type { PageBlock } from "@/types/schemas/pages";

type ReviewTab = "configure" | "overall" | "detailed";

interface PageSearchParams {
  tab?: ReviewTab;
}

export const Route = createFileRoute("/page/$pageId")({
  component: PageEditor,
  // Remount component when pageId changes to reset all state
  remountDeps: ({ params }) => params.pageId,
  validateSearch: (search: Record<string, unknown>): PageSearchParams => {
    const tab = search.tab as string | undefined;
    if (tab === "configure" || tab === "overall" || tab === "detailed") {
      return { tab };
    }
    return {};
  },
});

function PageEditor() {
  const { pageId } = Route.useParams();
  const { tab: initialTab } = Route.useSearch();
  const navigate = useNavigate();
  const { open: openDrawer } = useDrawer();
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref for the scroll container (passed to ResizablePanelLayout)
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Create block collection for this page
  const blockCollection = useMemo(
    () => createPageBlockCollection(pageId),
    [pageId],
  );

  // Live query for this specific page (filtered by ID)
  const { data: pages, isLoading: isLoadingPages } = useLiveQuery((q) =>
    q.from({ page: pageCollection }).where(({ page }) => eq(page.id, pageId)),
  );

  // Live query for blocks
  const { data: blocks, isLoading: isLoadingBlocks } = useLiveQuery((q) =>
    q.from({ block: blockCollection }),
  );

  const page = pages?.[0];
  const sortedBlocks = useMemo(() => {
    return [...(blocks ?? [])].sort((a, b) =>
      b.sortKey > a.sortKey ? 1 : b.sortKey < a.sortKey ? -1 : 0,
    );
  }, [blocks]);

  // Get block IDs in display order
  const blockIds = useMemo(() => sortedBlocks.map((b) => b.id), [sortedBlocks]);

  // Track block positions for syncing review panel
  const blockPositions = useBlockPositions(scrollContainerRef, blockIds);

  // AI Review state
  const {
    reviews,
    isPanelOpen,
    isReviewingAll,
    activeBlockId,
    reviewBlock,
    reviewAll,
    openPanel,
    closePanel,
    setActiveBlock,
  } = useAIReview({ pageId, blocks: sortedBlocks });

  const handleTitleChange = useCallback(
    (title: string) => {
      // Debounce the title update
      if (titleDebounceRef.current) {
        clearTimeout(titleDebounceRef.current);
      }
      titleDebounceRef.current = setTimeout(() => {
        pageCollection.update(pageId, (draft) => {
          draft.title = title;
          draft.updatedAt = new Date().toISOString();
        });
      }, 500);
    },
    [pageId],
  );

  const handleBlockCreate = useCallback(
    (block: PageBlock) => {
      blockCollection.insert({
        id: block.id,
        pageId: block.pageId,
        question: block.question,
        answer: block.answer,
        sortKey: block.sortKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    },
    [blockCollection],
  );

  const handleBlockUpdate = useCallback(
    (id: string, updates: Partial<PageBlock>) => {
      blockCollection.update(id, (draft) => {
        if (updates.question !== undefined) draft.question = updates.question;
        if (updates.answer !== undefined) draft.answer = updates.answer;
        if (updates.sortKey !== undefined) draft.sortKey = updates.sortKey;
        draft.updatedAt = new Date().toISOString();
      });
    },
    [blockCollection],
  );

  const handleBlockDelete = useCallback(
    (id: string) => {
      blockCollection.delete(id);
    },
    [blockCollection],
  );

  const handleDelete = useCallback(() => {
    pageCollection.delete(pageId);
    navigate({ to: "/" });
  }, [pageId, navigate]);

  // Handle clicking a block in the review panel (scroll to it in editor)
  const handlePanelBlockClick = useCallback(
    (blockId: string) => {
      setActiveBlock(blockId);
      // Scroll to the block in the document
      if (scrollContainerRef.current) {
        const blockElement = scrollContainerRef.current.querySelector(
          `[data-block-id="${blockId}"]`,
        );
        if (blockElement) {
          blockElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    },
    [setActiveBlock],
  );

  // Handle focusing a block in the editor (highlight it in panel)
  const handleEditorBlockFocus = useCallback(
    (blockId: string) => {
      if (isPanelOpen) {
        setActiveBlock(blockId);
      }
    },
    [isPanelOpen, setActiveBlock],
  );

  if (isLoadingPages || isLoadingBlocks) {
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
      <div className="flex-shrink-0 border-b border-base-300 bg-base-100 px-4 py-3 flex items-center gap-3">
        <button
          onMouseEnter={openDrawer}
          onClick={openDrawer}
          className="btn btn-ghost btn-sm btn-square"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="flex-1 font-semibold text-lg text-base-content">
          Graham
        </h1>

        {/* Actions dropdown */}
        <div className="dropdown dropdown-end">
          <button
            tabIndex={0}
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Page actions"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          <ul
            tabIndex={0}
            className="dropdown-content z-20 menu p-1 shadow-lg bg-base-100 rounded-lg border border-base-300 w-48"
          >
            <li>
              <button
                onClick={reviewAll}
                disabled={isReviewingAll || sortedBlocks.length === 0}
                className="flex items-center gap-2 text-sm"
              >
                {isReviewingAll ? (
                  <>
                    <span className="loading loading-spinner loading-xs" />
                    Reviewing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Review All
                  </>
                )}
              </button>
            </li>
            <li>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 text-sm text-error"
              >
                <Trash2 className="h-4 w-4" />
                Delete Page
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Main content with resizable panel */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelLayout
          ref={scrollContainerRef}
          isPanelOpen={isPanelOpen}
          onPanelOpen={openPanel}
          onPanelClose={closePanel}
          storageKey={`review-panel-width-${pageId}`}
          minMainWidth={33}
          maxMainWidth={66}
          defaultMainWidth={50}
          sidePanel={
            <AIReviewPanel
              pageId={pageId}
              blocks={sortedBlocks}
              reviews={reviews}
              blockPositions={blockPositions}
              activeBlockId={activeBlockId}
              isReviewingAll={isReviewingAll}
              initialTab={initialTab}
              onClose={closePanel}
              onBlockClick={handlePanelBlockClick}
              onReReview={reviewBlock}
              onReviewAll={reviewAll}
            />
          }
        >
          <QADocumentEditor
            pageId={pageId}
            pageTitle={page.title}
            blocks={sortedBlocks}
            reviews={reviews}
            activeBlockId={activeBlockId}
            showGradeBadges={false}
            onBlockCreate={handleBlockCreate}
            onBlockUpdate={handleBlockUpdate}
            onBlockDelete={handleBlockDelete}
            onBlockFocus={handleEditorBlockFocus}
            onReviewRequest={reviewBlock}
            onTitleChange={handleTitleChange}
          />
        </ResizablePanelLayout>
      </div>
    </div>
  );
}
