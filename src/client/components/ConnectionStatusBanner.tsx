import { useEffect, useState } from "react";
import { Wifi, WifiOff, Loader2, AlertCircle, X } from "lucide-react";
import type { ConnectionState } from "../hooks/useYjsWebSocket";

export interface ConnectionStatusBannerProps {
  /** Current connection state */
  connectionState: ConnectionState;
  /** Callback to manually reconnect */
  onReconnect?: () => void;
  /** Whether to auto-hide when connected */
  autoHide?: boolean;
  /** Delay before auto-hiding (ms) */
  autoHideDelay?: number;
}

/**
 * Banner component that shows the current WebSocket connection status
 *
 * - Shows warning when disconnected
 * - Shows "Reconnecting..." when attempting to reconnect
 * - Auto-dismisses when connected (optional)
 */
export function ConnectionStatusBanner({
  connectionState,
  onReconnect,
  autoHide = true,
  autoHideDelay = 2000,
}: ConnectionStatusBannerProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show/hide based on connection state
  useEffect(() => {
    if (connectionState === "connected") {
      // Auto-hide after delay when connected
      if (autoHide && visible) {
        const timeout = setTimeout(() => {
          setVisible(false);
        }, autoHideDelay);
        return () => clearTimeout(timeout);
      }
      // Reset dismissed state when reconnected
      setDismissed(false);
    } else {
      // Show banner when not connected (connecting, disconnected, or error)
      setVisible(true);
    }
  }, [connectionState, autoHide, autoHideDelay, visible]);

  // Don't show if connected and auto-hide is on, or if user dismissed
  if (!visible || (connectionState === "connected" && autoHide) || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
  };

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium ${getBackgroundClass(connectionState)}`}
    >
      {getIcon(connectionState)}
      <span>{getMessage(connectionState)}</span>
      {connectionState === "error" && onReconnect && (
        <button
          onClick={onReconnect}
          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-white transition-colors"
        >
          Retry
        </button>
      )}
      {connectionState === "disconnected" && onReconnect && (
        <button
          onClick={onReconnect}
          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
        >
          Reconnect
        </button>
      )}
      <button
        onClick={handleDismiss}
        className="ml-2 p-1 hover:bg-white/20 rounded transition-colors"
        title="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function getBackgroundClass(state: ConnectionState): string {
  switch (state) {
    case "connecting":
      return "bg-blue-500 text-white";
    case "connected":
      return "bg-green-500 text-white";
    case "disconnected":
      return "bg-yellow-500 text-yellow-900";
    case "error":
      return "bg-red-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
}

function getIcon(state: ConnectionState) {
  switch (state) {
    case "connecting":
      return <Loader2 className="w-4 h-4 animate-spin" />;
    case "connected":
      return <Wifi className="w-4 h-4" />;
    case "disconnected":
      return <WifiOff className="w-4 h-4" />;
    case "error":
      return <AlertCircle className="w-4 h-4" />;
    default:
      return null;
  }
}

function getMessage(state: ConnectionState): string {
  switch (state) {
    case "connecting":
      return "Connecting...";
    case "connected":
      return "Connected";
    case "disconnected":
      return "You're offline. Changes won't sync until reconnected.";
    case "error":
      return "Connection error. Changes may not sync.";
    default:
      return "Unknown connection state";
  }
}

/**
 * Inline connection indicator (smaller, for use in headers/toolbars)
 */
export function ConnectionIndicator({
  connectionState,
  onClick,
}: {
  connectionState: ConnectionState;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${getIndicatorClass(connectionState)}`}
      title={getIndicatorTitle(connectionState)}
    >
      {getSmallIcon(connectionState)}
      <span className="hidden sm:inline">{getShortMessage(connectionState)}</span>
    </button>
  );
}

function getIndicatorClass(state: ConnectionState): string {
  switch (state) {
    case "connecting":
      return "bg-blue-100 text-blue-700 hover:bg-blue-200";
    case "connected":
      return "bg-green-100 text-green-700 hover:bg-green-200";
    case "disconnected":
      return "bg-yellow-100 text-yellow-700 hover:bg-yellow-200";
    case "error":
      return "bg-red-100 text-red-700 hover:bg-red-200";
    default:
      return "bg-gray-100 text-gray-700 hover:bg-gray-200";
  }
}

function getSmallIcon(state: ConnectionState) {
  switch (state) {
    case "connecting":
      return <Loader2 className="w-3 h-3 animate-spin" />;
    case "connected":
      return <div className="w-2 h-2 rounded-full bg-green-500" />;
    case "disconnected":
      return <WifiOff className="w-3 h-3" />;
    case "error":
      return <AlertCircle className="w-3 h-3" />;
    default:
      return null;
  }
}

function getShortMessage(state: ConnectionState): string {
  switch (state) {
    case "connecting":
      return "Connecting";
    case "connected":
      return "Synced";
    case "disconnected":
      return "Offline";
    case "error":
      return "Error";
    default:
      return "Unknown";
  }
}

function getIndicatorTitle(state: ConnectionState): string {
  switch (state) {
    case "connecting":
      return "Connecting to collaboration server...";
    case "connected":
      return "Connected - all changes are syncing";
    case "disconnected":
      return "Disconnected - changes won't sync until reconnected";
    case "error":
      return "Connection error - click to retry";
    default:
      return "Unknown connection state";
  }
}
