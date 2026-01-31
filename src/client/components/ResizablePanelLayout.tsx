import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";

interface ResizablePanelLayoutProps {
  /** Main content (left side) */
  children: ReactNode;
  /** Side panel content (right side) */
  sidePanel: ReactNode;
  /** Optional header for main content that also gets pushed when panel opens */
  mainHeader?: ReactNode;
  /** Optional header for side panel that stays fixed when scrolling */
  sidePanelHeader?: ReactNode;
  /** Whether the side panel is open */
  isPanelOpen: boolean;
  /** Callback when panel is closed */
  onPanelClose: () => void;
  /** Callback when panel should be opened */
  onPanelOpen?: () => void;
  /** Storage key for persisting width preference */
  storageKey?: string;
  /** Minimum width of main content as percentage (default: 33) */
  minMainWidth?: number;
  /** Maximum width of main content as percentage (default: 66) */
  maxMainWidth?: number;
  /** Default width of main content as percentage (default: 50) */
  defaultMainWidth?: number;
}

/**
 * A layout component with a resizable side panel.
 * Both panels scroll independently.
 * Width preference is persisted to localStorage.
 */
export function ResizablePanelLayout({
  children,
  sidePanel,
  mainHeader,
  sidePanelHeader,
  isPanelOpen,
  onPanelClose,
  onPanelOpen,
  storageKey = "panel-width",
  minMainWidth = 33,
  maxMainWidth = 66,
  defaultMainWidth = 50,
}: ResizablePanelLayoutProps) {
  // Load initial width from localStorage or use default
  const [mainWidthPercent, setMainWidthPercent] = useState(() => {
    if (typeof window === "undefined") return defaultMainWidth;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = parseFloat(stored);
        if (
          !isNaN(parsed) &&
          parsed >= minMainWidth &&
          parsed <= maxMainWidth
        ) {
          return parsed;
        }
      }
    } catch {
      // localStorage may be unavailable in private browsing mode
    }
    return defaultMainWidth;
  });

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Persist width to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, mainWidthPercent.toString());
    } catch {
      // localStorage may be unavailable in private browsing mode
    }
  }, [mainWidthPercent, storageKey]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;
      const newPercent = (mouseX / containerWidth) * 100;

      // Clamp to min/max bounds
      const clampedPercent = Math.min(
        maxMainWidth,
        Math.max(minMainWidth, newPercent),
      );
      setMainWidthPercent(clampedPercent);
    },
    [isDragging, minMainWidth, maxMainWidth],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add/remove global mouse listeners when dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      // Prevent text selection while dragging
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Calculate the panel width in percentage
  const panelWidthPercent = 100 - mainWidthPercent;

  return (
    <div ref={containerRef} className="h-full flex flex-col overflow-hidden">
      {/* Header row - only renders when main header is provided */}
      {mainHeader && (
        <div className="flex-shrink-0 flex">
          {/* Main header - animates width */}
          <div
            className="flex-shrink-0 transition-[width] duration-300 ease-out overflow-hidden"
            style={{ width: isPanelOpen ? `${mainWidthPercent}%` : "100%" }}
          >
            {mainHeader}
          </div>

          {/* Spacer for resize handle */}
          {isPanelOpen && (
            <div className="w-1 flex-shrink-0 bg-base-300 border-b border-base-300" />
          )}

          {/* Side panel header in header row when main header exists */}
          {sidePanelHeader && isPanelOpen && (
            <div
              className="flex-shrink-0 bg-base-100 border-b border-base-300"
              style={{ width: `calc(${panelWidthPercent}% - 4px)` }}
            >
              {sidePanelHeader}
            </div>
          )}
        </div>
      )}

      {/* Content area - each panel scrolls independently */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main content - scrolls independently */}
        <div
          className="flex-shrink-0 overflow-y-auto transition-[width] duration-300 ease-out"
          style={{ width: isPanelOpen ? `${mainWidthPercent}%` : "100%" }}
        >
          {children}
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={handleMouseDown}
          className={`
            h-full w-1 cursor-col-resize flex-shrink-0 z-10
            bg-base-300 hover:bg-primary/50
            transition-all duration-300 ease-out
            ${isDragging ? "bg-primary" : ""}
            ${isPanelOpen ? "opacity-100" : "opacity-0 pointer-events-none w-0"}
          `}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
          tabIndex={isPanelOpen ? 0 : -1}
          aria-hidden={!isPanelOpen}
        >
          {/* Visual grip indicator */}
          <div className="h-full w-full flex items-center justify-center">
            <div
              className={`
                w-0.5 h-8 rounded-full
                ${isDragging ? "bg-primary-content" : "bg-base-content/20"}
              `}
            />
          </div>
        </div>

        {/* Side panel - scrolls independently */}
        <div
          className={`
            flex-shrink-0 bg-base-100 flex flex-col
            transition-all duration-300 ease-out
            ${isPanelOpen ? "opacity-100" : "opacity-0"}
          `}
          style={{
            width: isPanelOpen ? `calc(${panelWidthPercent}% - 4px)` : "0px",
          }}
          // Remove from tab order and accessibility tree when closed
          inert={!isPanelOpen ? true : undefined}
        >
          {/* Side panel header when no main header - stays fixed at top of panel */}
          {sidePanelHeader && !mainHeader && isPanelOpen && (
            <div className="flex-shrink-0 border-b border-base-300">
              {sidePanelHeader}
            </div>
          )}
          {/* Side panel content - scrolls independently */}
          <div
            className={`
              flex-1 overflow-y-auto
              transition-transform duration-300 ease-out
              ${isPanelOpen ? "translate-x-0" : "translate-x-8"}
            `}
            style={{
              width: `calc(${panelWidthPercent}vw - 4px)`,
              minWidth: "300px",
            }}
          >
            {sidePanel}
          </div>
        </div>
      </div>
    </div>
  );
}
