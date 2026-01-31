/**
 * Date and time formatting utilities.
 */

/**
 * Formats a date string as a relative time (e.g., "5 hours ago", "2 days ago").
 * Falls back to locale date for dates older than 7 days.
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

/**
 * Formats a duration in milliseconds as "Xm Ys" format.
 */
export function formatDuration(durationMs: number): string {
  const mins = Math.floor(durationMs / 60000);
  const secs = Math.floor((durationMs % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

/**
 * Formats a date string as a short date with time (e.g., "Jan 15, 3:45 PM").
 */
export function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
