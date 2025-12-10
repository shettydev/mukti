'use client';

/**
 * ThinkingCanvas component
 *
 * Main canvas component that integrates React Flow with custom node types
 * for visualizing the problem structure (Seed, Soil, Roots).
 * Includes integrated chat panel for Socratic dialogue on selected nodes.
 *
 * @requirements 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 7.1, 7.2
 * @requirements 1.1 - Open chat panel focused on selected node
 * @requirements 5.1 - Switch to node's dialogue when selected
 */

import type { OnSelectionChangeFunc, ReactFlowInstance } from '@xyflow/react';

import { Background, BackgroundVariant, ReactFlow } from '@xyflow/react';
import { Layers, Link2, Plus, Trash2, TreeDeciduous } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '@xyflow/react/dist/style.css';

import type { CanvasEdge, CanvasNode, Position } from '@/types/canvas-visualization.types';
import type { CanvasSession, InsightNode } from '@/types/canvas.types';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useCanvasActions,
  useCanvasChangeHandlers,
  useCanvasEdges,
  useCanvasNodes,
  useCanvasZoom,
  useRelationshipEdges,
  useSelectedNode,
} from '@/lib/stores/canvas-store';
import { usePanelWidth } from '@/lib/stores/chat-store';
import { cn } from '@/lib/utils';
import { MAX_ZOOM, MIN_ZOOM } from '@/types/canvas-visualization.types';

import type { InsightNodeData } from './chat/node-chat-panel';

import { AddAssumptionDialog } from './add-assumption-dialog';
import { AddContextDialog } from './add-context-dialog';
import { NodeChatPanel } from './chat';
import { CanvasLegend, NodePanel, ZoomControls } from './controls';
import { DeleteNodeDialog } from './delete-node-dialog';
import { edgeTypes } from './edges';
import { InsightNodeDialog } from './insight-node-dialog';
import { LinkConstraintDialog } from './link-constraint-dialog';
import { nodeTypes } from './nodes';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for ThinkingCanvas component
 * @property className - Optional additional CSS classes
 * @property insights - Optional array of insight nodes to display (Requirement 1.3)
 * @property onNodeSelect - Callback when a node is selected
 * @property onPositionChange - Callback when a node position changes (for persistence)
 * @property session - The canvas session data to visualize
 * @property showChatPanel - Whether to show the chat panel (default: true)
 */
export interface ThinkingCanvasProps {
  className?: string;
  insights?: InsightNode[];
  onNodeSelect?: (nodeId: null | string, nodeType: 'insight' | 'root' | 'seed' | 'soil') => void;
  onPositionChange?: (nodeId: string, position: Position) => void;
  session: CanvasSession;
  showChatPanel?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Zoom step for zoom in/out operations
 */
const ZOOM_STEP = 0.25;

/**
 * Fit view options for centering the canvas
 */
const FIT_VIEW_OPTIONS = {
  duration: 300,
  maxZoom: 1.5,
  padding: 0.2,
};

// ============================================================================
// Component
// ============================================================================

/**
 * ThinkingCanvas - Main canvas visualization component
 *
 * Renders an interactive canvas with:
 * - Seed node (central problem statement)
 * - Soil nodes (context/constraints)
 * - Root nodes (assumptions)
 *
 * Features:
 * - Pan and zoom with constraints (25%-200%)
 * - Node selection with single selection invariant
 * - Node dragging with position persistence
 * - Zoom controls toolbar
 * - Legend showing node types
 * - Side panel for selected node details
 *
 * @example
 * ```tsx
 * <ThinkingCanvas
 *   session={canvasSession}
 *   onPositionChange={(nodeId, position) => {
 *     // Persist position to backend
 *   }}
 * />
 * ```
 */
export function ThinkingCanvas({
  className,
  insights,
  onNodeSelect,
  onPositionChange,
  session,
  showChatPanel = true,
}: ThinkingCanvasProps) {
  const reactFlowInstance = useRef<null | ReactFlowInstance<CanvasNode, CanvasEdge>>(null);

  // Chat panel state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [insightDialogOpen, setInsightDialogOpen] = useState(false);
  const [insightParentNode, setInsightParentNode] = useState<CanvasNode | null>(null);
  const panelWidth = usePanelWidth();

  // Node management dialog state (Requirements 2.1, 5.1, 3.1, 6.1)
  const [addAssumptionDialogOpen, setAddAssumptionDialogOpen] = useState(false);
  const [addContextDialogOpen, setAddContextDialogOpen] = useState(false);
  const [linkConstraintDialogOpen, setLinkConstraintDialogOpen] = useState(false);
  const [deleteNodeDialogOpen, setDeleteNodeDialogOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<CanvasNode | null>(null);
  const [nodeToLink, setNodeToLink] = useState<CanvasNode | null>(null);

  // Context menu state (Requirements 3.1, 6.1)
  const [contextMenu, setContextMenu] = useState<null | {
    node: CanvasNode;
    x: number;
    y: number;
  }>(null);

  // Store state
  const nodes = useCanvasNodes();
  const edges = useCanvasEdges();
  const currentZoom = useCanvasZoom();
  const selectedNode = useSelectedNode();
  const relationshipEdges = useRelationshipEdges();
  const { onEdgesChange, onNodesChange } = useCanvasChangeHandlers();
  const {
    addAssumption,
    addContext,
    canDeleteNode,
    createInsightNode,
    createRelationship,
    deleteNode,
    getDependentNodes,
    initializeFromSession,
    selectNode,
    setViewport,
    updateNodePosition,
  } = useCanvasActions();

  // Computed values for node counts
  const rootCount = useMemo(() => nodes.filter((n) => n.type === 'root').length, [nodes]);
  const soilCount = useMemo(() => nodes.filter((n) => n.type === 'soil').length, [nodes]);

  // Get available constraints (Soil nodes) for linking
  const availableConstraints = useMemo(() => nodes.filter((n) => n.type === 'soil'), [nodes]);

  // Get existing links for the selected node
  const existingLinks = useMemo(() => {
    if (!nodeToLink) {
      return [];
    }
    return relationshipEdges
      .filter((r) => r.sourceNodeId === nodeToLink.id)
      .map((r) => r.targetNodeId);
  }, [nodeToLink, relationshipEdges]);

  // Get dependent nodes for deletion
  const dependentNodes = useMemo(() => {
    if (!nodeToDelete) {
      return [];
    }
    return getDependentNodes(nodeToDelete.id);
  }, [nodeToDelete, getDependentNodes]);

  // Convert relationship edges to React Flow edges and merge with structural edges (Requirement 3.4)
  const allEdges = useMemo(() => {
    const relationshipFlowEdges: CanvasEdge[] = relationshipEdges.map((rel) => ({
      id: rel.id,
      source: rel.sourceNodeId,
      target: rel.targetNodeId,
      type: 'relationship',
    }));

    // Ensure structural edges have visible styling
    const structuralEdges = edges.map((edge) => ({
      ...edge,
      style: { ...edge.style, stroke: 'var(--muted-foreground)', strokeWidth: 1.5 },
      type: edge.type || 'default',
    }));

    return [...structuralEdges, ...relationshipFlowEdges];
  }, [edges, relationshipEdges]);

  // Initialize canvas from session on mount or session change (Requirement 1.3)
  useEffect(() => {
    initializeFromSession(session, insights);
  }, [session, insights, initializeFromSession]);

  /**
   * Handle node selection changes
   * Maintains single selection invariant
   */
  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      const selected = selectedNodes[0] as CanvasNode | undefined;
      const nodeId = selected?.id ?? null;
      const nodeType = selected?.type as 'insight' | 'root' | 'seed' | 'soil' | undefined;

      selectNode(nodeId);

      if (onNodeSelect && nodeType) {
        onNodeSelect(nodeId, nodeType);
      }
    },
    [selectNode, onNodeSelect]
  );

  /**
   * Handle node click
   * Opens chat panel when a node is clicked (Requirement 1.1, 5.1)
   */
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: CanvasNode) => {
      if (showChatPanel) {
        setIsChatOpen(true);
      }
      // Ensure selection happens on click (redundant but safe)
      selectNode(node.id);
    },
    [showChatPanel, selectNode]
  );

  /**
   * Handle node drag end
   * Persists new position via callback
   */
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: CanvasNode) => {
      updateNodePosition(node.id, node.position);

      if (onPositionChange) {
        onPositionChange(node.id, node.position);
      }
    },
    [updateNodePosition, onPositionChange]
  );

  /**
   * Handle pane click (deselect nodes)
   * Does not close chat panel - user must explicitly close it
   */
  const handlePaneClick = useCallback(() => {
    selectNode(null);
    if (onNodeSelect) {
      onNodeSelect(null, 'seed');
    }
  }, [selectNode, onNodeSelect]);

  /**
   * Handle closing the chat panel
   */
  const handleCloseChatPanel = useCallback(() => {
    setIsChatOpen(false);
    selectNode(null);
  }, [selectNode]);

  /**
   * Handle insight creation from chat panel
   * Opens the InsightNodeDialog for user to enter insight label
   */
  const handleInsightCreate = useCallback(
    (insight: InsightNodeData) => {
      // Find the parent node
      const parentNode = nodes.find((n) => n.id === insight.parentNodeId);
      if (parentNode) {
        setInsightParentNode(parentNode);
        setInsightDialogOpen(true);
      }
    },
    [nodes]
  );

  /**
   * Handle confirming insight creation from dialog
   */
  const handleInsightConfirm = useCallback(
    async (label: string) => {
      if (insightParentNode) {
        const newNodeId = await createInsightNode(insightParentNode.id, label);
        if (newNodeId) {
          // Select the newly created insight node
          selectNode(newNodeId);
        }
      }
      setInsightDialogOpen(false);
      setInsightParentNode(null);
    },
    [insightParentNode, createInsightNode, selectNode]
  );

  /**
   * Handle adding a new assumption (Requirement 2.1)
   */
  const handleAddAssumption = useCallback(
    async (assumption: string) => {
      const nodeId = await addAssumption(assumption);
      if (nodeId) {
        selectNode(nodeId);
      }
    },
    [addAssumption, selectNode]
  );

  /**
   * Handle adding a new context item (Requirement 5.1)
   */
  const handleAddContext = useCallback(
    async (context: string) => {
      const nodeId = await addContext(context);
      if (nodeId) {
        selectNode(nodeId);
      }
    },
    [addContext, selectNode]
  );

  /**
   * Handle opening the link constraint dialog (Requirement 3.1)
   */
  const handleOpenLinkConstraint = useCallback((node: CanvasNode) => {
    setNodeToLink(node);
    setLinkConstraintDialogOpen(true);
  }, []);

  /**
   * Handle creating a relationship link (Requirement 3.1)
   */
  const handleCreateRelationship = useCallback(
    async (constraintNodeId: string) => {
      if (nodeToLink) {
        await createRelationship(nodeToLink.id, constraintNodeId);
      }
    },
    [nodeToLink, createRelationship]
  );

  /**
   * Handle opening the delete node dialog (Requirement 6.1)
   */
  const handleOpenDeleteNode = useCallback((node: CanvasNode) => {
    setNodeToDelete(node);
    setDeleteNodeDialogOpen(true);
  }, []);

  /**
   * Handle confirming node deletion (Requirement 6.1)
   */
  const handleDeleteNode = useCallback(
    async (deleteDependents: boolean) => {
      if (nodeToDelete) {
        await deleteNode(nodeToDelete.id, deleteDependents);
        selectNode(null);
      }
    },
    [nodeToDelete, deleteNode, selectNode]
  );

  /**
   * Handle node context menu (right-click) (Requirements 3.1, 6.1)
   */
  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: CanvasNode) => {
    event.preventDefault();
    setContextMenu({
      node,
      x: event.clientX,
      y: event.clientY,
    });
  }, []);

  /**
   * Close context menu
   */
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  /**
   * Handle context menu action: Link to Constraint (Requirement 3.1)
   */
  const handleContextMenuLinkConstraint = useCallback(() => {
    if (contextMenu) {
      handleOpenLinkConstraint(contextMenu.node);
      setContextMenu(null);
    }
  }, [contextMenu, handleOpenLinkConstraint]);

  /**
   * Handle context menu action: Delete Node (Requirement 6.1)
   */
  const handleContextMenuDeleteNode = useCallback(() => {
    if (contextMenu) {
      handleOpenDeleteNode(contextMenu.node);
      setContextMenu(null);
    }
  }, [contextMenu, handleOpenDeleteNode]);

  /**
   * Handle zoom in
   */
  const handleZoomIn = useCallback(() => {
    if (reactFlowInstance.current) {
      const newZoom = Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM);
      reactFlowInstance.current.zoomTo(newZoom, { duration: 200 });
    }
  }, [currentZoom]);

  /**
   * Handle zoom out
   */
  const handleZoomOut = useCallback(() => {
    if (reactFlowInstance.current) {
      const newZoom = Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM);
      reactFlowInstance.current.zoomTo(newZoom, { duration: 200 });
    }
  }, [currentZoom]);

  /**
   * Handle fit view (double-click on empty space)
   */
  const handleFitView = useCallback(() => {
    if (reactFlowInstance.current) {
      reactFlowInstance.current.fitView(FIT_VIEW_OPTIONS);
    }
  }, []);

  /**
   * Handle viewport change
   */
  const handleMoveEnd = useCallback(
    (_event: MouseEvent | null | TouchEvent, viewport: { x: number; y: number; zoom: number }) => {
      setViewport(viewport);
    },
    [setViewport]
  );

  /**
   * Handle React Flow initialization
   */
  const handleInit = useCallback((instance: ReactFlowInstance<CanvasNode, CanvasEdge>) => {
    reactFlowInstance.current = instance;
    // Fit view on initial load
    setTimeout(() => {
      instance.fitView(FIT_VIEW_OPTIONS);
    }, 100);
  }, []);

  /**
   * Handle starting dialogue from node panel
   */
  const handleStartDialogue = useCallback(() => {
    setIsChatOpen(true);
  }, []);

  /**
   * Close node panel
   */
  const handleClosePanel = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  // Calculate canvas width adjustment when chat panel is open
  const canvasStyle = showChatPanel && isChatOpen ? { marginRight: panelWidth } : undefined;

  return (
    <div className={cn('relative h-full w-full', className)}>
      {/* Canvas area - adjusts width when chat panel is open (Requirement 7.3) */}
      <div className="h-full w-full transition-[margin] duration-200" style={canvasStyle}>
        <ReactFlow<CanvasNode, CanvasEdge>
          edges={allEdges}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={FIT_VIEW_OPTIONS}
          maxZoom={MAX_ZOOM}
          minZoom={MIN_ZOOM}
          nodes={nodes}
          nodeTypes={nodeTypes}
          onEdgesChange={onEdgesChange}
          onInit={handleInit}
          onMoveEnd={handleMoveEnd}
          onNodeClick={handleNodeClick}
          onNodeContextMenu={handleNodeContextMenu}
          onNodeDragStop={handleNodeDragStop}
          onNodesChange={onNodesChange}
          onPaneClick={handlePaneClick}
          onSelectionChange={handleSelectionChange}
          panOnDrag
          panOnScroll={false}
          selectionOnDrag={false}
          zoomOnDoubleClick={false}
          zoomOnPinch
          zoomOnScroll
        >
          {/* Background pattern */}
          <Background
            color="hsl(var(--muted-foreground) / 0.2)"
            gap={20}
            variant={BackgroundVariant.Dots}
          />
        </ReactFlow>

        {/* Node context menu (Requirements 3.1, 6.1) */}
        {contextMenu && (
          <div
            className="fixed z-50 min-w-[160px] rounded-md border bg-popover p-1 shadow-md"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {/* Link to Constraint - only for Root nodes */}
            {contextMenu.node.type === 'root' && (
              <button
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={handleContextMenuLinkConstraint}
              >
                <Link2 className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                Link to Constraint
              </button>
            )}
            {/* Delete - only for deletable nodes */}
            {canDeleteNode(contextMenu.node.id) && (
              <button
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                onClick={handleContextMenuDeleteNode}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </button>
            )}
            {/* Show message if no actions available */}
            {contextMenu.node.type !== 'root' && !canDeleteNode(contextMenu.node.id) && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">No actions available</div>
            )}
          </div>
        )}

        {/* Click outside to close context menu */}
        {contextMenu && <div className="fixed inset-0 z-40" onClick={handleCloseContextMenu} />}

        {/* Toolbar - top left (Requirements 2.1, 5.1) */}
        <div className="absolute top-4 left-4 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2" size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                disabled={rootCount >= 8}
                onClick={() => setAddAssumptionDialogOpen(true)}
              >
                <TreeDeciduous className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400" />
                Add Assumption
                {rootCount >= 8 && (
                  <span className="ml-2 text-xs text-muted-foreground">(max 8)</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={soilCount >= 10}
                onClick={() => setAddContextDialogOpen(true)}
              >
                <Layers className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                Add Context
                {soilCount >= 10 && (
                  <span className="ml-2 text-xs text-muted-foreground">(max 10)</span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Zoom controls - bottom left */}
        <div className="absolute bottom-4 left-4 z-10">
          <ZoomControls
            currentZoom={currentZoom}
            maxZoom={MAX_ZOOM}
            minZoom={MIN_ZOOM}
            onFitView={handleFitView}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
          />
        </div>

        {/* Legend - bottom right (adjusts position when chat panel is open) */}
        <div
          className="absolute bottom-4 z-10 transition-[right] duration-200"
          style={{ right: showChatPanel && isChatOpen ? panelWidth + 16 : 16 }}
        >
          <CanvasLegend showExplorationStatus />
        </div>

        {/* Node panel - top right (hidden when chat panel is open) */}
        {(!showChatPanel || !isChatOpen) && (
          <div className="absolute right-4 top-4 z-10">
            <NodePanel
              onClose={handleClosePanel}
              onStartDialogue={handleStartDialogue}
              selectedNode={selectedNode}
            />
          </div>
        )}
      </div>

      {/* Chat panel - right side (Requirement 1.1, 5.1) */}
      {showChatPanel && isChatOpen && (
        <NodeChatPanel
          onClose={handleCloseChatPanel}
          onInsightCreate={handleInsightCreate}
          selectedNode={selectedNode}
          sessionId={session.id}
        />
      )}

      {/* Insight creation dialog (Requirement 3.1, 3.2) */}
      <InsightNodeDialog
        onConfirm={handleInsightConfirm}
        onOpenChange={setInsightDialogOpen}
        open={insightDialogOpen}
        parentNode={insightParentNode}
      />

      {/* Add Assumption dialog (Requirement 2.1, 2.2, 2.6) */}
      <AddAssumptionDialog
        currentCount={rootCount}
        maxCount={8}
        onConfirm={handleAddAssumption}
        onOpenChange={setAddAssumptionDialogOpen}
        open={addAssumptionDialogOpen}
      />

      {/* Add Context dialog (Requirement 5.1, 5.2, 5.6) */}
      <AddContextDialog
        currentCount={soilCount}
        maxCount={10}
        onConfirm={handleAddContext}
        onOpenChange={setAddContextDialogOpen}
        open={addContextDialogOpen}
      />

      {/* Link Constraint dialog (Requirement 3.1, 3.2) */}
      <LinkConstraintDialog
        availableConstraints={availableConstraints}
        existingLinks={existingLinks}
        onConfirm={handleCreateRelationship}
        onOpenChange={setLinkConstraintDialogOpen}
        open={linkConstraintDialogOpen}
        sourceNode={nodeToLink}
      />

      {/* Delete Node dialog (Requirement 6.1, 6.4) */}
      <DeleteNodeDialog
        dependentNodes={dependentNodes}
        node={nodeToDelete}
        onConfirm={handleDeleteNode}
        onOpenChange={setDeleteNodeDialogOpen}
        open={deleteNodeDialogOpen}
      />
    </div>
  );
}
