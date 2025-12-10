# Requirements Document

## Introduction

The Canvas Node Management feature enhances the Thinking Canvas by enabling dynamic node creation, persistence, and relationship visualization. Currently, insight nodes created during dialogue are only stored in frontend state and lost on page refresh. Additionally, users cannot add new assumptions after the initial setup, and there is no visual connection between context (Soil) and assumptions (Roots) to help users understand how constraints relate to their beliefs. This feature addresses these gaps by implementing persistent node storage, dynamic node creation, and relationship edges.

## Glossary

- **Insight Node**: A node spawned from dialogue representing a discovery or realization, connected to its parent node
- **Dynamic Node**: A node created after the initial canvas setup (insight nodes, new assumptions)
- **Relationship Edge**: A visual connection between nodes showing logical relationships (e.g., assumption relates to constraint)
- **Node Persistence**: Storing dynamically created nodes in the backend database
- **Parent Node**: The node from which an insight or relationship originates
- **Linked Assumption**: An assumption (Root) that is explicitly connected to a specific constraint (Soil)

## Requirements

### Requirement 1

**User Story:** As a user, I want insight nodes to be saved to the database, so that my discoveries persist across sessions and page refreshes.

#### Acceptance Criteria

1. WHEN a user creates an insight node from dialogue THEN the system SHALL persist the insight node to the backend database
2. THE persisted insight node SHALL include the label, parent node ID, position, and creation timestamp
3. WHEN a canvas session loads THEN the system SHALL retrieve and display all previously created insight nodes
4. WHEN an insight node is created THEN the system SHALL create an edge connecting it to its parent node and persist that relationship
5. THE system SHALL validate that the parent node exists before creating an insight node

### Requirement 2

**User Story:** As a user, I want to add new assumptions after the initial setup, so that I can capture additional beliefs as I explore my problem.

#### Acceptance Criteria

1. THE system SHALL provide an "Add Assumption" action accessible from the canvas toolbar or context menu
2. WHEN a user adds a new assumption THEN the system SHALL display a dialog for entering the assumption text
3. WHEN a new assumption is created THEN the system SHALL add it as a Root node connected to the Seed node
4. THE new assumption node SHALL be positioned in the Root node cluster using the auto-layout algorithm
5. WHEN a new assumption is created THEN the system SHALL persist it to the problemStructure.roots array in the backend
6. THE system SHALL enforce the maximum limit of 8 assumptions per canvas session

### Requirement 3

**User Story:** As a user, I want to link assumptions to specific constraints, so that I can understand which beliefs are influenced by which limitations.

#### Acceptance Criteria

1. THE system SHALL provide a "Link to Constraint" action when a Root (assumption) node is selected
2. WHEN a user initiates linking THEN the system SHALL highlight available Soil (constraint) nodes for selection
3. WHEN a user selects a constraint THEN the system SHALL create a visual edge connecting the assumption to the constraint
4. THE relationship edge SHALL have a distinct style (dashed line, different color) from parent-child edges
5. WHEN a relationship edge is created THEN the system SHALL persist the relationship to the backend
6. THE system SHALL allow multiple assumptions to link to the same constraint

### Requirement 4

**User Story:** As a user, I want to see visual indicators of relationships between assumptions and constraints, so that I can understand the structure of my thinking.

#### Acceptance Criteria

1. THE system SHALL display relationship edges with a distinct visual style (dashed, muted color) from structural edges
2. WHEN hovering over a relationship edge THEN the system SHALL highlight both connected nodes
3. THE canvas legend SHALL include an entry explaining relationship edges
4. WHEN a node has relationships THEN the node SHALL display a small indicator showing the count of relationships

### Requirement 5

**User Story:** As a user, I want to add new context items after the initial setup, so that I can capture additional constraints as I discover them.

#### Acceptance Criteria

1. THE system SHALL provide an "Add Context" action accessible from the canvas toolbar or context menu
2. WHEN a user adds new context THEN the system SHALL display a dialog for entering the context text
3. WHEN new context is created THEN the system SHALL add it as a Soil node connected to the Seed node
4. THE new context node SHALL be positioned in the Soil node cluster using the auto-layout algorithm
5. WHEN new context is created THEN the system SHALL persist it to the problemStructure.soil array in the backend
6. THE system SHALL enforce the maximum limit of 10 context items per canvas session

### Requirement 6

**User Story:** As a user, I want to delete nodes I no longer need, so that I can keep my canvas focused and relevant.

#### Acceptance Criteria

1. THE system SHALL provide a "Delete" action for Insight, dynamically-added Root, and dynamically-added Soil nodes
2. THE system SHALL NOT allow deletion of the Seed node or original nodes from the setup wizard
3. WHEN a user deletes a node THEN the system SHALL remove all edges connected to that node
4. WHEN a node with child insights is deleted THEN the system SHALL prompt the user to confirm deletion of dependent nodes
5. WHEN a node is deleted THEN the system SHALL persist the deletion to the backend

### Requirement 7

**User Story:** As a developer, I want dynamic nodes to be efficiently stored and retrieved, so that the system performs well with many nodes.

#### Acceptance Criteria

1. THE system SHALL store dynamic nodes (insights) in a separate collection linked to the canvas session
2. THE system SHALL store relationship edges in a dedicated field within the canvas session
3. WHEN loading a canvas THEN the system SHALL retrieve dynamic nodes in a single query
4. THE backend SHALL index dynamic node data for efficient queries by session ID
