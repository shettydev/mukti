# Implementation Plan

- [ ] 1. Backend: Create StreamService for SSE connection management
  - Create `packages/mukti-api/src/modules/conversations/services/stream.service.ts`
  - Implement connection storage using Map data structure
  - Implement `addConnection()` method to register new SSE connections
  - Implement `removeConnection()` method to clean up disconnected clients
  - Implement `emitToConversation()` method to broadcast events to all connections for a conversation
  - Implement `emitToUser()` method to send events to specific user connections
  - Implement `cleanupConversation()` method to remove all connections for a conversation
  - Add proper logging for connection lifecycle events
  - _Requirements: 2.1, 2.4, 2.5_

- [ ]* 1.1 Write property test for StreamService
  - **Property 9: Multiple Connection Support**
  - **Validates: Requirements 2.5**

- [ ] 2. Backend: Add SSE endpoint to ConversationController
  - Add `@Sse()` decorated method `streamConversation()` to `conversation.controller.ts`
  - Implement GET `/conversations/:id/stream` endpoint
  - Validate user authentication using JWT guard (when implemented)
  - Verify user owns the conversation before establishing connection
  - Return Observable<MessageEvent> that emits SSE events
  - Set appropriate SSE headers (Content-Type, Cache-Control, Connection)
  - Handle connection errors and return appropriate HTTP status codes
  - _Requirements: 2.1, 2.2, 4.1, 4.2, 4.3, 4.4_

- [ ]* 2.1 Write property test for SSE endpoint authentication
  - **Property 1: Connection Ownership**
  - **Validates: Requirements 4.2**

- [ ]* 2.2 Write property test for SSE endpoint authorization
  - **Property 6: Authentication Validation**
  - **Validates: Requirements 4.1**

- [ ] 3. Backend: Add Swagger documentation for SSE endpoint
  - Create SSE endpoint documentation in `dto/conversation.swagger.ts`
  - Document SSE connection establishment
  - Document event types and formats
  - Document authentication requirements
  - Document error responses
  - Add examples for each event type
  - _Requirements: 2.1_

- [ ] 4. Backend: Integrate StreamService with QueueService
  - Inject StreamService into QueueService constructor
  - Emit "processing" event when job starts processing
  - Emit "message" event when user message is added to conversation
  - Emit "message" event when AI response is generated
  - Emit "complete" event when job finishes successfully
  - Emit "error" event when job fails
  - Emit "progress" events for long-running jobs
  - Ensure events are emitted in correct order
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 4.1 Write property test for event ordering
  - **Property 2: Event Delivery Order**
  - **Validates: Requirements 5.5**

- [ ]* 4.2 Write property test for message persistence before event emission
  - **Property 4: Message Persistence**
  - **Validates: Requirements 1.3**

- [ ] 5. Backend: Register StreamService in ConversationsModule
  - Add StreamService to providers array in `conversations.module.ts`
  - Export StreamService for potential use in other modules
  - Ensure proper dependency injection setup
  - _Requirements: 2.1_

- [ ] 6. Backend: Implement connection cleanup on disconnect
  - Add cleanup logic in StreamService for client disconnects
  - Remove connection from Map when client closes connection
  - Release all resources associated with the connection
  - Log connection cleanup events
  - _Requirements: 2.4, 3.5_

- [ ]* 6.1 Write property test for connection cleanup
  - **Property 3: Connection Cleanup**
  - **Validates: Requirements 2.4**

- [ ] 7. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Frontend: Create useConversationStream hook
  - Create `packages/mukti-web/src/lib/hooks/use-conversation-stream.ts`
  - Implement SSE connection establishment using EventSource API
  - Add connection state management (isConnected, error)
  - Implement event listeners for 'message', 'error', 'open' events
  - Parse incoming SSE events and extract event type and data
  - Implement automatic reconnection with exponential backoff
  - Add cleanup logic to close EventSource on unmount
  - Include authentication credentials in SSE request
  - _Requirements: 1.1, 1.5, 7.2, 7.3_

- [ ]* 8.1 Write property test for reconnection idempotency
  - **Property 5: Reconnection Idempotency**
  - **Validates: Requirements 1.5, 7.2**

- [ ] 9. Frontend: Integrate TanStack Query cache updates in hook
  - Update conversation detail query when "message" event is received
  - Add new message to recentMessages array in cache
  - Update conversation metadata (messageCount, lastMessageAt)
  - Invalidate conversation list query to refresh counts
  - Handle optimistic updates correctly
  - Prevent duplicate messages in cache
  - _Requirements: 1.3_

- [ ] 10. Frontend: Implement error handling in useConversationStream
  - Handle connection establishment errors
  - Implement exponential backoff for reconnection (1s, 2s, 4s, 8s, max 30s)
  - Handle authentication errors (401) - don't retry, redirect to login
  - Handle authorization errors (403) - don't retry, show error
  - Handle not found errors (404) - don't retry, show error
  - Handle server errors (500) - retry with backoff
  - Handle rate limit errors - show banner, pause reconnection
  - Add error callback for custom error handling
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 11. Frontend: Add event type handlers in useConversationStream
  - Handle "processing" event - set loading state
  - Handle "message" event - update conversation with new message
  - Handle "complete" event - clear loading state, update metadata
  - Handle "error" event - show error message, handle retry
  - Handle "progress" event - update progress indicator
  - Add custom event handler callback for component-specific logic
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 12. Frontend: Integrate useConversationStream into ConversationDetail
  - Import and use useConversationStream hook in ConversationDetail component
  - Pass conversationId to the hook
  - Enable SSE connection when component mounts
  - Add loading indicator state based on "processing" events
  - Handle error events and display error messages
  - Clean up connection when component unmounts
  - Show connection status indicator (optional)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4_

- [ ]* 12.1 Write property test for stream closure on navigation
  - **Property 10: Stream Closure on Navigation**
  - **Validates: Requirements 1.4**

- [ ] 13. Frontend: Implement auto-scroll behavior for new messages
  - Detect when user is scrolled to bottom of message list
  - Auto-scroll to bottom when new message arrives and user is at bottom
  - Preserve scroll position when user is scrolled up reading old messages
  - Add "scroll to bottom" button when user is scrolled up and new messages arrive
  - Implement smooth scrolling animation
  - Batch scroll updates for multiple rapid messages
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 13.1 Write property test for auto-scroll preservation
  - **Property 8: Auto-scroll Preservation**
  - **Validates: Requirements 6.1, 6.2**

- [ ] 14. Frontend: Create LoadingMessage component
  - Create `packages/mukti-web/src/components/conversations/loading-message.tsx`
  - Implement message bubble with AI avatar
  - Add animated typing indicator (three pulsing dots)
  - Implement status text that updates based on processing duration
  - Add subtle pulsing border animation to message bubble
  - Show queue position if available
  - Implement fade-in animation for component appearance
  - Add accessibility attributes (aria-live, role="status")
  - Respect prefers-reduced-motion for animations
  - _Requirements: 3.1, 3.2, 3.7, 3.8, 3.9, 9.1, 9.2, 9.3, 9.4, 9.6, 9.7_

- [ ] 15. Frontend: Add Tailwind animations for loading states
  - Add custom animations to Tailwind config or CSS
  - Implement pulse-dot animation for typing indicator
  - Implement pulse-border animation for message bubble
  - Implement fade-in animation for message appearance
  - Implement highlight animation for new messages
  - Add shimmer animation for skeleton loaders (optional)
  - Ensure animations respect prefers-reduced-motion
  - _Requirements: 3.9, 3.10, 9.2, 9.5, 9.7_

- [ ] 16. Frontend: Integrate LoadingMessage into MessageList
  - Import LoadingMessage component in MessageList
  - Show LoadingMessage when processing state is active
  - Position LoadingMessage at the end of message list
  - Track processing duration and pass to LoadingMessage
  - Update status text based on SSE events (processing, generating)
  - Remove LoadingMessage when "complete" or "error" event received
  - Ensure smooth transition from loading to actual message
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.8, 8.1, 8.2, 8.3_

- [ ] 17. Frontend: Add message arrival animations
  - Implement fade-in animation when new message arrives
  - Add brief highlight effect to new message (subtle glow)
  - Ensure highlight fades out smoothly over 1 second
  - Make animations subtle and non-distracting
  - Respect prefers-reduced-motion preference
  - _Requirements: 3.10, 9.5, 9.10_

- [ ] 18. Frontend: Enhance loading state with progressive disclosure
  - Update status text after 5 seconds: "Still working on it..."
  - Update status text after 10 seconds: "This is taking longer than usual..."
  - Show queue position when available: "You're #X in queue"
  - Add tooltip on hover with additional details (optional)
  - Ensure text updates are smooth and non-jarring
  - _Requirements: 3.8, 8.4, 8.7, 9.8, 9.9_

- [ ] 19. Frontend: Update message sending flow to work with SSE
  - Keep existing POST /conversations/:id/messages endpoint call
  - Don't wait for response to complete before showing optimistic update
  - Rely on SSE events to update UI with actual response
  - Remove manual refetch after sending message (SSE handles it)
  - Handle case where SSE connection is not established
  - Show fallback behavior if SSE fails (manual refresh prompt)
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 20. Frontend: Add connection status indicator (optional)
  - Show small indicator when SSE connection is active
  - Show warning when connection is lost
  - Show reconnecting state during reconnection attempts
  - Make indicator unobtrusive but visible
  - Add tooltip with connection details
  - _Requirements: 1.5, 7.2_

- [ ] 21. Checkpoint - Ensure all frontend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Integration: Test end-to-end SSE flow with UI/UX
  - Start backend server
  - Start frontend development server
  - Send a message in a conversation
  - Verify SSE connection is established
  - Verify LoadingMessage component appears with animations
  - Verify status text updates as processing progresses
  - Verify "processing" event is received and displayed
  - Verify "message" events are received for user and AI messages
  - Verify "complete" event is received
  - Verify smooth transition from loading to actual message
  - Verify message appears in UI without reload
  - Verify conversation metadata is updated
  - Verify animations are smooth and non-jarring
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 5.1, 5.2, 9.1-9.10_

- [ ] 23. Integration: Test loading state variations
  - Test short processing time (< 5 seconds) - verify initial status text
  - Test medium processing time (5-10 seconds) - verify "Still working on it..." appears
  - Test long processing time (> 10 seconds) - verify extended message appears
  - Test with queue position - verify position is displayed
  - Test animations with prefers-reduced-motion enabled
  - Verify all animations respect accessibility preferences
  - _Requirements: 3.8, 8.4, 8.7, 9.8_

- [ ] 24. Integration: Test error scenarios
  - Test connection with invalid conversation ID (should get 404)
  - Test connection without authentication (should get 401)
  - Test connection to conversation user doesn't own (should get 403)
  - Test message processing error (should receive error event)
  - Verify LoadingMessage is removed on error
  - Verify error message is displayed clearly
  - Test network disconnection (should attempt reconnection)
  - Test reconnection after network restored
  - Verify error messages are displayed correctly
  - _Requirements: 3.3, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 25. Integration: Test multiple concurrent connections
  - Open same conversation in multiple browser tabs
  - Send message from one tab
  - Verify all tabs receive SSE events
  - Verify LoadingMessage appears in all tabs
  - Verify no duplicate messages appear
  - Verify all tabs show consistent state
  - Close one tab and verify others continue working
  - _Requirements: 2.5_

- [ ] 26. Integration: Test auto-scroll behavior
  - Send multiple messages rapidly
  - Verify auto-scroll works when at bottom
  - Verify LoadingMessage is visible during processing
  - Scroll up to read old messages
  - Send new message
  - Verify scroll position is preserved
  - Verify LoadingMessage appears but doesn't force scroll
  - Scroll back to bottom
  - Verify auto-scroll resumes
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 27. Documentation: Update API documentation
  - Document SSE endpoint in API docs
  - Add examples of SSE event formats
  - Document authentication requirements
  - Document error responses
  - Add code examples for frontend integration
  - Document LoadingMessage component usage
  - Add screenshots or GIFs of loading states
  - Update README with SSE feature description
  - _Requirements: All_

- [ ] 28. Final Checkpoint - Verify all requirements are met
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all acceptance criteria are satisfied
  - Test loading animations on different devices and browsers
  - Verify accessibility with screen readers
  - Test with real users if possible
  - Monitor error rates and performance
  - Gather feedback on loading state UX
