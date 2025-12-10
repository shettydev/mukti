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
 * - Manages relationship edges between assumptions and constraints
 * - Handles dynamic node creation (assumptions, context, insights)
 * - Supports node deletion with cascade handling
 */

import type { OnEdgesChange, OnNodesChange, Viewport } from '@xyflow/react';

import { applyEdgeChanges, applyNodeChanges } from '@xyflow/react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import type { CanvasEdge, CanvasNode, Position } from '@/types/canvas-visualization.types';
import type { CanvasSession, InsightNode, RelationshipEdge } from '@/types/canvas.types';

import { canvasApi } from '@/lib/api/canvas';
import {
  calculateInsightPosition,
  generateLayout,
  getInsightNodeId,
  getNextInsightIndex,
  getRootNodeId,
  getSoilNodeId,
  isInsightNode,
  isRootNode,
  isSeedNode,
  isSoilNode,
  parseNodeId,
  SEED_NODE_ID,
} from '@/lib/utils/canvas-layout';
import {
  DEFAULT_LAYOUT,
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
} from '@/types/canvas-visualization.types';

// ============================================================================
// Types
// ============================================================================

/**
 * Canvas state interface
 * @property dynamicNodeIds - Array of node IDs added dynamically after setup
 * @property edges - React Flow edges connecting nodes
 * @property nodes - React Flow nodes (Seed, Soil, Root, Insight)
 * @property relationshipEdges - Array of relationship edges between assumptions and constraints
 * @property selectedNodeId - Currently selected node ID or null
 * @property sessionId - Current canvas session ID
 * @property viewport - Current viewport state (position and zoom)
 */
interface CanvasState {
  // Actions - Node Management
  addAssumption: (label: string) => Promise<null | string>;
  addContext: (label: string) => Promise<null | string>;
  // Helper Functions
  canDeleteNode: (nodeId: string) => boolean;
  createInsightNode: (parentNodeId: string, label: string) => Promise<null | string>;
  createRelationship: (sourceNodeId: string, targetNodeId: string) => Promise<null | string>;
  deleteAssumption: (nodeId: string) => Promise<boolean>;
  deleteContext: (nodeId: string) => Promise<boolean>;
  deleteNode: (nodeId: string, deleteDependents?: boolean) => Promise<boolean>;
  deleteRelationship: (relationshipId: string) => Promise<boolean>;
  // State
  dynamicNodeIds: string[];
  edges: CanvasEdge[];
  getDependentNodes: (nodeId: string) => CanvasNode[];
  getNodeRelationships: (nodeId: string) => RelationshipEdge[];
  // Actions - Initialization and State Management
  initializeFromSession: (session: CanvasSession, insights?: InsightNode[]) => void;
  nodes: CanvasNode[];
  // React Flow change handlers
  onEdgesChange: OnEdgesChange<CanvasEdge>;
  onNodesChange: OnNodesChange<CanvasNode>;
  relationshipEdges: RelationshipEdge[];
  selectedNodeId: null | string;
  // Actions - Selection and Position
  selectNode: (nodeId: null | string) => void;
  sessionId: null | string;
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
  dynamicNodeIds: [] as string[],
  edges: [] as CanvasEdge[],
  nodes: [] as CanvasNode[],
  relationshipEdges: [] as RelationshipEdge[],
  selectedNodeId: null as null | string,
  sessionId: null as null | string,
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
 * initializeFromSession(canvasSession, insights);
 *
 * // Select a node
 * selectNode('soil-0');
 *
 * // Add a new assumption
 * await addAssumption('New assumption text');
 *
 * // Create a relationship
 * await createRelationship('root-0', 'soil-1');
 *
 * // Deselect
 * selectNode(null);
 * ```
 */
export const useCanvasStore = create<CanvasState>()((set, get) => ({
  ...initialState,

  /**
   * Add a new assumption (Root node) to the canvas
   * @param label - The assumption text
   * @returns The ID of the created node, or null if failed
   */
  addAssumption: async (label: string): Promise<null | string> => {
    const { dynamicNodeIds, edges, nodes, sessionId } = get();

    if (!sessionId) {
      console.error('Cannot add assumption: No session ID');
      return null;
    }

    // Check limit (max 8 roots)
    const rootCount = nodes.filter((n) => n.type === 'root').length;
    if (rootCount >= 8) {
      console.error('Cannot add assumption: Maximum limit of 8 reached');
      return null;
    }

    // Calculate the new node index
    const newIndex = nodes.filter((n) => n.type === 'root').length;
    const tempNodeId = getRootNodeId(newIndex);

    // Calculate position using layout algorithm
    const rootAngleStep =
      newIndex === 0 ? 0 : (DEFAULT_LAYOUT.rootEndAngle - DEFAULT_LAYOUT.rootStartAngle) / newIndex;
    const angle =
      newIndex === 0
        ? (DEFAULT_LAYOUT.rootStartAngle + DEFAULT_LAYOUT.rootEndAngle) / 2
        : DEFAULT_LAYOUT.rootStartAngle + newIndex * rootAngleStep;

    const position: Position = {
      x: DEFAULT_LAYOUT.centerX + Math.cos(angle) * DEFAULT_LAYOUT.rootRadius,
      y: DEFAULT_LAYOUT.centerY + Math.sin(angle) * DEFAULT_LAYOUT.rootRadius,
    };

    // Create temporary node for optimistic update
    const tempNode: CanvasNode = {
      data: {
        index: newIndex,
        isExplored: false,
        label,
      },
      id: tempNodeId,
      position,
      type: 'root',
    };

    const tempEdge: CanvasEdge = {
      id: `edge-seed-${tempNodeId}`,
      source: SEED_NODE_ID,
      target: tempNodeId,
    };

    // Optimistic update
    set({
      dynamicNodeIds: [...dynamicNodeIds, tempNodeId],
      edges: [...edges, tempEdge],
      nodes: [...nodes, tempNode],
    });

    try {
      // Call API
      await canvasApi.addAssumption(sessionId, { assumption: label });
      return tempNodeId;
    } catch (error) {
      // Rollback on error
      console.error('Failed to add assumption:', error);
      set({
        dynamicNodeIds: dynamicNodeIds.filter((id) => id !== tempNodeId),
        edges: edges.filter((e) => e.id !== tempEdge.id),
        nodes: nodes.filter((n) => n.id !== tempNodeId),
      });
      return null;
    }
  },

  /**
   * Add a new context item (Soil node) to the canvas
   * @param label - The context text
   * @returns The ID of the created node, or null if failed
   */
  addContext: async (label: string): Promise<null | string> => {
    const { dynamicNodeIds, edges, nodes, sessionId } = get();

    if (!sessionId) {
      console.error('Cannot add context: No session ID');
      return null;
    }

    // Check limit (max 10 soil)
    const soilCount = nodes.filter((n) => n.type === 'soil').length;
    if (soilCount >= 10) {
      console.error('Cannot add context: Maximum limit of 10 reached');
      return null;
    }

    // Calculate the new node index
    const newIndex = nodes.filter((n) => n.type === 'soil').length;
    const tempNodeId = getSoilNodeId(newIndex);

    // Calculate position using layout algorithm
    const soilAngleStep =
      newIndex === 0 ? 0 : (DEFAULT_LAYOUT.soilEndAngle - DEFAULT_LAYOUT.soilStartAngle) / newIndex;
    const angle =
      newIndex === 0
        ? (DEFAULT_LAYOUT.soilStartAngle + DEFAULT_LAYOUT.soilEndAngle) / 2
        : DEFAULT_LAYOUT.soilStartAngle + newIndex * soilAngleStep;

    const position: Position = {
      x: DEFAULT_LAYOUT.centerX + Math.cos(angle) * DEFAULT_LAYOUT.soilRadius,
      y: DEFAULT_LAYOUT.centerY + Math.sin(angle) * DEFAULT_LAYOUT.soilRadius,
    };

    // Create temporary node for optimistic update
    const tempNode: CanvasNode = {
      data: {
        index: newIndex,
        isExplored: false,
        label,
      },
      id: tempNodeId,
      position,
      type: 'soil',
    };

    const tempEdge: CanvasEdge = {
      id: `edge-seed-${tempNodeId}`,
      source: SEED_NODE_ID,
      target: tempNodeId,
    };

    // Optimistic update
    set({
      dynamicNodeIds: [...dynamicNodeIds, tempNodeId],
      edges: [...edges, tempEdge],
      nodes: [...nodes, tempNode],
    });

    try {
      // Call API
      await canvasApi.addContext(sessionId, { context: label });
      return tempNodeId;
    } catch (error) {
      // Rollback on error
      console.error('Failed to add context:', error);
      set({
        dynamicNodeIds: dynamicNodeIds.filter((id) => id !== tempNodeId),
        edges: edges.filter((e) => e.id !== tempEdge.id),
        nodes: nodes.filter((n) => n.id !== tempNodeId),
      });
      return null;
    }
  },

  /**
   * Check if a node can be deleted
   * @param nodeId - The node ID to check
   * @returns True if the node can be deleted
   */
  canDeleteNode: (nodeId: string): boolean => {
    const { dynamicNodeIds } = get();

    // Cannot delete seed node
    if (isSeedNode(nodeId)) {
      return false;
    }

    // Insight nodes can always be deleted
    if (isInsightNode(nodeId)) {
      return true;
    }

    // Root and Soil nodes can only be deleted if they were added dynamically
    if (isRootNode(nodeId) || isSoilNode(nodeId)) {
      return dynamicNodeIds.includes(nodeId);
    }

    return false;
  },

  /**
   * Create a new insight node connected to a parent node
   * @param parentNodeId - ID of the parent node
   * @param label - Label for the new insight node
   * @returns The ID of the created insight node, or null if parent not found
   */
  createInsightNode: async (parentNodeId: string, label: string): Promise<null | string> => {
    const { edges, nodes, sessionId } = get();

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

    // Optimistic update
    set({
      edges: [...edges, insightEdge],
      nodes: [...nodes, insightNode],
    });

    // If we have a session ID, persist to backend
    if (sessionId) {
      try {
        await canvasApi.createInsight(sessionId, {
          label,
          parentNodeId,
          x: position.x,
          y: position.y,
        });
      } catch (error) {
        // Rollback on error
        console.error('Failed to persist insight node:', error);
        set({
          edges: edges.filter((e) => e.id !== insightEdge.id),
          nodes: nodes.filter((n) => n.id !== insightNodeId),
        });
        return null;
      }
    }

    return insightNodeId;
  },

  /**
   * Create a relationship edge between an assumption and a constraint
   * @param sourceNodeId - The source node ID (must be a root-* node)
   * @param targetNodeId - The target node ID (must be a soil-* node)
   * @returns The relationship ID, or null if failed
   */
  createRelationship: async (
    sourceNodeId: string,
    targetNodeId: string
  ): Promise<null | string> => {
    const { relationshipEdges, sessionId } = get();

    if (!sessionId) {
      console.error('Cannot create relationship: No session ID');
      return null;
    }

    // Validate source is a root node and target is a soil node
    if (!isRootNode(sourceNodeId)) {
      console.error('Source node must be a root node');
      return null;
    }

    if (!isSoilNode(targetNodeId)) {
      console.error('Target node must be a soil node');
      return null;
    }

    // Check if relationship already exists
    const existingRelationship = relationshipEdges.find(
      (r) => r.sourceNodeId === sourceNodeId && r.targetNodeId === targetNodeId
    );
    if (existingRelationship) {
      console.error('Relationship already exists');
      return null;
    }

    const relationshipId = `rel-${sourceNodeId}-${targetNodeId}`;

    // Create temporary relationship for optimistic update
    const tempRelationship: RelationshipEdge = {
      id: relationshipId,
      sourceNodeId,
      targetNodeId,
    };

    // Optimistic update
    set({
      relationshipEdges: [...relationshipEdges, tempRelationship],
    });

    try {
      // Call API
      await canvasApi.createRelationship(sessionId, { sourceNodeId, targetNodeId });
      return relationshipId;
    } catch (error) {
      // Rollback on error
      console.error('Failed to create relationship:', error);
      set({
        relationshipEdges: relationshipEdges.filter((r) => r.id !== relationshipId),
      });
      return null;
    }
  },

  /**
   * Delete a dynamically-added assumption
   * @param nodeId - The node ID to delete
   * @returns True if deletion was successful
   */
  deleteAssumption: async (nodeId: string): Promise<boolean> => {
    const { dynamicNodeIds, edges, nodes, relationshipEdges, sessionId } = get();

    if (!sessionId) {
      console.error('Cannot delete assumption: No session ID');
      return false;
    }

    // Verify it's a root node and is dynamic
    if (!isRootNode(nodeId) || !dynamicNodeIds.includes(nodeId)) {
      console.error('Cannot delete: Node is not a dynamic assumption');
      return false;
    }

    // Get the index from the node ID
    const parsed = parseNodeId(nodeId);
    if (!parsed || parsed.index === undefined) {
      console.error('Cannot delete: Invalid node ID');
      return false;
    }

    // Store current state for rollback
    const previousNodes = nodes;
    const previousEdges = edges;
    const previousDynamicNodeIds = dynamicNodeIds;
    const previousRelationshipEdges = relationshipEdges;

    // Get dependent insight nodes
    const dependentInsights = nodes.filter(
      (n) => n.type === 'insight' && n.data.parentNodeId === nodeId
    );

    // Remove node, its edges, dependent insights, and relationships
    const nodesToRemove = [nodeId, ...dependentInsights.map((n) => n.id)];

    set({
      dynamicNodeIds: dynamicNodeIds.filter((id) => id !== nodeId),
      edges: edges.filter(
        (e) => !nodesToRemove.includes(e.source) && !nodesToRemove.includes(e.target)
      ),
      nodes: nodes.filter((n) => !nodesToRemove.includes(n.id)),
      relationshipEdges: relationshipEdges.filter((r) => r.sourceNodeId !== nodeId),
    });

    try {
      await canvasApi.deleteAssumption(sessionId, parsed.index);
      return true;
    } catch (error) {
      // Rollback on error
      console.error('Failed to delete assumption:', error);
      set({
        dynamicNodeIds: previousDynamicNodeIds,
        edges: previousEdges,
        nodes: previousNodes,
        relationshipEdges: previousRelationshipEdges,
      });
      return false;
    }
  },

  /**
   * Delete a dynamically-added context item
   * @param nodeId - The node ID to delete
   * @returns True if deletion was successful
   */
  deleteContext: async (nodeId: string): Promise<boolean> => {
    const { dynamicNodeIds, edges, nodes, relationshipEdges, sessionId } = get();

    if (!sessionId) {
      console.error('Cannot delete context: No session ID');
      return false;
    }

    // Verify it's a soil node and is dynamic
    if (!isSoilNode(nodeId) || !dynamicNodeIds.includes(nodeId)) {
      console.error('Cannot delete: Node is not a dynamic context');
      return false;
    }

    // Get the index from the node ID
    const parsed = parseNodeId(nodeId);
    if (!parsed || parsed.index === undefined) {
      console.error('Cannot delete: Invalid node ID');
      return false;
    }

    // Store current state for rollback
    const previousNodes = nodes;
    const previousEdges = edges;
    const previousDynamicNodeIds = dynamicNodeIds;
    const previousRelationshipEdges = relationshipEdges;

    // Get dependent insight nodes
    const dependentInsights = nodes.filter(
      (n) => n.type === 'insight' && n.data.parentNodeId === nodeId
    );

    // Remove node, its edges, dependent insights, and relationships
    const nodesToRemove = [nodeId, ...dependentInsights.map((n) => n.id)];

    set({
      dynamicNodeIds: dynamicNodeIds.filter((id) => id !== nodeId),
      edges: edges.filter(
        (e) => !nodesToRemove.includes(e.source) && !nodesToRemove.includes(e.target)
      ),
      nodes: nodes.filter((n) => !nodesToRemove.includes(n.id)),
      relationshipEdges: relationshipEdges.filter((r) => r.targetNodeId !== nodeId),
    });

    try {
      await canvasApi.deleteContext(sessionId, parsed.index);
      return true;
    } catch (error) {
      // Rollback on error
      console.error('Failed to delete context:', error);
      set({
        dynamicNodeIds: previousDynamicNodeIds,
        edges: previousEdges,
        nodes: previousNodes,
        relationshipEdges: previousRelationshipEdges,
      });
      return false;
    }
  },

  /**
   * Delete a node with optional cascade deletion of dependents
   * @param nodeId - The node ID to delete
   * @param deleteDependents - Whether to cascade delete child insights
   * @returns True if deletion was successful
   */
  deleteNode: async (nodeId: string, deleteDependents = false): Promise<boolean> => {
    const state = get();

    // Check if node can be deleted
    if (!state.canDeleteNode(nodeId)) {
      console.error('Cannot delete: Node is protected');
      return false;
    }

    // Handle insight nodes
    if (isInsightNode(nodeId)) {
      const { edges, nodes, sessionId } = state;

      // Store current state for rollback
      const previousNodes = nodes;
      const previousEdges = edges;

      // Get dependent insight nodes (insights that have this insight as parent)
      const dependentInsights = deleteDependents
        ? nodes.filter((n) => n.type === 'insight' && n.data.parentNodeId === nodeId)
        : [];

      const nodesToRemove = [nodeId, ...dependentInsights.map((n) => n.id)];

      // Remove node and its edges
      set({
        edges: edges.filter(
          (e) => !nodesToRemove.includes(e.source) && !nodesToRemove.includes(e.target)
        ),
        nodes: nodes.filter((n) => !nodesToRemove.includes(n.id)),
      });

      if (sessionId) {
        try {
          await canvasApi.deleteInsight(sessionId, nodeId);
          return true;
        } catch (error) {
          // Rollback on error
          console.error('Failed to delete insight:', error);
          set({
            edges: previousEdges,
            nodes: previousNodes,
          });
          return false;
        }
      }

      return true;
    }

    // Handle root nodes
    if (isRootNode(nodeId)) {
      return state.deleteAssumption(nodeId);
    }

    // Handle soil nodes
    if (isSoilNode(nodeId)) {
      return state.deleteContext(nodeId);
    }

    return false;
  },

  /**
   * Delete a relationship edge
   * @param relationshipId - The relationship ID to delete
   * @returns True if deletion was successful
   */
  deleteRelationship: async (relationshipId: string): Promise<boolean> => {
    const { relationshipEdges, sessionId } = get();

    if (!sessionId) {
      console.error('Cannot delete relationship: No session ID');
      return false;
    }

    // Find the relationship
    const relationship = relationshipEdges.find((r) => r.id === relationshipId);
    if (!relationship) {
      console.error('Relationship not found');
      return false;
    }

    // Store current state for rollback
    const previousRelationshipEdges = relationshipEdges;

    // Optimistic update
    set({
      relationshipEdges: relationshipEdges.filter((r) => r.id !== relationshipId),
    });

    try {
      await canvasApi.deleteRelationship(sessionId, relationshipId);
      return true;
    } catch (error) {
      // Rollback on error
      console.error('Failed to delete relationship:', error);
      set({
        relationshipEdges: previousRelationshipEdges,
      });
      return false;
    }
  },

  /**
   * Get all nodes that depend on a given node (child insights)
   * @param nodeId - The node ID to check
   * @returns Array of dependent nodes
   */
  getDependentNodes: (nodeId: string): CanvasNode[] => {
    const { nodes } = get();

    // Find all insight nodes that have this node as parent
    const directDependents = nodes.filter(
      (n) => n.type === 'insight' && n.data.parentNodeId === nodeId
    );

    // Recursively find dependents of dependents
    const allDependents: CanvasNode[] = [...directDependents];

    for (const dependent of directDependents) {
      const childDependents = get().getDependentNodes(dependent.id);
      allDependents.push(...childDependents);
    }

    return allDependents;
  },

  /**
   * Get all relationships for a given node
   * @param nodeId - The node ID to check
   * @returns Array of relationship edges involving this node
   */
  getNodeRelationships: (nodeId: string): RelationshipEdge[] => {
    const { relationshipEdges } = get();

    return relationshipEdges.filter((r) => r.sourceNodeId === nodeId || r.targetNodeId === nodeId);
  },

  /**
   * Initialize canvas from a session
   * Generates layout from problem structure and applies any saved positions
   * Loads insights and relationship edges from session data
   * @param session - The canvas session to initialize from
   * @param insights - Optional array of insight nodes to load
   */
  initializeFromSession: (session: CanvasSession, insights?: InsightNode[]) => {
    // Generate initial layout from problem structure
    const { edges: layoutEdges, nodes: layoutNodes } = generateLayout(session.problemStructure);

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

    // Convert insight nodes from backend format to canvas nodes
    const insightNodes: CanvasNode[] = (insights ?? []).map((insight) => ({
      data: {
        isExplored: insight.isExplored,
        label: insight.label,
        parentNodeId: insight.parentNodeId,
      },
      id: insight.nodeId,
      position: insight.position,
      type: 'insight' as const,
    }));

    // Create edges for insight nodes
    const insightEdges: CanvasEdge[] = insightNodes.map((insight) => ({
      id: `edge-${insight.data.parentNodeId}-${insight.id}`,
      source: insight.data.parentNodeId as string,
      target: insight.id,
    }));

    // Merge layout nodes with insight nodes
    const finalNodes = [...nodesWithExploration, ...insightNodes];
    const finalEdges = [...layoutEdges, ...insightEdges];

    set({
      dynamicNodeIds: session.dynamicNodeIds ?? [],
      edges: finalEdges,
      nodes: finalNodes,
      relationshipEdges: session.relationshipEdges ?? [],
      selectedNodeId: null,
      sessionId: session.id,
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
 * Get the relationship edges
 */
export const useRelationshipEdges = () => useCanvasStore((state) => state.relationshipEdges);

/**
 * Get the dynamic node IDs
 */
export const useDynamicNodeIds = () => useCanvasStore((state) => state.dynamicNodeIds);

/**
 * Get the current session ID
 */
export const useCanvasSessionId = () => useCanvasStore((state) => state.sessionId);

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
      addAssumption: state.addAssumption,
      addContext: state.addContext,
      canDeleteNode: state.canDeleteNode,
      createInsightNode: state.createInsightNode,
      createRelationship: state.createRelationship,
      deleteAssumption: state.deleteAssumption,
      deleteContext: state.deleteContext,
      deleteNode: state.deleteNode,
      deleteRelationship: state.deleteRelationship,
      getDependentNodes: state.getDependentNodes,
      getNodeRelationships: state.getNodeRelationships,
      initializeFromSession: state.initializeFromSession,
      selectNode: state.selectNode,
      setEdges: state.setEdges,
      setNodes: state.setNodes,
      setViewport: state.setViewport,
      updateNodePosition: state.updateNodePosition,
    }))
  );

/**
 * Get node management actions only
 * Uses useShallow to prevent infinite re-renders
 */
export const useNodeManagementActions = () =>
  useCanvasStore(
    useShallow((state) => ({
      addAssumption: state.addAssumption,
      addContext: state.addContext,
      canDeleteNode: state.canDeleteNode,
      createInsightNode: state.createInsightNode,
      createRelationship: state.createRelationship,
      deleteAssumption: state.deleteAssumption,
      deleteContext: state.deleteContext,
      deleteNode: state.deleteNode,
      deleteRelationship: state.deleteRelationship,
      getDependentNodes: state.getDependentNodes,
      getNodeRelationships: state.getNodeRelationships,
    }))
  );
