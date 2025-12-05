/**
 * Canvas type definitions for frontend
 * Based on canvas session DTOs from backend
 */

/**
 * Full canvas session object
 * @property createdAt - Creation timestamp
 * @property exploredNodes - Array of node IDs that have been explored through dialogue
 * @property id - Canvas session ID
 * @property nodePositions - Custom node positions set by user drag operations
 * @property problemStructure - The problem structure containing Seed, Soil, and Roots
 * @property updatedAt - Last update timestamp
 * @property userId - User ID who owns the canvas session
 */
export interface CanvasSession {
  createdAt: string;
  exploredNodes?: string[];
  id: string;
  nodePositions?: NodePosition[];
  problemStructure: ProblemStructure;
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
