# Requirements Document

## Introduction

This document specifies the requirements for the Quick Chat Interface feature in Mukti. The Quick Chat Interface transforms the dashboard landing page into an immediate chat experience, allowing users to start conversations instantly without navigating through multiple screens. This feature mirrors the user experience of ChatGPT and Claude, where users can begin chatting immediately upon landing on the main page.

## Glossary

- **Quick Chat Interface**: The main chat interface accessible at `/dashboard/chat` that allows immediate conversation initiation
- **Technique Selector**: A UI component that allows users to choose a Socratic questioning technique before or during conversation
- **Auto-Title Generation**: Backend functionality that automatically generates conversation titles based on initial messages
- **Sidebar Conversation List**: A dynamic list in the sidebar showing recent conversations with auto-generated titles
- **Elenchus**: The default Socratic technique focusing on cross-examination and refutation
- **Socratic Technique**: A method of philosophical inquiry (elenchus, maieutics, dialectic, definitional, analogical, counterfactual)
- **Message Stream**: Real-time delivery of AI responses using Server-Sent Events (SSE)
- **Conversation Session**: A persistent chat session with a unique ID and associated messages

## Requirements

### Requirement 1

**User Story:** As a user, I want to start chatting immediately when I access the dashboard, so that I can quickly engage with Mukti without extra navigation steps.

#### Acceptance Criteria

1. WHEN a user navigates to `/dashboard/chat` THEN the system SHALL display a full-screen chat interface with an input bar
2. WHEN the chat interface loads THEN the system SHALL display a welcome message explaining Mukti's Socratic approach
3. WHEN the chat interface is empty THEN the system SHALL show example prompts or conversation starters
4. WHEN a user types in the input bar THEN the system SHALL enable the send button
5. WHEN a user sends their first message THEN the system SHALL create a new conversation and display the message immediately

### Requirement 2

**User Story:** As a user, I want to select a Socratic technique before starting my conversation, so that I can choose the inquiry method that best fits my needs.

#### Acceptance Criteria

1. WHEN the chat interface loads THEN the system SHALL display a technique selector with "Elenchus" selected by default
2. WHEN a user clicks the technique selector THEN the system SHALL display all available Socratic techniques with descriptions
3. WHEN a user selects a different technique THEN the system SHALL update the active technique and persist it for the conversation
4. WHEN a user sends a message THEN the system SHALL use the selected technique for AI responses
5. WHEN a conversation is created THEN the system SHALL store the selected technique with the conversation metadata

### Requirement 3

**User Story:** As a user, I want the system to automatically generate meaningful titles for my conversations, so that I can easily identify and navigate between different chat sessions.

#### Acceptance Criteria

1. WHEN a user sends the first message in a new conversation THEN the system SHALL generate a temporary title based on the message content
2. WHEN the AI responds to the first message THEN the system SHALL generate a final conversation title using the first exchange
3. WHEN a conversation title is generated THEN the system SHALL update the sidebar conversation list immediately
4. WHEN a title is generated THEN the system SHALL ensure it is concise (maximum 60 characters) and descriptive
5. WHEN title generation fails THEN the system SHALL use a fallback title format "Conversation - [timestamp]"

### Requirement 4

**User Story:** As a user, I want to see my recent conversations in the sidebar, so that I can quickly switch between different chat sessions.

#### Acceptance Criteria

1. WHEN a new conversation is created THEN the system SHALL add it to the top of the sidebar conversation list
2. WHEN a conversation title is updated THEN the system SHALL reflect the change in the sidebar immediately
3. WHEN a user clicks a conversation in the sidebar THEN the system SHALL navigate to that conversation's chat interface
4. WHEN the sidebar displays conversations THEN the system SHALL show the most recent 20 conversations sorted by last activity
5. WHEN a conversation is active THEN the system SHALL highlight it in the sidebar conversation list

### Requirement 5

**User Story:** As a user, I want to send messages and receive AI responses in real-time, so that I can have a fluid conversational experience.

#### Acceptance Criteria

1. WHEN a user sends a message THEN the system SHALL display the message immediately in the chat interface
2. WHEN the AI begins responding THEN the system SHALL stream the response token-by-token using SSE
3. WHEN the AI response is streaming THEN the system SHALL display a typing indicator or streaming animation
4. WHEN the AI response completes THEN the system SHALL mark the message as complete and enable the input bar
5. WHEN a network error occurs during streaming THEN the system SHALL display an error message and allow retry

### Requirement 6

**User Story:** As a user, I want the chat interface to be responsive and accessible, so that I can use it comfortably on any device.

#### Acceptance Criteria

1. WHEN the chat interface renders on mobile devices THEN the system SHALL adapt the layout for small screens
2. WHEN a user interacts with the technique selector on mobile THEN the system SHALL display a mobile-optimized picker
3. WHEN the sidebar is open on mobile THEN the system SHALL overlay it on top of the chat interface
4. WHEN a user navigates using keyboard THEN the system SHALL support keyboard shortcuts for sending messages and navigation
5. WHEN screen readers are used THEN the system SHALL provide appropriate ARIA labels and semantic HTML

### Requirement 7

**User Story:** As a user, I want to see the instant chat interface immediately after logging in, so that I can start chatting without any additional navigation.

#### Acceptance Criteria

1. WHEN a user successfully logs in THEN the system SHALL redirect to `/dashboard/chat` as the default landing page
2. WHEN a user navigates to `/dashboard` THEN the system SHALL redirect to `/dashboard/chat`
3. WHEN a user navigates to `/dashboard/chat` THEN the system SHALL display the quick chat interface immediately
4. WHEN a user clicks "New Chat" in the sidebar THEN the system SHALL navigate to `/dashboard/chat` with a fresh conversation
5. WHEN a user has an active conversation THEN the system SHALL preserve the conversation state when navigating away and back

### Requirement 8

**User Story:** As a developer, I want the quick chat interface to integrate seamlessly with existing conversation infrastructure, so that all conversations are managed consistently.

#### Acceptance Criteria

1. WHEN a quick chat conversation is created THEN the system SHALL use the existing conversation API endpoints
2. WHEN messages are sent in quick chat THEN the system SHALL use the existing message sending and SSE infrastructure
3. WHEN conversations are displayed in the sidebar THEN the system SHALL use the existing conversation query hooks
4. WHEN a user switches between quick chat and conversation list THEN the system SHALL maintain consistent data state
5. WHEN the quick chat interface updates THEN the system SHALL invalidate and refetch conversation queries appropriately

### Requirement 9

**User Story:** As a user, I want the sidebar to be simplified and focused on core features, so that I can navigate efficiently without clutter.

#### Acceptance Criteria

1. WHEN the sidebar renders THEN the system SHALL remove the "Workspace" section and all dummy pages (Community, Resources, Messages, Reports)
2. WHEN the sidebar displays navigation items THEN the system SHALL show only: Chat (default), Conversations, Thinking Canvas, Security, Settings, and Help & Support
3. WHEN a user views the sidebar THEN the system SHALL maintain the existing collapse/expand functionality
4. WHEN the sidebar is collapsed THEN the system SHALL show only icons for navigation items
5. WHEN a user hovers over a collapsed navigation item THEN the system SHALL display a tooltip with the item label

### Requirement 10

**User Story:** As a user, I want to see the technique I'm using displayed clearly in the chat interface, so that I understand the inquiry method being applied.

#### Acceptance Criteria

1. WHEN a conversation is active THEN the system SHALL display the selected technique name near the input bar
2. WHEN a user changes the technique mid-conversation THEN the system SHALL show a visual indicator of the change
3. WHEN the technique selector is displayed THEN the system SHALL show a brief description of each technique
4. WHEN a technique is selected THEN the system SHALL provide visual feedback confirming the selection
5. WHEN a user hovers over the technique indicator THEN the system SHALL display a tooltip explaining the current technique
