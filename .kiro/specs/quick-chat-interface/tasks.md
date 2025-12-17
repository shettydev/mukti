# Implementation Plan

- [ ] 1. Set up project structure and routing
- [ ] 1.1 Create `/dashboard/chat` route directory and page component
  - Create `packages/mukti-web/src/app/dashboard/chat/page.tsx`
  - Set up basic page structure with ProtectedRoute wrapper
  - Add route to Next.js routing system
  - _Requirements: 1.1, 7.3_

- [ ] 1.2 Update `/dashboard` page to redirect to `/dashboard/chat`
  - Modify `packages/mukti-web/src/app/dashboard/page.tsx`
  - Implement client-side redirect using `useRouter`
  - Add loading state during redirect
  - _Requirements: 7.1, 7.2_

- [ ]\* 1.3 Write property test for dashboard redirect
  - **Property 16: Dashboard redirects to chat**
  - **Validates: Requirements 7.2**

- [ ] 2. Create core chat components
- [ ] 2.1 Create WelcomeSection component
  - Create `packages/mukti-web/src/components/chat/welcome-section.tsx`
  - Implement empty state UI with logo, greeting, and example prompts
  - Add click handlers for example prompts
  - Style with Tailwind CSS matching existing design system
  - _Requirements: 1.2, 1.3_

- [ ] 2.2 Create ChatInputBar component
  - Create `packages/mukti-web/src/components/chat/chat-input-bar.tsx`
  - Integrate TechniqueSelector component
  - Integrate MessageInput component (reuse existing)
  - Implement layout with technique selector above input
  - Add send button with loading state
  - _Requirements: 1.4, 2.1_

- [ ]\* 2.3 Write property test for input validation
  - **Property 1: Input validation enables send button**
  - **Validates: Requirements 1.4**

- [ ] 2.3 Create ChatInterface component
  - Create `packages/mukti-web/src/components/chat/chat-interface.tsx`
  - Implement conditional rendering (WelcomeSection vs MessageList)
  - Add ChatInputBar at bottom
  - Handle message sending and conversation creation
  - _Requirements: 1.1, 1.5_

- [ ]\* 2.4 Write property test for first message conversation creation
  - **Property 2: First message creates conversation**
  - **Validates: Requirements 1.5**

- [ ] 2.4 Create ChatPage component
  - Create `packages/mukti-web/src/app/dashboard/chat/page.tsx`
  - Implement conversation state management
  - Handle technique selection state
  - Integrate ChatInterface component
  - Add URL param handling for conversation ID
  - _Requirements: 1.1, 2.3, 7.5_

- [ ]\* 2.5 Write property test for navigation preservation
  - **Property 18: Navigation preserves conversation**
  - **Validates: Requirements 7.5**

- [ ] 3. Implement technique selection functionality
- [ ] 3.1 Verify TechniqueSelector component works with new layout
  - Test existing `packages/mukti-web/src/components/conversations/technique-selector.tsx`
  - Ensure it displays all 6 techniques with descriptions
  - Verify default selection of "Elenchus"
  - _Requirements: 2.1, 2.2_

- [ ]\* 3.2 Write property test for technique selector
  - **Property 3: Technique selector displays all options**
  - **Validates: Requirements 2.2**

- [ ] 3.3 Implement technique state management in ChatPage
  - Add `selectedTechnique` state with default "elenchus"
  - Pass technique to conversation creation
  - Update technique when user changes selection
  - _Requirements: 2.3, 2.4, 2.5_

- [ ]\* 3.4 Write property test for technique selection
  - **Property 4: Technique selection updates state**
  - **Validates: Requirements 2.3**

- [ ]\* 3.5 Write property test for technique persistence
  - **Property 5: Technique persists with conversation**
  - **Validates: Requirements 2.5**

- [ ] 3.6 Add technique indicator display
  - Display selected technique name near input bar
  - Add tooltip with technique explanation on hover
  - Show visual feedback when technique changes
  - _Requirements: 10.1, 10.2, 10.4, 10.5_

- [ ]\* 3.7 Write property test for technique indicator
  - **Property 21: Technique indicator displays current technique**
  - **Validates: Requirements 10.1**

- [ ]\* 3.8 Write property test for technique change feedback
  - **Property 22: Technique change shows feedback**
  - **Validates: Requirements 10.2, 10.4**

- [ ]\* 3.9 Write property test for technique tooltip
  - **Property 23: Technique tooltip shows explanation**
  - **Validates: Requirements 10.5**

- [ ] 4. Implement conversation creation and title generation
- [ ] 4.1 Create title generation utility
  - Create `packages/mukti-web/src/lib/utils/title-generation.ts`
  - Implement `generateTemporaryTitle()` function
  - Truncate to 60 characters
  - Remove incomplete words at end
  - Add ellipsis if truncated
  - _Requirements: 3.1, 3.4_

- [ ]\* 4.2 Write property test for title generation
  - **Property 6: Temporary title generation follows rules**
  - **Validates: Requirements 3.1, 3.4**

- [ ] 4.3 Implement conversation creation flow in ChatPage
  - Call `useCreateConversation` hook on first message
  - Generate temporary title from message content
  - Pass selected technique to creation DTO
  - Handle loading and error states
  - _Requirements: 1.5, 2.5, 3.1_

- [ ] 4.4 Add SSE event handler for title updates
  - Extend `useConversationStream` to handle 'title_updated' events
  - Update conversation cache when title changes
  - Invalidate sidebar queries to trigger re-render
  - _Requirements: 3.2, 3.3_

- [ ]\* 4.5 Write property test for sidebar reactive updates
  - **Property 7: Sidebar updates reactively**
  - **Validates: Requirements 3.3, 4.2**

- [ ] 5. Update sidebar component
- [ ] 5.1 Remove dummy navigation items from Sidebar
  - Modify `packages/mukti-web/src/components/dashboard/sidebar.tsx`
  - Remove "Workspace" section header
  - Remove Community, Resources, Messages, Reports nav items
  - Keep only: Chat, Conversations, Thinking Canvas, Security, Settings, Help & Support
  - _Requirements: 9.1, 9.2_

- [ ] 5.2 Add "Chat" navigation item to Sidebar
  - Replace "Dashboard" with "Chat" nav item
  - Use MessageSquare icon
  - Link to `/dashboard/chat`
  - Set as active when on chat page
  - _Requirements: 9.2_

- [ ] 5.3 Verify sidebar collapse/expand functionality
  - Test existing collapse/expand behavior
  - Ensure icons display correctly when collapsed
  - Verify tooltips show on hover when collapsed
  - _Requirements: 9.3, 9.4, 9.5_

- [ ]\* 5.4 Write property test for sidebar tooltips
  - **Property 20: Collapsed sidebar shows tooltips**
  - **Validates: Requirements 9.5**

- [ ] 6. Implement sidebar conversation list integration
- [ ] 6.1 Add conversation list to sidebar
  - Use existing `useInfiniteConversations` hook
  - Display most recent 20 conversations
  - Sort by last activity (updatedAt)
  - Show conversation titles
  - _Requirements: 4.4_

- [ ]\* 6.2 Write property test for sidebar conversation ordering
  - **Property 10: Sidebar shows recent conversations**
  - **Validates: Requirements 4.4**

- [ ] 6.3 Implement conversation click navigation
  - Add click handlers to conversation items
  - Navigate to `/dashboard/chat?id={conversationId}`
  - Load conversation data on navigation
  - _Requirements: 4.3_

- [ ]\* 6.4 Write property test for sidebar navigation
  - **Property 9: Sidebar navigation works**
  - **Validates: Requirements 4.3**

- [ ] 6.5 Add active conversation highlighting
  - Compare current conversation ID with sidebar items
  - Apply highlight styles to active conversation
  - Use existing design system colors
  - _Requirements: 4.5_

- [ ]\* 6.6 Write property test for active conversation highlight
  - **Property 11: Active conversation is highlighted**
  - **Validates: Requirements 4.5**

- [ ] 6.7 Implement new conversation at top of list
  - Ensure optimistic updates place new conversations at top
  - Verify sorting maintains newest first
  - Test with multiple rapid creations
  - _Requirements: 4.1_

- [ ]\* 6.8 Write property test for new conversation positioning
  - **Property 8: New conversations appear at top**
  - **Validates: Requirements 4.1**

- [ ] 7. Implement message sending and streaming
- [ ] 7.1 Integrate message sending in ChatInterface
  - Use existing `useSendMessage` hook
  - Implement optimistic message display
  - Handle loading state during send
  - Handle error state with retry
  - _Requirements: 5.1_

- [ ]\* 7.2 Write property test for optimistic message display
  - **Property 12: Optimistic message display**
  - **Validates: Requirements 5.1**

- [ ] 7.3 Integrate SSE streaming in ChatInterface
  - Use existing `useConversationStream` hook
  - Display streaming indicator during AI response
  - Update messages as they stream in
  - Handle stream completion
  - _Requirements: 5.2, 5.3, 5.4_

- [ ]\* 7.4 Write property test for streaming indicator
  - **Property 13: Streaming shows indicator**
  - **Validates: Requirements 5.3**

- [ ]\* 7.5 Write property test for streaming completion
  - **Property 14: Streaming completion enables input**
  - **Validates: Requirements 5.4**

- [ ] 7.6 Add error handling for streaming failures
  - Display error message on stream error
  - Provide retry button
  - Handle network disconnections gracefully
  - _Requirements: 5.5_

- [ ] 8. Implement keyboard shortcuts and accessibility
- [ ] 8.1 Add keyboard shortcut for sending messages
  - Implement Enter to send (existing in MessageInput)
  - Verify Shift+Enter for newline works
  - Test across different browsers
  - _Requirements: 6.4_

- [ ]\* 8.2 Write property test for keyboard shortcuts
  - **Property 15: Keyboard shortcuts work**
  - **Validates: Requirements 6.4**

- [ ] 8.3 Add ARIA labels and semantic HTML
  - Add role="log" to message list
  - Add aria-label to all buttons
  - Use semantic HTML (main, nav, article)
  - Add aria-live regions for dynamic content
  - _Requirements: 6.5_

- [ ] 8.4 Verify keyboard navigation
  - Test tab order through all interactive elements
  - Ensure focus indicators are visible
  - Test with screen reader (VoiceOver/NVDA)
  - _Requirements: 6.4, 6.5_

- [ ] 9. Implement "New Chat" functionality
- [ ] 9.1 Add "New Chat" button to sidebar
  - Add button at top of sidebar
  - Use Plus icon or similar
  - Link to `/dashboard/chat` (no ID param)
  - _Requirements: 7.4_

- [ ] 9.2 Implement conversation state reset on "New Chat"
  - Clear conversation ID from state
  - Clear messages from UI
  - Reset to welcome section
  - Clear URL params
  - _Requirements: 7.4_

- [ ]\* 9.3 Write property test for new chat state reset
  - **Property 17: New chat clears state**
  - **Validates: Requirements 7.4**

- [ ] 10. Ensure data consistency across views
- [ ] 10.1 Verify TanStack Query cache consistency
  - Test switching between chat and conversation list
  - Verify conversation data matches in both views
  - Test optimistic updates reflect in both views
  - _Requirements: 8.4_

- [ ]\* 10.2 Write property test for data consistency
  - **Property 19: Data consistency across views**
  - **Validates: Requirements 8.4**

- [ ] 10.3 Verify API integration uses existing endpoints
  - Confirm conversation creation uses existing API
  - Confirm message sending uses existing API
  - Confirm SSE uses existing infrastructure
  - _Requirements: 8.1, 8.2_

- [ ] 11. Add loading and error states
- [ ] 11.1 Add loading states to ChatPage
  - Show skeleton loader while creating conversation
  - Show loading indicator while sending message
  - Show loading indicator while connecting to SSE
  - _Requirements: 1.5, 5.1_

- [ ] 11.2 Add error states to ChatPage
  - Show error toast on conversation creation failure
  - Show error toast on message send failure
  - Show error banner on SSE connection failure
  - Add retry buttons for all error states
  - _Requirements: 5.5_

- [ ] 11.3 Implement error recovery patterns
  - Implement optimistic update rollback on error
  - Implement retry with exponential backoff
  - Keep user input on error (don't clear)
  - Log errors for debugging
  - _Requirements: 5.5_

- [ ] 12. Add responsive design and mobile support
- [ ] 12.1 Make ChatInterface responsive
  - Test on mobile viewport (375px)
  - Adjust layout for small screens
  - Ensure input bar is accessible on mobile
  - Test on tablet viewport (768px)
  - _Requirements: 6.1_

- [ ] 12.2 Make technique selector mobile-friendly
  - Test technique selector on mobile
  - Ensure dialog is mobile-optimized
  - Test touch interactions
  - _Requirements: 6.2_

- [ ] 12.3 Verify sidebar mobile behavior
  - Test sidebar overlay on mobile
  - Verify close button works
  - Test swipe gestures if implemented
  - _Requirements: 6.3_

- [ ] 13. Polish UI and animations
- [ ] 13.1 Add smooth transitions
  - Add fade-in for welcome section
  - Add slide-in for new messages
  - Add smooth scroll to bottom on new message
  - Add transition for technique selector

- [ ] 13.2 Add loading animations
  - Add typing indicator animation for AI responses
  - Add skeleton loaders for conversation list
  - Add spinner for send button during loading

- [ ] 13.3 Add hover and focus states
  - Add hover effects to all interactive elements
  - Add focus rings for keyboard navigation
  - Add active states for buttons

- [ ] 14. Write integration tests
- [ ]\* 14.1 Write end-to-end chat flow test
  - Test complete flow: land on page → select technique → send message → receive response
  - Verify conversation creation
  - Verify sidebar updates
  - Verify title generation

- [ ]\* 14.2 Write navigation flow test
  - Test /dashboard redirect
  - Test sidebar navigation
  - Test "New Chat" button
  - Test conversation preservation

- [ ]\* 14.3 Write error recovery test
  - Test message send failure and retry
  - Test SSE connection failure and reconnection
  - Test conversation creation failure

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. Performance optimization
- [ ] 16.1 Implement lazy loading
  - Lazy load WelcomeSection component
  - Lazy load TechniqueSelector dialog
  - Code-split chat page from other pages

- [ ] 16.2 Add memoization
  - Memoize MessageList with React.memo
  - Memoize technique selector options
  - Use useMemo for sorted conversation lists

- [ ] 16.3 Measure and optimize performance
  - Measure Time to Interactive (target < 2s)
  - Measure First Contentful Paint (target < 1s)
  - Measure message send latency (target < 100ms)
  - Optimize if targets not met

- [ ] 17. Final testing and bug fixes
- [ ] 17.1 Manual testing across browsers
  - Test on Chrome, Firefox, Safari, Edge
  - Test on mobile browsers (iOS Safari, Chrome Android)
  - Fix any browser-specific issues

- [ ] 17.2 Accessibility audit
  - Run Lighthouse accessibility audit
  - Test with screen reader
  - Fix any accessibility issues
  - Verify WCAG 2.1 AA compliance

- [ ] 17.3 Cross-device testing
  - Test on various screen sizes
  - Test on touch devices
  - Test on different network speeds
  - Fix any device-specific issues

- [ ] 18. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
