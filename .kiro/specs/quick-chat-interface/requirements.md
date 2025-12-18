# Requirements Document

## Introduction

This document specifies the requirements for the Quick Chat Interface feature in Mukti. The Quick Chat Interface transforms Mukti into a streamlined, ChatGPT/Claude-like experience where users can start conversations instantly. The interface removes the `/dashboard` prefix entirely, using clean routes like `/chat`, `/chat/:id`, and `/canvas`. The sidebar is simplified to show only Thinking Canvas and conversation history, with all other options moved to a user profile popover.

## Glossary

- **Quick Chat Interface**: The main chat interface accessible at `/chat` that allows immediate conversation initiation
- **Technique Selector**: A UI component that allows users to choose a Socratic questioning technique before or during conversation
- **Auto-Title Generation**: Client-side functionality that generates conversation titles based on initial messages
- **Sidebar Conversation List**: A dynamic list in the sidebar showing all conversations with auto-generated titles
- **User Profile Popover**: A dropdown menu triggered by clicking the user profile that contains Settings, Security, Help & Support, and Logout options
- **Elenchus**: The default Socratic technique focusing on cross-examination and refutation
- **Socratic Technique**: A method of philosophical inquiry (elenchus, maieutics, dialectic, definitional, analogical, counterfactual)
- **Message Stream**: Real-time delivery of AI responses using Server-Sent Events (SSE)
- **Conversation Session**: A persistent chat session with a unique ID and associated messages
- **Centered Input Layout**: Chat input positioned in the center of the page (like Claude) when no conversation is active

## Requirements

### Requirement 1

**User Story:** As a user, I want to start chatting immediately when I access the app, so that I can quickly engage with Mukti without extra navigation steps.

#### Acceptance Criteria

1. WHEN a user navigates to `/chat` THEN the system SHALL display a centered chat input with a quirky heading above it
2. WHEN the chat interface loads with no active conversation THEN the system SHALL display the input in the center of the page without a navbar
3. WHEN the chat interface is empty THEN the system SHALL show a creative heading that reflects Mukti's Socratic philosophy
4. WHEN a user types in the input bar THEN the system SHALL enable the send button
5. WHEN a user sends their first message THEN the system SHALL create a new conversation, navigate to `/chat/:id`, and display the message immediately

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

1. WHEN a user sends the first message in a new conversation THEN the system SHALL generate a title based on the message content
2. WHEN a title is generated THEN the system SHALL ensure it is concise (maximum 60 characters) and descriptive
3. WHEN a conversation title is generated THEN the system SHALL update the sidebar conversation list immediately
4. WHEN title generation encounters an edge case THEN the system SHALL use a fallback title format "Conversation - [timestamp]"

### Requirement 4

**User Story:** As a user, I want to see all my conversations in the sidebar, so that I can quickly switch between different chat sessions.

#### Acceptance Criteria

1. WHEN a new conversation is created THEN the system SHALL add it to the top of the sidebar conversation list
2. WHEN a conversation title is updated THEN the system SHALL reflect the change in the sidebar immediately
3. WHEN a user clicks a conversation in the sidebar THEN the system SHALL navigate to `/chat/:id` and load that conversation
4. WHEN the sidebar displays conversations THEN the system SHALL show all conversations sorted by last activity with infinite scroll
5. WHEN a conversation is active THEN the system SHALL highlight it in the sidebar conversation list
6. WHEN the sidebar renders THEN the system SHALL show Thinking Canvas link at the top, followed by a separator, then the conversation list

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

**User Story:** As a user, I want clean and simple URL routes, so that I can easily navigate and share links.

#### Acceptance Criteria

1. WHEN a user successfully logs in THEN the system SHALL redirect to `/chat` as the default landing page
2. WHEN a user navigates to `/dashboard` or `/dashboard/*` THEN the system SHALL redirect to the equivalent `/chat` or `/canvas` route
3. WHEN a user is on a conversation THEN the URL SHALL be `/chat/:id` where id is the conversation ID
4. WHEN a user clicks "New Chat" in the sidebar THEN the system SHALL navigate to `/chat` with a fresh conversation state
5. WHEN a user navigates to `/canvas` THEN the system SHALL display the Thinking Canvas interface

### Requirement 8

**User Story:** As a developer, I want the quick chat interface to integrate seamlessly with existing conversation infrastructure, so that all conversations are managed consistently.

#### Acceptance Criteria

1. WHEN a quick chat conversation is created THEN the system SHALL use the existing conversation API endpoints
2. WHEN messages are sent in quick chat THEN the system SHALL use the existing message sending and SSE infrastructure
3. WHEN conversations are displayed in the sidebar THEN the system SHALL use the existing conversation query hooks
4. WHEN a user switches between conversations THEN the system SHALL maintain consistent data state
5. WHEN the quick chat interface updates THEN the system SHALL invalidate and refetch conversation queries appropriately

### Requirement 9

**User Story:** As a user, I want a simplified sidebar focused on conversations, so that I can navigate efficiently without clutter.

#### Acceptance Criteria

1. WHEN the sidebar renders THEN the system SHALL show only: New Chat button, Thinking Canvas link, separator, and conversation list
2. WHEN the sidebar displays the conversation list THEN the system SHALL support infinite scroll for all conversations
3. WHEN a user views the sidebar THEN the system SHALL maintain the existing collapse/expand functionality
4. WHEN the sidebar is collapsed THEN the system SHALL show only icons for Thinking Canvas and a condensed conversation list
5. WHEN a user hovers over a collapsed navigation item THEN the system SHALL display a tooltip with the item label

### Requirement 10

**User Story:** As a user, I want to access settings and other options from my profile, so that the sidebar stays focused on conversations.

#### Acceptance Criteria

1. WHEN a user clicks on their profile at the bottom of the sidebar THEN the system SHALL display a popover menu
2. WHEN the profile popover opens THEN the system SHALL show: Security, Settings, Help & Support, and Logout options
3. WHEN a user clicks Security in the popover THEN the system SHALL navigate to `/security`
4. WHEN a user clicks Settings in the popover THEN the system SHALL navigate to `/settings`
5. WHEN a user clicks Help & Support in the popover THEN the system SHALL navigate to `/help`
6. WHEN a user clicks Logout in the popover THEN the system SHALL log the user out and redirect to the login page

### Requirement 11

**User Story:** As a user, I want to see the technique I'm using displayed clearly in the chat interface, so that I understand the inquiry method being applied.

#### Acceptance Criteria

1. WHEN a conversation is active THEN the system SHALL display the selected technique name near the input bar
2. WHEN a user changes the technique mid-conversation THEN the system SHALL show a visual indicator of the change
3. WHEN the technique selector is displayed THEN the system SHALL show a brief description of each technique
4. WHEN a technique is selected THEN the system SHALL provide visual feedback confirming the selection
5. WHEN a user hovers over the technique indicator THEN the system SHALL display a tooltip explaining the current technique

### Requirement 12

**User Story:** As a user, I want a clean, centered chat experience when starting a new conversation, so that I can focus on my inquiry.

#### Acceptance Criteria

1. WHEN the user is on `/chat` with no active conversation THEN the system SHALL hide the top navbar
2. WHEN the empty chat state renders THEN the system SHALL display the input bar centered vertically and horizontally
3. WHEN the empty chat state renders THEN the system SHALL display a quirky, inspiring heading above the input
4. WHEN a conversation becomes active THEN the system SHALL transition to the standard chat layout with messages
5. WHEN the user clicks "New Chat" THEN the system SHALL return to the centered input layout
