# Requirements Document

## Introduction

The Context-aware Chat is the third and final phase of the "Thinking Canvas" feature. This phase connects the Socratic dialogue system to specific nodes on the canvas, enabling users to have focused conversations about individual aspects of their problem. When a user selects a node (an assumption, constraint, or the problem statement itself), a chat panel opens with AI-powered Socratic questioning specifically tailored to that node's context. As insights emerge from the dialogue, users can spawn new nodes representing discoveries, creating a growing visual map of their decision-making process.

## Glossary

- **Context-aware Chat**: A chat interface that maintains awareness of which canvas node is being discussed, providing relevant Socratic questioning
- **Node Dialogue**: A conversation thread associated with a specific node on the canvas
- **Active Node**: The currently selected node that provides context for the chat
- **Insight Node**: A new node spawned from dialogue when the user discovers a new perspective or realization
- **Dialogue History**: The collection of messages exchanged about a specific node
- **Socratic Prompt**: An AI-generated question designed to challenge assumptions and deepen understanding
- **Node Context**: The combination of the node's content, type, and its relationship to other nodes in the problem structure

## Requirements

### Requirement 1

**User Story:** As a user, I want to start a Socratic dialogue about a specific node, so that I can examine that aspect of my problem in depth.

#### Acceptance Criteria

1. WHEN a user selects a node and clicks "Start Dialogue" THEN the system SHALL open a chat panel focused on that node
2. THE chat panel SHALL display the node's content as context at the top of the conversation
3. WHEN a dialogue starts THEN the AI SHALL generate an initial Socratic question relevant to the node's content and type
4. THE initial question for a Root (assumption) node SHALL challenge the validity or evidence for that assumption
5. THE initial question for a Soil (constraint) node SHALL explore whether the constraint is truly fixed or negotiable

### Requirement 2

**User Story:** As a user, I want the AI to ask thought-provoking Socratic questions, so that I can discover insights I wouldn't reach on my own.

#### Acceptance Criteria

1. WHEN a user sends a message THEN the AI SHALL respond with a Socratic question or reflection that deepens inquiry
2. THE AI response SHALL reference the specific node context and the user's previous answers
3. THE AI SHALL avoid providing direct answers or solutions, instead guiding the user toward their own conclusions
4. WHEN the user's response reveals a potential contradiction THEN the AI SHALL highlight it through questioning
5. THE AI SHALL use the selected Socratic technique (elenchus, maieutics, etc.) appropriate to the node type

### Requirement 3

**User Story:** As a user, I want to spawn new insight nodes from my dialogue, so that I can capture discoveries and see my thinking evolve.

#### Acceptance Criteria

1. WHEN a user identifies a new insight during dialogue THEN the system SHALL provide an option to create a new node
2. THE user SHALL be able to enter a label for the new insight node
3. WHEN an insight node is created THEN the system SHALL position it as a child of the node being discussed
4. THE system SHALL draw an edge connecting the insight node to its parent node
5. THE insight node SHALL have a distinct visual style indicating it emerged from dialogue

### Requirement 4

**User Story:** As a user, I want to see the dialogue history for each node, so that I can review my previous thinking.

#### Acceptance Criteria

1. WHEN a user selects a node that has previous dialogue THEN the system SHALL display the conversation history
2. THE dialogue history SHALL show all messages in chronological order with timestamps
3. WHEN a user continues a previous dialogue THEN the AI SHALL have context of the prior conversation
4. THE system SHALL persist dialogue history to the backend associated with the node

### Requirement 5

**User Story:** As a user, I want to switch between nodes while chatting, so that I can explore different aspects of my problem fluidly.

#### Acceptance Criteria

1. WHEN a user selects a different node while the chat panel is open THEN the system SHALL switch to that node's dialogue
2. WHEN switching nodes THEN the system SHALL preserve the previous node's dialogue state
3. THE chat panel SHALL update to show the newly selected node's content and history
4. WHEN switching to a node without dialogue history THEN the system SHALL offer to start a new dialogue

### Requirement 6

**User Story:** As a user, I want visual indicators showing which nodes have been explored, so that I can track my progress.

#### Acceptance Criteria

1. WHEN a node has dialogue history THEN the node SHALL display an "explored" indicator
2. THE explored indicator SHALL show the number of messages or a progress icon
3. WHEN all assumption (Root) nodes have been explored THEN the system SHALL display a completion indicator
4. THE canvas legend SHALL explain the meaning of exploration indicators

### Requirement 7

**User Story:** As a user, I want the chat panel to be resizable and dockable, so that I can customize my workspace.

#### Acceptance Criteria

1. THE chat panel SHALL be resizable by dragging its edge
2. THE chat panel SHALL have a minimum and maximum width constraint
3. WHEN the chat panel is closed THEN the canvas SHALL expand to fill the available space
4. THE system SHALL remember the user's panel size preference

### Requirement 8

**User Story:** As a user, I want to export my thinking map with dialogue summaries, so that I can share my decision-making process.

#### Acceptance Criteria

1. THE system SHALL provide an export option for the canvas session
2. THE export SHALL include the problem structure (Seed, Soil, Roots) and any insight nodes
3. THE export SHALL include summaries or full transcripts of node dialogues
4. THE export format SHALL be readable (Markdown or PDF)

### Requirement 9

**User Story:** As a developer, I want dialogue data to be efficiently stored and retrieved, so that the system performs well with extensive conversations.

#### Acceptance Criteria

1. THE system SHALL store dialogue messages in a separate collection linked to the canvas session
2. WHEN loading a canvas THEN the system SHALL lazy-load dialogue history only when a node is selected
3. THE system SHALL paginate dialogue history for nodes with many messages
4. THE backend SHALL index dialogue data for efficient queries by node ID and session ID
