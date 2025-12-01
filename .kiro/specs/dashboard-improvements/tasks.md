# Implementation Plan

- [-] 1. Set up foundational types and utilities
  - Create WebSocket type definitions for client/server events
  - Create layout state type definitions
  - Create connection status types
  - _Requirements: 1.1, 6.1_

- [ ]* 1.1 Write property test for message ordering
  - **Property 1: WebSocket message ordering preservation**
  - **Validates: Requirements 1.3, 18.2**

- [ ] 2. Implement DashboardLayout component system
  - Create reusable DashboardLayout component with sidebar, navbar, and content area
  - Implement responsive behavior (mobile drawer, desktop fixed sidebar)
  - Add sidebar collapse/expand functionality
  - Integrate keyboard shortcut support (Cmd/Ctrl+B for sidebar toggle)
  - Add layout state management with React Context
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 2.1 Write unit tests for DashboardLayout
  - Test sidebar collapse/expand
  - Test mobile menu open/close
  - Test responsive behavior
  - Test keyboard shortcuts
  - _Requirements: 6.1-6.7_

- [ ]* 2.2 Write property test for layout consistency
  - **Property 5: Layout consistency**
  - **Validates: Requirements 6.1, 6.2, 6.3, 13.4**

- [ ] 3. Create ComingSoon component
  - Implement ComingSoon component with feature name, description, and timeline
  - Add icon support
  - Add "Back to Dashboard" button
  - Style with consistent design system
  - _Requirements: 8.8, 8.9, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 3.1 Write unit tests for ComingSoon component
  - Test feature name display
  - Test description rendering
  - Test back button navigation
  - Test icon rendering
  - _Requirements: 8.8, 8.9, 9.1-9.5_

- [ ] 3.2 Create DashboardLayoutSkeleton component
  - Implement skeleton component matching DashboardLayout structure
  - Add skeleton sidebar, navbar, and content area
  - Support custom content skeleton via children prop
  - Ensure responsive behavior matches DashboardLayout
  - _Requirements: 19.1, 19.2, 19.3, 19.4_

- [ ]* 3.3 Write unit tests for DashboardLayoutSkeleton
  - Test skeleton structure rendering
  - Test custom content skeleton
  - Test responsive behavior
  - _Requirements: 19.1-19.4_

- [ ] 4. Migrate existing dashboard pages to DashboardLayout
  - Update /dashboard/page.tsx to use DashboardLayout
  - Update /dashboard/conversations/page.tsx to use DashboardLayout
  - Update /dashboard/conversations/[id]/page.tsx to use DashboardLayout
  - Remove duplicate sidebar and navbar code from individual pages
  - _Requirements: 7.1, 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 5. Move "New Conversation" button to navbar
  - Add "New Conversation" button to DashboardLayout navbar
  - Implement dialog trigger from navbar button
  - Add keyboard shortcut (Cmd/Ctrl+N) for new conversation
  - Ensure dialog works from all dashboard pages
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 14.1_

- [ ]* 5.1 Write unit tests for navbar actions
  - Test "New Conversation" button rendering
  - Test dialog open/close
  - Test keyboard shortcut (Cmd/Ctrl+N)
  - Test dialog state isolation
  - _Requirements: 3.1-3.5, 14.1_

- [ ]* 5.2 Write property test for dialog state isolation
  - **Property 6: Dialog state isolation**
  - **Validates: Requirements 3.4, 5.4**

- [ ] 6. Remove duplicate "New Conversation" UI elements
  - Remove "New Conversation" button from conversations list page header
  - Keep "Create Conversation" button in empty state
  - Update empty state button to open dialog instead of navigating
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 7. Delete /dashboard/conversations/new route
  - Delete /dashboard/conversations/new/page.tsx file
  - Add redirect from /new to /conversations with dialog auto-open
  - Update any internal links pointing to /new route
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 8. Reorganize sessions routes to avoid confusion
  - Move /dashboard/sessions/page.tsx to /dashboard/security/page.tsx (auth sessions management)
  - Update sidebar to show "Security" instead of "Inquiry Sessions" for auth sessions
  - Create new /dashboard/sessions/page.tsx with ComingSoon for inquiry sessions
  - Update sidebar link for "Inquiry Sessions" to point to /dashboard/sessions
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_

- [ ] 8.1 Create Coming Soon pages for incomplete features
  - Create /dashboard/community/page.tsx with ComingSoon component
  - Create /dashboard/resources/page.tsx with ComingSoon component
  - Create /dashboard/sessions/page.tsx with ComingSoon component (inquiry sessions)
  - Create /dashboard/messages/page.tsx with ComingSoon component
  - Create /dashboard/reports/page.tsx with ComingSoon component
  - Create /dashboard/settings/page.tsx with ComingSoon component
  - Create /dashboard/help/page.tsx with ComingSoon component
  - Wrap each page with DashboardLayout
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

- [ ] 8.2 Update loading states to use DashboardLayoutSkeleton
  - Update /dashboard/loading.tsx to use DashboardLayoutSkeleton
  - Update /dashboard/conversations/loading.tsx to use DashboardLayoutSkeleton
  - Update /dashboard/conversations/[id]/loading.tsx to use DashboardLayoutSkeleton
  - Remove inline DashboardSkeleton function from /dashboard/page.tsx
  - Delete /dashboard/conversations/new/loading.tsx (entire folder will be deleted)
  - _Requirements: 19.5, 20.1, 20.2, 20.3, 20.4_

- [ ] 9. Checkpoint - Ensure all layout and navigation changes work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Set up WebSocket infrastructure
  - Install socket.io-client package
  - Create WebSocketProvider with Socket.IO client initialization
  - Implement JWT authentication in Socket.IO handshake
  - Add connection state management (connecting, connected, disconnected, reconnecting, error)
  - Implement automatic reconnection with exponential backoff
  - Add WebSocketProvider to app providers
  - _Requirements: 1.1, 1.4, 10.1, 10.2, 10.3, 10.4_

- [ ]* 10.1 Write unit tests for WebSocketProvider
  - Test connection establishment
  - Test authentication
  - Test reconnection logic
  - Test connection state updates
  - _Requirements: 1.1, 1.4, 10.1-10.4_

- [ ]* 10.2 Write property test for reconnection exponential backoff
  - **Property 7: Reconnection exponential backoff**
  - **Validates: Requirements 1.4, 10.3**

- [ ] 11. Implement useWebSocket hook
  - Create useWebSocket hook with connection management
  - Implement conversation room join/leave functionality
  - Add message sending capability
  - Implement message queueing during disconnection
  - Add retry logic for failed messages (max 3 automatic retries)
  - Integrate with WebSocketProvider context
  - _Requirements: 1.1, 1.6, 1.7, 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ]* 11.1 Write unit tests for useWebSocket hook
  - Test room join/leave
  - Test message sending
  - Test message queueing
  - Test retry logic
  - Test disconnection handling
  - _Requirements: 1.1, 1.6, 1.7, 16.1-16.5_

- [ ]* 11.2 Write property test for message queue integrity
  - **Property 3: Message queue integrity**
  - **Validates: Requirements 16.1, 16.2, 18.3**

- [ ] 12. Implement WebSocket event handlers
  - Add handler for message:new event
  - Add handler for message:processing event
  - Add handler for message:complete event
  - Add handler for message:error event
  - Add handler for typing:user event
  - Integrate handlers with TanStack Query cache updates
  - _Requirements: 1.2, 1.3, 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ]* 12.1 Write unit tests for WebSocket event handlers
  - Test message:new handler and cache update
  - Test message:processing handler
  - Test message:complete handler
  - Test message:error handler
  - Test typing:user handler
  - _Requirements: 1.2, 1.3, 11.1-11.5_

- [ ]* 12.2 Write property test for cache synchronization
  - **Property 4: Cache synchronization**
  - **Validates: Requirements 11.1, 11.2, 11.3**

- [ ] 13. Create ConnectionStatus component
  - Implement connection status indicator with colored dot
  - Add status labels (Connected, Reconnecting, Offline)
  - Implement tooltip with connection details
  - Style with consistent design system
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ]* 13.1 Write unit tests for ConnectionStatus component
  - Test status indicator colors
  - Test status labels
  - Test tooltip display
  - _Requirements: 12.1-12.4_

- [ ]* 13.2 Write property test for connection state consistency
  - **Property 2: Connection state consistency**
  - **Validates: Requirements 12.1, 12.2, 12.3**

- [ ] 14. Add TypingIndicator component
  - Create TypingIndicator component with animated dots
  - Add "AI is thinking..." message
  - Integrate with WebSocket typing events
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 14.1 Write unit tests for TypingIndicator component
  - Test indicator display
  - Test animation
  - Test message text
  - _Requirements: 2.1-2.5_

- [ ] 15. Update ConversationDetail with real-time support
  - Integrate useWebSocket hook in ConversationDetail
  - Add ConnectionStatus indicator to conversation header
  - Add TypingIndicator to message list
  - Implement automatic scroll to new messages
  - Handle WebSocket message reception
  - Update TanStack Query cache on message receipt
  - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.3, 11.5, 12.1, 12.2, 12.3_

- [ ]* 15.1 Write integration tests for real-time conversation
  - Test WebSocket connection on conversation open
  - Test message reception and display
  - Test typing indicator display
  - Test connection status updates
  - Test automatic scroll
  - _Requirements: 1.2, 1.3, 2.1-2.3, 11.5, 12.1-12.3_

- [ ] 16. Update MessageInput with queue support
  - Add queued messages display
  - Disable input when offline
  - Add retry buttons for failed messages
  - Show "Sending..." indicator for queued messages
  - Integrate with useWebSocket message sending
  - _Requirements: 12.5, 16.1, 16.2, 16.3, 16.4, 16.5_

- [ ]* 16.1 Write unit tests for MessageInput queue support
  - Test input disabled when offline
  - Test queued messages display
  - Test retry button functionality
  - Test sending indicator
  - _Requirements: 12.5, 16.1-16.5_

- [ ] 17. Implement fallback polling mechanism
  - Add polling function for message updates when WebSocket unavailable
  - Implement 5-second polling interval
  - Disable polling when WebSocket is connected
  - Enable polling when connection fails after max retries
  - _Requirements: 10.5_

- [ ]* 17.1 Write unit tests for fallback polling
  - Test polling activation on connection failure
  - Test polling deactivation on connection success
  - Test polling interval
  - _Requirements: 10.5_

- [ ] 18. Add keyboard shortcut consistency across dashboard
  - Ensure Cmd/Ctrl+N works on all dashboard pages
  - Ensure Cmd/Ctrl+K works on all dashboard pages
  - Ensure Escape closes dialogs on all pages
  - Ensure Cmd/Ctrl+B toggles sidebar on all pages
  - Implement focus trap in dialogs
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ]* 18.1 Write unit tests for keyboard shortcuts
  - Test Cmd/Ctrl+N on multiple pages
  - Test Cmd/Ctrl+K on multiple pages
  - Test Escape key
  - Test Cmd/Ctrl+B
  - Test focus trap
  - _Requirements: 14.1-14.5_

- [ ]* 18.2 Write property test for keyboard shortcut consistency
  - **Property 8: Keyboard shortcut consistency**
  - **Validates: Requirements 14.1, 14.2**

- [ ] 19. Implement reconnection UI feedback
  - Add "Reconnecting..." indicator when connection is lost
  - Add reconnection attempt counter
  - Add manual retry button after max attempts
  - Remove indicator when connection is restored
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ]* 19.1 Write unit tests for reconnection UI
  - Test reconnecting indicator display
  - Test attempt counter
  - Test manual retry button
  - Test indicator removal on reconnection
  - _Requirements: 10.1-10.4_

- [ ] 20. Add WebSocket error handling
  - Handle authentication errors (redirect to login)
  - Handle room join failures (show error, retry)
  - Handle message send failures (queue for retry)
  - Handle connection errors (show status, attempt reconnection)
  - _Requirements: 1.5, 10.3, 16.3_

- [ ]* 20.1 Write unit tests for WebSocket error handling
  - Test authentication error handling
  - Test room join failure handling
  - Test message send failure handling
  - Test connection error handling
  - _Requirements: 1.5, 10.3, 16.3_

- [ ] 21. Checkpoint - Ensure all WebSocket features work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Add accessibility improvements
  - Add aria-live regions for new message announcements
  - Add text alternatives for connection status indicator
  - Ensure error messages are announced to screen readers
  - Verify keyboard navigation works for all interactive elements
  - Test with screen reader (VoiceOver or NVDA)
  - _Requirements: 14.5_

- [ ]* 22.1 Write accessibility tests
  - Test aria-live announcements
  - Test screen reader compatibility
  - Test keyboard navigation
  - _Requirements: 14.5_

- [ ] 23. Performance optimization
  - Implement message batching for cache updates
  - Add throttling for typing indicators (max 1 event per 2 seconds)
  - Lazy load WebSocketProvider only on dashboard pages
  - Clean up event listeners on component unmount
  - Profile and optimize re-renders
  - _Requirements: 1.1, 2.5_

- [ ]* 23.1 Write performance tests
  - Test message batching
  - Test typing indicator throttling
  - Test memory cleanup
  - _Requirements: 1.1, 2.5_

- [ ] 24. Add security measures
  - Verify JWT token is included in Socket.IO handshake
  - Implement rate limiting for message sending (10 messages/minute)
  - Sanitize message content before rendering
  - Validate all WebSocket event payloads
  - _Requirements: 1.4_

- [ ]* 24.1 Write security tests
  - Test JWT authentication
  - Test rate limiting
  - Test input sanitization
  - Test payload validation
  - _Requirements: 1.4_

- [ ] 25. Update documentation
  - Document WebSocket architecture in README
  - Document DashboardLayout usage
  - Document ComingSoon component usage
  - Add JSDoc comments to all new components and hooks
  - Update TESTING.md with WebSocket testing guidelines
  - _Requirements: All_

- [ ] 26. Verify all redundant files are removed
  - Confirm /dashboard/conversations/new/ folder is deleted (page.tsx, loading.tsx, error.tsx)
  - Confirm inline DashboardSkeleton is removed from /dashboard/page.tsx
  - Confirm all pages use DashboardLayout (no duplicate sidebar/navbar code)
  - Confirm all loading states use DashboardLayoutSkeleton
  - Confirm sessions routes are properly organized (security vs inquiry sessions)
  - _Requirements: 5.1, 13.1, 13.2, 13.3, 13.4, 13.5, 20.1, 20.2, 20.3, 21.1, 21.2, 21.3_

- [ ] 27. Final checkpoint - Complete testing and validation
  - Ensure all tests pass, ask the user if questions arise.
