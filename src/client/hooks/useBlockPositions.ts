import { useState, useEffect, useCallback, type RefObject } from "react";

export interface BlockPosition {
  top: number; // Y offset from container top (not viewport)
  height: number; // Block height
}

/**
 * Hook to track the Y positions and heights of Q&A blocks within a scroll container.
 * Uses ResizeObserver to detect size changes and recalculates positions.
 *
 * @param containerRef - Ref to the scrollable container element
 * @param blockIds - Array of block IDs to track (in display order)
 * @returns Map of blockId -> { top, height }
 */
export function useBlockPositions(
  containerRef: RefObject<HTMLElement | null>,
  blockIds: string[],
): Map<string, BlockPosition> {
  const [positions, setPositions] = useState<Map<string, BlockPosition>>(
    () => new Map(),
  );

  const measurePositions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const newPositions = new Map<string, BlockPosition>();

    for (const blockId of blockIds) {
      const blockElement = container.querySelector(
        `[data-block-id="${blockId}"]`,
      );
      if (blockElement) {
        const blockRect = blockElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Calculate position relative to container's scroll position
        const top = blockRect.top - containerRect.top + container.scrollTop;
        const height = blockRect.height;

        newPositions.set(blockId, { top, height });
      }
    }

    setPositions(newPositions);
  }, [containerRef, blockIds]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial measurement
    measurePositions();

    // Set up ResizeObserver to watch for size changes
    const resizeObserver = new ResizeObserver(() => {
      measurePositions();
    });

    // Observe the container
    resizeObserver.observe(container);

    // Observe each block element
    for (const blockId of blockIds) {
      const blockElement = container.querySelector(
        `[data-block-id="${blockId}"]`,
      );
      if (blockElement) {
        resizeObserver.observe(blockElement);
      }
    }

    // Also measure on scroll (positions are relative to scroll)
    // Actually, we calculate relative to container top + scrollTop,
    // so scroll shouldn't affect the stored positions.
    // But we might want to re-measure if content changes.

    // Use MutationObserver to detect DOM changes
    const mutationObserver = new MutationObserver(() => {
      // Debounce the measurement
      requestAnimationFrame(measurePositions);
    });

    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [containerRef, blockIds, measurePositions]);

  return positions;
}

/**
 * Calculate positioned card tops with collision detection.
 * Cards are positioned to align with their corresponding blocks,
 * but pushed down if they would overlap the previous card.
 *
 * @param blocks - Array of blocks in display order
 * @param blockPositions - Map of block positions from useBlockPositions
 * @param minGap - Minimum gap between cards (default: 8px)
 * @returns Map of blockId -> calculated top position
 */
export function calculateCardPositions(
  blockIds: string[],
  blockPositions: Map<string, BlockPosition>,
  cardHeights: Map<string, number>,
  minGap: number = 8,
): Map<string, number> {
  const cardPositions = new Map<string, number>();
  let lastBottom = 0;

  for (const blockId of blockIds) {
    const blockPos = blockPositions.get(blockId);
    if (!blockPos) continue;

    // Ideal position: align with block top
    let cardTop = blockPos.top;

    // Collision check: push down if overlapping previous card
    if (cardTop < lastBottom + minGap) {
      cardTop = lastBottom + minGap;
    }

    cardPositions.set(blockId, cardTop);

    // Estimate card height (use measured height or fallback)
    const cardHeight = cardHeights.get(blockId) ?? 80;
    lastBottom = cardTop + cardHeight;
  }

  return cardPositions;
}
