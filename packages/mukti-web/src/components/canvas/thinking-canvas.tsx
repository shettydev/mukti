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
import { useCallback, useEffect, useRef, useState } from 'react';
import '@xyflow/react/dist/style.css';

import type { CanvasEdge, CanvasNode, Position } from '@/types/canvas-visualization.types';
import type { CanvasSession } from '@/types/canvas.types';

import {
  useCanvasActions,
  useCanvasChangeHandlers,
  useCanvasEdges,
  useCanvasNodes,
  useCanvasZoom,
  useSelectedNode,
} from '@/lib/stores/canvas-store';
import { usePanelWidth } from '@/lib/stores/chat-store';
import { cn } from '@/lib/utils';
import { MAX_ZOOM, MIN_ZOOM } from '@/types/canvas-visualization.types';

import type { InsightNodeData } from './chat/node-chat-panel';

import { NodeChatPanel } from './chat';
import { CanvasLegend, NodePanel, ZoomControls } from './controls';
import { InsightNodeDialog } from './insight-node-dialog';
import { nodeTypes } from './nodes';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for ThinkingCanvas component
 * @property className - Optional additional CSS classes
 * @property onNodeSelect - Callback when a node is selected
 * @property onPositionChange - Callback when a node position changes (for persistence)
 * @property session - The canvas session data to visualize
 * @property showChatPanel - Whether to show the chat panel (default: true)
 */
export interface ThinkingCanvasProps {
  className?: string;
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

  // Store state
  const nodes = useCanvasNodes();
  const edges = useCanvasEdges();
  const currentZoom = useCanvasZoom();
  const selectedNode = useSelectedNode();
  const { onEdgesChange, onNodesChange } = useCanvasChangeHandlers();
  const { createInsightNode, initializeFromSession, selectNode, setViewport, updateNodePosition } =
    useCanvasActions();

  // Initialize canvas from session on mount or session change
  useEffect(() => {
    initializeFromSession(session);
  }, [session, initializeFromSession]);

  /**
   * Handle node selection changes
   * Maintains single selection invariant
   * Opens chat panel when a node is selected (Requirement 1.1, 5.1)
   */
  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      const selected = selectedNodes[0] as CanvasNode | undefined;
      const nodeId = selected?.id ?? null;
      const nodeType = selected?.type as 'insight' | 'root' | 'seed' | 'soil' | undefined;

      selectNode(nodeId);

      // Open chat panel when a node is selected
      if (showChatPanel && nodeId) {
        setIsChatOpen(true);
      }

      if (onNodeSelect && nodeType) {
        onNodeSelect(nodeId, nodeType);
      }
    },
    [selectNode, onNodeSelect, showChatPanel]
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
    (label: string) => {
      if (insightParentNode) {
        const newNodeId = createInsightNode(insightParentNode.id, label);
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
          edges={edges}
          fitView
          fitViewOptions={FIT_VIEW_OPTIONS}
          maxZoom={MAX_ZOOM}
          minZoom={MIN_ZOOM}
          nodes={nodes}
          nodeTypes={nodeTypes}
          onEdgesChange={onEdgesChange}
          onInit={handleInit}
          onMoveEnd={handleMoveEnd}
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
            <NodePanel onClose={handleClosePanel} selectedNode={selectedNode} />
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
    </div>
  );
}
