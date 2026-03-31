/**
 * Thought Map layout utilities
 * Implements the radial tree layout algorithm for RFC-0003 §5.6
 *
 * Layout strategy:
 * - Topic node (depth 0) is always placed at (0, 0)
 * - First-level children (depth 1) are split into two hemispheres:
 *   the first half go LEFT (x = -HORIZONTAL_SPACING), the second half go RIGHT
 *   (x = +HORIZONTAL_SPACING). Each group is distributed vertically, centred at y=0.
 * - Deeper nodes (depth 2+) extend outward in the same horizontal direction as their
 *   root ancestor (left or right). x = parentX ± HORIZONTAL_SPACING.
 *   Children are distributed vertically, centred under their parent.
 * - Only nodes where `position.x === 0 && position.y === 0` AND `depth > 0` are
 *   repositioned (user-dragged positions are left untouched).
 */

import type { ThoughtMapNode } from '@/types/thought-map';

// ============================================================================
// Constants
// ============================================================================

/** Horizontal distance between each depth level */
export const HORIZONTAL_SPACING = 250;

/** Vertical distance between sibling nodes at the same depth */
export const VERTICAL_SPACING = 120;

/**
 * Vertical distance between ghost (suggestion) nodes sharing the same parent.
 * Ghost nodes are taller than real nodes (~130–150px with SUGGESTION header,
 * label, and Accept/Dismiss buttons), so they need more breathing room than
 * the standard VERTICAL_SPACING (120px).
 */
export const GHOST_VERTICAL_SPACING = 150;

/**
 * Horizontal offset from parent for ghost (suggestion) nodes.
 * Larger than HORIZONTAL_SPACING to clear the widest parent node (TopicNode
 * at max-w-[320px]). React Flow positions are top-left anchored, so an offset
 * of 360px provides ~40px clearance from a fully-expanded topic node.
 */
export const GHOST_HORIZONTAL_OFFSET = 360;

// ============================================================================
// Types
// ============================================================================

/** A computed x/y position for a single node */
export interface NodePosition {
  x: number;
  y: number;
}

// ============================================================================
// Main export
// ============================================================================

/**
 * Compute layout positions for all unpositioned nodes in a Thought Map.
 *
 * The topic node is always at (0, 0) and is never included in the output
 * (callers should treat it as fixed). Only nodes where both x === 0 and
 * y === 0 AND depth > 0 are assigned a position — all other nodes retain
 * their existing positions (set by the user via drag).
 *
 * @param nodes - All nodes in the thought map
 * @returns A record mapping each repositioned nodeId to its computed {x, y}
 *
 * @example
 * ```typescript
 * const positions = computeThoughtMapLayout(nodes);
 * const updated = nodes.map(n => ({
 *   ...n,
 *   position: positions[n.nodeId] ?? n.position,
 * }));
 * ```
 */
export function computeThoughtMapLayout(nodes: ThoughtMapNode[]): Record<string, NodePosition> {
  const result: Record<string, NodePosition> = {};

  // Only reposition nodes that sit at origin AND are not the topic (depth > 0)
  const needsLayout = (node: ThoughtMapNode): boolean =>
    node.depth > 0 && node.position.x === 0 && node.position.y === 0;

  // ---- Depth-1 nodes -------------------------------------------------------

  const depth1Nodes = nodes.filter((n) => n.depth === 1 && needsLayout(n));
  const depth1Total = depth1Nodes.length;

  // Split depth-1 nodes into left / right groups
  const leftBranches = depth1Nodes.filter((_, i) => hemisphereDirection(i, depth1Total) === -1);
  const rightBranches = depth1Nodes.filter((_, i) => hemisphereDirection(i, depth1Total) === 1);

  const leftYPositions = centredYPositions(leftBranches.length, 0);
  const rightYPositions = centredYPositions(rightBranches.length, 0);

  leftBranches.forEach((node, i) => {
    result[node.nodeId] = { x: -HORIZONTAL_SPACING, y: leftYPositions[i] };
  });

  rightBranches.forEach((node, i) => {
    result[node.nodeId] = { x: HORIZONTAL_SPACING, y: rightYPositions[i] };
  });

  // ---- Deeper nodes (depth >= 2) -------------------------------------------
  // Process depth by depth so parent positions are resolved before children.

  const maxDepth = nodes.reduce((max, n) => Math.max(max, n.depth), 0);

  for (let depth = 2; depth <= maxDepth; depth++) {
    const depthNodes = nodes.filter((n) => n.depth === depth && needsLayout(n));

    // Group by parent
    const byParent = new Map<string, ThoughtMapNode[]>();
    for (const node of depthNodes) {
      if (!node.parentNodeId) {
        continue;
      }
      const siblings = byParent.get(node.parentNodeId) ?? [];
      siblings.push(node);
      byParent.set(node.parentNodeId, siblings);
    }

    for (const [parentNodeId, children] of byParent.entries()) {
      // Resolve the parent's position: check result map first, then the nodes array
      const parentFromResult = result[parentNodeId];
      const parentFromNodes = nodes.find((n) => n.nodeId === parentNodeId);

      const parentX =
        parentFromResult?.x ??
        (parentFromNodes && !(parentFromNodes.position.x === 0 && parentFromNodes.position.y === 0)
          ? parentFromNodes.position.x
          : undefined);

      const parentY =
        parentFromResult?.y ??
        (parentFromNodes && !(parentFromNodes.position.x === 0 && parentFromNodes.position.y === 0)
          ? parentFromNodes.position.y
          : undefined);

      if (parentX === undefined || parentY === undefined) {
        // Parent position unknown — skip for this depth, may be resolved later
        continue;
      }

      // Extend horizontally in the same direction as the parent
      const direction: -1 | 1 = parentX < 0 ? -1 : 1;
      const childX = parentX + direction * HORIZONTAL_SPACING;

      const yPositions = centredYPositions(children.length, parentY);

      children.forEach((child, i) => {
        result[child.nodeId] = { x: childX, y: yPositions[i] };
      });
    }
  }

  return result;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Compute vertical positions for a group of siblings, centred around a given y value.
 *
 * @param count - Number of siblings
 * @param centreY - The y-coordinate to centre the group around
 * @param spacing - Vertical spacing between siblings (defaults to VERTICAL_SPACING)
 * @returns Array of y-values for each sibling
 */
export function centredYPositions(
  count: number,
  centreY: number,
  spacing: number = VERTICAL_SPACING
): number[] {
  if (count === 0) {
    return [];
  }
  if (count === 1) {
    return [centreY];
  }

  const totalHeight = (count - 1) * spacing;
  const startY = centreY - totalHeight / 2;

  return Array.from({ length: count }, (_, i) => startY + i * spacing);
}

/**
 * Determine the direction (left or right) for a depth-1 node at a given index
 * among all depth-1 nodes.
 *
 * First half → LEFT, second half (including the middle when odd) → RIGHT.
 *
 * @param index - Zero-based index among depth-1 siblings
 * @param total - Total number of depth-1 siblings
 * @returns -1 for left, +1 for right
 */
function hemisphereDirection(index: number, total: number): -1 | 1 {
  return index < Math.ceil(total / 2) ? -1 : 1;
}
