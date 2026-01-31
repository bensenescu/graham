import { useHotkeys } from "react-hotkeys-hook";
import { X, Settings2, FileText } from "lucide-react";
import type { PageBlock } from "@/types/schemas/pages";
import { SHORTCUT_CLOSE_PANEL_HOTKEY } from "@/client/lib/keyboard-shortcuts";
import { ConfigureTab } from "./ConfigureTab";
import { OverallTab } from "./OverallTab";

export type ReviewTab = "settings" | "overall";

interface BlockReviewPanelProps {
  pageId: string;
  blocks: PageBlock[];
  /** Current active tab - controlled from parent */
  activeTab: ReviewTab;
  /** Called when tab changes */
  onTabChange?: (tab: ReviewTab) => void;
  onClose: () => void;
  /** Called when delete page is requested (only available for owners) */
  onDeletePage?: () => void;
  /** If true, header is rendered externally and not inside the panel */
  externalHeader?: boolean;
}

/**
 * Header component for the AI Review panel - can be rendered separately
 */
export function BlockReviewPanelHeader({
  activeTab,
  onTabChange,
  onClose,
}: {
  activeTab: ReviewTab;
  onTabChange: (tab: ReviewTab) => void;
  onClose: () => void;
}) {
  // Close panel on Escape key
  useHotkeys(SHORTCUT_CLOSE_PANEL_HOTKEY, onClose, { enableOnFormTags: true }, [
    onClose,
  ]);

  const tabs: { id: ReviewTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "settings",
      label: "Settings",
      icon: <Settings2 className="h-4 w-4" />,
    },
    { id: "overall", label: "Overall", icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div className="flex items-center justify-between px-4 py-2 h-full">
      <div className="flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors " +
              (activeTab === tab.id
                ? "text-primary bg-primary/10"
                : "text-base-content/60 hover:text-base-content hover:bg-base-200")
            }
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <button
        onClick={onClose}
        className="btn btn-ghost btn-sm btn-square"
        aria-label="Close review panel"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * AI Review side panel with two tabs:
 * - Configure: Review settings, prompts, model selection
 * - Overall: Holistic feedback on entire application
 */
export function BlockReviewPanel({
  pageId,
  blocks,
  activeTab,
  onTabChange,
  onClose,
  onDeletePage,
  externalHeader,
}: BlockReviewPanelProps) {
  return (
    <div className="h-full flex flex-col bg-base-100">
      {/* Header - only render inline if not external */}
      {!externalHeader && onTabChange && (
        <div className="flex-shrink-0 border-b border-base-300 bg-base-100">
          <BlockReviewPanelHeader
            activeTab={activeTab}
            onTabChange={onTabChange}
            onClose={onClose}
          />
        </div>
      )}

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "settings" && (
          <ConfigureTab pageId={pageId} onDeletePage={onDeletePage} />
        )}
        {activeTab === "overall" && (
          <OverallTab pageId={pageId} blocks={blocks} />
        )}
      </div>
    </div>
  );
}
