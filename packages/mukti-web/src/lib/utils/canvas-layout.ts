/**
 * Canvas layout utilities for generating node positions
 * Implements radial layout algorithm for Thinking Canvas visualization
 */

import type {
  CanvasEdge,
  CanvasNode,
  LayoutConfig,
  RootNodeData,
  SeedNodeData,
  SoilNodeData,
} from '@/types/canvas-visualization.types';
import type { ProblemStructure } from '@/types/canvas.types';

import { DEFAULT_LAYOUT } from '@/types/canvas-visualization.types';

// ============================================================================
// Node ID Constants and Helpers
// ============================================================================

/**
 * Constant ID for the central Seed node
 */
export const SEED_NODE_ID = 'seed';

// ============================================================================
// Layout Types
// ============================================================================

/**
 * Result of layout generation containing nodes and edges
 */
export interface LayoutResult {
  edges: CanvasEdge[];
  nodes: CanvasNode[];
}

// ============================================================================
// Layout Generation
// ============================================================================

/**
 * Generates initial node positions using radial layout algorithm
 *
 * Layout strategy:
 * - Seed node at center position
 * - Soil nodes arranged in left arc (upper-left to lower-left)
 * - Root nodes arranged in right arc (upper-right to lower-right)
 *
 * @param problemStructure - The problem structure containing seed, soil, and roots
 * @param config - Layout configuration (defaults to DEFAULT_LAYOUT)
 * @returns Object containing positioned nodes and connecting edges
 *
 * @example
 * ```typescript
 * const { nodes, edges } = generateLayout({
 *   seed: 'How do I improve performance?',
 *   soil: ['Limited budget', 'Legacy codebase'],
 *   roots: ['Caching is always the answer', 'More servers = better']
 * });
 * ```
 */
export function generateLayout(
  problemStructure: ProblemStructure,
  config: LayoutConfig = DEFAULT_LAYOUT
): LayoutResult {
  const nodes: CanvasNode[] = [];
  const edges: CanvasEdge[] = [];

  // Create Seed node at center
  const seedNodeData: SeedNodeData = {
    isExplored: false,
    label: problemStructure.seed,
  };

  nodes.push({
    data: seedNodeData,
    id: SEED_NODE_ID,
    position: { x: config.centerX, y: config.centerY },
    type: 'seed',
  });

  // Create Soil nodes in left arc
  const soilCount = problemStructure.soil.length;
  if (soilCount > 0) {
    const soilAngleStep =
      soilCount === 1 ? 0 : (config.soilEndAngle - config.soilStartAngle) / (soilCount - 1);

    problemStructure.soil.forEach((item, index) => {
      const angle =
        soilCount === 1
          ? (config.soilStartAngle + config.soilEndAngle) / 2 // Center single node
          : config.soilStartAngle + index * soilAngleStep;

      const nodeId = getSoilNodeId(index);

      const soilNodeData: SoilNodeData = {
        index,
        isExplored: false,
        label: item,
      };

      nodes.push({
        data: soilNodeData,
        id: nodeId,
        position: {
          x: config.centerX + Math.cos(angle) * config.soilRadius,
          y: config.centerY + Math.sin(angle) * config.soilRadius,
        },
        type: 'soil',
      });

      edges.push({
        id: `edge-seed-${nodeId}`,
        source: SEED_NODE_ID,
        target: nodeId,
      });
    });
  }

  // Create Root nodes in right arc
  const rootCount = problemStructure.roots.length;
  if (rootCount > 0) {
    const rootAngleStep =
      rootCount === 1 ? 0 : (config.rootEndAngle - config.rootStartAngle) / (rootCount - 1);

    problemStructure.roots.forEach((item, index) => {
      const angle =
        rootCount === 1
          ? (config.rootStartAngle + config.rootEndAngle) / 2 // Center single node
          : config.rootStartAngle + index * rootAngleStep;

      const nodeId = getRootNodeId(index);

      const rootNodeData: RootNodeData = {
        index,
        isExplored: false,
        label: item,
      };

      nodes.push({
        data: rootNodeData,
        id: nodeId,
        position: {
          x: config.centerX + Math.cos(angle) * config.rootRadius,
          y: config.centerY + Math.sin(angle) * config.rootRadius,
        },
        type: 'root',
      });

      edges.push({
        id: `edge-seed-${nodeId}`,
        source: SEED_NODE_ID,
        target: nodeId,
      });
    });
  }

  return { edges, nodes };
}

// ============================================================================
// Node ID Helper Functions
// ============================================================================

/**
 * Generates a unique ID for a Root node based on its index
 * @param index - Position in the roots array
 * @returns Node ID in format 'root-{index}'
 */
export function getRootNodeId(index: number): string {
  return `root-${index}`;
}

/**
 * Generates a unique ID for a Soil node based on its index
 * @param index - Position in the soil array
 * @returns Node ID in format 'soil-{index}'
 */
export function getSoilNodeId(index: number): string {
  return `soil-${index}`;
}

// ============================================================================
// Node Type Checking Functions
// ============================================================================

/**
 * Checks if a node ID represents a Root node
 * @param nodeId - The node ID to check
 * @returns True if the node is a Root node
 */
export function isRootNode(nodeId: string): boolean {
  return nodeId.startsWith('root-');
}

/**
 * Checks if a node ID represents a Seed node
 * @param nodeId - The node ID to check
 * @returns True if the node is a Seed node
 */
export function isSeedNode(nodeId: string): boolean {
  return nodeId === SEED_NODE_ID;
}

/**
 * Checks if a node ID represents a Soil node
 * @param nodeId - The node ID to check
 * @returns True if the node is a Soil node
 */
export function isSoilNode(nodeId: string): boolean {
  return nodeId.startsWith('soil-');
}

/**
 * Parses a node ID to extract its type and index
 * @param nodeId - The node ID to parse
 * @returns Object with type and optional index, or null if invalid
 */
export function parseNodeId(
  nodeId: string
): null | { index?: number; type: 'root' | 'seed' | 'soil' } {
  if (nodeId === SEED_NODE_ID) {
    return { type: 'seed' };
  }

  const rootMatch = nodeId.match(/^root-(\d+)$/);
  if (rootMatch) {
    return { index: parseInt(rootMatch[1], 10), type: 'root' };
  }

  const soilMatch = nodeId.match(/^soil-(\d+)$/);
  if (soilMatch) {
    return { index: parseInt(soilMatch[1], 10), type: 'soil' };
  }

  return null;
}
