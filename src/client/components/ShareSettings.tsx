import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { X, UserPlus, Users, ChevronDown } from "lucide-react";
import { usePageSharing } from "@/client/hooks/usePageSharing";

interface ShareSettingsProps {
  pageId: string;
}

/**
 * Component for managing page collaborators in the Settings tab.
 * Only visible to page owners.
 */
export function ShareSettings({ pageId }: ShareSettingsProps) {
  const {
    isOwner,
    shares,
    workspaceUsers,
    isLoading,
    addCollaborators,
    removeCollaborator,
    isAddingShares,
    isRemovingShare,
  } = usePageSharing(pageId);

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Filter out users who are already collaborators
  const availableUsers = useMemo(() => {
    const sharedUserIds = new Set(shares.map((s) => s.userId));
    return workspaceUsers.filter((u) => !sharedUserIds.has(u.id));
  }, [workspaceUsers, shares]);

  // Handle adding selected users
  const handleAddCollaborators = useCallback(async () => {
    if (selectedUserIds.length === 0) return;

    await addCollaborators(selectedUserIds);
    setSelectedUserIds([]);
    setIsDropdownOpen(false);
  }, [selectedUserIds, addCollaborators]);

  // Handle removing a collaborator
  const handleRemoveCollaborator = useCallback(
    async (userId: string) => {
      await removeCollaborator(userId);
    },
    [removeCollaborator],
  );

  // Toggle user selection
  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  }, []);

  // Don't show for non-owners
  if (!isOwner) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-base-content mb-2 block">
          Sharing
        </label>
        <div className="flex items-center justify-center py-4">
          <span className="loading loading-spinner loading-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-base-content block">
        Sharing
      </label>

      {/* Add collaborators section */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={availableUsers.length === 0}
          className={`
            inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all
            ${
              availableUsers.length === 0
                ? "text-base-content/40 border-base-content/10 cursor-not-allowed"
                : "text-base-content border-base-content/20 hover:border-base-content/40 hover:bg-base-200"
            }
          `}
        >
          <UserPlus className="h-4 w-4" />
          <span>
            {availableUsers.length === 0
              ? "No users available"
              : "Add collaborators"}
          </span>
          {availableUsers.length > 0 && (
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
            />
          )}
        </button>

        {/* Dropdown menu */}
        {isDropdownOpen && availableUsers.length > 0 && (
          <div className="absolute left-0 top-full mt-2 z-50 min-w-[260px] max-w-[320px] bg-base-300 rounded-xl shadow-2xl ring-1 ring-base-content/10 overflow-hidden">
            <div className="max-h-48 overflow-y-auto py-1">
              {availableUsers.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-base-content/5 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                  />
                  <span className="text-sm text-base-content truncate">
                    {user.email}
                  </span>
                </label>
              ))}
            </div>

            {selectedUserIds.length > 0 && (
              <div className="p-3 border-t border-base-content/10">
                <button
                  type="button"
                  onClick={handleAddCollaborators}
                  disabled={isAddingShares}
                  className="btn btn-primary btn-sm w-full"
                >
                  {isAddingShares ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    `Add ${selectedUserIds.length} collaborator${selectedUserIds.length > 1 ? "s" : ""}`
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current collaborators list */}
      {shares.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-base-content/50">
            <Users className="h-3.5 w-3.5" />
            <span>Collaborators ({shares.length})</span>
          </div>
          <div className="space-y-1">
            {shares.map((share) => (
              <div
                key={share.userId}
                className="group flex items-center justify-between py-2 px-3 bg-base-200/50 hover:bg-base-200 rounded-lg transition-colors"
              >
                <span className="text-sm truncate">{share.userEmail}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCollaborator(share.userId)}
                  disabled={isRemovingShare}
                  className="opacity-0 group-hover:opacity-100 btn btn-ghost btn-xs btn-square text-base-content/40 hover:text-error transition-opacity"
                  aria-label={`Remove ${share.userEmail}`}
                >
                  {isRemovingShare ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <X className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {shares.length === 0 && availableUsers.length > 0 && (
        <p className="text-xs text-base-content/40">
          Add collaborators to give them full access to edit this page.
        </p>
      )}
    </div>
  );
}
