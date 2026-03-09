/**
 * TypeScript types for the Thought Map feature
 *
 * Matches the RFC-0003 data models exactly.
 * Thought Maps are mind-map style structures for exploring a central topic
 * through branching thought nodes arranged in a radial tree layout.
 */

// ============================================================================
// Request DTOs
// ============================================================================

/**
 * DTO for creating a new Thought Map
 */
export interface CreateThoughtMapRequest {
  /** Optional initial settings override */
  settings?: Partial<ThoughtMapSettings>;
  /** The central topic / question for the map */
  topic: string;
}

/**
 * DTO for creating a new node in a Thought Map
 */
export interface CreateThoughtNodeRequest {
  /** Display text for the new node */
  label: string;
  /** The thought map to add the node to */
  mapId: string;
  /** nodeId of the parent node */
  parentNodeId: string;
  /** Initial x position (will be recalculated by layout if 0) */
  x?: number;
  /** Initial y position (will be recalculated by layout if 0) */
  y?: number;
}

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * A Thought Map — the top-level container
 *
 * @property id - Unique identifier (transformed from MongoDB _id)
 * @property userId - Owner of the thought map
 * @property title - Human-readable title for the map
 * @property status - Lifecycle status
 * @property settings - User-configurable display/behaviour settings
 * @property nodeCount - Denormalized count of nodes (for list views)
 * @property createdAt - ISO timestamp of creation
 * @property updatedAt - ISO timestamp of last update
 */
export interface ThoughtMap {
  createdAt: string;
  id: string;
  nodeCount: number;
  settings: ThoughtMapSettings;
  status: ThoughtMapStatus;
  title: string;
  updatedAt: string;
  userId: string;
}

/**
 * A single node within a Thought Map
 *
 * @property id - Unique identifier (transformed from MongoDB _id)
 * @property mapId - Parent Thought Map ID
 * @property nodeId - Stable node identifier used for layout and edges (e.g. "topic", "branch-0")
 * @property parentNodeId - nodeId of the parent node, or null for the topic node
 * @property type - Node type (topic | branch | leaf)
 * @property label - Display text for the node
 * @property depth - Distance from topic node (0 = topic, 1 = branch, 2+ = leaf)
 * @property isExplored - Whether the node has been explored via Socratic dialogue
 * @property position - Stored x/y position (may be overridden by layout algorithm)
 * @property createdAt - ISO timestamp of creation
 * @property updatedAt - ISO timestamp of last update
 */
export interface ThoughtMapNode {
  createdAt: string;
  depth: number;
  id: string;
  isExplored: boolean;
  label: string;
  mapId: string;
  nodeId: string;
  parentNodeId: null | string;
  position: { x: number; y: number };
  type: ThoughtMapNodeType;
  updatedAt: string;
}

// ============================================================================
// Enums
// ============================================================================

/**
 * Node types in a Thought Map
 * - topic: The central root node (depth 0), always at (0,0)
 * - branch: First-level child nodes (depth 1), split left/right hemispheres
 * - leaf: Deeper-level nodes (depth 2+), extending from their branch ancestor
 */
export type ThoughtMapNodeType = 'branch' | 'leaf' | 'topic';

// ============================================================================
// Settings
// ============================================================================

/**
 * User-configurable settings for a Thought Map
 */
export interface ThoughtMapSettings {
  /** Whether to show the Socratic dialogue panel by default */
  autoOpenDialogue: boolean;
  /** Layout direction preference */
  layoutDirection: 'horizontal' | 'vertical';
  /** Whether node labels wrap at a max width */
  wrapLabels: boolean;
}

/**
 * Status lifecycle of a Thought Map
 */
export type ThoughtMapStatus = 'active' | 'archived' | 'shared';

/**
 * A Thought Map with its nodes eagerly loaded
 * Used for the canvas view where both map metadata and all nodes are needed
 */
export interface ThoughtMapWithNodes {
  map: ThoughtMap;
  nodes: ThoughtMapNode[];
}

// ============================================================================
// Request DTOs (continued)
// ============================================================================

/**
 * DTO for updating an existing Thought Map node
 */
export interface UpdateThoughtNodeRequest {
  /** Mark as explored after Socratic dialogue */
  isExplored?: boolean;
  /** New display text */
  label?: string;
  /** Updated x position */
  x?: number;
  /** Updated y position */
  y?: number;
}
