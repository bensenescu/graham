import { useState, useCallback, useMemo } from "react";
import type { AIReview, ReviewSummary, Grade } from "@/types/schemas/reviews";
import type { PageBlock } from "@/types/schemas/pages";

/**
 * Mock review generator for development.
 * In production, this would call an AI API.
 */
async function generateMockReview(
  block: PageBlock,
): Promise<Omit<AIReview, "id" | "blockId" | "createdAt">> {
  // Simulate API delay
  await new Promise((resolve) =>
    setTimeout(resolve, 1000 + Math.random() * 1500),
  );

  // If no answer, return low score
  if (!block.answer || block.answer.trim().length < 10) {
    return {
      grade: "D",
      score: 35,
      strengths: [],
      improvements: ["Answer is too short or missing"],
      tips: ["Provide a detailed response to this question"],
      status: "completed",
    };
  }

  // Generate mock feedback based on answer length and content
  const answerLength = block.answer.length;
  const hasNumbers = /\d/.test(block.answer);
  const hasSpecificDetails = answerLength > 100;

  let score = 60;
  const strengths: string[] = [];
  const improvements: string[] = [];
  const tips: string[] = [];

  if (answerLength > 200) {
    score += 15;
    strengths.push("Provides comprehensive detail");
  } else if (answerLength > 100) {
    score += 8;
    strengths.push("Good level of detail");
  } else {
    improvements.push("Consider adding more detail");
  }

  if (hasNumbers) {
    score += 10;
    strengths.push("Includes specific metrics or numbers");
  } else {
    tips.push("Consider adding specific numbers or metrics");
  }

  if (hasSpecificDetails) {
    score += 5;
    strengths.push("Contains specific examples");
  }

  // Random variations
  score += Math.floor(Math.random() * 10) - 5;
  score = Math.max(0, Math.min(100, score));

  // Determine grade
  let grade: Grade;
  if (score >= 90) grade = "A";
  else if (score >= 80) grade = "B";
  else if (score >= 70) grade = "C";
  else if (score >= 60) grade = "D";
  else grade = "F";

  // Add some generic tips
  if (tips.length === 0 && Math.random() > 0.5) {
    tips.push("YC values concise, specific answers");
  }

  return {
    grade,
    score,
    strengths,
    improvements,
    tips,
    status: "completed",
    model: "mock-gpt-4",
  };
}

/**
 * Calculate overall summary from individual reviews
 */
function calculateSummary(
  pageId: string,
  reviews: Map<string, AIReview>,
  totalBlocks: number,
): ReviewSummary | null {
  const completedReviews = Array.from(reviews.values()).filter(
    (r) => r.status === "completed",
  );

  if (completedReviews.length === 0) return null;

  const avgScore = Math.round(
    completedReviews.reduce((sum, r) => sum + r.score, 0) /
      completedReviews.length,
  );

  let overallGrade: Grade;
  if (avgScore >= 90) overallGrade = "A";
  else if (avgScore >= 80) overallGrade = "B";
  else if (avgScore >= 70) overallGrade = "C";
  else if (avgScore >= 60) overallGrade = "D";
  else overallGrade = "F";

  return {
    pageId,
    overallGrade,
    overallScore: avgScore,
    reviewedCount: completedReviews.length,
    totalCount: totalBlocks,
    updatedAt: new Date().toISOString(),
  };
}

interface UseAIReviewOptions {
  pageId: string;
  blocks: PageBlock[];
}

/**
 * Hook for managing AI review state and operations.
 */
export function useAIReview({ pageId, blocks }: UseAIReviewOptions) {
  const [reviews, setReviews] = useState<Map<string, AIReview>>(new Map());
  const [isReviewingAll, setIsReviewingAll] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Calculate summary
  const summary = useMemo(
    () => calculateSummary(pageId, reviews, blocks.length),
    [pageId, reviews, blocks.length],
  );

  // Review a single block
  const reviewBlock = useCallback(
    async (blockId: string) => {
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;

      // Set loading state
      setReviews((prev) => {
        const next = new Map(prev);
        next.set(blockId, {
          id: crypto.randomUUID(),
          blockId,
          grade: "C",
          score: 0,
          strengths: [],
          improvements: [],
          status: "loading",
          createdAt: new Date().toISOString(),
        });
        return next;
      });

      // Open panel and focus on this block
      setIsPanelOpen(true);
      setActiveBlockId(blockId);

      try {
        const result = await generateMockReview(block);

        setReviews((prev) => {
          const next = new Map(prev);
          next.set(blockId, {
            id: crypto.randomUUID(),
            blockId,
            ...result,
            createdAt: new Date().toISOString(),
          });
          return next;
        });
      } catch (error) {
        setReviews((prev) => {
          const next = new Map(prev);
          next.set(blockId, {
            id: crypto.randomUUID(),
            blockId,
            grade: "F",
            score: 0,
            strengths: [],
            improvements: [],
            status: "error",
            error: error instanceof Error ? error.message : "Review failed",
            createdAt: new Date().toISOString(),
          });
          return next;
        });
      }
    },
    [blocks],
  );

  // Review all blocks
  const reviewAll = useCallback(async () => {
    setIsReviewingAll(true);
    setIsPanelOpen(true);

    // Review blocks sequentially with some parallelism
    const batchSize = 3;
    for (let i = 0; i < blocks.length; i += batchSize) {
      const batch = blocks.slice(i, i + batchSize);
      await Promise.all(batch.map((block) => reviewBlock(block.id)));
    }

    setIsReviewingAll(false);
  }, [blocks, reviewBlock]);

  // Open panel
  const openPanel = useCallback(() => {
    setIsPanelOpen(true);
  }, []);

  // Close panel
  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  // Set active block (for bi-directional sync)
  const setActiveBlock = useCallback((blockId: string | null) => {
    setActiveBlockId(blockId);
  }, []);

  return {
    reviews,
    summary,
    isPanelOpen,
    isReviewingAll,
    activeBlockId,
    reviewBlock,
    reviewAll,
    openPanel,
    closePanel,
    setActiveBlock,
  };
}
