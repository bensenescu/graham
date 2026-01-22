import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLiveQuery, eq } from "@tanstack/react-db";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
  useId,
} from "react";
import { createPortal } from "react-dom";
import { Menu, Trash2, Sparkles, MoreVertical } from "lucide-react";
import { useDrawer } from "@/client/contexts/DrawerContext";
import {
  pageCollection,
  createPageBlockCollection,
} from "@/client/tanstack-db";
import { QADocumentEditor } from "@/client/components/QADocumentEditor";
import {
  BlockReviewPanel,
  BlockReviewPanelHeader,
  type ReviewTab,
} from "@/client/components/AIReviewPanel";
import { ResizablePanelLayout } from "@/client/components/ResizablePanelLayout";
import { useAIReview } from "@/client/hooks/useAIReview";
import {
  useBlockPositions,
  calculateBlockSpacing,
} from "@/client/hooks/useBlockPositions";
import { usePageReviewSettings } from "@/client/hooks/usePageReviewSettings";
import type { PageBlock } from "@/types/schemas/pages";

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
  const { tab: initialTabFromUrl } = Route.useSearch();
  const navigate = useNavigate();
  const { open: openDrawer } = useDrawer();
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Actions dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    right: 0,
  });
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLUListElement>(null);
  const dropdownId = useId();

  // Calculate dropdown position when opening
  const openDropdown = useCallback(() => {
    if (dropdownButtonRef.current) {
      const rect = dropdownButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setIsDropdownOpen(true);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownButtonRef.current &&
        !dropdownButtonRef.current.contains(target) &&
        dropdownMenuRef.current &&
        !dropdownMenuRef.current.contains(target)
      ) {
        closeDropdown();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeDropdown();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isDropdownOpen, closeDropdown]);

  // Ref for the scroll container (passed to ResizablePanelLayout)
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Panel tab state - lifted up so header and panel content can share it
  const [activeTab, setActiveTab] = useState<ReviewTab>(() => {
    // Query param takes highest priority
    if (initialTabFromUrl) return initialTabFromUrl;

    // Then check localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`review-panel-tab-${pageId}`);
      if (
        stored === "configure" ||
        stored === "overall" ||
        stored === "detailed"
      ) {
        return stored;
      }
    }

    // Default to detailed
    return "detailed";
  });

  const handleTabChange = useCallback(
    (tab: ReviewTab) => {
      setActiveTab(tab);
      localStorage.setItem(`review-panel-tab-${pageId}`, tab);
    },
    [pageId],
  );

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

  // Track card heights from the review panel (for calculating Q&A block spacing)
  const [cardHeights, setCardHeights] = useState<Map<string, number>>(
    () => new Map(),
  );

  // Callback when card heights change in the review panel
  const handleCardHeightsChange = useCallback(
    (heights: Map<string, number>) => {
      setCardHeights(heights);
    },
    [],
  );

  // Get page review settings and prompts
  const { defaultPrompt } = usePageReviewSettings(pageId);

  // Pass only the default prompt as custom instructions
  const customInstructions = useMemo(() => {
    return defaultPrompt?.prompt || undefined;
  }, [defaultPrompt]);

  // AI Review state
  const {
    reviews,
    isPanelOpen,
    isReviewingAll,
    activeBlockId,
    requestedTab,
    loadingBlockIds,
    reviewBlock,
    reviewAll,
    openPanel,
    closePanel,
    setActiveBlock,
    clearRequestedTab,
  } = useAIReview({
    pageId,
    blocks: sortedBlocks,
    promptId: defaultPrompt?.id ?? null,
    customInstructions,
  });

  // Handle requestedTab changes from useAIReview (e.g., when reviewing a question)
  useEffect(() => {
    if (requestedTab && requestedTab !== activeTab) {
      setActiveTab(requestedTab);
      localStorage.setItem(`review-panel-tab-${pageId}`, requestedTab);
      clearRequestedTab();
    }
  }, [requestedTab, activeTab, pageId, clearRequestedTab]);

  // Determine if the detailed tab has reviews to show (not in empty state)
  const detailedTabHasContent = useMemo(() => {
    return reviews.size > 0 || loadingBlockIds.size > 0 || isReviewingAll;
  }, [reviews, loadingBlockIds, isReviewingAll]);

  // Only use synchronized scrolling when detailed tab is active AND has content
  const useSyncScroll = activeTab === "detailed" && detailedTabHasContent;

  // Calculate extra spacing needed for Q&A blocks to align with review cards
  // Only apply when detailed tab is active and has content
  const blockSpacing = useMemo(() => {
    if (!useSyncScroll) {
      return undefined;
    }
    return calculateBlockSpacing(blockIds, blockPositions, cardHeights, 8);
  }, [useSyncScroll, blockIds, blockPositions, cardHeights]);

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
      <ResizablePanelLayout
        ref={scrollContainerRef}
        isPanelOpen={isPanelOpen}
        onPanelOpen={openPanel}
        onPanelClose={closePanel}
        storageKey={`review-panel-width-${pageId}`}
        minMainWidth={33}
        maxMainWidth={66}
        defaultMainWidth={50}
        sidePanelIndependentScroll={!useSyncScroll}
        mainHeader={
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
            <div className="relative">
              <button
                ref={dropdownButtonRef}
                onClick={() =>
                  isDropdownOpen ? closeDropdown() : openDropdown()
                }
                className="btn btn-ghost btn-sm btn-square"
                aria-label="Page actions"
                aria-expanded={isDropdownOpen}
                aria-haspopup="menu"
                aria-controls={dropdownId}
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {isDropdownOpen &&
                createPortal(
                  <ul
                    ref={dropdownMenuRef}
                    id={dropdownId}
                    role="menu"
                    className="fixed z-50 menu p-1 shadow-lg bg-base-100 rounded-lg border border-base-300 w-48"
                    style={{
                      top: dropdownPosition.top,
                      right: dropdownPosition.right,
                    }}
                  >
                    <li role="none">
                      <button
                        role="menuitem"
                        onClick={() => {
                          reviewAll();
                          closeDropdown();
                        }}
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
                    <li role="none">
                      <button
                        role="menuitem"
                        onClick={() => {
                          handleDelete();
                          closeDropdown();
                        }}
                        className="flex items-center gap-2 text-sm text-error"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Page
                      </button>
                    </li>
                  </ul>,
                  document.body,
                )}
            </div>
          </div>
        }
        sidePanelHeader={
          <BlockReviewPanelHeader
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onClose={closePanel}
          />
        }
        sidePanel={
          <BlockReviewPanel
            pageId={pageId}
            blocks={sortedBlocks}
            reviews={reviews}
            loadingBlockIds={loadingBlockIds}
            blockPositions={blockPositions}
            activeBlockId={activeBlockId}
            isReviewingAll={isReviewingAll}
            activeTab={activeTab}
            onClose={closePanel}
            onBlockClick={handlePanelBlockClick}
            onReReview={reviewBlock}
            onReviewAll={reviewAll}
            onCardHeightsChange={handleCardHeightsChange}
            externalHeader
            disableInternalScroll={useSyncScroll}
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
          blockSpacing={blockSpacing}
          onBlockCreate={handleBlockCreate}
          onBlockUpdate={handleBlockUpdate}
          onBlockDelete={handleBlockDelete}
          onBlockFocus={handleEditorBlockFocus}
          onReviewRequest={reviewBlock}
          onTitleChange={handleTitleChange}
        />
      </ResizablePanelLayout>
    </div>
  );
}
