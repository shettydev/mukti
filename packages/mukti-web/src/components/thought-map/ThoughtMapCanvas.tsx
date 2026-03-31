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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

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
import {
  centredYPositions,
  computeThoughtMapLayout,
  GHOST_HORIZONTAL_OFFSET,
  GHOST_VERTICAL_SPACING,
  type NodePosition,
} from '@/lib/utils/thought-map-layout';

import { ThoughtMapEdge } from './edges/ThoughtMapEdge';
import { EditableBranchNode } from './nodes/EditableBranchNode';
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
  'editable-branch-node': EditableBranchNode as unknown as NodeTypes[string],
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
 * Position priority:
 *  1. `existingPositions[flowNodeId]` — preserves user-dragged or previously computed position
 *  2. Freshly computed via `centredYPositions` using GHOST_VERTICAL_SPACING (150px)
 *
 * Ghosts whose parent is not in the store are skipped — they will be cleaned up
 * by useGhostNodeAutoDismiss on the next render cycle.
 */
export function toGhostFlowNodes(
  ghostNodes: GhostNode[],
  storeNodes: Record<string, ThoughtMapNode>,
  layoutPositions: Record<string, NodePosition>,
  onAccept: (ghostId: string) => void,
  onDismiss: (ghostId: string) => void,
  existingPositions: Record<string, NodePosition> = {}
): RFNode[] {
  // Group ghosts by parent so we can compute centred vertical positions per group
  const ghostsByParent = new Map<string, GhostNode[]>();
  for (const ghost of ghostNodes) {
    if (!storeNodes[ghost.parentId]) {
      continue;
    }
    const siblings = ghostsByParent.get(ghost.parentId) ?? [];
    siblings.push(ghost);
    ghostsByParent.set(ghost.parentId, siblings);
  }

  const result: RFNode[] = [];

  for (const [parentId, siblings] of ghostsByParent) {
    const parent = storeNodes[parentId]!;
    const parentPosition = getDisplayedNodePosition(parent, layoutPositions);

    // Extend outward from parent (hemisphere-aware), using wider offset to
    // clear the parent node's rendered width (especially the wide TopicNode).
    const xOffset = parentPosition.x < 0 ? -GHOST_HORIZONTAL_OFFSET : GHOST_HORIZONTAL_OFFSET;
    const baseX = parentPosition.x + xOffset;

    // Compute evenly centred Y positions for the sibling group
    const yPositions = centredYPositions(siblings.length, parentPosition.y, GHOST_VERTICAL_SPACING);

    for (let i = 0; i < siblings.length; i++) {
      const ghost = siblings[i];
      const flowId = ghostNodeToFlowNodeId(ghost);

      // Use existing (persisted/dragged) position if available, otherwise compute fresh
      const position: NodePosition = existingPositions[flowId] ?? { x: baseX, y: yPositions[i] };

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
        position: { x: position.x, y: position.y },
        type: 'question',
        updatedAt: now,
      };

      result.push({
        data: {
          ghostCreatedAt: ghost.createdAt,
          isGhost: true,
          node: syntheticNode,
          onAccept,
          onDismiss,
        },
        id: flowId,
        position: { x: position.x, y: position.y },
        type: 'question-node',
      } satisfies RFNode);
    }
  }

  return result;
}

function getDisplayedNodePosition(
  node: ThoughtMapNode,
  layoutPositions: Record<string, NodePosition>
): NodePosition {
  return layoutPositions[node.nodeId] ?? node.position;
}

function ThoughtMapCanvasInner({ mapId }: ThoughtMapCanvasInnerProps) {
  const { data, error, isLoading } = useThoughtMapQuery(mapId);
  const {
    acceptGhostNode,
    addNode,
    deleteNode,
    removeGhostNode,
    setMap,
    setSelectedNodeId,
    updateNode,
  } = useThoughtMapActions();
  const storeNodes = useThoughtMapNodes();
  const ghostNodes = useGhostNodes();
  const selectedNodeId = useThoughtMapStore((s) => s.selectedNodeId);
  const activeMap = useThoughtMapStore((s) => s.map);
  // Inline branch editing state
  const [inlineEditParentId, setInlineEditParentId] = useState<null | string>(null);
  const [dialogueNodeId, setDialogueNodeId] = useState<null | string>(null);

  // Track active drag to prevent setNodes from interrupting mid-drag
  const isDraggingRef = useRef(false);
  // Capture inline edit node position so the committed node appears in the same spot
  const inlineEditPositionRef = useRef<null | { x: number; y: number }>(null);
  // Persist ghost node positions across re-renders so they survive accept/dismiss of siblings
  const ghostPositionsRef = useRef<Record<string, NodePosition>>({});

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
      const flowId = `ghost-${ghostId}`;
      const position = ghostPositionsRef.current[flowId];
      void acceptGhostNode(ghostId, position);
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
  const handleAddBranch = useCallback((nodeId: string) => {
    setInlineEditParentId(nodeId);
  }, []);

  // ---- Inline branch commit/cancel handlers ----------------------------------
  const handleInlineCommit = useCallback(
    async (label: string) => {
      if (!activeMap || !inlineEditParentId) {
        return;
      }
      const parentId = inlineEditParentId;
      const pos = inlineEditPositionRef.current;
      setInlineEditParentId(null);
      const newNodeId = await addNode({
        label,
        mapId: activeMap.id,
        parentNodeId: parentId,
        x: pos?.x,
        y: pos?.y,
      });
      if (newNodeId) {
        toast.success('Branch added');
      } else {
        toast.error('Failed to add branch');
      }
    },
    [activeMap, addNode, inlineEditParentId]
  );

  const handleInlineCancel = useCallback(() => {
    setInlineEditParentId(null);
  }, []);

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

  // ---- Inline editable branch node (temporary, not in store) ------------------
  const inlineEditNode = useMemo((): RFNode[] => {
    if (!inlineEditParentId) {
      inlineEditPositionRef.current = null;
      return [];
    }
    const parent = storeNodes[inlineEditParentId];
    if (!parent) {
      inlineEditPositionRef.current = null;
      return [];
    }
    const parentPos = layoutPositions[parent.nodeId] ?? parent.position;
    // Count existing children to stagger vertically
    const childCount = domainNodesList.filter((n) => n.parentNodeId === inlineEditParentId).length;
    const isRight = parentPos.x >= 0;
    const x = parentPos.x + (isRight ? 280 : -280);
    const y = parentPos.y + childCount * 90;
    const side: 'left' | 'right' = isRight ? 'right' : 'left';

    inlineEditPositionRef.current = { x, y };

    return [
      {
        data: {
          onCancel: handleInlineCancel,
          onCommit: handleInlineCommit,
          side,
        },
        id: '__inline-edit__',
        position: { x, y },
        type: 'editable-branch-node',
      },
    ];
  }, [
    domainNodesList,
    handleInlineCancel,
    handleInlineCommit,
    inlineEditParentId,
    layoutPositions,
    storeNodes,
  ]);

  const flowNodes = useMemo(() => {
    const realNodes = toFlowNodes(
      domainNodesList,
      layoutPositions,
      handleAddBranch,
      handleSuggestBranches,
      handleDeleteNode
    );
    const ghostFlowNodes = toGhostFlowNodes(
      ghostNodes,
      storeNodes,
      layoutPositions,
      handleAcceptGhost,
      handleDismissGhost,
      ghostPositionsRef.current
    );

    // Sync newly computed ghost positions back into the ref so they persist
    // across re-renders (e.g. when a sibling ghost is accepted/dismissed).
    const nextPositions: Record<string, NodePosition> = {};
    for (const gfn of ghostFlowNodes) {
      nextPositions[gfn.id] = { x: gfn.position.x, y: gfn.position.y };
    }
    ghostPositionsRef.current = nextPositions;

    return [...realNodes, ...ghostFlowNodes, ...inlineEditNode];
  }, [
    domainNodesList,
    ghostNodes,
    handleAcceptGhost,
    handleAddBranch,
    handleDeleteNode,
    handleDismissGhost,
    handleSuggestBranches,
    inlineEditNode,
    layoutPositions,
    storeNodes,
  ]);

  // ---- Temporary edge for inline edit node -----------------------------------
  const inlineEditEdge = useMemo((): RFEdge[] => {
    if (!inlineEditParentId || inlineEditNode.length === 0) {
      return [];
    }
    const editNode = inlineEditNode[0];
    const isRight = editNode.position.x > 0;
    return [
      {
        id: 'edge-inline-edit',
        source: inlineEditParentId,
        sourceHandle: isRight ? 'source-right' : 'source-left',
        style: { opacity: 0.4, strokeDasharray: '6 4' },
        target: '__inline-edit__',
        targetHandle: isRight ? 'target-left' : 'target-right',
        type: 'thought-map-edge',
      },
    ];
  }, [inlineEditNode, inlineEditParentId]);

  const flowEdges = useMemo(
    () => [...toFlowEdges(domainNodesList, layoutPositions), ...inlineEditEdge],
    [domainNodesList, inlineEditEdge, layoutPositions]
  );

  // React Flow useNodesState for local drag management
  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);

  // Keep nodes in sync whenever store changes (e.g. after addNode).
  // Skip during drag to prevent setNodes from interrupting the active drag.
  useEffect(() => {
    if (!isDraggingRef.current) {
      setNodes(flowNodes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowNodes]);

  // ---- Drag start → set flag to prevent setNodes during drag ------------------
  const handleNodeDragStart: RFOnNodeDrag = useCallback(() => {
    isDraggingRef.current = true;
  }, []);

  // ---- Drag stop → persist position to store or ghost ref -----------------------
  const handleNodeDragStop: RFOnNodeDrag = useCallback(
    (_event, node) => {
      isDraggingRef.current = false;

      // Skip inline edit node — it's not in the store
      if (node.id === '__inline-edit__') {
        return;
      }

      // Ghost nodes: persist to ref instead of calling updateNode (no backend)
      if (node.id.startsWith('ghost-')) {
        ghostPositionsRef.current = {
          ...ghostPositionsRef.current,
          [node.id]: { x: node.position.x, y: node.position.y },
        };
        return;
      }

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
      if (selectOn && selectOn.id !== '__inline-edit__') {
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
    // Skip inline edit node — it's not a real node
    if (node.id === '__inline-edit__') {
      return;
    }
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
        onNodeDragStart={handleNodeDragStart}
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
