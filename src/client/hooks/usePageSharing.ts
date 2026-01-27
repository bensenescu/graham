import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPageShares,
  addPageShares,
  removePageShare,
  getWorkspaceUsers,
  checkPageAccess,
} from "@/serverFunctions/pageShares";

/**
 * Hook for managing page sharing (collaborators).
 */
export function usePageSharing(pageId: string) {
  const queryClient = useQueryClient();

  // Check if current user is the owner
  const { data: accessData, isLoading: isLoadingAccess } = useQuery({
    queryKey: ["pageAccess", pageId],
    queryFn: () => checkPageAccess({ data: { pageId } }),
  });

  const isOwner = accessData?.isOwner ?? false;
  const hasAccess = accessData?.hasAccess ?? false;

  // Get current shares for this page (only if owner)
  const {
    data: sharesData,
    isLoading: isLoadingShares,
    refetch: refetchShares,
  } = useQuery({
    queryKey: ["pageShares", pageId],
    queryFn: () => getPageShares({ data: { pageId } }),
    enabled: isOwner,
  });

  const shares = sharesData?.shares ?? [];

  // Get all workspace users (for the dropdown)
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ["workspaceUsers"],
    queryFn: () => getWorkspaceUsers(),
    enabled: isOwner,
  });

  const workspaceUsers = usersData?.users ?? [];

  // Add shares mutation
  const addSharesMutation = useMutation({
    mutationFn: (userIds: string[]) =>
      addPageShares({ data: { pageId, userIds } }),
    onSuccess: () => {
      refetchShares();
    },
  });

  // Remove share mutation
  const removeShareMutation = useMutation({
    mutationFn: (userId: string) =>
      removePageShare({ data: { pageId, userId } }),
    onSuccess: () => {
      refetchShares();
    },
  });

  // Actions
  const addCollaborators = useCallback(
    async (userIds: string[]) => {
      await addSharesMutation.mutateAsync(userIds);
    },
    [addSharesMutation],
  );

  const removeCollaborator = useCallback(
    async (userId: string) => {
      await removeShareMutation.mutateAsync(userId);
    },
    [removeShareMutation],
  );

  const isLoading = isLoadingAccess || isLoadingShares || isLoadingUsers;
  const isAddingShares = addSharesMutation.isPending;
  const isRemovingShare = removeShareMutation.isPending;

  return {
    // Access info
    isOwner,
    hasAccess,

    // Data
    shares,
    workspaceUsers,
    isLoading,

    // Actions
    addCollaborators,
    removeCollaborator,

    // Loading states
    isAddingShares,
    isRemovingShare,
  };
}
