# Design Document

## Overview

The Quick Chat Interface transforms Mukti into a streamlined, Claude-like chat experience. This design removes the `/dashboard` prefix entirely, using clean routes (`/chat`, `/chat/:id`, `/canvas`). The sidebar is simplified to show only Thinking Canvas and conversation history, with all other options (Settings, Security, Help) moved to a user profile popover. When starting a new conversation, the input is centered on the page with a quirky heading, creating a focused, distraction-free experience.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Quick Chat Interface                     │
│                                                              │
│  ┌────────────────┐  ┌──────────────────────────────────┐  │
│  │   Simplified   │  │         Chat Page                 │  │
│  │    Sidebar     │  │                                   │  │
│  │                │  │  Empty State:                     │  │
│  │ • New Chat     │  │  ┌─────────────────────────────┐  │  │
│  │ • Canvas       │  │  │   Quirky Heading            │  │  │
│  │ ─────────────  │  │  │   [Technique ▼]             │  │  │
│  │ • Conv 1       │  │  │   [    Input Bar      ] [→] │  │  │
│  │ • Conv 2       │  │  └─────────────────────────────┘  │  │
│  │ • Conv 3       │  │                                   │  │
│  │ • ...          │  │  Active State:                    │  │
│  │                │  │  • Message list                   │  │
│  │ ─────────────  │  │  • Input bar at bottom            │  │
│  │ [User Profile] │  │                                   │  │
│  └────────────────┘  └──────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Route Structure

```
/chat           → New conversation (centered input)
/chat/:id       → Existing conversation
/canvas         → Thinking Canvas
/security       → Security settings (from profile popover)
/settings       → User settings (from profile popover)
/help           → Help & Support (from profile popover)
```

### Component Hierarchy

```
/chat (ChatPage)
├── AppLayout
│   ├── Sidebar
│   │   ├── Logo
│   │   ├── NewChatButton
│   │   ├── CanvasNavItem
│   │   ├── Separator
│   │   ├── ConversationList (infinite scroll)
│   │   │   └── ConversationItem[]
│   │   └── UserProfilePopover
│   │       ├── User Info
│   │       ├── Security Link
│   │       ├── Settings Link
│   │       ├── Help & Support Link
│   │       └── Logout Button
│   └── Main Content
│       └── ChatInterface
│           ├── EmptyState (when no conversation)
│           │   ├── QuirkyHeading
│           │   ├── TechniqueSelector
│           │   └── CenteredInput
│           └── ActiveState (when conversation exists)
│               ├── MessageList
│               └── ChatInputBar
```

## Components and Interfaces

### 1. ChatPage Component

**Location:** `packages/mukti-web/src/app/chat/page.tsx` and `packages/mukti-web/src/app/chat/[id]/page.tsx`

**Purpose:** Main page component that manages chat state and conversation lifecycle.

**State:**

- `conversationId: string | null` - Current conversation ID (from URL param)
- `selectedTechnique: SocraticTechnique` - Selected technique (default: 'elenchus')
- `isCreatingConversation: boolean` - Loading state for conversation creation

**Interface:**

```typescript
interface ChatPageState {
  conversationId: string | null;
  selectedTechnique: SocraticTechnique;
  isCreatingConversation: boolean;
}
```

### 2. ChatInterface Component

**Location:** `packages/mukti-web/src/components/chat/chat-interface.tsx`

**Purpose:** Main chat UI that displays either empty state or active conversation.

**Props:**

```typescript
interface ChatInterfaceProps {
  conversationId: string | null;
  selectedTechnique: SocraticTechnique;
  onTechniqueChange: (technique: SocraticTechnique) => void;
  onSendMessage: (content: string) => Promise<void>;
  isCreating: boolean;
}
```

### 3. EmptyState Component

**Location:** `packages/mukti-web/src/components/chat/empty-state.tsx`

**Purpose:** Centered input with quirky heading when no conversation is active.

**Props:**

```typescript
interface EmptyStateProps {
  selectedTechnique: SocraticTechnique;
  onTechniqueChange: (technique: SocraticTechnique) => void;
  onSendMessage: (content: string) => Promise<void>;
  isCreating: boolean;
}
```

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                                                              │
│                                                              │
│              "What's on your mind today?"                    │
│                   or similar quirky heading                  │
│                                                              │
│              [Technique: Elenchus ▼]                         │
│              ┌─────────────────────────────────────────┐    │
│              │ Ask me anything...                  [→] │    │
│              └─────────────────────────────────────────┘    │
│                                                              │
│                                                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Quirky Heading Options:**

- "What's puzzling you today?"
- "Let's think together..."
- "Question everything."
- "What would Socrates ask?"
- "Ready to challenge your assumptions?"

### 4. Simplified Sidebar Component

**Location:** `packages/mukti-web/src/components/sidebar/sidebar.tsx`

**Structure:**

```typescript
interface SidebarProps {
  collapsed: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onToggleCollapse?: () => void;
}
```

**Layout:**

```
┌──────────────────────┐
│ [Logo] Mukti AI  [<] │
├──────────────────────┤
│ [+] New Chat         │
│ [🧠] Thinking Canvas │
├──────────────────────┤
│ Conversations        │
│ ─────────────────    │
│ • React Performance  │
│ • API Design Quest...│
│ • Learning Rust      │
│ • ...                │
│ (infinite scroll)    │
├──────────────────────┤
│ [Avatar] John Doe    │
│          john@...    │
└──────────────────────┘
```

### 5. UserProfilePopover Component

**Location:** `packages/mukti-web/src/components/sidebar/user-profile-popover.tsx`

**Purpose:** Dropdown menu from user profile containing settings and logout.

**Props:**

```typescript
interface UserProfilePopoverProps {
  user: User;
  collapsed: boolean;
  onLogout: () => void;
}
```

**Menu Items:**

```typescript
const menuItems = [
  { icon: Shield, label: 'Security', href: '/security' },
  { icon: Settings, label: 'Settings', href: '/settings' },
  { icon: HelpCircle, label: 'Help & Support', href: '/help' },
  { type: 'separator' },
  { icon: LogOut, label: 'Logout', action: 'logout', variant: 'destructive' },
];
```

### 6. ConversationList Component

**Location:** `packages/mukti-web/src/components/sidebar/conversation-list.tsx`

**Purpose:** Infinite scroll list of all conversations in sidebar.

**Props:**

```typescript
interface ConversationListProps {
  activeConversationId?: string;
  collapsed: boolean;
  onConversationClick: (id: string) => void;
}
```

**Features:**

- Infinite scroll using `useInfiniteConversations` hook
- Active conversation highlighting
- Truncated titles with tooltips
- Last activity timestamp

### 7. Route Redirects

**Location:** `packages/mukti-web/src/app/dashboard/[[...slug]]/page.tsx`

**Purpose:** Redirect all `/dashboard/*` routes to new routes.

**Redirect Mapping:**

```typescript
const redirectMap: Record<string, string> = {
  '/dashboard': '/chat',
  '/dashboard/chat': '/chat',
  '/dashboard/conversations': '/chat',
  '/dashboard/conversations/:id': '/chat/:id',
  '/dashboard/canvas': '/canvas',
  '/dashboard/security': '/security',
  '/dashboard/settings': '/settings',
  '/dashboard/help': '/help',
};
```

## Data Models

### Conversation Creation Flow

```typescript
// 1. User on /chat (empty state)
// 2. User types message and sends

const handleSendFirstMessage = async (content: string) => {
  setIsCreating(true);

  // Generate temporary title
  const title = generateTemporaryTitle(content);

  // Create conversation
  const conversation = await conversationsApi.create({
    title,
    technique: selectedTechnique,
    tags: [],
  });

  // Navigate to /chat/:id
  router.push(`/chat/${conversation.id}`);

  // Send message
  await conversationsApi.sendMessage(conversation.id, { content });

  setIsCreating(false);
};
```

### Temporary Title Generation

```typescript
function generateTemporaryTitle(message: string): string {
  // Truncate to first 60 characters
  const truncated = message.slice(0, 60);

  // Remove incomplete words at the end
  const lastSpace = truncated.lastIndexOf(' ');
  const cleaned = lastSpace > 30 ? truncated.slice(0, lastSpace) : truncated;

  // Add ellipsis if truncated
  return message.length > 60 ? `${cleaned}...` : cleaned;
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property Reflection

After analyzing all acceptance criteria, the following properties have been identified as unique and testable:

**Property 1: Input validation enables send button**
_For any_ non-empty text input in the message bar, the send button should be enabled
**Validates: Requirements 1.4**

**Property 2: First message creates conversation and navigates**
_For any_ valid message content sent when no conversation exists, a new conversation should be created and the user should be navigated to `/chat/:id`
**Validates: Requirements 1.5**

**Property 3: Technique selector displays all options**
_For any_ state of the chat interface, clicking the technique selector should display all 6 Socratic techniques with their descriptions
**Validates: Requirements 2.2**

**Property 4: Technique selection updates state**
_For any_ Socratic technique selected from the picker, the active technique should update and be reflected in the UI
**Validates: Requirements 2.3**

**Property 5: Technique persists with conversation**
_For any_ technique selected when creating a conversation, that technique should be stored in the conversation metadata
**Validates: Requirements 2.5**

**Property 6: Temporary title generation follows rules**
_For any_ message content, the generated temporary title should be truncated to 60 characters maximum and should not end mid-word
**Validates: Requirements 3.1, 3.2**

**Property 7: Sidebar updates reactively**
_For any_ conversation title update or new conversation creation, the sidebar conversation list should reflect the change immediately
**Validates: Requirements 3.3, 4.2**

**Property 8: New conversations appear at top**
_For any_ newly created conversation, it should appear at the top of the sidebar conversation list
**Validates: Requirements 4.1**

**Property 9: Sidebar navigation works**
_For any_ conversation in the sidebar list, clicking it should navigate to `/chat/:id`
**Validates: Requirements 4.3**

**Property 10: Active conversation is highlighted**
_For any_ active conversation, it should have a visual highlight in the sidebar conversation list
**Validates: Requirements 4.5**

**Property 11: Optimistic message display**
_For any_ message sent by the user, it should appear immediately in the chat interface before server confirmation
**Validates: Requirements 5.1**

**Property 12: Streaming shows indicator**
_For any_ AI response being streamed, a typing indicator or streaming animation should be visible
**Validates: Requirements 5.3**

**Property 13: Streaming completion enables input**
_For any_ completed AI response, the input bar should be re-enabled and the streaming indicator should be hidden
**Validates: Requirements 5.4**

**Property 14: Keyboard shortcuts work**
_For any_ text in the input bar, pressing Enter should send the message
**Validates: Requirements 6.4**

**Property 15: Dashboard routes redirect correctly**
_For any_ navigation to `/dashboard/*`, the system should redirect to the equivalent `/chat`, `/canvas`, or settings route
**Validates: Requirements 7.2**

**Property 16: New chat clears state and shows centered input**
_For any_ click on "New Chat" in the sidebar, the system should navigate to `/chat` and display the centered input layout
**Validates: Requirements 7.4, 12.5**

**Property 17: Profile popover shows all options**
_For any_ click on the user profile, the popover should display Security, Settings, Help & Support, and Logout options
**Validates: Requirements 10.2**

**Property 18: Profile popover navigation works**
_For any_ click on a navigation item in the profile popover, the system should navigate to the correct route
**Validates: Requirements 10.3, 10.4, 10.5**

**Property 19: Empty state shows centered layout**
_For any_ visit to `/chat` without a conversation ID, the system should display the centered input with quirky heading and no navbar
**Validates: Requirements 12.1, 12.2, 12.3**

**Property 20: Technique indicator displays current technique**
_For any_ active conversation, the technique indicator should display the currently selected technique name
**Validates: Requirements 11.1**

## Error Handling

### Client-Side Error Scenarios

**1. Conversation Creation Failure**

- Show error toast: "Failed to create conversation. Please try again."
- Keep message in input bar (don't clear)
- Enable retry button

**2. Message Send Failure**

- Rollback optimistic update (remove message from UI)
- Show error toast: "Failed to send message. Please try again."
- Keep message in input bar

**3. SSE Connection Failure**

- Use existing `useConversationStream` error handling
- Show connection status indicator
- Attempt automatic reconnection with exponential backoff

**4. Title Generation Failure**

- Use fallback title: `"Conversation - ${new Date().toISOString()}"`
- Continue with conversation creation

## Testing Strategy

### Unit Testing

**Components to Test:**

1. **ChatPage** - State management, conversation lifecycle
2. **ChatInterface** - Message display, input handling
3. **EmptyState** - Centered layout, quirky heading
4. **Sidebar** - Navigation, conversation list
5. **UserProfilePopover** - Menu items, navigation
6. **ConversationList** - Infinite scroll, highlighting

### Property-Based Testing

We'll use **fast-check** for property-based testing.

**Key Properties to Test:**

**1. Title Truncation Property:**

```typescript
it('Property 6: Temporary title generation follows rules', () => {
  fc.assert(
    fc.property(fc.string({ minLength: 1, maxLength: 200 }), (message) => {
      const title = generateTemporaryTitle(message);
      expect(title.length).toBeLessThanOrEqual(60);
    }),
    { numRuns: 100 }
  );
});
```

**2. Route Redirect Property:**

```typescript
it('Property 15: Dashboard routes redirect correctly', () => {
  fc.assert(
    fc.property(
      fc.constantFrom(
        '/dashboard',
        '/dashboard/chat',
        '/dashboard/conversations',
        '/dashboard/canvas'
      ),
      (route) => {
        const redirected = getRedirectRoute(route);
        expect(redirected).not.toContain('/dashboard');
      }
    ),
    { numRuns: 20 }
  );
});
```

### Integration Testing

**Test Scenarios:**

1. **End-to-End Chat Flow:** Land on /chat → Send message → Navigate to /chat/:id → Receive response
2. **Navigation Flow:** Test all route redirects and sidebar navigation
3. **Profile Popover Flow:** Open popover → Navigate to settings → Return to chat

## Performance Considerations

### Optimization Strategies

**1. Lazy Loading:**

- Lazy load EmptyState component
- Lazy load TechniqueSelector dialog
- Code-split chat page from canvas page

**2. Memoization:**

- Memoize ConversationList items
- Memoize message rendering
- Use `useMemo` for sorted conversation lists

**3. Virtualization:**

- Use virtual scrolling for conversation list in sidebar
- Use virtual scrolling for message list

## Accessibility

### WCAG 2.1 AA Compliance

**Keyboard Navigation:**

- Tab through all interactive elements
- Enter to send message
- Escape to close popover/dialogs
- Arrow keys to navigate conversation list

**Screen Reader Support:**

- ARIA labels on all buttons and inputs
- ARIA live regions for message updates
- Semantic HTML structure

## Migration Strategy

### Phase 1: Route Setup

1. Create new route structure (`/chat`, `/chat/[id]`, `/canvas`)
2. Add redirect handlers for `/dashboard/*` routes
3. Update auth redirects to use `/chat`

### Phase 2: Component Development

1. Create EmptyState component with centered layout
2. Update Sidebar to remove nav items, add conversation list
3. Create UserProfilePopover component
4. Create ConversationList component

### Phase 3: Integration

1. Wire up conversation creation flow
2. Integrate SSE streaming
3. Implement technique selection
4. Add title generation logic

### Phase 4: Cleanup

1. Remove old dashboard pages
2. Remove old conversation list page
3. Update all internal links
4. Update documentation
