/**
 * Canvas node components barrel export
 *
 * Exports all custom node components and the nodeTypes map for React Flow
 */

import type { NodeTypes } from '@xyflow/react';

import { InsightNode } from './insight-node';
import { RootNode } from './root-node';
import { SeedNode } from './seed-node';
import { SoilNode } from './soil-node';

// Export individual node components
export { InsightNode } from './insight-node';
export { RootNode } from './root-node';
export { SeedNode } from './seed-node';
export { SoilNode } from './soil-node';

/**
 * Node types map for React Flow
 *
 * Maps node type strings to their corresponding React components.
 * Used when initializing React Flow to register custom node types.
 *
 * @example
 * ```tsx
 * import { ReactFlow } from '@xyflow/react';
 * import { nodeTypes } from '@/components/canvas/nodes';
 *
 * <ReactFlow
 *   nodes={nodes}
 *   edges={edges}
 *   nodeTypes={nodeTypes}
 * />
 * ```
 */
export const nodeTypes: NodeTypes = {
  insight: InsightNode,
  root: RootNode,
  seed: SeedNode,
  soil: SoilNode,
};
