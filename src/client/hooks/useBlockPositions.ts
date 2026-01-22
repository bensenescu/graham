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

/**
 * Calculate extra bottom spacing needed for Q&A blocks to align with review cards.
 * When a review card is taller than its corresponding Q&A block, the Q&A block
 * needs extra bottom spacing so the next block starts below the review card.
 *
 * IMPORTANT: This function assumes blockPositions are CURRENT measured positions
 * (which may already include previously applied spacing). It calculates what
 * ADDITIONAL spacing (if any) each block needs based on current state.
 *
 * @param blockIds - Array of block IDs in display order
 * @param blockPositions - Map of CURRENT block positions from useBlockPositions
 * @param cardHeights - Map of measured review card heights
 * @param minGap - Minimum gap between elements (default: 8px)
 * @returns Map of blockId -> extra bottom spacing needed
 */
export function calculateBlockSpacing(
  blockIds: string[],
  blockPositions: Map<string, BlockPosition>,
  cardHeights: Map<string, number>,
  minGap: number = 8,
): Map<string, number> {
  const blockSpacing = new Map<string, number>();

  // First pass: calculate where cards end up with collision detection
  // Cards try to align with block tops but may be pushed down if they'd overlap
  const cardPositions = new Map<string, number>();
  let lastCardBottom = 0;

  for (const blockId of blockIds) {
    const blockPos = blockPositions.get(blockId);
    if (!blockPos) continue;

    // Card tries to align with block top, but can't overlap previous card
    const cardTop = Math.max(blockPos.top, lastCardBottom + minGap);
    cardPositions.set(blockId, cardTop);

    const cardHeight = cardHeights.get(blockId) ?? 0;
    if (cardHeight > 0) {
      lastCardBottom = cardTop + cardHeight;
    }
  }

  // Second pass: calculate spacing needed for each block
  for (let i = 0; i < blockIds.length; i++) {
    const blockId = blockIds[i];
    const blockPos = blockPositions.get(blockId);

    if (!blockPos) {
      blockSpacing.set(blockId, 0);
      continue;
    }

    const cardTop = cardPositions.get(blockId);
    const cardHeight = cardHeights.get(blockId);

    if (cardTop === undefined || cardHeight === undefined || cardHeight === 0) {
      blockSpacing.set(blockId, 0);
      continue;
    }

    const blockBottom = blockPos.top + blockPos.height;
    const cardBottom = cardTop + cardHeight;

    // If card extends below block, we need spacing
    // But we also need to check: will the next block start below our card?
    const nextBlockId = blockIds[i + 1];
    const nextBlockPos = nextBlockId
      ? blockPositions.get(nextBlockId)
      : undefined;

    if (nextBlockPos) {
      // Next block already exists at some position
      // If next block is above where it should be (card bottom + gap), add spacing
      const idealNextTop = cardBottom + minGap;
      if (nextBlockPos.top < idealNextTop) {
        blockSpacing.set(blockId, idealNextTop - nextBlockPos.top);
      } else {
        blockSpacing.set(blockId, 0);
      }
    } else {
      // No next block, just ensure card fits
      const extraSpacing = Math.max(0, cardBottom - blockBottom + minGap);
      blockSpacing.set(blockId, extraSpacing);
    }
  }

  return blockSpacing;
}

/**
 * Calculate card positions with collision detection.
 * Cards align with their block tops, but are pushed down if they'd overlap previous cards.
 *
 * @param blockIds - Array of block IDs in display order
 * @param blockPositions - Map of CURRENT block positions
 * @param cardHeights - Map of measured review card heights
 * @param minGap - Minimum gap between cards (default: 8px)
 * @returns Map of blockId -> card top position
 */
export function calculateAdjustedCardPositions(
  blockIds: string[],
  blockPositions: Map<string, BlockPosition>,
  cardHeights: Map<string, number>,
  minGap: number = 8,
): Map<string, number> {
  const cardPositions = new Map<string, number>();
  let lastCardBottom = 0;

  for (const blockId of blockIds) {
    const blockPos = blockPositions.get(blockId);
    if (!blockPos) continue;

    // Card tries to align with block top, but can't overlap previous card
    const cardTop = Math.max(blockPos.top, lastCardBottom + minGap);
    cardPositions.set(blockId, cardTop);

    const cardHeight = cardHeights.get(blockId) ?? 0;
    if (cardHeight > 0) {
      lastCardBottom = cardTop + cardHeight;
    }
  }

  return cardPositions;
}
