# Requirements Document

## Introduction

This document outlines the requirements for implementing the conversation backend system for Mukti. The system enables users to engage in Socratic dialogues powered by AI through OpenRouter, with support for multiple questioning techniques, conversation management, message archival, usage tracking, and rate limiting. The implementation follows the Thinking Workspace paradigm where AI guides users through structured inquiry rather than providing direct answers.

## Glossary

- **Conversation**: A Socratic dialogue session between a user and the AI system
- **Technique**: A specific Socratic questioning methodology (e.g., elenchus, dialectic, maieutics)
- **RecentMessage**: A message stored in-memory within the conversation document (last 50 messages)
- **ArchivedMessage**: A message moved to separate storage when conversation exceeds 50 messages
- **OpenRouter**: Third-party API service providing unified access to multiple AI models
- **BullMQ**: Redis-based queue system for processing AI requests with priority-based execution
- **RequestQueue**: Job data structure for BullMQ containing request information
- **UsageEvent**: Time-series record of user interactions for analytics and billing
- **Subscription**: User's service tier (free/paid) with associated usage limits
- **RateLimit**: Anti-spam mechanism enforcing request quotas per time window
- **SystemPrompt**: Template instructions that define the AI's questioning behavior
- **ConversationService**: Service layer handling conversation business logic
- **MessageService**: Service layer managing message operations and archival
- **OpenRouterService**: Service layer interfacing with OpenRouter API
- **QueueService**: Service layer managing asynchronous request processing
- **UsageTrackingService**: Service layer recording usage events and analytics

## Requirements

### Requirement 1

**User Story:** As a user, I want to create new conversations with different Socratic techniques, so that I can explore problems using various questioning methodologies.

#### Acceptance Criteria

1. WHEN a user creates a conversation with a valid technique THEN the system SHALL create a new conversation document with the specified technique
2. WHEN a user creates a conversation THEN the system SHALL initialize the conversation with empty recentMessages array and zero message count
3. WHEN a user creates a conversation THEN the system SHALL set the conversation metadata with default values for estimatedCost, totalTokens, and messageCount
4. WHEN a user creates a conversation with a non-existent technique THEN the system SHALL return an error indicating the technique is invalid
5. WHEN a user creates a conversation THEN the system SHALL associate the conversation with the authenticated user's ID

### Requirement 2

**User Story:** As a user, I want to send messages to my conversations and receive Socratic responses, so that I can engage in guided inquiry.

#### Acceptance Criteria

1. WHEN a user sends a message to a conversation THEN the system SHALL validate the user owns the conversation
2. WHEN a user sends a message THEN the system SHALL check the user's rate limits before processing
3. WHEN a user exceeds their rate limit THEN the system SHALL return HTTP 429 with retry-after information
4. WHEN a user sends a message within rate limits THEN the system SHALL enqueue the request with priority based on subscription tier
5. WHEN a request is enqueued THEN the system SHALL return HTTP 202 with the request queue ID and position
6. WHEN a worker processes a request THEN the system SHALL load the conversation context including recent messages and technique template
7. WHEN building the AI prompt THEN the system SHALL apply the technique's systemPrompt and include conversation history
8. WHEN calling OpenRouter API THEN the system SHALL use the model specified by the user's subscription tier
9. WHEN OpenRouter returns a response THEN the system SHALL parse the content, token counts, and cost information
10. WHEN the AI response is received THEN the system SHALL append both user message and AI response to the conversation
11. WHEN appending messages THEN the system SHALL update conversation metadata including totalTokens, estimatedCost, and lastMessageAt
12. WHEN the conversation exceeds 50 messages THEN the system SHALL archive the oldest messages to ArchivedMessage collection
13. WHEN messages are archived THEN the system SHALL set hasArchivedMessages flag to true
14. WHEN the request completes THEN the system SHALL update the RequestQueue status to COMPLETED
15. WHEN the request completes THEN the system SHALL log a UsageEvent with token counts, cost, and latency

### Requirement 3

**User Story:** As a user, I want to retrieve my conversation history including archived messages, so that I can review past dialogues.

#### Acceptance Criteria

1. WHEN a user requests a conversation by ID THEN the system SHALL return the conversation with recent messages
2. WHEN a user requests archived messages THEN the system SHALL retrieve messages from ArchivedMessage collection ordered by sequence number
3. WHEN retrieving archived messages THEN the system SHALL support pagination with beforeSequence parameter
4. WHEN a user requests a conversation they do not own THEN the system SHALL return HTTP 403 Forbidden
5. WHEN a user requests a non-existent conversation THEN the system SHALL return HTTP 404 Not Found

### Requirement 4

**User Story:** As a user, I want to list all my conversations with filtering and sorting options, so that I can easily find specific dialogues.

#### Acceptance Criteria

1. WHEN a user lists conversations THEN the system SHALL return only conversations owned by that user
2. WHEN listing conversations THEN the system SHALL support pagination with page and limit parameters
3. WHEN listing conversations THEN the system SHALL support filtering by technique, tags, isArchived, and isFavorite
4. WHEN listing conversations THEN the system SHALL support sorting by createdAt, updatedAt, and lastMessageAt
5. WHEN listing conversations THEN the system SHALL return total count for pagination metadata

### Requirement 5

**User Story:** As a user, I want to update conversation properties like title, tags, technique, and favorite status, so that I can organize my dialogues and change questioning approaches.

#### Acceptance Criteria

1. WHEN a user updates a conversation title THEN the system SHALL validate the title is not empty
2. WHEN a user updates conversation tags THEN the system SHALL validate tags are an array of strings
3. WHEN a user updates isFavorite or isArchived flags THEN the system SHALL accept boolean values
4. WHEN a user updates a conversation technique THEN the system SHALL validate the technique exists in the allowed set
5. WHEN a user updates a conversation technique THEN the system SHALL update the conversation document with the new technique
6. WHEN a user updates a conversation they do not own THEN the system SHALL return HTTP 403 Forbidden
7. WHEN a user updates a non-existent conversation THEN the system SHALL return HTTP 404 Not Found

### Requirement 6

**User Story:** As a user, I want to delete conversations, so that I can remove dialogues I no longer need.

#### Acceptance Criteria

1. WHEN a user deletes a conversation THEN the system SHALL remove the conversation document
2. WHEN a user deletes a conversation THEN the system SHALL remove all associated archived messages
3. WHEN a user deletes a conversation they do not own THEN the system SHALL return HTTP 403 Forbidden
4. WHEN a user deletes a non-existent conversation THEN the system SHALL return HTTP 404 Not Found

### Requirement 7

**User Story:** As a system administrator, I want built-in Socratic techniques seeded in the database, so that users have ready-to-use questioning methodologies.

#### Acceptance Criteria

1. WHEN the system initializes THEN the system SHALL seed six built-in techniques: elenchus, dialectic, maieutics, definitional, analogical, and counterfactual
2. WHEN seeding techniques THEN the system SHALL set isBuiltIn flag to true
3. WHEN seeding techniques THEN the system SHALL set status to approved
4. WHEN seeding techniques THEN the system SHALL include complete template with systemPrompt, questioningStyle, followUpStrategy, and exampleQuestions
5. WHEN a technique already exists THEN the system SHALL skip seeding that technique

### Requirement 8

**User Story:** As a system administrator, I want a test user seeded in the database, so that I can test the conversation system without manual user creation.

#### Acceptance Criteria

1. WHEN the system initializes THEN the system SHALL seed a test user with email test@mukti.app
2. WHEN seeding the test user THEN the system SHALL create an associated subscription with free tier limits
3. WHEN the test user already exists THEN the system SHALL skip seeding that user

### Requirement 9

**User Story:** As a developer, I want comprehensive error handling for OpenRouter API failures, so that the system gracefully handles external service issues.

#### Acceptance Criteria

1. WHEN OpenRouter API returns an error THEN the system SHALL log the error with full context
2. WHEN OpenRouter API fails and retry count is below maximum THEN the system SHALL requeue the request with exponential backoff
3. WHEN OpenRouter API fails and retry count exceeds maximum THEN the system SHALL mark the request as FAILED
4. WHEN a request is marked FAILED THEN the system SHALL update the RequestQueue with error details
5. WHEN OpenRouter API times out THEN the system SHALL treat it as a retriable error

### Requirement 10

**User Story:** As a user, I want my usage tracked for analytics and billing purposes, so that I can monitor my consumption and costs.

#### Acceptance Criteria

1. WHEN a conversation message is processed THEN the system SHALL create a UsageEvent with eventType QUESTION
2. WHEN creating a UsageEvent THEN the system SHALL include metadata with tokens, cost, latency, model, and technique
3. WHEN creating a UsageEvent THEN the system SHALL associate it with the user's ID
4. WHEN a UsageEvent is created THEN the system SHALL update the user's subscription usage counters
5. WHEN updating subscription usage THEN the system SHALL increment questionsToday and questionsThisHour atomically

### Requirement 11

**User Story:** As a user, I want rate limiting enforced based on my subscription tier, so that system resources are fairly distributed.

#### Acceptance Criteria

1. WHEN a user sends a message THEN the system SHALL check if daily question limit is exceeded
2. WHEN a user sends a message THEN the system SHALL check if hourly question limit is exceeded
3. WHEN daily limit is exceeded THEN the system SHALL return HTTP 429 with message indicating daily limit reached
4. WHEN hourly limit is exceeded THEN the system SHALL return HTTP 429 with message indicating hourly limit reached
5. WHEN usage counters need daily reset THEN the system SHALL reset questionsToday to zero
6. WHEN usage counters need hourly reset THEN the system SHALL reset questionsThisHour to zero

### Requirement 12

**User Story:** As a developer, I want the conversation API documented with Swagger/OpenAPI, so that frontend developers can easily integrate with the backend.

#### Acceptance Criteria

1. WHEN accessing the API documentation THEN the system SHALL display all conversation endpoints with descriptions
2. WHEN viewing endpoint documentation THEN the system SHALL show request body schemas with validation rules
3. WHEN viewing endpoint documentation THEN the system SHALL show response schemas for success and error cases
4. WHEN viewing endpoint documentation THEN the system SHALL include example requests and responses
5. WHEN viewing endpoint documentation THEN the system SHALL indicate which endpoints require authentication
