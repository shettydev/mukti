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
 * - Render AI ghost nodes and wire Accept/Dismiss callbacks
 * - Mount cold-start suggestion trigger and auto-dismiss logic
 * - Mount the CreateNodeDialog and ThoughtMapToolbar
 *
 * Node type mapping:
 *   topic    → topic-node    (TopicNode)
 *   branch   → thought-node  (ThoughtNode)
 *   leaf     → thought-node  (ThoughtNode)
 *   insight  → insight-node  (InsightNode)
 *   question → question-node (QuestionNode)
 *   ghost    → question-node (QuestionNode, isGhost: true)
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

import type { GhostNode } from '@/lib/stores/thought-map-store';
import type { ThoughtMapNode } from '@/types/thought-map';

import { useThoughtMap as useThoughtMapQuery } from '@/lib/hooks/use-thought-map';
import {
  ghostNodeToFlowNodeId,
  useColdStartSuggestions,
  useGhostNodeAutoDismiss,
  useThoughtMapSuggestions,
} from '@/lib/hooks/use-thought-map-suggestions';
import {
  useGhostNodes,
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
import { ThoughtMapDialoguePanel } from './ThoughtMapDialoguePanel';
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

/** Map each domain node type to the correct React Flow custom node type key */
export function resolveNodeType(type: ThoughtMapNode['type']): string {
  switch (type) {
    case 'insight':
      return 'insight-node';
    case 'question':
      return 'question-node';
    case 'topic':
      return 'topic-node';
    default:
      // 'branch' | 'leaf' | 'thought'
      return 'thought-node';
  }
}

// ============================================================================
// Inner canvas + helpers (non-exported, alphabetical order)
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

/**
 * Convert domain nodes to React Flow nodes, applying layout overrides.
 * Fixes: each node type is now mapped correctly (was always 'thought-node' except 'topic').
 */
export function toFlowNodes(
  domainNodes: ThoughtMapNode[],
  layoutPositions: Record<string, NodePosition>,
  onAddBranch: (nodeId: string) => void,
  onSuggestBranches: (nodeId: string) => void,
  onDeleteNode?: (nodeId: string) => void
): RFNode[] {
  return domainNodes.map((n) => {
    const position = getDisplayedNodePosition(n, layoutPositions);
    const type = resolveNodeType(n.type);
    // Determine which hemisphere this node sits in so handles face the right way
    const side: 'left' | 'right' = position.x <= 0 ? 'left' : 'right';

    return {
      data: {
        ...(n.type === 'question' && { isGhost: false }),
        ...(n.type !== 'topic' && { side }),
        node: n,
        onAddBranch,
        onDeleteNode: n.type !== 'topic' ? onDeleteNode : undefined,
        onSuggestBranches,
      },
      id: n.nodeId,
      position,
      type,
    } satisfies RFNode;
  });
}

/**
 * Convert ghost nodes to React Flow question-node entries.
 *
 * Each ghost is rendered as a `question-node` (QuestionNode component).
 * A synthetic ThoughtMapNode is constructed so QuestionNode can render the label.
 * The ghost's ghostId is used as nodeId so onAccept/onDismiss callbacks
 * (which receive `node.nodeId`) correctly identify which ghost to act on.
 *
 * Position: offset 280px outward (hemisphere-aware) and staggered 90px vertically.
 * Ghosts whose parent is not in the store are skipped — they will be cleaned up
 * by useGhostNodeAutoDismiss on the next render cycle.
 */
export function toGhostFlowNodes(
  ghostNodes: GhostNode[],
  storeNodes: Record<string, ThoughtMapNode>,
  layoutPositions: Record<string, NodePosition>,
  onAccept: (ghostId: string) => void,
  onDismiss: (ghostId: string) => void
): RFNode[] {
  const ghostIndexByParent = new Map<string, number>();

  return ghostNodes.flatMap((ghost) => {
    const parent = storeNodes[ghost.parentId];

    // Skip ghosts whose parent isn't in the store — they have no valid anchor.
    if (!parent) {
      return [];
    }

    const parentIndex = ghostIndexByParent.get(ghost.parentId) ?? 0;
    ghostIndexByParent.set(ghost.parentId, parentIndex + 1);

    const parentPosition = getDisplayedNodePosition(parent, layoutPositions);

    // Mirror the X-offset based on which hemisphere the parent sits in so
    // ghosts extend outward rather than toward the canvas centre.
    const xOffset = parentPosition.x < 0 ? -280 : 280;
    const baseX = parentPosition.x + xOffset;
    const baseY = parentPosition.y + parentIndex * 90 - 45;

    // Synthetic ThoughtMapNode for QuestionNode rendering
    const now = new Date().toISOString();
    const syntheticNode: ThoughtMapNode = {
      createdAt: now,
      depth: parent.depth + 1,
      fromSuggestion: true,
      id: ghost.ghostId,
      isCollapsed: false,
      isExplored: false,
      label: ghost.label,
      mapId: parent.mapId,
      messageCount: 0,
      nodeId: ghost.ghostId,
      parentNodeId: ghost.parentId,
      position: { x: baseX, y: baseY },
      type: 'question',
      updatedAt: now,
    };

    return [
      {
        data: {
          ghostCreatedAt: ghost.createdAt,
          isGhost: true,
          node: syntheticNode,
          onAccept,
          onDismiss,
        },
        id: ghostNodeToFlowNodeId(ghost),
        position: { x: baseX, y: baseY },
        type: 'question-node',
      } satisfies RFNode,
    ];
  });
}

function getDisplayedNodePosition(
  node: ThoughtMapNode,
  layoutPositions: Record<string, NodePosition>
): NodePosition {
  return layoutPositions[node.nodeId] ?? node.position;
}

function ThoughtMapCanvasInner({ mapId }: ThoughtMapCanvasInnerProps) {
  const { data, error, isLoading } = useThoughtMapQuery(mapId);
  const { acceptGhostNode, deleteNode, removeGhostNode, setMap, setSelectedNodeId, updateNode } =
    useThoughtMapActions();
  const storeNodes = useThoughtMapNodes();
  const ghostNodes = useGhostNodes();
  const selectedNodeId = useThoughtMapStore((s) => s.selectedNodeId);
  const activeMap = useThoughtMapStore((s) => s.map);
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogParentLabel, setDialogParentLabel] = useState<string | undefined>(undefined);
  const [dialogParentNodeId, setDialogParentNodeId] = useState<string>('');
  const [dialogueNodeId, setDialogueNodeId] = useState<null | string>(null);

  // ---- Sync remote data into the Zustand store --------------------------------
  useEffect(() => {
    if (data) {
      setMap(data.map, data.nodes);
    }
  }, [data, setMap]);

  // ---- Ghost node lifecycle hooks -----------------------------------
  useGhostNodeAutoDismiss();

  const rootNodeId = activeMap?.rootNodeId ?? '';
  const autoSuggestEnabled = activeMap?.settings.autoSuggestEnabled ?? true;
  useColdStartSuggestions(mapId, rootNodeId, autoSuggestEnabled && !selectedNodeId);

  // ---- Ghost node callbacks ---------------------------------------------------
  const handleAcceptGhost = useCallback(
    (ghostId: string) => {
      void acceptGhostNode(ghostId);
    },
    [acceptGhostNode]
  );

  const handleDismissGhost = useCallback(
    (ghostId: string) => {
      removeGhostNode(ghostId);
    },
    [removeGhostNode]
  );

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

  // ---- "Delete Node" handler (called by node context menus) -------------------
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      void deleteNode(nodeId);
    },
    [deleteNode]
  );

  // ---- "Suggest Branches" handler (called by node context menus) --------------
  const [suggestParentNodeId, setSuggestParentNodeId] = useState<string>('');
  const handleSuggestBranches = useCallback((nodeId: string) => {
    setSuggestParentNodeId(nodeId);
  }, []);

  // Trigger suggestion stream whenever a node's "Suggest Branches" is clicked
  const { isStreaming: isSuggesting, requestSuggestions } = useThoughtMapSuggestions(
    mapId,
    suggestParentNodeId
  );
  useEffect(() => {
    if (suggestParentNodeId) {
      void requestSuggestions();
      // Reset so a second click on the same node re-triggers
      setSuggestParentNodeId('');
    }
    // requestSuggestions changes identity when suggestParentNodeId changes — that's fine
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestParentNodeId]);

  // ---- Build React Flow nodes + edges from the store --------------------------
  const domainNodesList = useMemo(() => Object.values(storeNodes), [storeNodes]);
  const layoutPositions = useMemo(
    () => computeThoughtMapLayout(domainNodesList),
    [domainNodesList]
  );

  const flowNodes = useMemo(
    () => [
      ...toFlowNodes(
        domainNodesList,
        layoutPositions,
        handleAddBranch,
        handleSuggestBranches,
        handleDeleteNode
      ),
      ...toGhostFlowNodes(
        ghostNodes,
        storeNodes,
        layoutPositions,
        handleAcceptGhost,
        handleDismissGhost
      ),
    ],
    [
      domainNodesList,
      ghostNodes,
      handleAcceptGhost,
      handleAddBranch,
      handleDeleteNode,
      handleDismissGhost,
      handleSuggestBranches,
      layoutPositions,
      storeNodes,
    ]
  );

  const flowEdges = useMemo(
    () => toFlowEdges(domainNodesList, layoutPositions),
    [domainNodesList, layoutPositions]
  );

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
      void updateNode(node.id, { x: node.position.x, y: node.position.y });
    },
    [updateNode]
  );

  // ---- Selection → update store -----------------------------------------------
  const handleNodesChange = useCallback(
    (changes: RFNodeChange[]) => {
      onNodesChange(changes);

      // Mirror selection into the Zustand store
      const selectOn = changes.find(
        (c): c is Extract<RFNodeChange, { type: 'select' }> => c.type === 'select' && c.selected
      );
      if (selectOn) {
        setSelectedNodeId(selectOn.id);
        return;
      }

      // If the currently selected node was deselected, clear the store
      const deselected = changes.find(
        (c): c is Extract<RFNodeChange, { type: 'select' }> => c.type === 'select' && !c.selected
      );
      if (deselected?.id === selectedNodeId) {
        setDialogueNodeId((current) => (current === deselected.id ? null : current));
        setSelectedNodeId(null);
      }
    },
    [onNodesChange, selectedNodeId, setSelectedNodeId]
  );

  const handleNodeClick = useCallback((_: React.MouseEvent, node: RFNode) => {
    setDialogueNodeId(node.id);
  }, []);

  // ---- Toolbar "Add Branch" (uses current selection) -------------------------
  const handleToolbarAddBranch = useCallback(() => {
    if (selectedNodeId) {
      handleAddBranch(selectedNodeId);
    }
  }, [handleAddBranch, selectedNodeId]);

  // ---- Can the selected node have a branch added? ----------------------------
  const canAddBranch = useMemo(() => {
    return !!selectedNodeId && !!storeNodes[selectedNodeId];
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
      {/* AI suggestion loading indicator */}
      {isSuggesting && (
        <div
          aria-live="polite"
          className={cn(
            'pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2',
            'flex items-center gap-2 rounded-full px-3 py-1.5',
            'border border-stone-200/60 bg-stone-50/90 shadow-sm backdrop-blur-sm',
            'dark:border-stone-700/60 dark:bg-stone-900/90',
            'animate-in fade-in slide-in-from-top-1 duration-200'
          )}
        >
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-stone-400 dark:bg-stone-500" />
          <span className="text-[11px] font-medium tracking-wide text-stone-500 dark:text-stone-400">
            Thinking…
          </span>
        </div>
      )}

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
        onNodeClick={handleNodeClick}
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
          sourceConversationId={activeMap?.sourceConversationId ?? undefined}
        />
      </div>

      {/* Per-node Socratic dialogue panel */}
      {dialogueNodeId && storeNodes[dialogueNodeId] && (
        <ThoughtMapDialoguePanel
          mapId={mapId}
          node={storeNodes[dialogueNodeId]!}
          onClose={() => {
            setDialogueNodeId(null);
            setSelectedNodeId(null);
          }}
        />
      )}

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
 * Build React Flow edges from parent-child relationships in domain nodes.
 * Ghost nodes also get a dashed edge connecting them to their parent.
 * sourceHandle / targetHandle are set based on which hemisphere the child sits
 * in, ensuring edges always route through the horizontal sides of nodes.
 */
function toFlowEdges(
  domainNodes: ThoughtMapNode[],
  layoutPositions: Record<string, NodePosition>
): RFEdge[] {
  return domainNodes
    .filter((n): n is ThoughtMapNode & { parentNodeId: string } => n.parentNodeId !== null)
    .map((n) => {
      const childPos = layoutPositions[n.nodeId] ?? n.position;
      const isRight = childPos.x > 0;
      return {
        id: `edge-${n.parentNodeId}-${n.nodeId}`,
        source: n.parentNodeId,
        sourceHandle: isRight ? 'source-right' : 'source-left',
        target: n.nodeId,
        targetHandle: isRight ? 'target-left' : 'target-right',
        type: 'thought-map-edge',
      };
    });
}
