# Implementation Plan

- [-] 1. Set up TypeScript types and API client foundation
  - Create TypeScript types matching backend DTOs
  - Implement conversation API client with all endpoints
  - Create query key factory for cache management
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 1.1 Write property test for API client configuration usage
  - **Property 1: Configuration usage**
  - **Validates: Requirements 1.1**

- [x] 1.2 Write property test for response parsing
  - **Property 2: Response parsing consistency**
  - **Validates: Requirements 1.2**

- [x] 1.3 Write property test for error transformation
  - **Property 3: Error transformation**
  - **Validates: Requirements 1.3**

- [x] 1.4 Write property test for auth header injection
  - **Property 4: Auth header injection**
  - **Validates: Requirements 1.4**

- [x] 1.5 Write property tests for query key factory
  - **Property 5: Query key hierarchy**
  - **Property 6: Filter inclusion in keys**
  - **Property 7: ID inclusion in detail keys**
  - **Property 8: Pagination in message keys**
  - **Property 9: Cache invalidation scope**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [x] 1.6 Write unit tests for API client
  - Test all conversation endpoints (getAll, getById, create, update, delete, sendMessage, getArchivedMessages)
  - Test query parameter construction
  - Test error handling for all error types
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 2. Implement TanStack Query hooks with optimistic updates
  - Create useInfiniteConversations hook for infinite scroll list fetching
  - Create useConversation hook for detail fetching
  - Create useArchivedMessages hook with infinite scroll
  - Create useCreateConversation hook with optimistic update
  - Create useUpdateConversation hook with optimistic update
  - Create useDeleteConversation hook with optimistic update
  - Create useSendMessage hook with optimistic update
  - _Requirements: 4.4, 4.5, 4.7, 5.5, 5.6, 7.2, 7.5, 7.6, 8.2, 8.3, 8.4, 8.7, 8.8, 9.2, 9.4, 9.5_

- [ ] 2.1 Write property tests for form validation
  - **Property 10: Title validation**
  - **Property 11: Tag validation**
  - **Property 12: Message content validation**
  - **Validates: Requirements 4.1, 7.1, 8.1, 8.6**

- [ ] 2.2 Write property tests for optimistic updates
  - **Property 13: Optimistic creation**
  - **Property 14: Optimistic update rollback**
  - **Property 15: Optimistic message sending**
  - **Property 16: Optimistic deletion**
  - **Property 17: Optimistic toggle**
  - **Validates: Requirements 4.4, 4.5, 7.2, 7.6, 8.2, 8.3, 8.4, 8.7, 9.2, 9.5**

- [ ] 2.3 Write property tests for cache invalidation
  - **Property 18: Post-creation invalidation**
  - **Property 19: Post-update invalidation**
  - **Property 20: Post-deletion invalidation**
  - **Property 21: Post-message invalidation**
  - **Validates: Requirements 4.7, 7.5, 8.8, 9.4**


- [ ] 2.4 Write unit tests for query hooks
  - Test useConversations with various filters
  - Test useConversation with valid/invalid IDs
  - Test useArchivedMessages infinite scroll
  - Test useCreateConversation success and error cases
  - Test useUpdateConversation success and error cases
  - Test useDeleteConversation success and error cases
  - Test useSendMessage success and error cases
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 3. Build conversation list components with infinite scroll
  - Create ConversationCard component with all metadata
  - Create ConversationFilters component with technique, tags, archived, favorite filters
  - Create ConversationList component with infinite scroll using @tanstack/react-virtual
  - Implement virtualization for performance with large lists
  - Implement automatic page loading on scroll
  - Implement skeleton loading states
  - Implement empty state with create CTA
  - Implement error state with retry
  - Add prefetching on card hover
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 10.1_

- [ ] 3.1 Write property tests for data integrity
  - **Property 22: Message ordering**
  - **Property 23: Archived message prepending**
  - **Property 24: Filter preservation during pagination**
  - **Property 25: Conversation card completeness**
  - **Validates: Requirements 5.2, 5.5, 6.2, 6.5**

- [ ] 3.2 Write property tests for query behavior
  - **Property 26: Filter change triggers refetch**
  - **Property 27: Sort change triggers refetch**
  - **Property 28: Archived message pagination**
  - **Validates: Requirements 5.3, 5.4, 6.4**

- [ ] 3.3 Write unit tests for conversation list components
  - Test ConversationCard rendering with various data
  - Test ConversationFilters state management
  - Test ConversationList with data, loading, error, and empty states
  - Test infinite scroll behavior (fetchNextPage on scroll)
  - Test virtualization rendering
  - Test prefetching behavior
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

- [ ] 4. Build conversation detail and messaging components
  - Create ConversationDetail component with header and actions
  - Create MessageList component with chronological ordering
  - Create Message component for user and assistant messages
  - Create LoadOlderButton for archived messages
  - Implement skeleton loading for messages
  - Implement error and 404 states
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 10.2_

- [ ] 4.1 Write unit tests for conversation detail components
  - Test ConversationDetail rendering
  - Test MessageList with various message arrays
  - Test Message component for both roles
  - Test LoadOlderButton behavior
  - Test error and 404 states
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [ ] 5. Build message input and sending functionality
  - Create MessageInput component with auto-resize textarea
  - Implement send button with loading state
  - Add keyboard shortcuts (Enter to send, Shift+Enter for newline)
  - Implement input validation (no empty/whitespace messages)
  - Add character count display
  - Clear input after successful send
  - _Requirements: 7.1, 7.2, 7.3, 7.8, 10.3_

- [ ] 5.1 Write unit tests for message input
  - Test textarea auto-resize
  - Test send button enable/disable logic
  - Test keyboard shortcuts
  - Test input validation
  - Test input clearing after send
  - _Requirements: 7.1, 7.2, 7.3, 7.8_

- [ ] 6. Implement error handling and rate limiting UI
  - Create ErrorState component with typed error messages
  - Create RateLimitBanner component with countdown
  - Implement error message mapping for all error codes
  - Add retry buttons where applicable
  - Display rate limit errors with retry-after time
  - _Requirements: 7.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ] 6.1 Write unit tests for error handling components
  - Test ErrorState with various error types
  - Test RateLimitBanner countdown
  - Test error message display
  - Test retry button functionality
  - _Requirements: 7.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

- [ ] 7. Build conversation creation and management dialogs
  - Create CreateConversationDialog with form validation
  - Create TechniqueSelector with descriptions
  - Create TagInput component
  - Create DeleteConversationDialog with confirmation
  - Create UpdateConversationDialog for title, tags, technique
  - Implement technique change confirmation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.1, 9.3_

- [ ] 7.1 Write unit tests for dialog components
  - Test CreateConversationDialog form validation
  - Test TechniqueSelector selection
  - Test TagInput add/remove
  - Test DeleteConversationDialog confirmation flow
  - Test UpdateConversationDialog validation
  - _Requirements: 4.1, 4.2, 8.1, 8.5, 8.6, 9.1_

- [ ] 8. Create conversation pages with Next.js App Router
  - Create /dashboard/conversations page (list view)
  - Create /dashboard/conversations/[id] page (detail view)
  - Create /dashboard/conversations/new page (creation flow)
  - Implement navigation between pages
  - Add loading.tsx for each route
  - Add error.tsx for each route
  - _Requirements: 4.6, 9.6_

- [ ] 8.1 Write integration tests for page navigation
  - Test navigation from list to detail
  - Test navigation after creation
  - Test navigation after deletion
  - Test back button behavior
  - _Requirements: 4.6, 9.6_

- [ ] 9. Implement responsive design and accessibility
  - Add mobile-first responsive styles to all components
  - Implement single-column layout for mobile
  - Implement sidebar layout for desktop
  - Add keyboard shortcuts (Cmd/Ctrl+K, Cmd/Ctrl+N, Escape)
  - Add ARIA labels to all interactive elements
  - Ensure focus management for dialogs
  - Add semantic HTML throughout
  - Ensure 44x44px touch targets on mobile
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 9.1 Write accessibility tests
  - Test keyboard navigation
  - Test ARIA labels
  - Test focus management
  - Test semantic HTML structure
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 10. Optimize performance and caching
  - Configure TanStack Query stale times and cache times
  - Implement prefetching on conversation card hover
  - Add background refetch on window focus
  - Implement debouncing for filter changes
  - Add pagination limits (20 items per page)
  - _Requirements: 5.3, 5.4, 5.5_

- [ ] 11. Final integration and polish
  - Connect all components to pages
  - Test complete user flows (create, read, update, delete, message)
  - Verify error handling across all operations
  - Test rate limiting behavior
  - Verify optimistic updates and rollbacks
  - Test responsive design on multiple devices
  - Verify accessibility with screen reader
  - _Requirements: All requirements_

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
