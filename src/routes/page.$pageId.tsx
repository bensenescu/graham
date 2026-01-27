import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery, eq } from "@tanstack/react-db";
import { useCallback, useMemo, useRef, useState } from "react";
import { pageCollection, pageBlockCollection } from "@/client/tanstack-db";
import { CollaborativeQADocumentEditor } from "@/client/components/CollaborativeQADocumentEditor";
import { PageCollaborationProvider } from "@/client/components/PageCollaborationProvider";
import { ResizablePanelLayout } from "@/client/components/ResizablePanelLayout";
import { FloatingControls } from "@/client/components/FloatingControls";
import {
  BlockReviewPanel,
  BlockReviewPanelHeader,
  type ReviewTab,
} from "@/client/components/AIReviewPanel";
import { useAIReview } from "@/client/hooks/useAIReview";
import { usePageReviewSettings } from "@/client/hooks/usePageReviewSettings";
import { useCollaborationUser } from "@/client/hooks/useCollaborationUser";
import type { PageBlock } from "@/types/schemas/pages";

export const Route = createFileRoute("/page/$pageId")({
  component: PageEditor,
  // Remount component when pageId changes to reset all state
  remountDeps: ({ params }) => params.pageId,
});

function PageEditor() {
  const { pageId } = Route.useParams();
  const navigate = useNavigate();

  // Collaboration user info
  const { userInfo, isLoading: isLoadingUser } = useCollaborationUser();

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

  // Live query for this specific page (filtered by ID)
  const { data: pages, isLoading: isLoadingPages } = useLiveQuery((q) =>
    q.from({ page: pageCollection }).where(({ page }) => eq(page.id, pageId)),
  );

  // Live query for blocks (filtered by pageId from the singleton collection)
  const { data: blocks, isLoading: isLoadingBlocks } = useLiveQuery((q) =>
    q
      .from({ block: pageBlockCollection })
      .where(({ block }) => eq(block.pageId, pageId)),
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

  // Panel handlers
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

  if (isLoadingPages || isLoadingBlocks || isLoadingUser) {
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
    <div className="h-full bg-base-200">
      <ResizablePanelLayout
        isPanelOpen={isPanelOpen}
        onPanelOpen={handlePanelOpen}
        onPanelClose={handlePanelClose}
        sidePanelHeader={
          <BlockReviewPanelHeader
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onClose={handlePanelClose}
          />
        }
        sidePanel={
          <BlockReviewPanel
            pageId={pageId}
            blocks={sortedBlocks}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onClose={handlePanelClose}
            onDeletePage={handleDelete}
            externalHeader
          />
        }
        storageKey="page-review-panel-width"
      >
        <PageCollaborationProvider pageId={pageId} userInfo={userInfo}>
          <CollaborativeQADocumentEditor
            pageId={pageId}
            blocks={sortedBlocks}
            reviews={reviews}
            loadingBlockIds={loadingBlockIds}
            showInlineReviews={showInlineReviews}
            onBlockCreate={handleBlockCreate}
            onBlockUpdate={handleBlockUpdate}
            onBlockDelete={handleBlockDelete}
            onReviewRequest={reviewBlock}
          />
        </PageCollaborationProvider>
      </ResizablePanelLayout>

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
      />
    </div>
  );
}
