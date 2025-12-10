'use client';

/**
 * Custom edge component for rendering relationships between Root and Soil nodes
 * Uses a smooth curved path with a violet → amber gradient to match node colors.
 */

import {
  BaseEdge,
  type Edge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react';
import { memo } from 'react';

/**
 * Optional data passed to relationship edges.
 * @property isHighlighted - Emphasize the edge (e.g., on hover/selection)
 * @property label - Optional label to display along the edge
 */
export interface RelationshipEdgeData {
  [key: string]: unknown;
  isHighlighted?: boolean;
  label?: string;
}

type RelationshipFlowEdge = Edge<RelationshipEdgeData>;

function RelationshipEdgeComponent({
  data,
  id,
  markerEnd,
  markerStart,
  selected,
  sourcePosition,
  sourceX,
  sourceY,
  targetPosition,
  targetX,
  targetY,
}: EdgeProps<RelationshipFlowEdge>) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    borderRadius: 16,
    sourcePosition,
    sourceX,
    sourceY,
    targetPosition,
    targetX,
    targetY,
  });

  const gradientId = `relationship-gradient-${id}`;
  const strokeWidth = selected || data?.isHighlighted ? 3 : 2;

  return (
    <>
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id={gradientId}
          x1={sourceX}
          x2={targetX}
          y1={sourceY}
          y2={targetY}
        >
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      <BaseEdge
        id={id}
        markerEnd={markerEnd}
        markerStart={markerStart}
        path={edgePath}
        style={{
          opacity: data?.isHighlighted ? 1 : 0.9,
          stroke: `url(#${gradientId})`,
          strokeLinecap: 'round',
          strokeWidth,
          transition: 'stroke-width 0.15s ease, opacity 0.15s ease',
        }}
      />

      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none rounded-full border border-border bg-background/80 px-2 py-1 text-[11px] font-medium text-foreground shadow-sm backdrop-blur"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const RelationshipEdge = memo(RelationshipEdgeComponent);
