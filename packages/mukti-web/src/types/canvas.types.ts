/**
 * Canvas type definitions for frontend
 * Based on canvas session DTOs from backend
 */

/**
 * DTO for adding a new assumption (Root node) to a canvas session
 * @property assumption - The assumption text (5-200 characters)
 */
export interface AddAssumptionDto {
  assumption: string;
}

/**
 * DTO for adding a new context item (Soil node) to a canvas session
 * @property context - The context/constraint text (5-200 characters)
 */
export interface AddContextDto {
  context: string;
}

/**
 * Full canvas session object
 * @property createdAt - Creation timestamp
 * @property dynamicNodeIds - Array of node IDs added dynamically after setup
 * @property exploredNodes - Array of node IDs that have been explored through dialogue
 * @property id - Canvas session ID
 * @property nodePositions - Custom node positions set by user drag operations
 * @property problemStructure - The problem structure containing Seed, Soil, and Roots
 * @property relationshipEdges - Array of relationship edges between assumptions and constraints
 * @property updatedAt - Last update timestamp
 * @property userId - User ID who owns the canvas session
 */
export interface CanvasSession {
  createdAt: string;
  dynamicNodeIds?: string[];
  exploredNodes?: string[];
  id: string;
  nodePositions?: NodePosition[];
  problemStructure: ProblemStructure;
  relationshipEdges?: RelationshipEdge[];
  updatedAt: string;
  userId: string;
}

/**
 * Create canvas session DTO
 * @property roots - Core assumptions about the problem (1-8 items, 5-200 chars each)
 * @property seed - The main problem statement (10-500 characters)
 * @property soil - Context and constraints (0-10 items, 5-200 chars each)
 */
export interface CreateCanvasSessionDto {
  roots: string[];
  seed: string;
  soil: string[];
}

/**
 * DTO for creating a new insight node
 * @property label - The insight text (5-200 characters)
 * @property parentNodeId - The ID of the parent node this insight spawns from
 * @property x - X coordinate for canvas placement
 * @property y - Y coordinate for canvas placement
 */
export interface CreateInsightNodeDto {
  label: string;
  parentNodeId: string;
  x: number;
  y: number;
}

/**
 * DTO for creating a relationship edge between an assumption and a constraint
 * @property sourceNodeId - The source node ID (must be a root-* node)
 * @property targetNodeId - The target node ID (must be a soil-* node)
 */
export interface CreateRelationshipDto {
  sourceNodeId: string;
  targetNodeId: string;
}

/**
 * DTO for deleting a node from a canvas session
 * @property nodeId - The ID of the node to delete
 * @property deleteDependents - Optional flag to cascade delete child insights
 */
export interface DeleteNodeDto {
  deleteDependents?: boolean;
  nodeId: string;
}

/**
 * Insight node spawned from dialogue representing a discovery or realization
 * @property createdAt - Creation timestamp
 * @property id - Insight node ID (MongoDB _id)
 * @property isExplored - Whether this insight has been explored through dialogue
 * @property label - The insight text describing the discovery
 * @property nodeId - Unique node identifier (e.g., 'insight-0', 'insight-1')
 * @property parentNodeId - The parent node ID from which this insight was spawned
 * @property position - Position coordinates on the canvas
 * @property sessionId - Reference to the canvas session
 * @property updatedAt - Last update timestamp
 */
export interface InsightNode {
  createdAt: string;
  id: string;
  isExplored: boolean;
  label: string;
  nodeId: string;
  parentNodeId: string;
  position: InsightNodePosition;
  sessionId: string;
  updatedAt: string;
}

/**
 * Position coordinates for an insight node on the canvas
 * @property x - X coordinate on the canvas
 * @property y - Y coordinate on the canvas
 */
export interface InsightNodePosition {
  x: number;
  y: number;
}

/**
 * Node position for persisting custom node positions on the canvas
 * @property nodeId - Unique identifier for the node (e.g., 'seed', 'soil-0', 'root-1')
 * @property x - X coordinate on the canvas
 * @property y - Y coordinate on the canvas
 */
export interface NodePosition {
  nodeId: string;
  x: number;
  y: number;
}

/**
 * Problem structure containing the three key elements of a Thinking Canvas
 * @property roots - Core assumptions the user holds about the problem (1-8 items)
 * @property seed - The main problem statement (10-500 characters)
 * @property soil - Context and constraints surrounding the problem (0-10 items)
 */
export interface ProblemStructure {
  roots: string[];
  seed: string;
  soil: string[];
}

/**
 * Relationship edge connecting an assumption (Root) to a constraint (Soil)
 * @property id - Unique identifier for the relationship (e.g., 'rel-root-0-soil-1')
 * @property sourceNodeId - Source node ID - must be an assumption node (root-*)
 * @property targetNodeId - Target node ID - must be a constraint node (soil-*)
 */
export interface RelationshipEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
}
