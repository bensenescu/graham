import type { BlockAwarenessUser } from "../hooks/useBlockCollaboration";

export interface BlockPresenceIndicatorProps {
  /** Users currently editing this block */
  users: BlockAwarenessUser[];
  /** Maximum number of avatars to show */
  maxAvatars?: number;
  /** Size of the avatars */
  size?: "sm" | "md" | "lg";
}

/**
 * Component that displays avatars of users currently editing a block
 */
export function BlockPresenceIndicator({
  users,
  maxAvatars = 3,
  size = "sm",
}: BlockPresenceIndicatorProps) {
  if (users.length === 0) return null;

  const visibleUsers = users.slice(0, maxAvatars);
  const overflowCount = users.length - maxAvatars;

  const sizeClasses = {
    sm: "w-5 h-5 text-[10px]",
    md: "w-6 h-6 text-xs",
    lg: "w-8 h-8 text-sm",
  };

  const sizeClass = sizeClasses[size];

  return (
    <div className="flex items-center -space-x-1">
      {visibleUsers.map((user) => (
        <div
          key={user.userId}
          className={`${sizeClass} rounded-full border-2 border-white flex items-center justify-center font-medium text-white`}
          style={{ backgroundColor: user.userColor }}
          title={`${user.userName} is editing`}
        >
          {getInitials(user.userName)}
        </div>
      ))}
      {overflowCount > 0 && (
        <div
          className={`${sizeClass} rounded-full border-2 border-white bg-gray-400 flex items-center justify-center font-medium text-white`}
          title={`${overflowCount} more users editing`}
        >
          +{overflowCount}
        </div>
      )}
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
