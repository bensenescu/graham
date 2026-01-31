import type { ConnectionState } from "@/client/lib/PageCollabManager";

interface ConnectionStatusProps {
  connectionState: ConnectionState;
  onReconnect: () => void;
}

/**
 * Displays the connection status indicator for collaborative editing.
 */
export function ConnectionStatus({
  connectionState,
  onReconnect,
}: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-base-content/60 pt-2 h-6">
      {connectionState === "connected" ? (
        <span className="w-2 h-2 rounded-full bg-success" title="Online" />
      ) : connectionState === "connecting" ? (
        <>
          <span className="loading loading-spinner loading-xs" />
          <span>Syncing...</span>
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-warning" title="Offline" />
          <span>Offline</span>
          <button
            onClick={onReconnect}
            className="underline hover:text-base-content"
          >
            Reconnect
          </button>
        </>
      )}
    </div>
  );
}
