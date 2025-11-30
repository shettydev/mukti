# Requirements Document

## Introduction

This document outlines the requirements for integrating the conversation backend API with the Mukti Web frontend. The system enables users to create, manage, and interact with Socratic dialogue conversations through a responsive React-based interface. The implementation follows TanStack Query patterns for data fetching, optimistic updates, and proper error handling, ensuring a seamless user experience aligned with Mukti's cognitive liberation philosophy.

## Glossary

- **ConversationAPI**: Frontend API client layer for conversation endpoints
- **TanStack Query**: React data-fetching library providing caching, background updates, and optimistic mutations
- **Query Hook**: Custom React hook wrapping TanStack Query for specific data operations
- **Optimistic Update**: UI update applied immediately before server confirmation
- **Query Key Factory**: Centralized function generating consistent cache keys
- **Skeleton Loading**: Loading state UI matching final content structure
- **Property-Based Test**: Test validating universal properties across generated inputs
- **Unit Test**: Test validating specific examples and edge cases
- **API Client**: Centralized fetch wrapper with error handling and type safety
- **DTO**: Data Transfer Object defining request/response shapes
- **Conversation Card**: UI component displaying conversation summary
- **Conversation Detail**: UI component showing full conversation with messages
- **Message Input**: UI component for composing and sending messages
- **Rate Limit Banner**: UI component displaying rate limit status and retry information
- **Technique Selector**: UI component for choosing Socratic questioning methodology
- **Pagination Controls**: UI component for navigating paginated conversation lists
- **Filter Panel**: UI component for filtering conversations by technique, tags, and status

## Requirements

### Requirement 1

**User Story:** As a developer, I want a centralized API client for conversation endpoints, so that all API calls follow consistent patterns with proper error handling.

#### Acceptance Criteria

1. WHEN the API client makes a request THEN the system SHALL use the centralized config for base URL and timeout
2. WHEN the API client receives a response THEN the system SHALL parse the standardized response format with success, data, and meta fields
3. WHEN the API client encounters an error THEN the system SHALL throw a typed error with code, message, and details
4. WHEN the API client makes authenticated requests THEN the system SHALL include JWT token in Authorization header
5. WHEN the API client receives HTTP 401 THEN the system SHALL trigger authentication flow

### Requirement 2

**User Story:** As a developer, I want TypeScript types for all conversation DTOs, so that the frontend has type safety matching the backend API.

#### Acceptance Criteria

1. WHEN defining conversation types THEN the system SHALL include all fields from backend Conversation schema
2. WHEN defining message types THEN the system SHALL include role, content, timestamp, and sequence fields
3. WHEN defining create conversation DTO THEN the system SHALL require title and technique with optional tags
4. WHEN defining update conversation DTO THEN the system SHALL make all fields optional
5. WHEN defining send message DTO THEN the system SHALL require content field

### Requirement 3

**User Story:** As a developer, I want query key factories for conversation queries, so that cache invalidation is consistent and predictable.

#### Acceptance Criteria

1. WHEN defining query keys THEN the system SHALL create hierarchical keys with conversations.all as root
2. WHEN defining list query keys THEN the system SHALL include filter parameters in the key
3. WHEN defining detail query keys THEN the system SHALL include conversation ID in the key
4. WHEN defining message query keys THEN the system SHALL include conversation ID and pagination parameters
5. WHEN invalidating queries THEN the system SHALL support invalidating all conversations or specific subsets

### Requirement 4

**User Story:** As a user, I want to create new conversations with a selected technique, so that I can start Socratic dialogues.

#### Acceptance Criteria

1. WHEN a user submits the create conversation form THEN the system SHALL validate title is not empty
2. WHEN a user submits the create conversation form THEN the system SHALL validate technique is selected
3. WHEN creating a conversation THEN the system SHALL show loading state on submit button
4. WHEN the conversation is created successfully THEN the system SHALL add it optimistically to the conversation list
5. WHEN the conversation creation fails THEN the system SHALL revert the optimistic update and show error message
6. WHEN the conversation is created successfully THEN the system SHALL navigate to the conversation detail page
7. WHEN the conversation is created successfully THEN the system SHALL invalidate the conversation list query

### Requirement 5

**User Story:** As a user, I want to view an infinite-scrolling list of my conversations with filtering and sorting, so that I can find specific dialogues.

#### Acceptance Criteria

1. WHEN the conversation list loads THEN the system SHALL display skeleton loading matching the final layout
2. WHEN conversations are loaded THEN the system SHALL display conversation cards with title, technique, last message preview, and timestamp
3. WHEN the user changes filter options THEN the system SHALL update the query parameters and refetch from page 1
4. WHEN the user changes sort order THEN the system SHALL update the query parameters and refetch from page 1
5. WHEN the user scrolls to the bottom of the list THEN the system SHALL automatically fetch the next page while maintaining filters
6. WHEN fetching additional pages THEN the system SHALL append new conversations to the existing list
7. WHEN the conversation list is empty THEN the system SHALL display an empty state with create conversation CTA
8. WHEN the conversation list fails to load THEN the system SHALL display error state with retry button
9. WHEN all conversations are loaded THEN the system SHALL not attempt to fetch additional pages

### Requirement 6

**User Story:** As a user, I want to view a specific conversation with its messages, so that I can review the dialogue history.

#### Acceptance Criteria

1. WHEN the conversation detail loads THEN the system SHALL display skeleton loading for messages
2. WHEN the conversation is loaded THEN the system SHALL display recent messages in chronological order
3. WHEN the conversation has archived messages THEN the system SHALL show a "Load older messages" button
4. WHEN the user clicks "Load older messages" THEN the system SHALL fetch archived messages with pagination
5. WHEN archived messages are loaded THEN the system SHALL prepend them to the message list
6. WHEN the conversation fails to load THEN the system SHALL display error state with back button
7. WHEN the conversation is not found THEN the system SHALL display 404 state

### Requirement 7

**User Story:** As a user, I want to send messages to a conversation and see AI responses, so that I can engage in Socratic dialogue.

#### Acceptance Criteria

1. WHEN a user types a message THEN the system SHALL enable the send button only when content is not empty
2. WHEN a user sends a message THEN the system SHALL add the message optimistically to the conversation
3. WHEN a user sends a message THEN the system SHALL disable the input and show loading state
4. WHEN the message is enqueued successfully THEN the system SHALL display "Processing..." status with job position
5. WHEN the message processing completes THEN the system SHALL fetch the updated conversation with AI response
6. WHEN the message fails to send THEN the system SHALL revert the optimistic update and show error message
7. WHEN the user hits rate limit THEN the system SHALL display rate limit banner with retry-after time
8. WHEN the user sends a message THEN the system SHALL clear the input field after successful submission

### Requirement 8

**User Story:** As a user, I want to update conversation properties, so that I can organize and customize my dialogues.

#### Acceptance Criteria

1. WHEN a user updates conversation title THEN the system SHALL validate title is not empty
2. WHEN a user updates conversation title THEN the system SHALL apply the update optimistically
3. WHEN a user toggles favorite status THEN the system SHALL update the UI immediately
4. WHEN a user toggles archive status THEN the system SHALL update the UI immediately
5. WHEN a user changes technique THEN the system SHALL show confirmation dialog explaining the change
6. WHEN a user updates tags THEN the system SHALL validate tags are non-empty strings
7. WHEN an update fails THEN the system SHALL revert the optimistic update and show error message
8. WHEN an update succeeds THEN the system SHALL invalidate related queries

### Requirement 9

**User Story:** As a user, I want to delete conversations, so that I can remove dialogues I no longer need.

#### Acceptance Criteria

1. WHEN a user clicks delete THEN the system SHALL show confirmation dialog
2. WHEN a user confirms deletion THEN the system SHALL remove the conversation optimistically from the list
3. WHEN a user confirms deletion THEN the system SHALL show loading state on delete button
4. WHEN deletion succeeds THEN the system SHALL invalidate conversation list query
5. WHEN deletion fails THEN the system SHALL revert the optimistic update and show error message
6. WHEN deleting from detail page THEN the system SHALL navigate back to conversation list after success

### Requirement 10

**User Story:** As a user, I want to see loading states during API operations, so that I understand the system is processing my requests.

#### Acceptance Criteria

1. WHEN fetching conversation list THEN the system SHALL display skeleton cards matching final layout
2. WHEN fetching conversation detail THEN the system SHALL display skeleton messages
3. WHEN sending a message THEN the system SHALL show spinner on send button
4. WHEN updating a conversation THEN the system SHALL show loading indicator on the updated field
5. WHEN deleting a conversation THEN the system SHALL show spinner on delete button

### Requirement 11

**User Story:** As a user, I want clear error messages when operations fail, so that I understand what went wrong and how to proceed.

#### Acceptance Criteria

1. WHEN an API call fails with network error THEN the system SHALL display "Connection failed. Please check your internet."
2. WHEN an API call fails with 404 THEN the system SHALL display "Conversation not found"
3. WHEN an API call fails with 403 THEN the system SHALL display "You don't have permission to access this conversation"
4. WHEN an API call fails with 429 THEN the system SHALL display rate limit message with retry time
5. WHEN an API call fails with 500 THEN the system SHALL display "Something went wrong. Please try again."
6. WHEN displaying errors THEN the system SHALL include a retry button where applicable

### Requirement 12

**User Story:** As a developer, I want comprehensive unit tests for API client and query hooks, so that the integration is reliable and maintainable.

#### Acceptance Criteria

1. WHEN testing API client THEN the system SHALL mock fetch responses for all endpoints
2. WHEN testing API client THEN the system SHALL verify correct request headers and body
3. WHEN testing API client THEN the system SHALL verify error handling for all error types
4. WHEN testing query hooks THEN the system SHALL verify correct query keys are used
5. WHEN testing mutation hooks THEN the system SHALL verify optimistic updates are applied and reverted correctly

### Requirement 13

**User Story:** As a developer, I want property-based tests for critical conversation operations, so that edge cases are automatically discovered.

#### Acceptance Criteria

1. WHEN testing conversation creation THEN the system SHALL generate random valid conversation data
2. WHEN testing conversation updates THEN the system SHALL verify updates preserve conversation invariants
3. WHEN testing message sending THEN the system SHALL verify message ordering is maintained
4. WHEN testing pagination THEN the system SHALL verify page boundaries are handled correctly
5. WHEN testing filtering THEN the system SHALL verify filter combinations produce valid results

### Requirement 14

**User Story:** As a user, I want responsive conversation UI that works on mobile and desktop, so that I can use Mukti on any device.

#### Acceptance Criteria

1. WHEN viewing on mobile THEN the system SHALL display single-column layout
2. WHEN viewing on desktop THEN the system SHALL display sidebar with conversation list and main content area
3. WHEN viewing messages on mobile THEN the system SHALL optimize message bubbles for narrow screens
4. WHEN viewing conversation list on mobile THEN the system SHALL show compact card layout
5. WHEN interacting with forms on mobile THEN the system SHALL ensure touch targets are at least 44x44 pixels

### Requirement 15

**User Story:** As a user, I want keyboard shortcuts for common actions, so that I can navigate efficiently.

#### Acceptance Criteria

1. WHEN the user presses Cmd/Ctrl+K THEN the system SHALL open conversation search
2. WHEN the user presses Cmd/Ctrl+N THEN the system SHALL open new conversation dialog
3. WHEN the user presses Escape THEN the system SHALL close open dialogs
4. WHEN the user presses Enter in message input THEN the system SHALL send the message
5. WHEN the user presses Shift+Enter in message input THEN the system SHALL insert a new line
