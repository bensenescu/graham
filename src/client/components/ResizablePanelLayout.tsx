import {
  useState,
  useCallback,
  useRef,
  useEffect,
  forwardRef,
  type ReactNode,
} from "react";
import { Sparkles } from "lucide-react";

interface ResizablePanelLayoutProps {
  /** Main content (left side) */
  children: ReactNode;
  /** Side panel content (right side) */
  sidePanel: ReactNode;
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
 * Uses a single scroll container so both panels scroll together (1:1 sync).
 * Width preference is persisted to localStorage.
 */
export const ResizablePanelLayout = forwardRef<
  HTMLDivElement,
  ResizablePanelLayoutProps
>(function ResizablePanelLayout(
  {
    children,
    sidePanel,
    isPanelOpen,
    onPanelClose,
    onPanelOpen,
    storageKey = "panel-width",
    minMainWidth = 33,
    maxMainWidth = 66,
    defaultMainWidth = 50,
  },
  ref,
) {
  // Load initial width from localStorage or use default
  const [mainWidthPercent, setMainWidthPercent] = useState(() => {
    if (typeof window === "undefined") return defaultMainWidth;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed >= minMainWidth && parsed <= maxMainWidth) {
        return parsed;
      }
    }
    return defaultMainWidth;
  });

  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Persist width to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, mainWidthPercent.toString());
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
      {/* Single scroll container for both panels */}
      <div ref={ref} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex min-h-full">
          {/* Main content - animates width */}
          <div
            className="flex-shrink-0 transition-[width] duration-300 ease-out"
            style={{ width: isPanelOpen ? `${mainWidthPercent}%` : "100%" }}
          >
            {children}
          </div>

          {/* Resize handle - sticky to viewport, fades in/out */}
          <div
            onMouseDown={handleMouseDown}
            className={`
              sticky top-0 h-screen w-1 cursor-col-resize flex-shrink-0 z-10
              bg-base-300 hover:bg-primary/50
              transition-all duration-300 ease-out
              ${isDragging ? "bg-primary" : ""}
              ${isPanelOpen ? "opacity-100" : "opacity-0 pointer-events-none"}
            `}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panel"
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

          {/* Side panel - slides in/out from right */}
          <div
            className={`
              flex-shrink-0 bg-base-100 border-l border-base-300
              transition-all duration-300 ease-out
              ${isPanelOpen ? "opacity-100" : "opacity-0"}
            `}
            style={{
              width: isPanelOpen ? `calc(${panelWidthPercent}% - 4px)` : "0px",
            }}
          >
            <div
              className={`
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

      {/* Edge trigger tab to open panel - only shows when closed */}
      {onPanelOpen && (
        <button
          onClick={onPanelOpen}
          className={`
            fixed right-0 top-20 z-20
            w-6 h-24 
            bg-base-300 hover:bg-primary hover:w-8
            border-l border-t border-b border-base-content/10
            rounded-l-lg
            flex items-center justify-center
            transition-all duration-300 ease-out
            group
            shadow-lg
            ${isPanelOpen ? "opacity-0 pointer-events-none translate-x-full" : "opacity-100 translate-x-0"}
          `}
          aria-label="Open review panel"
        >
          <Sparkles className="h-4 w-4 text-base-content/60 group-hover:text-primary-content transition-colors" />
        </button>
      )}
    </div>
  );
});
