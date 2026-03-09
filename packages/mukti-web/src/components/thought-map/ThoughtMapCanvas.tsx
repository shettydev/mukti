'use client';

/**
 * ThoughtMapCanvas component
 *
 * Main orchestrator for the Thought Map React Flow canvas.
 * Responsibilities:
 * - Load map data via `useThoughtMap` (TanStack Query) and sync into Zustand store
 * - Apply the radial layout algorithm to unpositioned nodes
 * - Convert domain `ThoughtMapNode[]` into React Flow node/edge arrays
 * - Register custom node and edge types
 * - Handle drag, selection, and "Add Branch" interactions
 * - Mount the CreateNodeDialog and ThoughtMapToolbar
 *
 * Node type mapping:
 *   topic  → topic-node   (TopicNode)
 *   branch → thought-node (ThoughtNode)
 *   leaf   → thought-node (ThoughtNode)
 *
 * QuestionNode and InsightNode are registered for future use.
 */

import '@xyflow/react/dist/style.css';
import {
  Background,
  BackgroundVariant,
  type EdgeTypes,
  type NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  type Edge as RFEdge,
  type Node as RFNode,
  type NodeChange as RFNodeChange,
  type OnNodeDrag as RFOnNodeDrag,
  useNodesState,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ThoughtMapNode } from '@/types/thought-map';

import { useThoughtMap as useThoughtMapQuery } from '@/lib/hooks/use-thought-map';
import {
  useThoughtMapActions,
  useThoughtMapNodes,
  useThoughtMapStore,
} from '@/lib/stores/thought-map-store';
import { cn } from '@/lib/utils';
import { computeThoughtMapLayout, type NodePosition } from '@/lib/utils/thought-map-layout';

import { CreateNodeDialog } from './CreateNodeDialog';
import { ThoughtMapEdge } from './edges/ThoughtMapEdge';
import { InsightNode } from './nodes/InsightNode';
import { QuestionNode } from './nodes/QuestionNode';
import { ThoughtNode } from './nodes/ThoughtNode';
import { TopicNode } from './nodes/TopicNode';
import { ThoughtMapToolbar } from './ThoughtMapToolbar';

// ============================================================================
// Custom node / edge type registrations
// NOTE: cast via `unknown` to bridge our typed props with React Flow's generic
// ComponentType<NodeProps> — the data shapes are compatible at runtime.
// ============================================================================

const nodeTypes: NodeTypes = {
  'insight-node': InsightNode as unknown as NodeTypes[string],
  'question-node': QuestionNode as unknown as NodeTypes[string],
  'thought-node': ThoughtNode as unknown as NodeTypes[string],
  'topic-node': TopicNode as unknown as NodeTypes[string],
};

const edgeTypes: EdgeTypes = {
  'thought-map-edge': ThoughtMapEdge as unknown as EdgeTypes[string],
};

// ============================================================================
// Types
// ============================================================================

export interface ThoughtMapCanvasProps {
  /** Optional additional className for the outer wrapper */
  className?: string;
  /** The Thought Map ID to load and display */
  mapId: string;
}

interface ThoughtMapCanvasInnerProps {
  mapId: string;
}

// ============================================================================
// Public export — wraps inner canvas in ReactFlowProvider
// ============================================================================

/**
 * ThoughtMapCanvas - Full Thought Map canvas experience
 *
 * Wraps the inner canvas in a `ReactFlowProvider` so that `useReactFlow()`
 * (used by `ThoughtMapToolbar`) works correctly. Pass a `mapId` to load
 * and display the corresponding thought map.
 *
 * @param mapId - The thought map to render
 * @param className - Optional className for the outer container
 */
export function ThoughtMapCanvas({ className, mapId }: ThoughtMapCanvasProps) {
  return (
    <ReactFlowProvider>
      <div className={cn('h-full w-full', className)}>
        <ThoughtMapCanvasInner mapId={mapId} />
      </div>
    </ReactFlowProvider>
  );
}

// ============================================================================
// Inner canvas + helpers (non-exported, alphabetical order)
// ============================================================================

function ThoughtMapCanvasInner({ mapId }: ThoughtMapCanvasInnerProps) {
  const { data, error, isLoading } = useThoughtMapQuery(mapId);
  const { setMap, setNodePosition, setSelectedNodeId } = useThoughtMapActions();
  const storeNodes = useThoughtMapNodes();
  const selectedNodeId = useThoughtMapStore((s) => s.selectedNodeId);
  const activeMap = useThoughtMapStore((s) => s.map);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogParentLabel, setDialogParentLabel] = useState<string | undefined>(undefined);
  const [dialogParentNodeId, setDialogParentNodeId] = useState<string>('');

  // ---- Sync remote data into the Zustand store --------------------------------
  useEffect(() => {
    if (data) {
      setMap(data.map, data.nodes);
    }
  }, [data, setMap]);

  // ---- "Add Branch" handler (called by node context menus / toolbar) ----------
  const handleAddBranch = useCallback(
    (nodeId: string) => {
      const node = storeNodes[nodeId];
      setDialogParentLabel(node?.label);
      setDialogParentNodeId(nodeId);
      setDialogOpen(true);
    },
    [storeNodes]
  );

  // ---- Build React Flow nodes + edges from the store --------------------------
  const domainNodesList = useMemo(() => Object.values(storeNodes), [storeNodes]);

  const flowNodes = useMemo(
    () => toFlowNodes(domainNodesList, handleAddBranch),
    [domainNodesList, handleAddBranch]
  );

  const flowEdges = useMemo(() => toFlowEdges(domainNodesList), [domainNodesList]);

  // React Flow useNodesState for local drag management
  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);

  // Keep nodes in sync whenever store changes (e.g. after addNode)
  useEffect(() => {
    setNodes(flowNodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowNodes]);

  // ---- Drag stop → persist position to store ----------------------------------
  const handleNodeDragStop: RFOnNodeDrag = useCallback(
    (_event, node) => {
      setNodePosition(node.id, node.position.x, node.position.y);
    },
    [setNodePosition]
  );

  // ---- Selection → update store -----------------------------------------------
  const handleNodesChange = useCallback(
    (changes: RFNodeChange[]) => {
      onNodesChange(changes);

      // Mirror selection into the Zustand store
      const selectOn = changes.find((c) => c.type === 'select' && c.selected);
      if (selectOn && selectOn.type === 'select') {
        setSelectedNodeId(selectOn.id);
        return;
      }

      // If the currently selected node was deselected, clear the store
      const deselected = changes.find(
        (c) => c.type === 'select' && !c.selected && c.id === selectedNodeId
      );
      if (deselected) {
        setSelectedNodeId(null);
      }
    },
    [onNodesChange, selectedNodeId, setSelectedNodeId]
  );

  // ---- Toolbar "Add Branch" (uses current selection) -------------------------
  const handleToolbarAddBranch = useCallback(() => {
    if (selectedNodeId) {
      handleAddBranch(selectedNodeId);
    }
  }, [handleAddBranch, selectedNodeId]);

  // ---- Can the selected node have a branch added? ----------------------------
  const canAddBranch = useMemo(() => {
    if (!selectedNodeId) {
      return false;
    }
    const node = storeNodes[selectedNodeId];
    return node?.type === 'topic' || node?.type === 'branch';
  }, [selectedNodeId, storeNodes]);

  // ---- Loading / error states ------------------------------------------------
  if (isLoading || (!activeMap && !error)) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-stone-50 dark:bg-stone-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-600 dark:border-stone-700 dark:border-t-stone-300" />
          <span className="text-sm text-stone-500 dark:text-stone-400">Loading map…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-stone-50 dark:bg-stone-950">
        <p className="text-sm text-red-500 dark:text-red-400">
          Failed to load thought map. Please refresh.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {/* React Flow canvas */}
      <ReactFlow
        className={cn(
          'rounded-xl',
          '[&_.react-flow__background]:!bg-stone-50',
          'dark:[&_.react-flow__background]:!bg-stone-950'
        )}
        edges={flowEdges}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        maxZoom={2}
        minZoom={0.2}
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodeDragStop={handleNodeDragStop}
        onNodesChange={handleNodesChange}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          color="oklch(0.82 0.01 60)"
          gap={32}
          size={1}
          variant={BackgroundVariant.Dots}
        />
      </ReactFlow>

      {/* Floating toolbar — bottom left */}
      <div className="absolute bottom-4 left-4 z-10">
        <ThoughtMapToolbar
          canAddBranch={canAddBranch}
          onAddBranch={handleToolbarAddBranch}
          selectedNodeId={selectedNodeId}
        />
      </div>

      {/* Create node dialog */}
      {activeMap && (
        <CreateNodeDialog
          mapId={activeMap.id}
          onClose={() => setDialogOpen(false)}
          open={dialogOpen}
          parentLabel={dialogParentLabel}
          parentNodeId={dialogParentNodeId}
        />
      )}
    </div>
  );
}

/**
 * Build React Flow edges from parent-child relationships in domain nodes
 */
function toFlowEdges(domainNodes: ThoughtMapNode[]): RFEdge[] {
  return domainNodes
    .filter((n): n is ThoughtMapNode & { parentNodeId: string } => n.parentNodeId !== null)
    .map((n) => ({
      id: `edge-${n.parentNodeId}-${n.nodeId}`,
      source: n.parentNodeId,
      target: n.nodeId,
      type: 'thought-map-edge',
    }));
}

/**
 * Convert domain nodes to React Flow nodes, applying layout overrides
 */
function toFlowNodes(
  domainNodes: ThoughtMapNode[],
  onAddBranch: (nodeId: string) => void
): RFNode[] {
  const layoutPositions: Record<string, NodePosition> = computeThoughtMapLayout(domainNodes);

  return domainNodes.map((n) => {
    const layoutPos = layoutPositions[n.nodeId];
    const position = layoutPos ?? n.position;
    const type = n.type === 'topic' ? 'topic-node' : 'thought-node';

    return {
      data: { node: n, onAddBranch },
      id: n.nodeId,
      position,
      type,
    } satisfies RFNode;
  });
}
