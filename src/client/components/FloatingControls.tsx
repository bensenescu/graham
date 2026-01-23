import { useState, useEffect } from "react";
import { Eye, EyeOff, Sparkles, Settings2, FileText } from "lucide-react";

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
  /** Open the panel to the Overall tab */
  onOpenOverallTab: () => void;
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
  onOpenOverallTab,
}: FloatingControlsProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // Track visibility state with delay for entrance animation
  // This waits for the AIReviewPanel close animation (300ms) to finish before showing
  const [isVisible, setIsVisible] = useState(!isPanelOpen);

  useEffect(() => {
    if (isPanelOpen) {
      // Hide immediately when panel opens
      setIsVisible(false);
    } else {
      // Wait for panel close animation (300ms) to complete before showing
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isPanelOpen]);

  // Don't render when panel is open
  if (isPanelOpen) {
    return null;
  }

  const handleReviewAllClick = () => {
    if (hasReviews) {
      // Show confirmation if re-reviewing
      setShowConfirmModal(true);
    } else {
      // No existing reviews, proceed directly
      onReviewAll();
    }
  };

  const handleConfirmReview = () => {
    setShowConfirmModal(false);
    onReviewAll();
  };

  return (
    <>
      <div
        className={`
          fixed top-20 right-6 z-30
          transition-all duration-200 ease-out
          ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}
        `}
      >
        <div className="flex flex-col gap-1 p-1.5 rounded-xl bg-base-100 border border-base-300 shadow-lg min-w-[150px]">
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

          {/* Overall Review button */}
          <button
            onClick={onOpenOverallTab}
            className="btn btn-sm btn-ghost justify-start gap-2 text-left"
          >
            <FileText className="h-4 w-4" />
            <span className="text-xs">Overall Review</span>
          </button>

          {/* Review All / Re-review All button */}
          <button
            onClick={handleReviewAllClick}
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

          {/* Open Settings Panel */}
          <button
            onClick={onOpenPanel}
            className="btn btn-sm btn-ghost justify-start gap-2 text-left"
          >
            <Settings2 className="h-4 w-4" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Re-review */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowConfirmModal(false)}
          />
          {/* Modal */}
          <div className="relative bg-base-100 rounded-lg shadow-xl p-6 max-w-sm mx-4 border border-base-300">
            <h3 className="text-lg font-semibold mb-2">Re-review All?</h3>
            <p className="text-sm text-base-content/70 mb-4">
              This will replace all existing reviews with new ones. Are you sure
              you want to continue?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="btn btn-sm btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReview}
                className="btn btn-sm btn-primary"
              >
                Re-review All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
