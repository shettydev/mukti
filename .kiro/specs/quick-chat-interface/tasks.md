# Implementation Plan

- [x] 1. Set up new route structure
- [x] 1.1 Create `/chat` route directory and page component
  - Create `packages/mukti-web/src/app/chat/page.tsx`
  - Set up basic page structure with ProtectedRoute wrapper
  - Implement empty state with centered input layout
  - _Requirements: 1.1, 1.2, 12.1, 12.2_

- [x] 1.2 Create `/chat/[id]` dynamic route for existing conversations
  - Create `packages/mukti-web/src/app/chat/[id]/page.tsx`
  - Load conversation by ID from URL param
  - Display active conversation state
  - _Requirements: 7.3_

- [x] 1.3 Create `/canvas` route
  - Create `packages/mukti-web/src/app/canvas/page.tsx`
  - Move existing Thinking Canvas functionality
  - _Requirements: 7.5_

- [x] 1.4 Create redirect handlers for legacy `/dashboard/*` routes
  - Create `packages/mukti-web/src/app/dashboard/[[...slug]]/page.tsx`
  - Redirect `/dashboard` → `/chat`
  - Redirect `/dashboard/conversations` → `/chat`
  - Redirect `/dashboard/conversations/:id` → `/chat/:id`
  - Redirect `/dashboard/canvas` → `/canvas`
  - Redirect `/dashboard/security` → `/security`
  - Redirect `/dashboard/settings` → `/settings`
  - Redirect `/dashboard/help` → `/help`
  - _Requirements: 7.2_

- [x] 1.5 Write property test for route redirects
  - **Property 15: Dashboard routes redirect correctly**
  - **Validates: Requirements 7.2**

- [x] 1.6 Update auth redirects to use `/chat`
  - Update login success redirect to `/chat`
  - Update protected route redirect to `/chat`
  - Update any hardcoded `/dashboard` references
  - _Requirements: 7.1_

- [x] 2. Create EmptyState component (centered input layout)
- [x] 2.1 Create EmptyState component
  - Create `packages/mukti-web/src/components/chat/empty-state.tsx`
  - Implement centered layout (vertically and horizontally)
  - Add quirky heading above input
  - Hide navbar in this state
  - _Requirements: 1.2, 1.3, 12.2, 12.3_

- [x] 2.2 Implement quirky heading rotation
  - Create array of quirky headings reflecting Socratic philosophy
  - Randomly select heading on page load
  - Examples: "What's puzzling you today?", "Question everything.", "Let's think together..."
  - _Requirements: 1.3, 12.3_

- [x] 2.3 Add technique selector to EmptyState
  - Position technique selector above input bar
  - Default to "Elenchus" technique
  - Style to match centered layout
  - _Requirements: 2.1_

- [x] 2.4 Write property test for empty state layout
  - **Property 19: Empty state shows centered layout**
  - **Validates: Requirements 12.1, 12.2, 12.3**

- [x] 3. Create ChatInterface component
- [x] 3.1 Create ChatInterface component
  - Create `packages/mukti-web/src/components/chat/chat-interface.tsx`
  - Implement conditional rendering (EmptyState vs ActiveState)
  - Handle conversation state transitions
  - _Requirements: 1.1, 1.5_

- [x] 3.2 Implement first message handling
  - Create conversation on first message send
  - Generate temporary title from message content
  - Navigate to `/chat/:id` after creation
  - Send message to new conversation
  - _Requirements: 1.5, 3.1_

- [x] 3.3 Write property test for first message conversation creation
  - **Property 2: First message creates conversation and navigates**
  - **Validates: Requirements 1.5**

- [x] 3.4 Implement active conversation state
  - Display message list
  - Show input bar at bottom
  - Integrate SSE streaming
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 3.5 Write property test for optimistic message display
  - **Property 11: Optimistic message display**
  - **Validates: Requirements 5.1**

- [x] 4. Implement title generation utility
- [x] 4.1 Create title generation utility
  - Create `packages/mukti-web/src/lib/utils/title-generation.ts`
  - Implement `generateTemporaryTitle()` function
  - Truncate to 60 characters
  - Remove incomplete words at end
  - Add ellipsis if truncated
  - _Requirements: 3.1, 3.2_

- [x] 4.2 Write property test for title generation
  - **Property 6: Temporary title generation follows rules**
  - **Validates: Requirements 3.1, 3.2**

- [x] 5. Update Sidebar component
- [x] 5.1 Remove old navigation items from Sidebar
  - Remove Dashboard, Conversations, Security, Settings, Help nav items
  - Keep only structure for new layout
  - _Requirements: 9.1_

- [x] 5.2 Add New Chat button to Sidebar
  - Add prominent "New Chat" button at top
  - Navigate to `/chat` on click
  - Clear conversation state
  - _Requirements: 7.4, 9.1_

- [x] 5.3 Add Thinking Canvas link to Sidebar
  - Add Canvas nav item below New Chat
  - Link to `/canvas`
  - Show active state when on canvas page
  - _Requirements: 9.1_

- [x] 5.4 Add separator between nav and conversation list
  - Add visual separator (line or spacing)
  - Add "Conversations" label above list
  - _Requirements: 4.6, 9.1_

- [-] 5.5 Write property test for new chat navigation
  - **Property 16: New chat clears state and shows centered input**
  - **Validates: Requirements 7.4, 12.5**

- [-] 6. Create ConversationList component
- [x] 6.1 Create ConversationList component
  - Create `packages/mukti-web/src/components/sidebar/conversation-list.tsx`
  - Use `useInfiniteConversations` hook
  - Implement infinite scroll
  - Sort by last activity
  - _Requirements: 4.4, 9.2_

- [x] 6.2 Implement conversation item rendering
  - Show truncated title
  - Show last activity timestamp
  - Add tooltip for full title on hover
  - _Requirements: 4.2_

- [x] 6.3 Implement active conversation highlighting
  - Compare current URL param with conversation ID
  - Apply highlight styles to active item
  - _Requirements: 4.5_

- [x] 6.4 Write property test for active conversation highlight
  - **Property 10: Active conversation is highlighted**
  - **Validates: Requirements 4.5**

- [x] 6.5 Implement conversation click navigation
  - Navigate to `/chat/:id` on click
  - Close mobile sidebar if open
  - _Requirements: 4.3_

- [x] 6.6 Write property test for sidebar navigation
  - **Property 9: Sidebar navigation works**
  - **Validates: Requirements 4.3**

- [x] 6.7 Implement new conversation at top of list
  - Ensure optimistic updates place new conversations at top
  - Verify sorting maintains newest first
  - _Requirements: 4.1_

- [x] 6.8 Write property test for new conversation positioning
  - **Property 8: New conversations appear at top**
  - **Validates: Requirements 4.1**

- [x] 7. Create UserProfilePopover component
- [x] 7.1 Create UserProfilePopover component
  - Create `packages/mukti-web/src/components/sidebar/user-profile-popover.tsx`
  - Replace existing dropdown menu
  - Add user info display
  - _Requirements: 10.1_

- [x] 7.2 Add navigation items to popover
  - Add Security link → `/security`
  - Add Settings link → `/settings`
  - Add Help & Support link → `/help`
  - Add separator before logout
  - Add Logout button with destructive styling
  - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 7.3 Write property test for profile popover options
  - **Property 17: Profile popover shows all options**
  - **Validates: Requirements 10.2**

- [x] 7.4 Write property test for profile popover navigation
  - **Property 18: Profile popover navigation works**
  - **Validates: Requirements 10.3, 10.4, 10.5**

- [x] 8. Implement technique selection
- [x] 8.1 Verify TechniqueSelector works in new layout
  - Test in EmptyState centered layout
  - Test in active conversation layout
  - Ensure all 6 techniques display with descriptions
  - _Requirements: 2.1, 2.2_

- [x] 8.2 Write property test for technique selector
  - **Property 3: Technique selector displays all options**
  - **Validates: Requirements 2.2**

- [x] 8.3 Implement technique state management
  - Add `selectedTechnique` state with default "elenchus"
  - Pass technique to conversation creation
  - Update technique when user changes selection
  - _Requirements: 2.3, 2.4, 2.5_

- [x] 8.4 Write property test for technique selection
  - **Property 4: Technique selection updates state**
  - **Validates: Requirements 2.3**

- [x] 8.5 Write property test for technique persistence
  - **Property 5: Technique persists with conversation**
  - **Validates: Requirements 2.5**

- [x] 8.6 Add technique indicator display
  - Display selected technique name near input bar
  - Add tooltip with technique explanation on hover
  - _Requirements: 11.1, 11.5_

- [x] 8.7 Write property test for technique indicator
  - **Property 20: Technique indicator displays current technique**
  - **Validates: Requirements 11.1**

- [x] 9. Implement message sending and streaming
- [x] 9.1 Integrate message sending
  - Use existing `useSendMessage` hook
  - Implement optimistic message display
  - Handle loading state during send
  - Handle error state with retry
  - _Requirements: 5.1_

- [x] 9.2 Integrate SSE streaming
  - Use existing `useConversationStream` hook
  - Display streaming indicator during AI response
  - Update messages as they stream in
  - Handle stream completion
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 9.3 Write property test for streaming indicator
  - **Property 12: Streaming shows indicator**
  - **Validates: Requirements 5.3**

- [x] 9.4 Write property test for streaming completion
  - **Property 13: Streaming completion enables input**
  - **Validates: Requirements 5.4**

- [x] 9.5 Add error handling for streaming failures
  - Display error message on stream error
  - Provide retry button
  - Handle network disconnections gracefully
  - _Requirements: 5.5_

- [ ] 10. Implement input validation and keyboard shortcuts
- [x] 10.1 Implement input validation
  - Enable send button only when input is non-empty
  - Disable during sending
  - Show character count
  - _Requirements: 1.4_

- [x] 10.2 Write property test for input validation
  - **Property 1: Input validation enables send button**
  - **Validates: Requirements 1.4**

- [x] 10.3 Implement keyboard shortcuts
  - Enter to send message
  - Shift+Enter for newline
  - _Requirements: 6.4_

- [x] 10.4 Write property test for keyboard shortcuts
  - **Property 14: Keyboard shortcuts work**
  - **Validates: Requirements 6.4**

- [x] 11. Implement sidebar reactive updates
- [x] 11.1 Ensure sidebar updates on new conversation
  - Invalidate conversation queries after creation
  - New conversation appears at top immediately
  - _Requirements: 4.1, 3.3_

- [x] 11.2 Ensure sidebar updates on title change
  - Update conversation in cache when title changes
  - Reflect change in sidebar immediately
  - _Requirements: 4.2, 3.3_

- [x] 11.3 Write property test for sidebar reactive updates
  - **Property 7: Sidebar updates reactively**
  - **Validates: Requirements 3.3, 4.2**

- [ ] 12. Add accessibility features
- [ ] 12.1 Add ARIA labels and semantic HTML
  - Add role="log" to message list
  - Add aria-label to all buttons
  - Use semantic HTML (main, nav, article)
  - Add aria-live regions for dynamic content
  - _Requirements: 6.5_

- [ ] 12.2 Verify keyboard navigation
  - Test tab order through all interactive elements
  - Ensure focus indicators are visible
  - Test with screen reader
  - _Requirements: 6.4, 6.5_

- [ ] 13. Add responsive design
- [ ] 13.1 Make EmptyState responsive
  - Test centered layout on mobile
  - Adjust padding and sizing for small screens
  - _Requirements: 6.1_

- [ ] 13.2 Make ChatInterface responsive
  - Test message list on mobile
  - Ensure input bar is accessible on mobile
  - _Requirements: 6.1_

- [ ] 13.3 Make technique selector mobile-friendly
  - Test technique selector on mobile
  - Ensure dialog is mobile-optimized
  - _Requirements: 6.2_

- [ ] 13.4 Verify sidebar mobile behavior
  - Test sidebar overlay on mobile
  - Verify close button works
  - _Requirements: 6.3_

- [ ] 14. Add loading and error states
- [ ] 14.1 Add loading states
  - Show loading indicator while creating conversation
  - Show loading indicator while sending message
  - Show loading indicator while connecting to SSE
  - _Requirements: 1.5, 5.1_

- [ ] 14.2 Add error states
  - Show error toast on conversation creation failure
  - Show error toast on message send failure
  - Show error banner on SSE connection failure
  - Add retry buttons for all error states
  - _Requirements: 5.5_

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Cleanup old dashboard code
- [x] 16.1 Remove old dashboard pages
  - Remove `/dashboard/page.tsx` (replaced by redirect)
  - Remove `/dashboard/conversations` directory
  - Keep redirect handler for backwards compatibility
  - _Requirements: 7.2_

- [x] 16.2 Update all internal links
  - Search for `/dashboard` references in codebase
  - Update to new routes (`/chat`, `/canvas`, etc.)
  - Update navigation components
  - _Requirements: 7.2_

- [x] 16.3 Update documentation
  - Update README if it references old routes
  - Update any API documentation
  - _Requirements: N/A_

- [ ] 17. Polish UI and animations
- [ ] 17.1 Add smooth transitions
  - Add fade-in for empty state
  - Add slide-in for new messages
  - Add smooth scroll to bottom on new message
  - Add transition for conversation list updates

- [ ] 17.2 Add loading animations
  - Add typing indicator animation for AI responses
  - Add skeleton loaders for conversation list
  - Add spinner for send button during loading

- [ ] 17.3 Add hover and focus states
  - Add hover effects to all interactive elements
  - Add focus rings for keyboard navigation
  - Add active states for buttons

- [-] 18. Write integration tests
- [-]\* 18.1 Write end-to-end chat flow test
  - Test complete flow: land on /chat → send message → navigate to /chat/:id → receive response
  - Verify conversation creation
  - Verify sidebar updates

- [ ]\* 18.2 Write navigation flow test
  - Test /dashboard redirects
  - Test sidebar navigation
  - Test profile popover navigation
  - Test "New Chat" button

- [ ]\* 18.3 Write error recovery test
  - Test message send failure and retry
  - Test SSE connection failure and reconnection

- [ ] 19. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
