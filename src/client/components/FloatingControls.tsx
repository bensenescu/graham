import { Eye, EyeOff, Sparkles, Settings2 } from "lucide-react";

interface FloatingControlsProps {
  /** Whether inline AI reviews are visible */
  showInlineReviews: boolean;
  /** Toggle inline review visibility */
  onToggleInlineReviews: () => void;
  /** Whether any reviews exist */
  hasReviews: boolean;
  /** Whether currently reviewing all */
  isReviewingAll: boolean;
  /** Review all blocks */
  onReviewAll: () => void;
  /** Whether there are blocks to review */
  hasBlocks: boolean;
  /** Whether the settings panel is open */
  isPanelOpen: boolean;
  /** Open the settings panel */
  onOpenPanel: () => void;
}

/**
 * Floating controls panel for page-level actions.
 * Positioned to the right of the document, aligned towards the top.
 */
export function FloatingControls({
  showInlineReviews,
  onToggleInlineReviews,
  hasReviews,
  isReviewingAll,
  onReviewAll,
  hasBlocks,
  isPanelOpen,
  onOpenPanel,
}: FloatingControlsProps) {
  // Hide when side panel is open
  if (isPanelOpen) {
    return null;
  }

  return (
    <div className="fixed top-24 right-6 z-30">
      <div className="flex flex-col gap-1 p-1.5 rounded-xl bg-base-100 border border-base-300 shadow-lg min-w-[150px]">
        {/* Review All / Re-review All button */}
        <button
          onClick={onReviewAll}
          disabled={isReviewingAll || !hasBlocks}
          className="btn btn-sm btn-ghost justify-start gap-2 text-left"
        >
          {isReviewingAll ? (
            <>
              <span className="loading loading-spinner loading-xs" />
              <span className="text-xs">Reviewing...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs">
                {hasReviews ? "Re-review All" : "Review All"}
              </span>
            </>
          )}
        </button>

        {/* Toggle inline reviews */}
        <button
          onClick={onToggleInlineReviews}
          className={`
            btn btn-sm btn-ghost justify-start gap-2 text-left
            ${showInlineReviews ? "text-base-content" : "text-base-content/50"}
          `}
          title={showInlineReviews ? "Hide AI reviews" : "Show AI reviews"}
        >
          {showInlineReviews ? (
            <>
              <EyeOff className="h-4 w-4" />
              <span className="text-xs">Hide Reviews</span>
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              <span className="text-xs">Show Reviews</span>
            </>
          )}
        </button>

        {/* Open Settings Panel */}
        {!isPanelOpen && (
          <button
            onClick={onOpenPanel}
            className="btn btn-sm btn-ghost justify-start gap-2 text-left"
          >
            <Settings2 className="h-4 w-4" />
            <span className="text-xs">Settings</span>
          </button>
        )}
      </div>
    </div>
  );
}
