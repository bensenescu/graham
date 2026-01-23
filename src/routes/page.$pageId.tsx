import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery, eq } from "@tanstack/react-db";
import { useCallback, useMemo, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { useDrawer } from "@/client/contexts/DrawerContext";
import {
  pageCollection,
  createPageBlockCollection,
} from "@/client/tanstack-db";
import { QADocumentEditor } from "@/client/components/QADocumentEditor";
import { ResizablePanelLayout } from "@/client/components/ResizablePanelLayout";
import { FloatingControls } from "@/client/components/FloatingControls";
import {
  BlockReviewPanel,
  BlockReviewPanelHeader,
  type ReviewTab,
} from "@/client/components/AIReviewPanel";
import { useAIReview } from "@/client/hooks/useAIReview";
import { usePageReviewSettings } from "@/client/hooks/usePageReviewSettings";
import type { PageBlock } from "@/types/schemas/pages";

export const Route = createFileRoute("/page/$pageId")({
  component: PageEditor,
  // Remount component when pageId changes to reset all state
  remountDeps: ({ params }) => params.pageId,
});

function PageEditor() {
  const { pageId } = Route.useParams();
  const navigate = useNavigate();
  const { open: openDrawer } = useDrawer();
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ReviewTab>("settings");

  // Inline reviews visibility (persisted to localStorage)
  const [showInlineReviews, setShowInlineReviews] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("show-inline-reviews");
    return stored === null ? true : stored === "true";
  });

  const handleToggleInlineReviews = useCallback(() => {
    setShowInlineReviews((prev) => {
      const next = !prev;
      localStorage.setItem("show-inline-reviews", String(next));
      return next;
    });
  }, []);

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

  // Get page review settings and prompts
  const { defaultPrompt } = usePageReviewSettings(pageId);

  // Pass only the default prompt as custom instructions
  const customInstructions = useMemo(() => {
    return defaultPrompt?.prompt || undefined;
  }, [defaultPrompt]);

  // AI Review state
  const { reviews, isReviewingAll, loadingBlockIds, reviewBlock, reviewAll } =
    useAIReview({
      pageId,
      blocks: sortedBlocks,
      promptId: defaultPrompt?.id ?? null,
      customInstructions,
    });

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

  // Panel handlers - must be before early returns to maintain consistent hook order
  const handlePanelOpen = useCallback(() => {
    setIsPanelOpen(true);
  }, []);

  const handlePanelClose = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  const handleTabChange = useCallback((tab: ReviewTab) => {
    setActiveTab(tab);
  }, []);

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

  // Header component for the main content area
  const mainHeader = (
    <div className="border-b border-base-300 bg-base-100 px-4 py-3 flex items-center gap-3 w-full">
      <button
        onMouseEnter={openDrawer}
        onClick={openDrawer}
        className="btn btn-ghost btn-sm btn-square"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="flex-1 font-semibold text-lg text-base-content">Graham</h1>
    </div>
  );

  // Side panel header
  const sidePanelHeader = (
    <BlockReviewPanelHeader
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onClose={handlePanelClose}
    />
  );

  // Side panel content
  const sidePanel = (
    <BlockReviewPanel
      pageId={pageId}
      blocks={sortedBlocks}
      reviews={reviews}
      isReviewingAll={isReviewingAll}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onClose={handlePanelClose}
      onReviewAll={reviewAll}
      onDeletePage={handleDelete}
      externalHeader
    />
  );

  return (
    <div className="h-full bg-base-200">
      <ResizablePanelLayout
        isPanelOpen={isPanelOpen}
        onPanelOpen={handlePanelOpen}
        onPanelClose={handlePanelClose}
        mainHeader={mainHeader}
        sidePanelHeader={sidePanelHeader}
        sidePanel={sidePanel}
        storageKey="page-review-panel-width"
        sidePanelIndependentScroll
      >
        <QADocumentEditor
          pageId={pageId}
          pageTitle={page.title}
          blocks={sortedBlocks}
          reviews={reviews}
          loadingBlockIds={loadingBlockIds}
          showInlineReviews={showInlineReviews}
          onBlockCreate={handleBlockCreate}
          onBlockUpdate={handleBlockUpdate}
          onBlockDelete={handleBlockDelete}
          onReviewRequest={reviewBlock}
          onTitleChange={handleTitleChange}
        />
      </ResizablePanelLayout>

      {/* Floating controls */}
      <FloatingControls
        showInlineReviews={showInlineReviews}
        onToggleInlineReviews={handleToggleInlineReviews}
        hasReviews={reviews.size > 0}
        isReviewingAll={isReviewingAll}
        onReviewAll={reviewAll}
        hasBlocks={sortedBlocks.length > 0}
        isPanelOpen={isPanelOpen}
        onOpenPanel={handlePanelOpen}
      />
    </div>
  );
}
