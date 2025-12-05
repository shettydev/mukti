/**
 * Canvas store using Zustand
 * Manages the state for the Thinking Canvas visualization
 *
 * @remarks
 * - Handles React Flow nodes and edges state
 * - Manages node selection (single selection invariant)
 * - Tracks viewport state with zoom constraints
 * - Provides actions for node position updates
 * - Initializes layout from canvas session data
 */

import type { OnEdgesChange, OnNodesChange, Viewport } from '@xyflow/react';

import { applyEdgeChanges, applyNodeChanges } from '@xyflow/react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import type { CanvasEdge, CanvasNode, Position } from '@/types/canvas-visualization.types';
import type { CanvasSession } from '@/types/canvas.types';

import {
  calculateInsightPosition,
  generateLayout,
  getInsightNodeId,
  getNextInsightIndex,
} from '@/lib/utils/canvas-layout';
import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM } from '@/types/canvas-visualization.types';

// ============================================================================
// Types
// ============================================================================

/**
 * Canvas state interface
 * @property edges - React Flow edges connecting nodes
 * @property nodes - React Flow nodes (Seed, Soil, Root, Insight)
 * @property selectedNodeId - Currently selected node ID or null
 * @property viewport - Current viewport state (position and zoom)
 */
interface CanvasState {
  // Actions
  createInsightNode: (parentNodeId: string, label: string) => null | string;
  // State
  edges: CanvasEdge[];
  initializeFromSession: (session: CanvasSession) => void;
  nodes: CanvasNode[];
  // React Flow change handlers
  onEdgesChange: OnEdgesChange<CanvasEdge>;

  onNodesChange: OnNodesChange<CanvasNode>;
  selectedNodeId: null | string;

  selectNode: (nodeId: null | string) => void;
  setEdges: (edges: CanvasEdge[]) => void;
  setNodes: (nodes: CanvasNode[]) => void;
  setViewport: (viewport: Viewport) => void;
  updateNodePosition: (nodeId: string, position: Position) => void;
  viewport: Viewport;
}

// ============================================================================
// Initial State
// ============================================================================

/**
 * Initial viewport state
 */
const initialViewport: Viewport = {
  x: 0,
  y: 0,
  zoom: DEFAULT_ZOOM,
};

/**
 * Initial state for the canvas store
 */
const initialState = {
  edges: [] as CanvasEdge[],
  nodes: [] as CanvasNode[],
  selectedNodeId: null as null | string,
  viewport: initialViewport,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Clamps zoom level between MIN_ZOOM and MAX_ZOOM
 * @param zoom - The zoom level to clamp
 * @returns Clamped zoom level
 */
function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

// ============================================================================
// Store
// ============================================================================

/**
 * Canvas store for managing the Thinking Canvas visualization state
 *
 * @example
 * ```typescript
 * const { nodes, edges, selectNode, initializeFromSession } = useCanvasStore();
 *
 * // Initialize from session data
 * initializeFromSession(canvasSession);
 *
 * // Select a node
 * selectNode('soil-0');
 *
 * // Deselect
 * selectNode(null);
 * ```
 */
export const useCanvasStore = create<CanvasState>()((set, get) => ({
  ...initialState,

  /**
   * Create a new insight node connected to a parent node
   * @param parentNodeId - ID of the parent node
   * @param label - Label for the new insight node
   * @returns The ID of the created insight node, or null if parent not found
   */
  createInsightNode: (parentNodeId: string, label: string): null | string => {
    const { edges, nodes } = get();

    // Find the parent node
    const parentNode = nodes.find((n) => n.id === parentNodeId);
    if (!parentNode) {
      return null;
    }

    // Get the next available insight index
    const insightIndex = getNextInsightIndex(nodes);
    const insightNodeId = getInsightNodeId(insightIndex);

    // Calculate position relative to parent
    const position = calculateInsightPosition(parentNode, nodes);

    // Create the new insight node
    const insightNode: CanvasNode = {
      data: {
        isExplored: false,
        label,
        parentNodeId,
      },
      id: insightNodeId,
      position,
      type: 'insight',
    };

    // Create edge connecting insight to parent
    const insightEdge: CanvasEdge = {
      id: `edge-${parentNodeId}-${insightNodeId}`,
      source: parentNodeId,
      target: insightNodeId,
    };

    set({
      edges: [...edges, insightEdge],
      nodes: [...nodes, insightNode],
    });

    return insightNodeId;
  },

  /**
   * Initialize canvas from a session
   * Generates layout from problem structure and applies any saved positions
   * @param session - The canvas session to initialize from
   */
  initializeFromSession: (session: CanvasSession) => {
    // Generate initial layout from problem structure
    const { edges, nodes: layoutNodes } = generateLayout(session.problemStructure);

    // Apply any saved node positions
    const nodes = layoutNodes.map((node) => {
      const savedPosition = session.nodePositions?.find((np) => np.nodeId === node.id);
      if (savedPosition) {
        return {
          ...node,
          position: { x: savedPosition.x, y: savedPosition.y },
        };
      }
      return node;
    });

    // Mark explored nodes
    const nodesWithExploration = nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        isExplored: session.exploredNodes?.includes(node.id) ?? false,
      },
    }));

    set({
      edges,
      nodes: nodesWithExploration,
      selectedNodeId: null,
      viewport: initialViewport,
    });
  },

  /**
   * Handle edge changes from React Flow
   * @param changes - Edge changes to apply
   */
  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges) as CanvasEdge[],
    }));
  },

  /**
   * Handle node changes from React Flow
   * @param changes - Node changes to apply
   */
  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as CanvasNode[],
    }));
  },

  /**
   * Select a node (maintains single selection invariant)
   * @param nodeId - Node ID to select, or null to deselect
   */
  selectNode: (nodeId: null | string) => {
    const { nodes } = get();

    // Update selection state on all nodes
    const updatedNodes = nodes.map((node) => ({
      ...node,
      selected: node.id === nodeId,
    }));

    set({
      nodes: updatedNodes,
      selectedNodeId: nodeId,
    });
  },

  /**
   * Set edges directly
   * @param edges - New edges array
   */
  setEdges: (edges: CanvasEdge[]) => set({ edges }),

  /**
   * Set nodes directly
   * @param nodes - New nodes array
   */
  setNodes: (nodes: CanvasNode[]) => set({ nodes }),

  /**
   * Set viewport with zoom clamping
   * @param viewport - New viewport state
   */
  setViewport: (viewport: Viewport) => {
    set({
      viewport: {
        ...viewport,
        zoom: clampZoom(viewport.zoom),
      },
    });
  },

  /**
   * Update a single node's position
   * @param nodeId - ID of the node to update
   * @param position - New position coordinates
   */
  updateNodePosition: (nodeId: string, position: Position) => {
    set((state) => ({
      nodes: state.nodes.map((node) => (node.id === nodeId ? { ...node, position } : node)),
    }));
  },
}));

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Get the current edges
 */
export const useCanvasEdges = () => useCanvasStore((state) => state.edges);

/**
 * Get the current nodes
 */
export const useCanvasNodes = () => useCanvasStore((state) => state.nodes);

/**
 * Get the currently selected node
 */
export const useSelectedNode = () =>
  useCanvasStore((state) => {
    if (!state.selectedNodeId) {
      return null;
    }
    return state.nodes.find((node) => node.id === state.selectedNodeId) ?? null;
  });

/**
 * Get the selected node ID
 */
export const useSelectedNodeId = () => useCanvasStore((state) => state.selectedNodeId);

/**
 * Get the current viewport
 */
export const useCanvasViewport = () => useCanvasStore((state) => state.viewport);

/**
 * Get the current zoom level
 */
export const useCanvasZoom = () => useCanvasStore((state) => state.viewport.zoom);

/**
 * Get node and edge change handlers for React Flow
 * Uses useShallow to prevent infinite re-renders
 */
export const useCanvasChangeHandlers = () =>
  useCanvasStore(
    useShallow((state) => ({
      onEdgesChange: state.onEdgesChange,
      onNodesChange: state.onNodesChange,
    }))
  );

/**
 * Get canvas actions
 * Uses useShallow to prevent infinite re-renders
 */
export const useCanvasActions = () =>
  useCanvasStore(
    useShallow((state) => ({
      createInsightNode: state.createInsightNode,
      initializeFromSession: state.initializeFromSession,
      selectNode: state.selectNode,
      setEdges: state.setEdges,
      setNodes: state.setNodes,
      setViewport: state.setViewport,
      updateNodePosition: state.updateNodePosition,
    }))
  );
