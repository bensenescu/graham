import { Users } from "lucide-react";
import type { PagePresenceUser } from "../hooks/usePageCollaboration";

export interface PagePresenceIndicatorProps {
  /** Users currently on this page */
  users: PagePresenceUser[];
  /** Maximum number of avatars to show in expanded view */
  maxAvatars?: number;
  /** Whether to show in compact mode */
  compact?: boolean;
}

/**
 * Component that displays users currently viewing/editing the page
 */
export function PagePresenceIndicator({
  users,
  maxAvatars = 5,
  compact = false,
}: PagePresenceIndicatorProps) {
  if (users.length === 0) return null;

  const visibleUsers = users.slice(0, maxAvatars);
  const overflowCount = users.length - maxAvatars;

  if (compact) {
    return (
      <div
        className="flex items-center gap-1.5 text-sm text-gray-500"
        title={users.map((u) => u.userName).join(", ")}
      >
        <Users className="w-4 h-4" />
        <span>{users.length}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => (
          <div
            key={user.userId}
            className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white shadow-sm"
            style={{ backgroundColor: user.userColor }}
            title={`${user.userName}${user.activeBlockId ? " (editing)" : ""}`}
          >
            {getInitials(user.userName)}
          </div>
        ))}
        {overflowCount > 0 && (
          <div
            className="w-7 h-7 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-xs font-medium text-white shadow-sm"
            title={`${overflowCount} more users`}
          >
            +{overflowCount}
          </div>
        )}
      </div>
      <span className="text-sm text-gray-500">
        {users.length === 1 ? "1 person" : `${users.length} people`} editing
      </span>
    </div>
  );
}

/**
 * Compact version that shows just the count
 */
export function PagePresenceCount({ users }: { users: PagePresenceUser[] }) {
  if (users.length === 0) return null;

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
      title={users.map((u) => u.userName).join(", ")}
    >
      <Users className="w-3 h-3" />
      <span>{users.length}</span>
    </div>
  );
}

/**
 * Get initials from a name
 */
function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
