import { useState, useCallback, useMemo, useRef } from "react";
import { useLiveQuery } from "@tanstack/react-db";
import type { PageOverallReview } from "@/types/schemas/reviews";
import type { PageBlock } from "@/types/schemas/pages";
import { authenticatedFetch } from "@every-app/sdk/core";
import { createPageOverallReviewCollection } from "@/client/tanstack-db";

interface UseOverallReviewOptions {
  pageId: string;
  blocks: PageBlock[];
  customInstructions?: string;
}

/**
 * Hook for managing overall page review state and operations.
 * Provides a holistic narrative review of all answers combined with streaming support.
 */
export function useOverallReview({
  pageId,
  blocks,
  customInstructions,
}: UseOverallReviewOptions) {
  // Create the collection for this page
  const reviewCollection = useMemo(
    () => createPageOverallReviewCollection(pageId),
    [pageId],
  );

  // Get the overall review from the collection
  const { data: reviewsArray, isLoading: isLoadingReview } = useLiveQuery((q) =>
    q.from({ review: reviewCollection }),
  );

  // Get the single overall review (or null if none exists)
  const overallReview: PageOverallReview | null = useMemo(() => {
    return reviewsArray?.[0] ?? null;
  }, [reviewsArray]);

  // Use a ref to always have access to the latest overallReview in callbacks
  const overallReviewRef = useRef(overallReview);
  overallReviewRef.current = overallReview;

  // Track loading/streaming state
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Abort controller ref for cancelling streams
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generate or regenerate the overall review with streaming
  const generateOverallReview = useCallback(
    async (
      promptId: string | null = null,
      customPrompt: string | null = null,
    ) => {
      // Cancel any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setIsGenerating(true);
      setStreamingText("");
      setError(null);

      try {
        // Build custom instructions from the prompt if provided
        const instructions = customPrompt || customInstructions;

        const response = await authenticatedFetch("/api/overall-review", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pageId,
            blocks: blocks.map((b) => ({
              question: b.question,
              answer: b.answer || "",
            })),
            customInstructions: instructions,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            errorData.error || `Overall review failed: ${response.status}`,
          );
        }

        // Read the streaming response
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // Decode the chunk and append to full text
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setStreamingText(fullText);
        }

        // Streaming complete - save to database
        const now = new Date().toISOString();
        const currentReview = overallReviewRef.current;

        if (currentReview) {
          // Update existing review
          reviewCollection.update(currentReview.id, (draft) => {
            draft.promptId = promptId;
            draft.customPrompt = customPrompt;
            draft.summary = fullText;
            draft.updatedAt = now;
          });
        } else {
          // Insert new review
          const reviewId = crypto.randomUUID();
          reviewCollection.insert({
            id: reviewId,
            pageId,
            promptId,
            customPrompt,
            summary: fullText,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Clear streaming text now that it's saved
        setStreamingText(null);
        setIsGenerating(false);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Failed to generate review",
        );
        setStreamingText(null);
        setIsGenerating(false);
      }
    },
    [pageId, blocks, customInstructions, reviewCollection],
  );

  // Stop the current generation
  const stopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setStreamingText(null);
  }, []);

  // Check if there are any answers to review
  const hasAnswers = useMemo(() => {
    return blocks.some((b) => b.answer && b.answer.trim().length > 0);
  }, [blocks]);

  // The displayed text is either the streaming text (while generating) or the saved review
  const displayText = streamingText ?? overallReview?.summary ?? null;

  return {
    overallReview,
    isLoading: isLoadingReview,
    isGenerating,
    streamingText,
    displayText,
    error,
    hasAnswers,
    generateOverallReview,
    stopGenerating,
  };
}
