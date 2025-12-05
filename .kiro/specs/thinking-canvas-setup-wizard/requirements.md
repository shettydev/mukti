# Requirements Document

## Introduction

The Setup Wizard is the first phase of the "Thinking Canvas" feature - a visual mind-mapping approach to Socratic inquiry. This wizard provides a structured input experience where users define the core components of their problem before entering the visual canvas. Instead of jumping straight into an unstructured chat, users articulate their problem through three key elements: the Seed (problem statement), the Soil (context and constraints), and the Roots (core assumptions). This structured approach gives the AI the context needed to be an effective Socratic mentor.

## Glossary

- **Setup Wizard**: A multi-step form overlay that guides users through defining their problem structure before entering the canvas view
- **Seed**: The main problem statement that the user wants to explore (e.g., "My team is burned out")
- **Soil**: The context and constraints surrounding the problem (e.g., "Budget is tight," "Deadline in 2 weeks")
- **Roots**: The core assumptions the user holds about the problem (e.g., "We need to hire more people")
- **Thinking Canvas**: The visual mind-mapping interface where the structured problem is displayed and explored (Phase 2)
- **Problem Structure**: The complete set of Seed, Soil, and Roots that define a user's problem space

## Requirements

### Requirement 1

**User Story:** As a user, I want to define my main problem statement (Seed), so that I have a clear focal point for my Socratic inquiry session.

#### Acceptance Criteria

1. WHEN a user initiates a new canvas session THEN the Setup Wizard SHALL display a text input field for entering the problem statement (Seed)
2. WHEN a user enters a problem statement THEN the Setup Wizard SHALL validate that the statement is between 10 and 500 characters
3. WHEN a user submits an empty or whitespace-only problem statement THEN the Setup Wizard SHALL display a validation error and prevent progression
4. WHEN a user enters a valid problem statement THEN the Setup Wizard SHALL enable navigation to the next step

### Requirement 2

**User Story:** As a user, I want to add context and constraints (Soil) to my problem, so that the AI understands the boundaries and circumstances of my situation.

#### Acceptance Criteria

1. WHEN a user reaches the Soil step THEN the Setup Wizard SHALL display an interface for adding multiple context items
2. WHEN a user adds a context item THEN the Setup Wizard SHALL validate that each item is between 5 and 200 characters
3. WHEN a user has added context items THEN the Setup Wizard SHALL display all items in a list with the ability to remove individual items
4. THE Setup Wizard SHALL allow a minimum of 0 and maximum of 10 context items per problem
5. WHEN a user attempts to add more than 10 context items THEN the Setup Wizard SHALL display a message indicating the maximum has been reached

### Requirement 3

**User Story:** As a user, I want to articulate my core assumptions (Roots) about the problem, so that the AI can challenge my thinking effectively.

#### Acceptance Criteria

1. WHEN a user reaches the Roots step THEN the Setup Wizard SHALL display an interface for adding multiple assumption items
2. WHEN a user adds an assumption THEN the Setup Wizard SHALL validate that each assumption is between 5 and 200 characters
3. WHEN a user has added assumptions THEN the Setup Wizard SHALL display all assumptions in a list with the ability to remove individual items
4. THE Setup Wizard SHALL allow a minimum of 1 and maximum of 8 assumptions per problem
5. WHEN a user attempts to proceed without at least one assumption THEN the Setup Wizard SHALL display a validation error

### Requirement 4

**User Story:** As a user, I want to review my complete problem structure before starting, so that I can verify everything is correct.

#### Acceptance Criteria

1. WHEN a user reaches the review step THEN the Setup Wizard SHALL display the complete problem structure including Seed, Soil items, and Roots items
2. WHEN a user is on the review step THEN the Setup Wizard SHALL provide navigation to edit any previous step
3. WHEN a user confirms the review THEN the Setup Wizard SHALL create a new canvas session with the defined problem structure
4. WHEN a canvas session is created THEN the system SHALL persist the problem structure to the backend

### Requirement 5

**User Story:** As a user, I want to navigate freely between wizard steps, so that I can refine my inputs before finalizing.

#### Acceptance Criteria

1. WHEN a user is on any step after the first THEN the Setup Wizard SHALL provide a back button to return to the previous step
2. WHEN a user navigates backward THEN the Setup Wizard SHALL preserve all previously entered data
3. WHEN a user navigates forward after going back THEN the Setup Wizard SHALL retain any modifications made
4. THE Setup Wizard SHALL display a progress indicator showing the current step and total steps

### Requirement 6

**User Story:** As a user, I want the wizard to have a clean, minimal design, so that I can focus on articulating my problem without distraction.

#### Acceptance Criteria

1. THE Setup Wizard SHALL render as a modal overlay with a semi-transparent backdrop
2. THE Setup Wizard SHALL use consistent spacing, typography, and color scheme aligned with the Mukti design system
3. WHEN the wizard is open THEN the background content SHALL be visually dimmed but remain visible
4. THE Setup Wizard SHALL be responsive and function correctly on mobile, tablet, and desktop viewports

### Requirement 7

**User Story:** As a developer, I want the problem structure to be persisted to the backend, so that it can be used for canvas visualization and AI context.

#### Acceptance Criteria

1. WHEN a user completes the wizard THEN the system SHALL send the problem structure to the backend API
2. THE backend SHALL store the problem structure with fields for seed (string), soil (array of strings), and roots (array of strings)
3. WHEN the problem structure is saved THEN the backend SHALL return a unique canvas session identifier
4. IF the backend save fails THEN the Setup Wizard SHALL display an error message and allow retry
5. THE problem structure SHALL be associated with the authenticated user's account

### Requirement 8

**User Story:** As a user, I want helpful guidance during each step, so that I understand what information to provide.

#### Acceptance Criteria

1. WHEN a user is on the Seed step THEN the Setup Wizard SHALL display placeholder text and helper text explaining what a good problem statement looks like
2. WHEN a user is on the Soil step THEN the Setup Wizard SHALL display examples of context and constraints
3. WHEN a user is on the Roots step THEN the Setup Wizard SHALL display examples of assumptions and explain why identifying assumptions is valuable
4. THE Setup Wizard SHALL provide tooltip or expandable help for each input field
