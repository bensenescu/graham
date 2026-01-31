import { useQuery } from "@tanstack/react-query";
import {
  getPracticeCriteria,
  getPracticePool,
  getIncompleteSession,
  getLastPracticeDate,
  getPracticeBlockStats,
} from "@/serverFunctions/practice";
import type { PracticeSessionWithAnswers } from "./types";

interface UsePracticeQueriesOptions {
  pageId: string;
  isOpen: boolean;
}

/**
 * Hook for fetching practice-related data.
 */
export function usePracticeQueries({
  pageId,
  isOpen,
}: UsePracticeQueriesOptions) {
  // Fetch criteria
  const { data: criteriaData, refetch: refetchCriteria } = useQuery({
    queryKey: ["practice-criteria"],
    queryFn: () => getPracticeCriteria(),
  });

  // Fetch practice pool
  const { data: poolData, refetch: refetchPool } = useQuery({
    queryKey: ["practice-pool", pageId],
    queryFn: () => getPracticePool({ data: { pageId } }),
    enabled: !!pageId,
  });

  // Fetch incomplete session
  const { data: incompleteData, isLoading: isLoadingIncomplete } = useQuery({
    queryKey: ["practice-incomplete-session", pageId],
    queryFn: () => getIncompleteSession({ data: { pageId } }),
    enabled: !!pageId && isOpen,
  });

  // Fetch last practice date
  const { data: lastPracticeDateData } = useQuery({
    queryKey: ["practice-last-date", pageId],
    queryFn: () => getLastPracticeDate({ data: { pageId } }),
    enabled: !!pageId,
  });

  // Fetch block stats
  const { data: statsData } = useQuery({
    queryKey: ["practice-block-stats", pageId],
    queryFn: () => getPracticeBlockStats({ data: { pageId } }),
    enabled: !!pageId,
  });

  // Derived state
  const criteria = criteriaData?.criteria ?? [];
  const poolBlockIds = poolData?.blockIds ?? [];
  const lastPracticeDate = lastPracticeDateData?.lastPracticeDate ?? null;
  const incompleteSession =
    (incompleteData?.session as PracticeSessionWithAnswers | null) ?? null;
  const isLoading = isLoadingIncomplete;
  const blockStats = statsData?.stats ?? [];

  return {
    criteria,
    poolBlockIds,
    lastPracticeDate,
    incompleteSession,
    isLoading,
    blockStats,
    refetchCriteria,
    refetchPool,
  };
}
