/**
 * Canvas layout utilities for generating node positions
 * Implements three-column layout algorithm for Thinking Canvas visualization
 *
 * Layout: [Context column] ←→ [Problem center] ←→ [Assumptions column]
 */

import type {
  CanvasEdge,
  CanvasNode,
  LayoutConfig,
  Position,
  RootNodeData,
  SeedNodeData,
  SoilNodeData,
} from '@/types/canvas-visualization.types';
import type { ProblemStructure } from '@/types/canvas.types';

import { DEFAULT_LAYOUT } from '@/types/canvas-visualization.types';

// ============================================================================
// Constants
// ============================================================================

/**
 * Constant ID for the central Seed node
 */
export const SEED_NODE_ID = 'seed';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of layout generation containing nodes and edges
 */
export interface LayoutResult {
  edges: CanvasEdge[];
  nodes: CanvasNode[];
}

// ============================================================================
// Exported Functions (alphabetical order per perfectionist/sort-modules)
// ============================================================================

/**
 * Calculates the position for a new insight node relative to its parent
 *
 * Positions insight nodes in an arc below the parent node, spreading
 * them out based on how many sibling insights already exist.
 *
 * @param parentNode - The parent node the insight is connected to
 * @param existingInsights - Array of existing insight nodes
 * @returns Position coordinates for the new insight node
 *
 * @example
 * ```typescript
 * const position = calculateInsightPosition(parentNode, existingInsights);
 * // Returns { x: 150, y: 200 }
 * ```
 */
export function calculateInsightPosition(
  parentNode: CanvasNode,
  existingInsights: CanvasNode[]
): Position {
  const siblingInsights = existingInsights.filter(
    (n) => n.type === 'insight' && n.data.parentNodeId === parentNode.id
  );
  const siblingCount = siblingInsights.length;

  // Base angle points downward (90 degrees = PI/2)
  const baseAngle = Math.PI / 2;

  // Spread insights evenly around the base angle
  const angleOffset = siblingCount * ANGLE_SPREAD;
  const angle = baseAngle + angleOffset - (siblingCount * ANGLE_SPREAD) / 2;

  return {
    x: parentNode.position.x + Math.cos(angle) * INSIGHT_OFFSET,
    y: parentNode.position.y + Math.sin(angle) * INSIGHT_OFFSET,
  };
}

/**
 * Calculates the next Y position for a dynamically added node in a column.
 *
 * Places the new node below the last existing node in the column,
 * or at the seed center if the column is empty.
 *
 * @param existingNodes - Current nodes of the same type in the column
 * @param config - Layout configuration
 * @returns Y position for the new node
 */
export function calculateNextColumnY(existingNodes: CanvasNode[], config: LayoutConfig): number {
  if (existingNodes.length === 0) {
    return config.centerY + config.seedEstimatedHeight / 2;
  }

  const lastNode = existingNodes.reduce((bottommost, node) =>
    node.position.y > bottommost.position.y ? node : bottommost
  );

  return lastNode.position.y + config.nodeVerticalSpacing;
}

/**
 * Generates initial node positions using three-column layout algorithm
 *
 * Layout strategy:
 * - Seed node centered at (centerX, centerY)
 * - Soil nodes stacked vertically in left column, centered around seed
 * - Root nodes stacked vertically in right column, centered around seed
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

  // Create Soil nodes in left column
  const soilCount = problemStructure.soil.length;
  if (soilCount > 0) {
    const yPositions = calculateColumnYPositions(soilCount, config);

    problemStructure.soil.forEach((item, index) => {
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
          x: config.centerX + config.soilColumnX,
          y: yPositions[index],
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

  // Create Root nodes in right column
  const rootCount = problemStructure.roots.length;
  if (rootCount > 0) {
    const yPositions = calculateColumnYPositions(rootCount, config);

    problemStructure.roots.forEach((item, index) => {
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
          x: config.centerX + config.rootColumnX,
          y: yPositions[index],
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

/**
 * Generates a unique ID for an Insight node based on its index
 * @param index - Position in the insights array
 * @returns Node ID in format 'insight-{index}'
 */
export function getInsightNodeId(index: number): string {
  return `insight-${index}`;
}

/**
 * Gets the next available insight index based on existing nodes
 * @param nodes - Array of all canvas nodes
 * @returns The next available index for an insight node
 */
export function getNextInsightIndex(nodes: CanvasNode[]): number {
  const insightNodes = nodes.filter((n) => n.type === 'insight');
  if (insightNodes.length === 0) {
    return 0;
  }

  const maxIndex = Math.max(
    ...insightNodes.map((n) => {
      const parsed = parseNodeId(n.id);
      return parsed?.index ?? 0;
    })
  );

  return maxIndex + 1;
}

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

/**
 * Checks if a node ID represents an Insight node
 * @param nodeId - The node ID to check
 * @returns True if the node is an Insight node
 */
export function isInsightNode(nodeId: string): boolean {
  return nodeId.startsWith('insight-');
}

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
): null | { index?: number; type: 'insight' | 'root' | 'seed' | 'soil' } {
  if (nodeId === SEED_NODE_ID) {
    return { type: 'seed' };
  }

  const insightMatch = nodeId.match(/^insight-(\d+)$/);
  if (insightMatch) {
    return { index: parseInt(insightMatch[1], 10), type: 'insight' };
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

// ============================================================================
// Private Helpers (after all exports per perfectionist/sort-modules)
// ============================================================================

/** Distance from parent node for insight placement */
const INSIGHT_OFFSET = 150;

/** Angular spread between insight nodes (45 degrees) */
const ANGLE_SPREAD = Math.PI / 4;

/**
 * Calculates vertically-centered positions for a column of nodes.
 *
 * Given a count of nodes, produces Y coordinates centered around a
 * reference point (seed center), with consistent vertical spacing.
 *
 * @param count - Number of nodes in the column
 * @param config - Layout configuration with spacing and center values
 * @returns Array of Y positions, one per node
 */
function calculateColumnYPositions(count: number, config: LayoutConfig): number[] {
  const seedCenterY = config.centerY + config.seedEstimatedHeight / 2;
  const totalHeight = (count - 1) * config.nodeVerticalSpacing;
  const startY = seedCenterY - totalHeight / 2;

  return Array.from({ length: count }, (_, i) => startY + i * config.nodeVerticalSpacing);
}
