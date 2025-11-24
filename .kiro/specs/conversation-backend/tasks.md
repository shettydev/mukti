# Implementation Plan

- [x] 1. Set up module structure and dependencies
  - Create conversations module with proper NestJS structure
  - Install required dependencies: @nestjs/mongoose, @nestjs/bullmq, bullmq, fast-check, openai SDK
  - Configure Redis connection for BullMQ
  - Configure module imports and exports
  - _Requirements: All_

- [x] 2. Implement database seeding service
  - Create SeedService for initializing database with test data
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3_

- [x] 2.1 Implement technique seeding
  - Create method to seed six built-in Socratic techniques
  - Set isBuiltIn: true, status: 'approved' for all seeded techniques
  - Include complete templates with systemPrompt, questioningStyle, followUpStrategy, exampleQuestions
  - Implement idempotency check to skip existing techniques
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2.2 Write property test for technique seeding
  - **Property 23: Seeded techniques have correct properties**
  - **Validates: Requirements 7.2, 7.3, 7.4**

- [x] 2.3 Write property test for seeding idempotency
  - **Property 24: Seeding is idempotent**
  - **Validates: Requirements 7.5, 8.3**

- [x] 2.4 Implement test user seeding
  - Create method to seed test user with email test@mukti.app
  - Hash password using bcrypt
  - Create associated subscription with free tier limits
  - Implement idempotency check to skip existing user
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 2.5 Create seed command or initialization hook
  - Integrate seeding into application bootstrap
  - Add CLI command for manual seeding
  - _Requirements: 7.1, 8.1_

- [-] 3. Implement ConversationService core CRUD operations
  - Create ConversationService with dependency injection
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 6.1, 6.2_

- [x] 3.1 Implement createConversation method
  - Validate technique exists in allowed set
  - Initialize conversation with empty recentMessages
  - Set default metadata values
  - Associate with authenticated user
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3.2 Write property test for conversation creation
  - **Property 1: Conversation creation initializes correctly**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.5**

- [x] 3.3 Write property test for invalid technique rejection
  - **Property 2: Invalid techniques are rejected**
  - **Validates: Requirements 1.4**

- [x] 3.4 Implement findConversationById method
  - Retrieve conversation by ID
  - Validate user ownership
  - Return 403 if user doesn't own conversation
  - Return 404 if conversation doesn't exist
  - _Requirements: 3.1, 3.4, 3.5_

- [x] 3.5 Write property test for ownership validation
  - **Property 3: Ownership validation prevents unauthorized access**
  - **Validates: Requirements 2.1, 3.4, 5.4, 6.3**

- [x] 3.6 Write property test for non-existent resources
  - **Property 22: Non-existent resources return 404**
  - **Validates: Requirements 3.5, 5.5, 6.4**

- [x] 3.7 Implement findUserConversations method
  - List conversations for authenticated user only
  - Support pagination with page and limit
  - Support filtering by technique, tags, isArchived, isFavorite
  - Support sorting by createdAt, updatedAt, lastMessageAt
  - Return total count for pagination metadata
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3.8 Write property test for conversation listing ownership
  - **Property 14: Conversation listing respects ownership**
  - **Validates: Requirements 4.1**

- [x] 3.9 Write property test for pagination
  - **Property 13: Pagination works correctly**
  - **Validates: Requirements 3.3, 4.2**

- [x] 3.10 Write property test for filtering
  - **Property 15: Filtering works correctly**
  - **Validates: Requirements 4.3**

- [x] 3.11 Write property test for sorting
  - **Property 16: Sorting works correctly**
  - **Validates: Requirements 4.4**

- [x] 3.12 Write property test for total count accuracy
  - **Property 17: Total count is accurate**
  - **Validates: Requirements 4.5**

- [x] 3.13 Implement updateConversation method
  - Validate user ownership
  - Validate title is not empty
  - Validate tags are array of strings
  - Validate boolean flags are boolean type
  - Validate technique is in allowed set if provided
  - Update allowed fields only (title, tags, isFavorite, isArchived, technique)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_
    and
- [x] 3.14 Write property test for title validation
  - **Property 18: Title validation rejects empty strings**
  - **Validates: Requirements 5.1**

- [x] 3.15 Write property test for tags validation
  - **Property 19: Tags validation enforces array of strings**
  - **Validates: Requirements 5.2**

- [x] 3.16 Write property test for boolean validation
  - **Property 20: Boolean flags accept only booleans**
  - **Validates: Requirements 5.3**

- [x] 3.17 Write property test for technique switching
  - **Property 30: Technique switching validates and updates**
  - **Validates: Requirements 5.4, 5.5**

- [x] 3.18 Implement deleteConversation method
  - Validate user ownership
  - Delete conversation document
  - Cascade delete all archived messages
  - Return 404 if conversation doesn't exist
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 3.19 Write property test for cascade deletion
  - **Property 21: Conversation deletion cascades**
  - **Validates: Requirements 6.1, 6.2**

- [x] 4. Implement MessageService for message operations
  - Create MessageService with dependency injection
  - _Requirements: 2.10, 2.11, 2.12, 2.13, 3.2, 3.3_

- [x] 4.1 Implement addMessageToConversation method
  - Append user message and AI response to recentMessages
  - Update conversation metadata (totalTokens, estimatedCost, lastMessageAt)
  - Increment totalMessageCount
  - _Requirements: 2.10, 2.11_

- [x] 4.2 Write property test for message appending
  - **Property 8: Both messages are appended**
  - **Validates: Requirements 2.10**

- [x] 4.3 Write property test for metadata updates
  - **Property 6: Message appending updates metadata**
  - **Validates: Requirements 2.11**

- [x] 4.4 Implement archiveOldMessages method
  - Check if recentMessages exceeds 50
  - Move oldest messages to ArchivedMessage collection
  - Set hasArchivedMessages flag to true
  - Keep only last 50 messages in recentMessages
  - Assign sequence numbers to archived messages
  - _Requirements: 2.12, 2.13_

- [x] 4.5 Write property test for archival threshold
  - **Property 7: Archival threshold triggers correctly**
  - **Validates: Requirements 2.12, 2.13**

- [x] 4.6 Implement getArchivedMessages method
  - Retrieve archived messages by conversationId
  - Order by sequenceNumber ascending
  - Support pagination with beforeSequence parameter
  - _Requirements: 3.2, 3.3_

- [x] 4.7 Write property test for archived message ordering
  - **Property 12: Archived messages maintain order**
  - **Validates: Requirements 3.2**

- [x] 4.8 Implement buildConversationContext method
  - Load recent messages from conversation
  - Format messages for AI prompt
  - Include technique template
  - _Requirements: 2.6, 2.7_

- [x] 5. Implement OpenRouterService for AI integration
  - Create OpenRouterService with HTTP client
  - Configure OpenRouter API base URL and authentication
  - _Requirements: 2.7, 2.8, 2.9, 9.1, 9.2, 9.4, 9.5_

- [x] 5.1 Implement buildPrompt method
  - Apply technique's systemPrompt
  - Include conversation history
  - Format user message
  - _Requirements: 2.7_

- [x] 5.2 Implement selectModel method
  - Return gpt-5-mini for free tier
  - Return gpt-5.1 for paid tier
  - _Requirements: 2.8_

- [x] 5.3 Implement sendChatCompletion method
  - Send request to OpenRouter API
  - Include HTTP-Referer and X-Title headers
  - Set 30-second timeout
  - Handle API errors
  - _Requirements: 2.8, 2.9, 9.1, 9.5_

- [x] 5.4 Implement parseResponse method
  - Extract content from API response
  - Parse token counts (prompt, completion, total)
  - Calculate cost based on model pricing
  - _Requirements: 2.9_

- [x] 5.5 Write property test for prompt building
  - Verify systemPrompt and conversation history are included
  - _Requirements: 2.7_

- [x] 5.6 Write property test for model selection
  - **Property 8 variant: Model selection based on tier**
  - **Validates: Requirements 2.8**

- [x] 5.7 Write property test for response parsing
  - Verify all required fields are extracted
  - _Requirements: 2.9_

- [x] 5.8 Implement error handling and retry logic
  - Log errors with full context
  - Identify retriable vs non-retriable errors
  - Return error details for failed requests
  - _Requirements: 9.1, 9.4, 9.5_

- [x] 5.9 Write property test for error logging
  - **Property 25: OpenRouter errors are logged**
  - **Validates: Requirements 9.1**

- [x] 5.10 Write property test for error details storage
  - **Property 27: Failed requests store error details**
  - **Validates: Requirements 9.4**

- [x] 6. Implement QueueService with BullMQ
  - Create QueueService using @nestjs/bullmq
  - Configure BullMQ with Redis connection
  - _Requirements: 2.4, 2.5, 2.6, 2.14, 9.2, 9.3_

- [x] 6.1 Set up BullMQ module and queue
  - Import BullModule in conversations module
  - Configure Redis connection from environment variables
  - Register 'conversation-requests' queue
  - Set queue options (attempts: 3, backoff: exponential)
  - _Requirements: 2.4_

- [x] 6.2 Implement enqueueRequest method
  - Add job to BullMQ queue with user message data
  - Set priority based on subscription tier (paid: 10, free: 1)
  - Return job ID and current queue position
  - _Requirements: 2.4, 2.5_

- [x] 6.3 Write property test for request enqueueing
  - **Property 5: Request enqueueing returns correct response**
  - **Validates: Requirements 2.4, 2.5**

- [x] 6.4 Implement getJobStatus method
  - Query BullMQ for job status by ID
  - Return job state (waiting, active, completed, failed)
  - Include progress information if available
  - _Requirements: 2.5_

- [x] 6.5 Implement processRequest worker processor
  - Create @Processor decorator for 'conversation-requests' queue
  - Implement @Process() method to handle jobs
  - Load conversation context
  - Call OpenRouterService
  - Add messages to conversation
  - Archive if needed
  - Log usage event
  - Return job result with messageId, tokens, cost
  - _Requirements: 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15_

- [x] 6.6 Write property test for request completion
  - **Property 9: Request completion updates queue status**
  - **Validates: Requirements 2.14**

- [x] 6.7 Implement error handling in processor
  - Catch and log errors during processing
  - Throw errors to trigger BullMQ retry mechanism
  - BullMQ will automatically retry with exponential backoff
  - After max attempts, job moves to failed state
  - _Requirements: 9.2, 9.3_

- [x] 6.8 Write property test for retry logic
  - **Property 26: Retriable errors trigger requeue**
  - **Validates: Requirements 9.2**

- [x] 6.9 Implement job event listeners
  - Listen to 'completed' event for successful jobs
  - Listen to 'failed' event for failed jobs after all retries
  - Log job lifecycle events
  - _Requirements: 9.3, 9.4_

- [x] 6.10 Implement getQueueMetrics method
  - Get counts for waiting, active, completed, failed jobs
  - Return queue health metrics
  - _Requirements: Monitoring_

- [ ] 7. Implement UsageTrackingService for analytics
  - Create UsageTrackingService with UsageEvent model
  - _Requirements: 2.15, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 7.1 Implement logQuestionEvent method
  - Create UsageEvent with eventType QUESTION
  - Include metadata: tokens, cost, latency, model, technique
  - Associate with userId and conversationId
  - _Requirements: 2.15, 10.1, 10.2, 10.3_

- [ ] 7.2 Write property test for usage event logging
  - **Property 10: Usage events are logged**
  - **Validates: Requirements 2.15, 10.1, 10.2, 10.3**

- [ ] 7.3 Implement updateSubscriptionUsage method
  - Increment questionsToday atomically
  - Increment questionsThisHour atomically
  - Check if resets are needed
  - _Requirements: 10.4, 10.5_

- [ ] 7.4 Write property test for subscription counter updates
  - **Property 11: Subscription usage counters increment**
  - **Validates: Requirements 10.4, 10.5**

- [ ] 7.5 Implement resetDailyUsage method
  - Check if different calendar day
  - Reset questionsToday to 0
  - Update lastResetAt timestamp
  - _Requirements: 11.5_

- [ ] 7.6 Write property test for daily reset
  - **Property 28: Usage counter resets work correctly**
  - **Validates: Requirements 11.5**

- [ ] 7.7 Implement resetHourlyUsage method
  - Check if >= 1 hour elapsed
  - Reset questionsThisHour to 0
  - Update lastHourResetAt timestamp
  - _Requirements: 11.6_

- [ ] 7.8 Write property test for hourly reset
  - **Property 29: Hourly reset works correctly**
  - **Validates: Requirements 11.6**

- [ ] 8. Implement RateLimitService for quota enforcement
  - Create RateLimitService with Subscription model
  - _Requirements: 2.2, 2.3, 11.1, 11.2, 11.3, 11.4_

- [ ] 8.1 Implement checkRateLimit method
  - Get user's subscription
  - Check questionsThisHour against hourly limit
  - Check questionsToday against daily limit
  - Return quota status and remaining count
  - _Requirements: 2.2, 11.1, 11.2_

- [ ] 8.2 Write property test for rate limit checking
  - **Property 4: Rate limiting enforces quotas**
  - **Validates: Requirements 2.2, 2.3, 11.1, 11.2**

- [ ] 8.3 Implement consumeQuota method
  - Decrement remaining quota
  - Called after successful rate limit check
  - _Requirements: 2.2_

- [ ] 8.4 Implement getResetTime method
  - Calculate next hourly reset time
  - Calculate next daily reset time (midnight UTC)
  - Return appropriate reset time for Retry-After header
  - _Requirements: 2.3, 11.3, 11.4_

- [x] 9. Implement ConversationController REST API
  - Create ConversationController with route decorators
  - Apply JWT authentication guard
  - _Requirements: All_

- [x] 9.1 Implement POST /conversations endpoint
  - Validate CreateConversationDto
  - Call ConversationService.createConversation
  - Return 201 Created with conversation data
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 9.2 Implement GET /conversations endpoint
  - Extract query parameters for filtering, sorting, pagination
  - Call ConversationService.findUserConversations
  - Return 200 OK with paginated results
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 9.3 Implement GET /conversations/:id endpoint
  - Extract conversation ID from params
  - Call ConversationService.findConversationById
  - Return 200 OK with conversation data
  - Handle 403 and 404 errors
  - _Requirements: 3.1, 3.4, 3.5_

- [x] 9.4 Implement PATCH /conversations/:id endpoint
  - Validate UpdateConversationDto
  - Call ConversationService.updateConversation
  - Return 200 OK with updated conversation
  - Handle 403 and 404 errors
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 9.5 Implement DELETE /conversations/:id endpoint
  - Extract conversation ID from params
  - Call ConversationService.deleteConversation
  - Return 204 No Content
  - Handle 403 and 404 errors
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 9.6 Implement POST /conversations/:id/messages endpoint
  - Validate SendMessageDto
  - Check rate limits via RateLimitService
  - Enqueue request via QueueService
  - Return 202 Accepted with request ID
  - Return 429 if rate limit exceeded
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 9.7 Implement GET /conversations/:id/messages/archived endpoint
  - Extract pagination parameters
  - Call MessageService.getArchivedMessages
  - Return 200 OK with paginated archived messages
  - _Requirements: 3.2, 3.3_

- [ ] 10. Create DTOs and Swagger documentation
  - Create DTO classes with validation decorators
  - Create Swagger documentation file in dto folder
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 10.1 Create CreateConversationDto
  - technique: string (enum validation)
  - title: string (not empty)
  - tags: string[] (optional)
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 10.2 Create UpdateConversationDto
  - title: string (optional, not empty if provided)
  - tags: string[] (optional)
  - isFavorite: boolean (optional)
  - isArchived: boolean (optional)
  - technique: string (optional, enum validation)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10.3 Create SendMessageDto
  - content: string (not empty)
  - _Requirements: 2.1_

- [x] 10.4 Create ConversationResponseDto
  - Map conversation document to response format
  - Exclude sensitive fields
  - _Requirements: 3.1, 4.1_

- [x] 10.5 Create conversation.swagger.ts file
  - Document all conversation endpoints
  - Include request/response schemas
  - Add example requests and responses
  - Mark authentication requirements
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 11. Configure BullMQ worker settings
  - Set worker concurrency (default: 5 concurrent jobs)
  - Configure worker lifecycle hooks
  - _Requirements: 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 2.14, 2.15_

- [ ] 11.1 Configure worker concurrency
  - Set concurrency from environment variable QUEUE_CONCURRENCY
  - Default to 5 concurrent workers
  - Configure worker options (lockDuration, maxStalledCount)
  - _Requirements: 2.6_

- [ ] 11.2 Implement graceful shutdown
  - BullMQ workers automatically handle shutdown
  - Configure closeTimeout for graceful job completion
  - Ensure jobs complete before shutdown
  - _Requirements: 2.6_

- [ ] 12. Checkpoint - Ensure all tests pass
  - Run all unit tests
  - Run all property-based tests
  - Fix any failing tests
  - Verify test coverage
  - Ask the user if questions arise

- [ ] 13. Write integration tests
  - Test end-to-end conversation flow
  - Test rate limiting with real subscription data
  - Test message archival with database
  - Test OpenRouter integration (mocked)
  - Test queue processing workflow

- [ ] 14. Write E2E tests
  - Test complete user workflows through HTTP API
  - Test authentication and authorization
  - Test error responses
  - Test pagination and filtering

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Run complete test suite
  - Verify all property tests pass
  - Check test coverage meets requirements
  - Ask the user if questions arise
