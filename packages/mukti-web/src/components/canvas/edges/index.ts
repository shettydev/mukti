/**
 * Canvas edge components barrel export
 *
 * Exports all custom edge components and the edgeTypes map for React Flow
 */

import type { EdgeTypes } from '@xyflow/react';

import { RelationshipEdge } from './relationship-edge';

// Export individual edge components
export { RelationshipEdge } from './relationship-edge';
export type { RelationshipEdgeData } from './relationship-edge';

/**
 * Edge types map for React Flow
 *
 * Maps edge type strings to their corresponding React components.
 * Used when initializing React Flow to register custom edge types.
 *
 * @example
 * ```tsx
 * import { ReactFlow } from '@xyflow/react';
 * import { edgeTypes } from '@/components/canvas/edges';
 *
 * <ReactFlow
 *   nodes={nodes}
 *   edges={edges}
 *   edgeTypes={edgeTypes}
 * />
 * ```
 */
export const edgeTypes: EdgeTypes = {
  relationship: RelationshipEdge,
};
