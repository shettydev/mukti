# Requirements Document

## Introduction

The Canvas Visualization is the second phase of the "Thinking Canvas" feature. After users complete the Setup Wizard (Phase 1), they transition to an infinite canvas powered by React Flow where their problem structure is visualized as an interactive node graph. The central node displays the problem statement (Seed), with satellite nodes representing context/constraints (Soil) and assumptions (Roots). This spatial representation allows users to see the shape of their problem and provides the foundation for context-aware Socratic dialogue (Phase 2).

## Glossary

- **Canvas**: The infinite, pannable, zoomable workspace powered by React Flow where nodes are displayed
- **Node**: A visual element on the canvas representing a piece of the problem structure (Seed, Soil item, or Root item)
- **Seed Node**: The central node displaying the main problem statement
- **Soil Node**: A satellite node representing a context item or constraint
- **Root Node**: A satellite node representing an assumption
- **Edge**: A visual connection line between nodes showing relationships
- **React Flow**: The open-source library used to build the node-based canvas interface
- **Viewport**: The visible area of the canvas that the user can pan and zoom
- **Node Selection**: The state where a node is highlighted and ready for interaction
- **Auto-layout**: Automatic positioning of nodes in a visually pleasing arrangement

## Requirements

### Requirement 1

**User Story:** As a user, I want to see my problem statement displayed as a central node on the canvas, so that I have a clear focal point for my thinking map.

#### Acceptance Criteria

1. WHEN a canvas session loads THEN the system SHALL display the Seed as a central node positioned at the center of the viewport
2. THE Seed node SHALL display the full problem statement text with appropriate text wrapping
3. THE Seed node SHALL have a distinct visual style (color, border, size) that differentiates it from other node types
4. WHEN the problem statement exceeds 100 characters THEN the Seed node SHALL truncate the display with an ellipsis and show full text on hover

### Requirement 2

**User Story:** As a user, I want to see my context items displayed as satellite nodes around the problem, so that I can visualize the constraints affecting my situation.

#### Acceptance Criteria

1. WHEN a canvas session loads THEN the system SHALL display each Soil item as a separate node
2. THE Soil nodes SHALL be positioned in an arc or cluster arrangement around the Seed node
3. THE Soil nodes SHALL have a consistent visual style distinct from Seed and Root nodes
4. THE system SHALL draw edges connecting each Soil node to the Seed node
5. WHEN a Soil item text exceeds 50 characters THEN the node SHALL truncate with ellipsis and show full text on hover

### Requirement 3

**User Story:** As a user, I want to see my assumptions displayed as satellite nodes, so that I can identify which beliefs to examine through Socratic dialogue.

#### Acceptance Criteria

1. WHEN a canvas session loads THEN the system SHALL display each Root item as a separate node
2. THE Root nodes SHALL be positioned in an arc or cluster arrangement around the Seed node, visually separated from Soil nodes
3. THE Root nodes SHALL have a consistent visual style distinct from Seed and Soil nodes
4. THE system SHALL draw edges connecting each Root node to the Seed node
5. WHEN a Root item text exceeds 50 characters THEN the node SHALL truncate with ellipsis and show full text on hover

### Requirement 4

**User Story:** As a user, I want to pan and zoom the canvas, so that I can navigate my thinking map as it grows.

#### Acceptance Criteria

1. WHEN a user drags on empty canvas space THEN the viewport SHALL pan in the drag direction
2. WHEN a user uses scroll wheel or pinch gesture THEN the viewport SHALL zoom in or out
3. THE system SHALL constrain zoom level between 25% and 200% of default scale
4. WHEN a user double-clicks on empty canvas space THEN the viewport SHALL reset to fit all nodes
5. THE system SHALL display zoom controls (zoom in, zoom out, fit view) in a toolbar

### Requirement 5

**User Story:** As a user, I want to select and interact with individual nodes, so that I can focus on specific aspects of my problem.

#### Acceptance Criteria

1. WHEN a user clicks on a node THEN the system SHALL visually highlight the node as selected
2. WHEN a user clicks on a different node THEN the system SHALL deselect the previous node and select the new one
3. WHEN a user clicks on empty canvas space THEN the system SHALL deselect any selected node
4. WHEN a node is selected THEN the system SHALL display a context menu or action panel for that node
5. THE selected node state SHALL be visually distinct with a highlight border or glow effect

### Requirement 6

**User Story:** As a user, I want nodes to be automatically arranged in a readable layout, so that I can understand my problem structure without manual positioning.

#### Acceptance Criteria

1. WHEN a canvas session first loads THEN the system SHALL apply an automatic layout algorithm to position nodes
2. THE auto-layout SHALL position the Seed node at the center
3. THE auto-layout SHALL position Soil nodes in one visual grouping (e.g., left arc or top cluster)
4. THE auto-layout SHALL position Root nodes in a separate visual grouping (e.g., right arc or bottom cluster)
5. THE auto-layout SHALL maintain minimum spacing between nodes to prevent overlap

### Requirement 7

**User Story:** As a user, I want to manually reposition nodes by dragging, so that I can customize my thinking map layout.

#### Acceptance Criteria

1. WHEN a user drags a node THEN the node SHALL move to follow the cursor position
2. WHEN a node is dragged THEN connected edges SHALL update in real-time to maintain connections
3. WHEN a user releases a dragged node THEN the system SHALL persist the new position
4. THE system SHALL prevent nodes from being dragged outside reasonable canvas bounds

### Requirement 8

**User Story:** As a user, I want visual indicators showing the type and status of each node, so that I can quickly understand my thinking map.

#### Acceptance Criteria

1. THE Seed node SHALL display with a primary/accent color indicating its central importance
2. THE Soil nodes SHALL display with a secondary color indicating context/constraints
3. THE Root nodes SHALL display with a tertiary color indicating assumptions to examine
4. WHEN a node has been explored through dialogue (Phase 3) THEN the node SHALL display a visual indicator of exploration status
5. THE system SHALL include a legend or key explaining node colors and icons

### Requirement 9

**User Story:** As a user, I want the canvas to load quickly and perform smoothly, so that I can focus on thinking rather than waiting.

#### Acceptance Criteria

1. WHEN a canvas session loads THEN the initial render SHALL complete within 500 milliseconds for up to 20 nodes
2. WHEN panning or zooming THEN the frame rate SHALL maintain at least 30 frames per second
3. WHEN dragging nodes THEN the movement SHALL feel responsive with no perceptible lag
4. THE system SHALL use virtualization or optimization techniques for canvases with many nodes

### Requirement 10

**User Story:** As a user, I want to access the canvas from a dedicated route, so that I can bookmark and share my thinking sessions.

#### Acceptance Criteria

1. THE system SHALL provide a route at `/dashboard/canvas/[id]` for viewing canvas sessions
2. WHEN a user navigates to a canvas route THEN the system SHALL load the corresponding canvas session data
3. IF a canvas session does not exist THEN the system SHALL display a not-found message
4. IF a user is not authenticated THEN the system SHALL redirect to the login page
5. THE system SHALL only allow users to view their own canvas sessions
