import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery, eq } from "@tanstack/react-db";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  pageCollection,
  pageBlockCollection,
  sharedPageCollection,
} from "@/client/tanstack-db";
import { QADocumentEditor } from "@/client/components/QADocumentEditor";
import { ResizablePanelLayout } from "@/client/components/ResizablePanelLayout";
import { FloatingControls } from "@/client/components/FloatingControls";
import {
  BlockReviewPanel,
  BlockReviewPanelHeader,
  type ReviewTab,
} from "@/client/components/AIReviewPanel";
import { PracticeModeModal } from "@/client/components/PracticeMode";
import { useAIReview } from "@/client/hooks/useAIReview";
import { usePageReviewSettings } from "@/client/hooks/usePageReviewSettings";
import { sortBlocksBySortKey } from "@/client/lib/fractional-indexing";
import type { PageBlock } from "@/types/schemas/pages";

export const Route = createFileRoute("/page/$pageId")({
  component: PageEditor,
  // Remount component when pageId changes to reset all state
  remountDeps: ({ params }) => params.pageId,
});

function PageEditor() {
  const { pageId } = Route.useParams();
  const navigate = useNavigate();
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // DEBUG: Track component mount time
  const mountTimeRef = useRef(performance.now());
  useEffect(() => {
    console.log("[PageEditor] mounted, pageId:", pageId);
    return () => {
      console.log("[PageEditor] unmounted, pageId:", pageId);
    };
  }, [pageId]);

  // Panel state
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ReviewTab>("settings");

  // Practice mode state
  const [isPracticeModeOpen, setIsPracticeModeOpen] = useState(false);

  // Inline reviews visibility (persisted to localStorage)
  const [showInlineReviews, setShowInlineReviews] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem("show-inline-reviews");
      return stored === null ? true : stored === "true";
    } catch {
      // localStorage may be unavailable in private browsing mode
      return true;
    }
  });

  const handleToggleInlineReviews = useCallback(() => {
    setShowInlineReviews((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("show-inline-reviews", String(next));
      } catch {
        // localStorage may be unavailable in private browsing mode
      }
      return next;
    });
  }, []);

  // Live query for this specific page from owned pages
  const { data: ownedPages, isLoading: isLoadingOwnedPages } = useLiveQuery(
    (q) =>
      q.from({ page: pageCollection }).where(({ page }) => eq(page.id, pageId)),
  );

  // Live query for this specific page from shared pages
  const { data: sharedPages, isLoading: isLoadingSharedPages } = useLiveQuery(
    (q) =>
      q
        .from({ page: sharedPageCollection })
        .where(({ page }) => eq(page.id, pageId)),
  );

  // Live query for blocks (filtered by pageId from the singleton collection)
  const { data: blocks, isLoading: isLoadingBlocks } = useLiveQuery((q) =>
    q
      .from({ block: pageBlockCollection })
      .where(({ block }) => eq(block.pageId, pageId)),
  );

  // DEBUG: Log when queries complete
  useEffect(() => {
    const elapsed = performance.now() - mountTimeRef.current;
    console.log(
      `[PageEditor] ownedPages query: isLoading=${isLoadingOwnedPages}, count=${ownedPages?.length ?? 0}, elapsed=${elapsed.toFixed(0)}ms`,
    );
  }, [isLoadingOwnedPages, ownedPages]);

  useEffect(() => {
    const elapsed = performance.now() - mountTimeRef.current;
    console.log(
      `[PageEditor] sharedPages query: isLoading=${isLoadingSharedPages}, count=${sharedPages?.length ?? 0}, elapsed=${elapsed.toFixed(0)}ms`,
    );
  }, [isLoadingSharedPages, sharedPages]);

  useEffect(() => {
    const elapsed = performance.now() - mountTimeRef.current;
    console.log(
      `[PageEditor] blocks query: isLoading=${isLoadingBlocks}, count=${blocks?.length ?? 0}, elapsed=${elapsed.toFixed(0)}ms`,
    );
  }, [isLoadingBlocks, blocks]);

  // Determine if this is an owned or shared page
  const ownedPage = ownedPages?.[0];
  const sharedPage = sharedPages?.[0];
  const page = ownedPage ?? sharedPage;
  const isOwner = !!ownedPage;
  const isLoadingPages = isLoadingOwnedPages || isLoadingSharedPages;
  const sortedBlocks = useMemo(() => {
    return sortBlocksBySortKey(blocks ?? []);
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

  const handleBlockCreate = useCallback((block: PageBlock) => {
    pageBlockCollection.insert({
      id: block.id,
      pageId: block.pageId,
      question: block.question,
      answer: block.answer,
      sortKey: block.sortKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const handleBlockUpdate = useCallback(
    (id: string, updates: Partial<PageBlock>) => {
      pageBlockCollection.update(id, (draft) => {
        if (updates.question !== undefined) draft.question = updates.question;
        if (updates.answer !== undefined) draft.answer = updates.answer;
        if (updates.sortKey !== undefined) draft.sortKey = updates.sortKey;
        draft.updatedAt = new Date().toISOString();
      });
    },
    [],
  );

  const handleBlockDelete = useCallback((id: string) => {
    pageBlockCollection.delete(id);
  }, []);

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

  const handleOpenOverallTab = useCallback(() => {
    setActiveTab("overall");
    setIsPanelOpen(true);
  }, []);

  const handleOpenPracticeMode = useCallback(() => {
    setIsPracticeModeOpen(true);
  }, []);

  const handleClosePracticeMode = useCallback(() => {
    setIsPracticeModeOpen(false);
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
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onClose={handlePanelClose}
      onDeletePage={isOwner ? handleDelete : undefined}
      externalHeader
    />
  );

  return (
    <div className="h-full bg-base-200">
      <ResizablePanelLayout
        isPanelOpen={isPanelOpen}
        onPanelOpen={handlePanelOpen}
        onPanelClose={handlePanelClose}
        sidePanelHeader={sidePanelHeader}
        sidePanel={sidePanel}
        storageKey="page-review-panel-width"
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
        onOpenOverallTab={handleOpenOverallTab}
        onOpenPracticeMode={handleOpenPracticeMode}
      />

      {/* Practice Mode Modal */}
      <PracticeModeModal
        pageId={pageId}
        blocks={sortedBlocks}
        isOpen={isPracticeModeOpen}
        onClose={handleClosePracticeMode}
      />
    </div>
  );
}
