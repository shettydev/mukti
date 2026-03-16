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
 * - ghostNodes stores AI-suggested ghost nodes keyed by a client-side ghost ID
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import { thoughtMapApi } from '@/lib/api/thought-map';
import {
  type CreateThoughtMapRequest,
  type CreateThoughtNodeRequest,
  getThoughtMapNodeType,
  type ThoughtMap,
  type ThoughtMapNode,
  type ThoughtMapShareLink,
  type ThoughtMapWithNodes,
  type UpdateThoughtMapSettingsRequest,
  type UpdateThoughtNodeRequest,
} from '@/types/thought-map';

// ============================================================================
// Types
// ============================================================================

/**
 * Lifecycle state for the conversation → map extraction flow.
 *
 * idle      → user has not started extraction
 * processing → extraction job enqueued; waiting for SSE preview
 * preview   → draft map received from SSE; user reviewing before confirming
 * complete  → user confirmed the map; it is now "active"
 * error     → extraction or confirmation failed
 */
export type ExtractionState = 'complete' | 'error' | 'idle' | 'preview' | 'processing';

/**
 * A ghost node — an AI-suggested branch that is not yet persisted.
 * Displayed at 50–70% opacity with dashed border until accepted or dismissed.
 */
export interface GhostNode {
  /** Timestamp when this ghost was created — used for 60s auto-dismiss */
  createdAt: number;
  /** Unique client-side identifier (not a real nodeId) */
  ghostId: string;
  /** Suggested question label */
  label: string;
  /** nodeId of the parent node this branches from */
  parentId: string;
  /** Suggested node type */
  suggestedType: 'question' | 'thought';
}

/**
 * Core state shape for the Thought Map store
 */
interface ThoughtMapState {
  /**
   * Accept a ghost node: persists it as a real node via addNode, then removes the ghost.
   * @returns The new node's nodeId, or null if failed
   */
  acceptGhostNode: (ghostId: string) => Promise<null | string>;

  /**
   * Add a ghost node (AI suggestion) to the canvas.
   * Ignored if ≥4 ghosts already exist for the same parent.
   */
  addGhostNode: (ghost: Omit<GhostNode, 'createdAt' | 'ghostId'>) => void;

  /**
   * Add a new node with optimistic update and rollback
   * @returns The new node's nodeId, or null if failed
   */
  addNode: (dto: CreateThoughtNodeRequest) => Promise<null | string>;

  /**
   * Remove all ghost nodes (e.g. on store reset or map change)
   */
  clearGhostNodes: () => void;

  /**
   * Confirm the draft map: calls PATCH /thought-maps/:id/confirm,
   * then loads the confirmed map into the canvas store.
   * @returns The confirmed ThoughtMap, or null on failure
   */
  confirmDraftMap: () => Promise<null | ThoughtMap>;

  /**
   * Convert the currently-viewed CanvasSession into a new Thought Map.
   * Navigates to the new map on success.
   * @param sessionId - The CanvasSession ID to convert
   * @param title     - Optional title override
   * @returns The new ThoughtMapWithNodes on success, or null on failure
   */
  convertFromCanvas: (sessionId: string, title?: string) => Promise<null | ThoughtMapWithNodes>;

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

  /** Draft map received via SSE preview event, waiting for user confirmation */
  draftMap: null | ThoughtMapWithNodes;

  /** Last error message, or null */
  error: null | string;

  /** BullMQ job ID for the active extraction, or null */
  extractionJobId: null | string;

  /** Current phase of the conversation → map extraction flow */
  extractionState: ExtractionState;

  /** All ghost (AI-suggested) nodes keyed by ghostId */
  ghostNodes: Record<string, GhostNode>;

  /** True while the canvas→map conversion is in flight */
  isConverting: boolean;

  /** True while an async operation is in flight */
  isLoading: boolean;

  /**
   * Load the active share link for the current map into the store.
   * @returns The share link or null
   */
  loadShareLink: () => Promise<null | ThoughtMapShareLink>;

  /** Active thought map metadata, or null when unloaded */
  map: null | ThoughtMap;

  /** All nodes keyed by their stable nodeId */
  nodes: Record<string, ThoughtMapNode>;

  /**
   * Remove a single ghost node by its ghostId
   */
  removeGhostNode: (ghostId: string) => void;

  /**
   * Reset all state (e.g. on navigation away)
   */
  reset: () => void;

  /**
   * Reset extraction state back to idle (e.g. on dismiss or navigation)
   */
  resetExtraction: () => void;

  /**
   * Revoke the active share link for the current map.
   * @returns True on success
   */
  revokeShareLink: () => Promise<boolean>;

  /** Currently selected node's nodeId, or null */
  selectedNodeId: null | string;

  /**
   * Update extraction state and optionally store a draft map preview.
   */
  setExtractionPreview: (draftMap: ThoughtMapWithNodes) => void;

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

  /** Active share link for the current map, or null if not loaded / none exists */
  shareLink: null | ThoughtMapShareLink;

  /**
   * Create (or replace) a public share link for the current map.
   * @returns The new share link or null on failure
   */
  shareMap: (opts?: { expiresInDays?: number }) => Promise<null | ThoughtMapShareLink>;

  /**
   * Mark extraction as started with the given job ID.
   */
  startExtraction: (jobId: string) => void;

  /**
   * Update an existing node with optimistic update and rollback
   * @param nodeId - Stable nodeId of the node to update
   * @param dto - Fields to update
   * @returns True on success, false on failure
   */
  updateNode: (nodeId: string, dto: UpdateThoughtNodeRequest) => Promise<boolean>;

  /**
   * Update the auto-suggestion settings for the current map.
   * @param dto - Partial settings
   * @returns True on success
   */
  updateSettings: (dto: UpdateThoughtMapSettingsRequest) => Promise<boolean>;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  draftMap: null as null | ThoughtMapWithNodes,
  error: null as null | string,
  extractionJobId: null as null | string,
  extractionState: 'idle' as ExtractionState,
  ghostNodes: {} as Record<string, GhostNode>,
  isConverting: false,
  isLoading: false,
  map: null as null | ThoughtMap,
  nodes: {} as Record<string, ThoughtMapNode>,
  selectedNodeId: null as null | string,
  shareLink: null as null | ThoughtMapShareLink,
};

// ============================================================================
// Helpers
// ============================================================================

function buildOptimisticThoughtMapNode(
  map: ThoughtMap,
  nodes: Record<string, ThoughtMapNode>,
  dto: CreateThoughtNodeRequest
): ThoughtMapNode {
  const now = new Date().toISOString();
  const parentNode = nodes[dto.parentNodeId];
  const depth = parentNode ? parentNode.depth + 1 : 1;

  return {
    createdAt: now,
    depth,
    fromSuggestion: dto.fromSuggestion ?? false,
    id: `temp-${Date.now()}`,
    isCollapsed: false,
    isExplored: false,
    label: dto.label,
    mapId: map.id,
    messageCount: 0,
    nodeId: `node-temp-${Date.now()}`,
    parentNodeId: dto.parentNodeId,
    position: { x: dto.x ?? 0, y: dto.y ?? 0 },
    type: dto.type ?? getThoughtMapNodeType(depth),
    updatedAt: now,
  };
}

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
   * Accept a ghost node: persists it as a real node, then removes the ghost.
   */
  acceptGhostNode: async (ghostId: string): Promise<null | string> => {
    const { ghostNodes, map } = get();
    const ghost = ghostNodes[ghostId];

    if (!ghost || !map) {
      console.error(`Cannot accept ghost node: ghostId "${ghostId}" not found or no active map`);
      return null;
    }

    const nodeId = await get().addNode({
      fromSuggestion: true,
      label: ghost.label,
      mapId: map.id,
      parentNodeId: ghost.parentId,
      type: ghost.suggestedType,
    });

    // Remove the ghost regardless of success
    get().removeGhostNode(ghostId);

    return nodeId;
  },

  /**
   * Add a ghost node (AI suggestion) to the canvas.
   * Max 4 ghost nodes per parent node; excess suggestions are silently dropped.
   */
  addGhostNode: (ghost: Omit<GhostNode, 'createdAt' | 'ghostId'>): void => {
    const { ghostNodes } = get();

    // Enforce max 4 per parent
    const existingForParent = Object.values(ghostNodes).filter(
      (g) => g.parentId === ghost.parentId
    );
    if (existingForParent.length >= 4) {
      return;
    }

    const ghostId = `ghost-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newGhost: GhostNode = {
      ...ghost,
      createdAt: Date.now(),
      ghostId,
    };

    set({ ghostNodes: { ...ghostNodes, [ghostId]: newGhost } });
  },

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
    const tempNode = buildOptimisticThoughtMapNode(map, nodes, dto);
    const tempNodeId = tempNode.nodeId;

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
   * Remove all ghost nodes
   */
  clearGhostNodes: (): void => {
    set({ ghostNodes: {} });
  },

  /**
   * Confirm the draft map: PATCH /thought-maps/:id/confirm → loads the active map.
   */
  confirmDraftMap: async (): Promise<null | ThoughtMap> => {
    const { draftMap } = get();
    if (!draftMap) {
      console.error('Cannot confirm: no draft map in store');
      return null;
    }

    set({ isLoading: true });

    try {
      const confirmedMap = await thoughtMapApi.confirmMap(draftMap.map.id);

      // Load the confirmed map + nodes into the canvas state
      set({
        draftMap: null,
        extractionJobId: null,
        extractionState: 'complete',
        isLoading: false,
        map: confirmedMap,
        nodes: nodesToRecord(draftMap.nodes),
      });

      return confirmedMap;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to confirm map';
      set({ error: message, isLoading: false });
      return null;
    }
  },

  /**
   * Convert a CanvasSession into a new Thought Map.
   */
  convertFromCanvas: async (
    sessionId: string,
    title?: string
  ): Promise<null | ThoughtMapWithNodes> => {
    set({ isConverting: true });

    try {
      const result = await thoughtMapApi.convertFromCanvas(
        sessionId,
        title ? { title } : undefined
      );

      set({ isConverting: false });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to convert canvas';
      console.error('Failed to convert canvas to thought map:', err);
      set({ error: message, isConverting: false });
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
   * Delete a node and all its descendants with optimistic update + rollback.
   * Also clears ghost nodes whose parent is in the deleted subtree.
   */
  deleteNode: async (nodeId: string): Promise<boolean> => {
    const { ghostNodes, map, nodes } = get();

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
    if (existing.nodeId === map.rootNodeId || existing.type === 'topic') {
      console.error('Cannot delete the topic node');
      return false;
    }

    // BFS to collect all descendants
    const toDelete = new Set<string>([nodeId]);
    const queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const n of Object.values(nodes)) {
        if (n.parentNodeId === current && !toDelete.has(n.nodeId)) {
          toDelete.add(n.nodeId);
          queue.push(n.nodeId);
        }
      }
    }

    // Snapshot for rollback
    const snapshotNodes: Record<string, ThoughtMapNode> = {};
    for (const id of toDelete) {
      snapshotNodes[id] = nodes[id]!;
    }

    // Optimistic remove: nodes
    const remainingNodes = { ...nodes };
    for (const id of toDelete) {
      delete remainingNodes[id];
    }

    // Optimistic remove: ghost nodes whose parent is in the deleted subtree
    const remainingGhosts = { ...ghostNodes };
    for (const [gid, ghost] of Object.entries(ghostNodes)) {
      if (toDelete.has(ghost.parentId)) {
        delete remainingGhosts[gid];
      }
    }

    set({ ghostNodes: remainingGhosts, nodes: remainingNodes });

    try {
      await thoughtMapApi.deleteThoughtNode(map.id, nodeId);
      return true;
    } catch (err) {
      // Rollback
      console.error('Failed to delete thought node:', err);
      set({
        ghostNodes: { ...get().ghostNodes, ...ghostNodes },
        nodes: { ...get().nodes, ...snapshotNodes },
      });
      return false;
    }
  },

  /**
   * Load the active share link for the current map.
   */
  loadShareLink: async (): Promise<null | ThoughtMapShareLink> => {
    const { map } = get();
    if (!map) {
      return null;
    }

    try {
      const link = await thoughtMapApi.getShareLink(map.id);
      set({ shareLink: link });
      return link;
    } catch (err) {
      console.error('Failed to load share link:', err);
      return null;
    }
  },

  /**
   * Remove a single ghost node by ghostId
   */
  removeGhostNode: (ghostId: string): void => {
    const { ghostNodes } = get();
    const { [ghostId]: _removed, ...rest } = ghostNodes;
    set({ ghostNodes: rest });
  },

  /**
   * Reset store to initial state
   */
  reset: (): void => {
    set(initialState);
  },

  /**
   * Reset extraction state back to idle
   */
  resetExtraction: (): void => {
    set({
      draftMap: null,
      extractionJobId: null,
      extractionState: 'idle',
    });
  },

  /**
   * Revoke the active share link for the current map.
   */
  revokeShareLink: async (): Promise<boolean> => {
    const { map } = get();
    if (!map) {
      return false;
    }

    try {
      await thoughtMapApi.revokeShareLink(map.id);
      set({ shareLink: null });
      return true;
    } catch (err) {
      console.error('Failed to revoke share link:', err);
      return false;
    }
  },

  /**
   * Store the draft map received from the SSE preview event.
   */
  setExtractionPreview: (draftMap: ThoughtMapWithNodes): void => {
    set({ draftMap, extractionState: 'preview' });
  },

  /**
   * Load an existing map and its nodes into the store
   */
  setMap: (map: ThoughtMap, nodes: ThoughtMapNode[]): void => {
    const current = get();
    const isSameMap = current.map?.id === map.id;
    const nextNodes = nodesToRecord(nodes);
    const selectedNodeId =
      isSameMap && current.selectedNodeId && nextNodes[current.selectedNodeId]
        ? current.selectedNodeId
        : null;

    set({
      error: null,
      ghostNodes: isSameMap ? current.ghostNodes : {},
      isLoading: false,
      map,
      nodes: nextNodes,
      selectedNodeId,
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
   * Create (or replace) a public share link for the current map.
   */
  shareMap: async (opts?: { expiresInDays?: number }): Promise<null | ThoughtMapShareLink> => {
    const { map } = get();
    if (!map) {
      return null;
    }

    try {
      const link = await thoughtMapApi.createShareLink(map.id, opts);
      set({ shareLink: link });
      return link;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create share link';
      console.error('Failed to create share link:', err);
      set({ error: message });
      return null;
    }
  },

  /**
   * Mark extraction as started with the given job ID.
   */
  startExtraction: (jobId: string): void => {
    set({ draftMap: null, extractionJobId: jobId, extractionState: 'processing' });
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

  /**
   * Update auto-suggestion settings for the current map with optimistic update + rollback.
   */
  updateSettings: async (dto: UpdateThoughtMapSettingsRequest): Promise<boolean> => {
    const { map } = get();
    if (!map) {
      return false;
    }

    // Optimistic update
    const optimisticMap: ThoughtMap = {
      ...map,
      settings: {
        ...map.settings,
        ...(dto.autoSuggestEnabled !== undefined && {
          autoSuggestEnabled: dto.autoSuggestEnabled,
        }),
        ...(dto.autoSuggestIdleSeconds !== undefined && {
          autoSuggestIdleSeconds: dto.autoSuggestIdleSeconds,
        }),
        ...(dto.maxSuggestionsPerNode !== undefined && {
          maxSuggestionsPerNode: dto.maxSuggestionsPerNode,
        }),
      },
    };
    set({ map: optimisticMap });

    try {
      const updated = await thoughtMapApi.updateSettings(map.id, dto);
      set({ map: updated });
      return true;
    } catch (err) {
      // Rollback
      console.error('Failed to update thought map settings:', err);
      set({ map });
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
      acceptGhostNode: state.acceptGhostNode,
      addGhostNode: state.addGhostNode,
      addNode: state.addNode,
      clearGhostNodes: state.clearGhostNodes,
      confirmDraftMap: state.confirmDraftMap,
      convertFromCanvas: state.convertFromCanvas,
      createMap: state.createMap,
      deleteNode: state.deleteNode,
      loadShareLink: state.loadShareLink,
      removeGhostNode: state.removeGhostNode,
      reset: state.reset,
      resetExtraction: state.resetExtraction,
      revokeShareLink: state.revokeShareLink,
      setExtractionPreview: state.setExtractionPreview,
      setMap: state.setMap,
      setNodePosition: state.setNodePosition,
      setSelectedNodeId: state.setSelectedNodeId,
      shareMap: state.shareMap,
      startExtraction: state.startExtraction,
      updateNode: state.updateNode,
      updateSettings: state.updateSettings,
    }))
  );

/**
 * Get all ghost nodes as an array (for rendering on the canvas)
 */
export const useGhostNodes = () =>
  useThoughtMapStore(useShallow((state) => Object.values(state.ghostNodes)));

/**
 * Get the current extraction state and draft map
 */
export const useExtractionState = () =>
  useThoughtMapStore(
    useShallow((state) => ({
      draftMap: state.draftMap,
      extractionJobId: state.extractionJobId,
      extractionState: state.extractionState,
    }))
  );

// ============================================================================
// Phase 5 Selector Hooks
// ============================================================================

/**
 * Get the active share link for the current map
 */
export const useThoughtMapShareLink = () => useThoughtMapStore((state) => state.shareLink);

/**
 * Get the canvas→map conversion loading state
 */
export const useIsConverting = () => useThoughtMapStore((state) => state.isConverting);
