/**
 * Canvas visualization type definitions for React Flow integration
 * Used for rendering the Thinking Canvas with nodes and edges
 */

import type { Edge, Node } from '@xyflow/react';

// ============================================================================
// Node Types
// ============================================================================

/**
 * Canvas edge extending React Flow Edge
 * @property source - Source node ID (always 'seed' for initial structure)
 * @property target - Target node ID (Soil or Root node ID)
 */
export interface CanvasEdge extends Edge {
  source: string;
  target: string;
}

/**
 * Canvas node extending React Flow Node with specific types
 * Uses generic Node type with CanvasNodeData for proper typing
 */
export type CanvasNode = Node<CanvasNodeData, NodeType>;

/**
 * Union type for all node data types
 */
export type CanvasNodeData = InsightNodeData | RootNodeData | SeedNodeData | SoilNodeData;

/**
 * Data for Insight nodes (dialogue discoveries)
 * @property isExplored - Whether node has been explored in dialogue
 * @property label - Insight text
 * @property parentNodeId - ID of the parent node this insight emerged from
 */
export interface InsightNodeData extends BaseNodeData {
  parentNodeId: string;
}

/**
 * Configuration for auto-layout algorithm
 * @property centerX - X coordinate for center position
 * @property centerY - Y coordinate for center position
 * @property minNodeSpacing - Minimum pixels between nodes
 * @property rootEndAngle - Ending angle for root arc (radians)
 * @property rootRadius - Distance from center for root nodes
 * @property rootStartAngle - Starting angle for root arc (radians)
 * @property soilEndAngle - Ending angle for soil arc (radians)
 * @property soilRadius - Distance from center for soil nodes
 * @property soilStartAngle - Starting angle for soil arc (radians)
 */
export interface LayoutConfig {
  centerX: number;
  centerY: number;
  minNodeSpacing: number;
  rootEndAngle: number;
  rootRadius: number;
  rootStartAngle: number;
  soilEndAngle: number;
  soilRadius: number;
  soilStartAngle: number;
}

/**
 * Node type identifier for canvas nodes
 */
export type NodeType = 'insight' | 'root' | 'seed' | 'soil';

/**
 * Position coordinates for nodes
 * @property x - Horizontal position
 * @property y - Vertical position
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Data for Root nodes (assumptions)
 * @property index - Position in roots array
 * @property isExplored - Whether node has been explored in dialogue
 * @property label - Assumption text
 */
export interface RootNodeData extends BaseNodeData {
  index: number;
}

/**
 * Data for the central Seed node (problem statement)
 * @property isExplored - Whether node has been explored in dialogue
 * @property label - Problem statement text
 */
export interface SeedNodeData extends BaseNodeData {
  index?: never; // Seed node doesn't have an index
}

/**
 * Data for Soil nodes (context/constraints)
 * @property index - Position in soil array
 * @property isExplored - Whether node has been explored in dialogue
 * @property label - Context item text
 */
export interface SoilNodeData extends BaseNodeData {
  index: number;
}

// ============================================================================
// Layout Configuration
// ============================================================================

/**
 * Base node data with index signature for React Flow compatibility
 * @property isExplored - Whether node has been explored in dialogue
 * @property label - Node text content
 * @property messageCount - Number of dialogue messages for this node
 */
interface BaseNodeData {
  [key: string]: unknown;
  isExplored?: boolean;
  label: string;
  messageCount?: number;
}

/**
 * Default layout configuration
 * - Seed at center (0, 0)
 * - Soil nodes in left arc (upper-left to lower-left)
 * - Root nodes in right arc (upper-right to lower-right)
 */
export const DEFAULT_LAYOUT: LayoutConfig = {
  centerX: 0,
  centerY: 0,
  minNodeSpacing: 80,
  rootEndAngle: Math.PI * 0.25, // Lower right (45°)
  rootRadius: 250,
  rootStartAngle: -Math.PI * 0.25, // Upper right (-45°)
  soilEndAngle: Math.PI * 1.25, // Lower left (225°)
  soilRadius: 250,
  soilStartAngle: Math.PI * 0.75, // Upper left (135°)
};

// ============================================================================
// Canvas Controls Props
// ============================================================================

/**
 * Props for CanvasLegend component
 * @property showExplorationStatus - Whether to show exploration status legend
 */
export interface CanvasLegendProps {
  showExplorationStatus?: boolean;
}

/**
 * Props for InsightNode component
 * @property data - Insight node data
 * @property selected - Whether node is currently selected
 */
export interface InsightNodeProps {
  data: InsightNodeData;
  selected: boolean;
}

/**
 * Props for NodePanel component (side panel for selected node)
 * @property onClose - Handler for closing the panel
 * @property onStartDialogue - Handler for starting dialogue (Phase 3)
 * @property selectedNode - Currently selected node or null
 */
export interface NodePanelProps {
  onClose: () => void;
  onStartDialogue?: (nodeId: string) => void;
  selectedNode: CanvasNode | null;
}

/**
 * Props for RootNode component
 * @property data - Root node data
 * @property selected - Whether node is currently selected
 */
export interface RootNodeProps {
  data: RootNodeData;
  selected: boolean;
}

/**
 * Props for SeedNode component
 * @property data - Seed node data
 * @property selected - Whether node is currently selected
 */
export interface SeedNodeProps {
  data: SeedNodeData;
  selected: boolean;
}

/**
 * Props for SoilNode component
 * @property data - Soil node data
 * @property selected - Whether node is currently selected
 */
export interface SoilNodeProps {
  data: SoilNodeData;
  selected: boolean;
}

/**
 * Props for ZoomControls component
 * @property currentZoom - Current zoom level
 * @property maxZoom - Maximum zoom level (2.0)
 * @property minZoom - Minimum zoom level (0.25)
 * @property onFitView - Handler for fit view action
 * @property onZoomIn - Handler for zoom in action
 * @property onZoomOut - Handler for zoom out action
 */
export interface ZoomControlsProps {
  currentZoom: number;
  maxZoom: number;
  minZoom: number;
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

// ============================================================================
// Zoom Constants
// ============================================================================

/**
 * Minimum zoom level (25%)
 */
export const MIN_ZOOM = 0.25;

/**
 * Maximum zoom level (200%)
 */
export const MAX_ZOOM = 2.0;

/**
 * Default zoom level (100%)
 */
export const DEFAULT_ZOOM = 1.0;
