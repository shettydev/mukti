/**
 * Thought Map store using Zustand
 * Manages the state for the Thought Map visualization
 *
 * @remarks
 * - Mirrors canvas-store.ts pattern: optimistic updates with rollback on failure
 * - Nodes stored as a Record<nodeId, ThoughtMapNode> for O(1) lookups
 * - All mutation actions (addNode, updateNode, deleteNode, setNodePosition) follow the
 *   pattern: optimistic update → API call → rollback on error
 * - createMap is a full async create with loading/error state
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import type {
  CreateThoughtMapRequest,
  CreateThoughtNodeRequest,
  ThoughtMap,
  ThoughtMapNode,
  UpdateThoughtNodeRequest,
} from '@/types/thought-map';

import { thoughtMapApi } from '@/lib/api/thought-map';

// ============================================================================
// Types
// ============================================================================

/**
 * Core state shape for the Thought Map store
 */
interface ThoughtMapState {
  /**
   * Add a new node with optimistic update and rollback
   * @returns The new node's nodeId, or null if failed
   */
  addNode: (dto: CreateThoughtNodeRequest) => Promise<null | string>;

  /**
   * Create a new Thought Map and load it into the store
   * Sets isLoading during the API call; sets error on failure
   */
  createMap: (dto: CreateThoughtMapRequest) => Promise<null | ThoughtMap>;

  /**
   * Delete a node with optimistic update and rollback
   * @param nodeId - Stable nodeId of the node to delete
   * @returns True on success, false on failure
   */
  deleteNode: (nodeId: string) => Promise<boolean>;

  /** Last error message, or null */
  error: null | string;
  /** True while an async operation is in flight */
  isLoading: boolean;
  /** Active thought map metadata, or null when unloaded */
  map: null | ThoughtMap;
  /** All nodes keyed by their stable nodeId */
  nodes: Record<string, ThoughtMapNode>;

  /**
   * Reset all state (e.g. on navigation away)
   */
  reset: () => void;

  /** Currently selected node's nodeId, or null */
  selectedNodeId: null | string;

  /**
   * Set the active map and nodes (used when loading an existing map)
   */
  setMap: (map: ThoughtMap, nodes: ThoughtMapNode[]) => void;

  /**
   * Update a node's x/y position locally (no API call)
   * Used during drag operations before persisting via updateNode
   */
  setNodePosition: (nodeId: string, x: number, y: number) => void;

  /**
   * Set the selected node by its nodeId (or null to deselect)
   */
  setSelectedNodeId: (nodeId: null | string) => void;

  /**
   * Update an existing node with optimistic update and rollback
   * @param nodeId - Stable nodeId of the node to update
   * @param dto - Fields to update
   * @returns True on success, false on failure
   */
  updateNode: (nodeId: string, dto: UpdateThoughtNodeRequest) => Promise<boolean>;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  error: null as null | string,
  isLoading: false,
  map: null as null | ThoughtMap,
  nodes: {} as Record<string, ThoughtMapNode>,
  selectedNodeId: null as null | string,
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert a ThoughtMapNode array to a Record keyed by nodeId
 */
function nodesToRecord(nodes: ThoughtMapNode[]): Record<string, ThoughtMapNode> {
  return nodes.reduce<Record<string, ThoughtMapNode>>((acc, node) => {
    acc[node.nodeId] = node;
    return acc;
  }, {});
}

// ============================================================================
// Store
// ============================================================================

/**
 * Thought Map Zustand store
 *
 * @example
 * ```typescript
 * const { map, nodes, addNode, setSelectedNodeId } = useThoughtMapStore();
 *
 * // Load an existing map
 * const { data } = useThoughtMap(mapId);
 * useEffect(() => {
 *   if (data) setMap(data.map, data.nodes);
 * }, [data, setMap]);
 *
 * // Add a node
 * await addNode({ mapId: map.id, label: 'New thought', parentNodeId: 'branch-0' });
 * ```
 */
export const useThoughtMapStore = create<ThoughtMapState>()((set, get) => ({
  ...initialState,

  /**
   * Add a new node with optimistic update + rollback
   */
  addNode: async (dto: CreateThoughtNodeRequest): Promise<null | string> => {
    const { map, nodes } = get();

    if (!map) {
      console.error('Cannot add node: No active thought map');
      return null;
    }

    // Generate a temporary nodeId for the optimistic node
    const tempNodeId = `leaf-temp-${Date.now()}`;
    const tempNode: ThoughtMapNode = {
      createdAt: new Date().toISOString(),
      depth: 2,
      id: `temp-${Date.now()}`,
      isExplored: false,
      label: dto.label,
      mapId: map.id,
      nodeId: tempNodeId,
      parentNodeId: dto.parentNodeId,
      position: { x: dto.x ?? 0, y: dto.y ?? 0 },
      type: 'leaf',
      updatedAt: new Date().toISOString(),
    };

    // Optimistic update
    set({
      nodes: { ...nodes, [tempNodeId]: tempNode },
    });

    try {
      const created = await thoughtMapApi.createThoughtNode(dto);

      // Replace temp node with real node from server
      const currentNodes = get().nodes;
      const { [tempNodeId]: _removed, ...rest } = currentNodes;
      set({
        nodes: { ...rest, [created.nodeId]: created },
      });

      return created.nodeId;
    } catch (err) {
      // Rollback: remove temp node
      console.error('Failed to add thought node:', err);
      const currentNodes = get().nodes;
      const { [tempNodeId]: _removed, ...rolledBack } = currentNodes;
      set({ nodes: rolledBack });
      return null;
    }
  },

  /**
   * Create a new Thought Map
   * Sets isLoading, then populates map (with a single topic node) on success.
   */
  createMap: async (dto: CreateThoughtMapRequest): Promise<null | ThoughtMap> => {
    set({ error: null, isLoading: true });

    try {
      const newMap = await thoughtMapApi.createThoughtMap(dto);

      // Fetch the full map+nodes to get the auto-created topic node
      const { map, nodes } = await thoughtMapApi.getThoughtMap(newMap.id);

      set({
        isLoading: false,
        map,
        nodes: nodesToRecord(nodes),
        selectedNodeId: null,
      });

      return map;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create thought map';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  /**
   * Delete a node with optimistic update + rollback
   */
  deleteNode: async (nodeId: string): Promise<boolean> => {
    const { map, nodes } = get();

    if (!map) {
      console.error('Cannot delete node: No active thought map');
      return false;
    }

    const existing = nodes[nodeId];
    if (!existing) {
      console.error(`Cannot delete node: nodeId "${nodeId}" not found`);
      return false;
    }

    // Protect the topic node
    if (existing.type === 'topic') {
      console.error('Cannot delete the topic node');
      return false;
    }

    // Optimistic remove
    const { [nodeId]: _removed, ...remainingNodes } = nodes;
    set({ nodes: remainingNodes });

    try {
      await thoughtMapApi.deleteThoughtNode(map.id, nodeId);
      return true;
    } catch (err) {
      // Rollback
      console.error('Failed to delete thought node:', err);
      set({ nodes: { ...get().nodes, [nodeId]: existing } });
      return false;
    }
  },

  /**
   * Reset store to initial state
   */
  reset: (): void => {
    set(initialState);
  },

  /**
   * Load an existing map and its nodes into the store
   */
  setMap: (map: ThoughtMap, nodes: ThoughtMapNode[]): void => {
    set({
      error: null,
      isLoading: false,
      map,
      nodes: nodesToRecord(nodes),
      selectedNodeId: null,
    });
  },

  /**
   * Update a node's position locally (no API call)
   */
  setNodePosition: (nodeId: string, x: number, y: number): void => {
    const { nodes } = get();
    const existing = nodes[nodeId];
    if (!existing) {
      return;
    }

    set({
      nodes: {
        ...nodes,
        [nodeId]: { ...existing, position: { x, y } },
      },
    });
  },

  /**
   * Set the selected node ID
   */
  setSelectedNodeId: (nodeId: null | string): void => {
    set({ selectedNodeId: nodeId });
  },

  /**
   * Update a node with optimistic update + rollback
   */
  updateNode: async (nodeId: string, dto: UpdateThoughtNodeRequest): Promise<boolean> => {
    const { map, nodes } = get();

    if (!map) {
      console.error('Cannot update node: No active thought map');
      return false;
    }

    const existing = nodes[nodeId];
    if (!existing) {
      console.error(`Cannot update node: nodeId "${nodeId}" not found`);
      return false;
    }

    // Optimistic update
    const optimisticNode: ThoughtMapNode = {
      ...existing,
      ...(dto.isExplored !== undefined && { isExplored: dto.isExplored }),
      ...(dto.label !== undefined && { label: dto.label }),
      ...(dto.x !== undefined && dto.y !== undefined && { position: { x: dto.x, y: dto.y } }),
      updatedAt: new Date().toISOString(),
    };

    set({ nodes: { ...nodes, [nodeId]: optimisticNode } });

    try {
      const updated = await thoughtMapApi.updateThoughtNode(map.id, nodeId, dto);
      set({ nodes: { ...get().nodes, [nodeId]: updated } });
      return true;
    } catch (err) {
      // Rollback
      console.error('Failed to update thought node:', err);
      set({ nodes: { ...get().nodes, [nodeId]: existing } });
      return false;
    }
  },
}));

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Get the active thought map metadata
 */
export const useThoughtMap = () => useThoughtMapStore((state) => state.map);

/**
 * Get all nodes as a Record<nodeId, ThoughtMapNode>
 */
export const useThoughtMapNodes = () => useThoughtMapStore((state) => state.nodes);

/**
 * Get the selected node by its nodeId
 */
export const useSelectedThoughtNode = () =>
  useThoughtMapStore((state) => {
    if (!state.selectedNodeId) {
      return null;
    }
    return state.nodes[state.selectedNodeId] ?? null;
  });

/**
 * Get the selected node ID
 */
export const useSelectedThoughtNodeId = () => useThoughtMapStore((state) => state.selectedNodeId);

/**
 * Get loading and error state
 */
export const useThoughtMapStatus = () =>
  useThoughtMapStore(
    useShallow((state) => ({
      error: state.error,
      isLoading: state.isLoading,
    }))
  );

/**
 * Get all store actions
 * Uses useShallow to prevent unnecessary re-renders
 */
export const useThoughtMapActions = () =>
  useThoughtMapStore(
    useShallow((state) => ({
      addNode: state.addNode,
      createMap: state.createMap,
      deleteNode: state.deleteNode,
      reset: state.reset,
      setMap: state.setMap,
      setNodePosition: state.setNodePosition,
      setSelectedNodeId: state.setSelectedNodeId,
      updateNode: state.updateNode,
    }))
  );
