# Design Document

## Overview

The Dashboard Improvements feature enhances the Mukti Web application with real-time messaging capabilities, eliminates code duplication, establishes consistent layout patterns, and provides informative placeholder pages for features under development. The design leverages Socket.IO for WebSocket communication, React Context for connection state management, and a reusable layout component system to ensure consistency across all dashboard pages.

The implementation follows Next.js 15 App Router patterns, integrates seamlessly with TanStack Query for cache management, and maintains the existing design system while improving user experience through real-time updates and predictable navigation.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Next.js 15)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Dashboard Layout System                  │  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │  │
│  │  │  Sidebar   │  │   Navbar   │  │   Content    │  │  │
│  │  │ Navigation │  │  Actions   │  │     Area     │  │  │
│  │  └────────────┘  └────────────┘  └──────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           WebSocket Connection Layer                  │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │  Socket.IO Client (useWebSocket hook)         │  │  │
│  │  │  - Connection management                       │  │  │
│  │  │  - Event handlers                              │  │  │
│  │  │  - Reconnection logic                          │  │  │
│  │  │  - Message queueing                            │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         TanStack Query Integration                    │  │
│  │  - Cache updates from WebSocket events               │  │
│  │  - Optimistic updates                                 │  │
│  │  - Query invalidation                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Socket.IO Protocol
                            │ (WebSocket + fallbacks)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Server (NestJS Backend)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            WebSocket Gateway                          │  │
│  │  - Socket.IO server                                   │  │
│  │  - Room management (conversation rooms)              │  │
│  │  - Authentication middleware                          │  │
│  │  - Event broadcasting                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Conversation Service                          │  │
│  │  - Message processing                                 │  │
│  │  - AI response generation                             │  │
│  │  - WebSocket event emission                           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
App
├── Providers
│   ├── QueryClientProvider (TanStack Query)
│   ├── WebSocketProvider (Connection context)
│   └── AuthProvider (Authentication)
│
└── Dashboard Routes
    ├── DashboardLayout (Reusable shell)
    │   ├── Sidebar
    │   │   ├── Logo
    │   │   ├── Navigation Items
    │   │   └── Collapse Toggle
    │   │
    │   ├── Navbar
    │   │   ├── Mobile Menu Button
    │   │   ├── Page Title
    │   │   ├── Search Button
    │   │   ├── New Conversation Button (Dialog trigger)
    │   │   └── User Menu
    │   │
    │   └── Content Area
    │       └── {children} (Page-specific content)
    │
    ├── /dashboard (Overview)
    ├── /dashboard/conversations (List)
    │   └── ConversationList
    │       ├── Filters
    │       ├── ConversationCard (multiple)
    │       └── Infinite Scroll Trigger
    │
    ├── /dashboard/conversations/[id] (Detail with real-time)
    │   ├── ConversationHeader
    │   │   └── ConnectionStatus (WebSocket indicator)
    │   ├── MessageList
    │   │   ├── Message (multiple)
    │   │   ├── TypingIndicator
    │   │   └── LoadOlderButton
    │   └── MessageInput
    │
    └── /dashboard/* (Coming Soon pages)
        └── ComingSoon component
```

## Components and Interfaces

### 1. WebSocket Integration

#### useWebSocket Hook

```typescript
// lib/hooks/use-websocket.ts

interface UseWebSocketOptions {
  /** Conversation ID to join */
  conversationId?: string;
  /** Callback when message is received */
  onMessage?: (message: Message) => void;
  /** Callback when connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void;
  /** Enable automatic reconnection */
  autoReconnect?: boolean;
}

interface UseWebSocketReturn {
  /** Current connection status */
  status: ConnectionStatus;
  /** Send a message */
  sendMessage: (content: string) => Promise<void>;
  /** Manually reconnect */
  reconnect: () => void;
  /** Disconnect */
  disconnect: () => void;
  /** Whether currently connected */
  isConnected: boolean;
  /** Queued messages pending send */
  queuedMessages: QueuedMessage[];
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

interface QueuedMessage {
  id: string;
  content: string;
  timestamp: number;
  retries: number;
}

/**
 * Custom hook for WebSocket connection to conversation rooms
 * 
 * Features:
 * - Automatic connection on mount
 * - Automatic disconnection on unmount
 * - Exponential backoff reconnection
 * - Message queueing during disconnection
 * - TanStack Query cache integration
 */
function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn;
```

#### WebSocketProvider Context

```typescript
// lib/providers/websocket-provider.tsx

interface WebSocketContextValue {
  /** Socket.IO client instance */
  socket: Socket | null;
  /** Global connection status */
  status: ConnectionStatus;
  /** Join a conversation room */
  joinConversation: (conversationId: string) => void;
  /** Leave a conversation room */
  leaveConversation: (conversationId: string) => void;
  /** Manually reconnect */
  reconnect: () => void;
}

/**
 * WebSocket provider component
 * 
 * Manages global Socket.IO connection and provides context
 * to child components. Handles authentication, reconnection,
 * and event routing.
 */
function WebSocketProvider({ children }: { children: ReactNode }): JSX.Element;
```

#### WebSocket Event Types

```typescript
// types/websocket.types.ts

/** Client -> Server events */
interface ClientToServerEvents {
  /** Join a conversation room */
  'conversation:join': (conversationId: string) => void;
  /** Leave a conversation room */
  'conversation:leave': (conversationId: string) => void;
  /** Send a message */
  'message:send': (data: { conversationId: string; content: string }) => void;
  /** User is typing */
  'typing:start': (conversationId: string) => void;
  /** User stopped typing */
  'typing:stop': (conversationId: string) => void;
}

/** Server -> Client events */
interface ServerToClientEvents {
  /** New message received */
  'message:new': (message: Message) => void;
  /** Message processing started */
  'message:processing': (data: { messageId: string; jobId: string }) => void;
  /** Message processing completed */
  'message:complete': (data: { messageId: string; response: Message }) => void;
  /** Message processing failed */
  'message:error': (data: { messageId: string; error: string }) => void;
  /** Another user is typing */
  'typing:user': (data: { userId: string; conversationId: string }) => void;
  /** Connection error */
  'error': (error: { code: string; message: string }) => void;
}
```

### 2. Layout Components

#### DashboardLayout Component

```typescript
// components/layouts/dashboard-layout.tsx

interface DashboardLayoutProps {
  /** Page content */
  children: ReactNode;
  /** Page title displayed in navbar */
  title?: string;
  /** Additional actions for navbar */
  actions?: ReactNode;
  /** Whether to show the sidebar */
  showSidebar?: boolean;
  /** Custom className for content area */
  contentClassName?: string;
}

/**
 * Reusable dashboard layout component
 * 
 * Provides consistent structure with sidebar, navbar, and content area.
 * Handles mobile responsiveness, sidebar collapse state, and keyboard shortcuts.
 * 
 * Features:
 * - Responsive sidebar (drawer on mobile, fixed on desktop)
 * - Collapsible sidebar on desktop
 * - Navbar with page title and actions
 * - Keyboard shortcut integration
 * - Consistent spacing and styling
 */
function DashboardLayout(props: DashboardLayoutProps): JSX.Element;
```

#### ComingSoon Component

```typescript
// components/coming-soon.tsx

interface ComingSoonProps {
  /** Feature name */
  feature: string;
  /** Feature description */
  description: string;
  /** Expected release timeline (optional) */
  timeline?: string;
  /** Icon to display */
  icon?: ReactNode;
  /** Custom className */
  className?: string;
}

/**
 * Coming soon placeholder component
 * 
 * Displays informative message for features under development.
 * Includes feature name, description, timeline, and navigation back to dashboard.
 */
function ComingSoon(props: ComingSoonProps): JSX.Element;
```

#### DashboardLayoutSkeleton Component

```typescript
// components/layouts/dashboard-layout-skeleton.tsx

interface DashboardLayoutSkeletonProps {
  /** Custom skeleton content for the main area */
  children?: ReactNode;
  /** Whether to show sidebar skeleton */
  showSidebar?: boolean;
  /** Custom className for content area */
  contentClassName?: string;
}

/**
 * Reusable loading skeleton for dashboard pages
 * 
 * Provides consistent loading state matching DashboardLayout structure.
 * Includes skeleton sidebar, navbar, and customizable content area.
 * 
 * Features:
 * - Matches DashboardLayout structure exactly
 * - Responsive skeleton (mobile and desktop)
 * - Customizable content area skeleton
 * - Consistent with design system
 */
function DashboardLayoutSkeleton(props: DashboardLayoutSkeletonProps): JSX.Element;
```

#### ConnectionStatus Component

```typescript
// components/conversations/connection-status.tsx

interface ConnectionStatusProps {
  /** Current connection status */
  status: ConnectionStatus;
  /** Custom className */
  className?: string;
  /** Show detailed tooltip */
  showTooltip?: boolean;
}

/**
 * WebSocket connection status indicator
 * 
 * Displays colored dot with status label and optional tooltip.
 * Colors: green (connected), yellow (reconnecting), red (disconnected)
 */
function ConnectionStatus(props: ConnectionStatusProps): JSX.Element;
```

### 3. Updated Conversation Components

#### ConversationDetail with Real-time

```typescript
// components/conversations/conversation-detail.tsx

interface ConversationDetailProps {
  conversationId: string;
}

/**
 * Conversation detail view with real-time messaging
 * 
 * Features:
 * - WebSocket connection for real-time updates
 * - Typing indicators
 * - Connection status display
 * - Optimistic message sending
 * - Automatic scroll to new messages
 * - Message queueing during disconnection
 */
function ConversationDetail(props: ConversationDetailProps): JSX.Element;
```

#### MessageInput with Queue Support

```typescript
// components/conversations/message-input.tsx

interface MessageInputProps {
  conversationId: string;
  /** Whether WebSocket is connected */
  isConnected: boolean;
  /** Queued messages */
  queuedMessages: QueuedMessage[];
  /** Callback when message is sent */
  onSend: (content: string) => Promise<void>;
}

/**
 * Message input component with queue support
 * 
 * Features:
 * - Disabled when offline
 * - Shows queued messages
 * - Retry failed messages
 * - Keyboard shortcuts (Enter to send, Shift+Enter for newline)
 * - Character count
 * - Auto-resize textarea
 */
function MessageInput(props: MessageInputProps): JSX.Element;
```

### 4. Dialog Components

#### CreateConversationDialog (Updated)

```typescript
// components/conversations/create-conversation-dialog.tsx

interface CreateConversationDialogProps {
  /** Whether dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when conversation is created */
  onSuccess: (conversation: Conversation) => void;
}

/**
 * Create conversation dialog
 * 
 * Triggered from navbar "New Conversation" button.
 * Available on all dashboard pages.
 */
function CreateConversationDialog(props: CreateConversationDialogProps): JSX.Element;
```

## Data Models

### WebSocket Message Models

```typescript
// types/websocket.types.ts

interface WebSocketMessage {
  /** Message ID */
  id: string;
  /** Conversation ID */
  conversationId: string;
  /** Message content */
  content: string;
  /** Message role (user or assistant) */
  role: 'user' | 'assistant';
  /** Timestamp */
  timestamp: string;
  /** Sequence number for ordering */
  sequence: number;
}

interface TypingEvent {
  /** User ID who is typing */
  userId: string;
  /** Conversation ID */
  conversationId: string;
  /** Timestamp */
  timestamp: string;
}

interface MessageProcessingEvent {
  /** Message ID being processed */
  messageId: string;
  /** Job ID for tracking */
  jobId: string;
  /** Current status */
  status: 'queued' | 'processing' | 'complete' | 'failed';
  /** Position in queue (if queued) */
  position?: number;
  /** Error message (if failed) */
  error?: string;
}
```

### Layout State Models

```typescript
// types/layout.types.ts

interface LayoutState {
  /** Whether sidebar is collapsed */
  sidebarCollapsed: boolean;
  /** Whether mobile menu is open */
  mobileMenuOpen: boolean;
  /** Current page title */
  pageTitle: string;
}

interface NavbarAction {
  /** Action label */
  label: string;
  /** Action icon */
  icon: ReactNode;
  /** Click handler */
  onClick: () => void;
  /** Keyboard shortcut */
  shortcut?: string;
  /** Whether action is disabled */
  disabled?: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: WebSocket message ordering preservation

*For any* sequence of messages sent via WebSocket, the messages should appear in the UI in the same order they were sent, based on their sequence numbers.

**Validates: Requirements 1.3, 18.2**

### Property 2: Connection state consistency

*For any* WebSocket connection state transition, the UI connection indicator should reflect the current state accurately without lag or incorrect states.

**Validates: Requirements 12.1, 12.2, 12.3**

### Property 3: Message queue integrity

*For any* message added to the queue during disconnection, the message should be sent exactly once when connection is restored, preserving order.

**Validates: Requirements 16.1, 16.2, 18.3**

### Property 4: Cache synchronization

*For any* message received via WebSocket, the TanStack Query cache should be updated to include the new message, and all components using that query should re-render.

**Validates: Requirements 11.1, 11.2, 11.3**

### Property 5: Layout consistency

*For any* dashboard page, the layout should include sidebar, navbar, and content area in the same positions with the same behavior.

**Validates: Requirements 6.1, 6.2, 6.3, 13.4**

### Property 6: Dialog state isolation

*For any* dialog opened from the navbar, closing the dialog should return the user to the same page they were on, without navigation.

**Validates: Requirements 3.4, 5.4**

### Property 7: Reconnection exponential backoff

*For any* sequence of failed reconnection attempts, the delay between attempts should increase exponentially up to a maximum threshold.

**Validates: Requirements 1.4, 10.3**

### Property 8: Keyboard shortcut consistency

*For any* dashboard page, pressing Cmd/Ctrl+N should open the new conversation dialog regardless of which page is active.

**Validates: Requirements 14.1, 14.2**

### Property 9: Coming soon page completeness

*For any* incomplete feature route, navigating to that route should display a coming soon page with feature name, description, and back button.

**Validates: Requirements 8.1-8.9**

### Property 10: Optimistic update rollback

*For any* optimistic message update that fails, the message should be removed from the UI and the cache should be reverted to its previous state.

**Validates: Requirements 16.3, 16.4**

### Property 11: Loading skeleton structure consistency

*For any* dashboard page loading state, the skeleton structure should match the final rendered layout structure exactly.

**Validates: Requirements 19.2, 19.4**

## Error Handling

### WebSocket Errors

1. **Connection Failure**
   - Display: "Unable to connect to real-time messaging. Retrying..."
   - Action: Automatic reconnection with exponential backoff
   - Fallback: Polling for new messages every 5 seconds

2. **Authentication Error**
   - Display: "Session expired. Please sign in again."
   - Action: Redirect to login page
   - Preserve: Current page URL for redirect after login

3. **Message Send Failure**
   - Display: "Failed to send message. Retry?"
   - Action: Add to queue with retry button
   - Limit: 3 automatic retries, then manual retry only

4. **Room Join Failure**
   - Display: "Unable to join conversation. Please refresh."
   - Action: Retry joining room
   - Fallback: Disable real-time, use polling

### Layout Errors

1. **Missing Layout Props**
   - Default: Use empty string for title, no actions
   - Log: Warning in development mode
   - Render: Layout with default values

2. **Navigation Error**
   - Display: "Page not found" or Coming Soon page
   - Action: Provide back button to dashboard
   - Log: Navigation attempt for analytics

## Testing Strategy

### Unit Tests

1. **WebSocket Hook Tests**
   - Test connection establishment
   - Test message sending
   - Test disconnection handling
   - Test queue management
   - Test reconnection logic

2. **Layout Component Tests**
   - Test sidebar collapse/expand
   - Test mobile menu open/close
   - Test navbar action rendering
   - Test keyboard shortcut handling
   - Test responsive behavior

3. **Dialog Component Tests**
   - Test dialog open/close
   - Test form submission
   - Test navigation after success
   - Test escape key handling

4. **Coming Soon Component Tests**
   - Test feature name display
   - Test description rendering
   - Test back button navigation

### Property-Based Tests

1. **Message Ordering Property**
   - Generate: Random sequences of messages with sequence numbers
   - Verify: Messages appear in UI sorted by sequence number
   - Edge cases: Out-of-order arrival, duplicate sequence numbers

2. **Connection State Property**
   - Generate: Random sequences of connection state changes
   - Verify: UI always reflects current state
   - Edge cases: Rapid state changes, concurrent updates

3. **Message Queue Property**
   - Generate: Random messages during disconnection
   - Verify: All messages sent exactly once after reconnection
   - Edge cases: Connection restored mid-queue, queue overflow

4. **Cache Synchronization Property**
   - Generate: Random WebSocket messages
   - Verify: Cache contains all received messages
   - Edge cases: Concurrent cache updates, stale data

5. **Layout Consistency Property**
   - Generate: Random navigation between dashboard pages
   - Verify: Layout structure remains consistent
   - Edge cases: Rapid navigation, browser back/forward

### Integration Tests

1. **End-to-End Real-time Messaging**
   - Scenario: User sends message, receives AI response via WebSocket
   - Verify: Message appears immediately, AI response updates in real-time
   - Mock: Socket.IO server with simulated AI responses

2. **Reconnection Flow**
   - Scenario: Connection lost, user sends message, connection restored
   - Verify: Message queued, sent after reconnection, appears in UI
   - Mock: Socket.IO server with controlled disconnections

3. **Layout Navigation**
   - Scenario: User navigates between dashboard pages
   - Verify: Layout persists, content updates, sidebar state maintained
   - Mock: None (pure frontend test)

4. **Dialog Workflow**
   - Scenario: User opens dialog from navbar, creates conversation
   - Verify: Dialog opens, form submits, navigation occurs, dialog closes
   - Mock: API responses for conversation creation

## Implementation Notes

### WebSocket Library Choice

**Socket.IO** is chosen over native WebSocket for the following reasons:

1. **Automatic Reconnection**: Built-in exponential backoff reconnection
2. **Fallback Mechanisms**: Automatically falls back to long-polling if WebSocket unavailable
3. **Room Support**: Native support for conversation rooms
4. **Event-based API**: Clean event emitter pattern
5. **TypeScript Support**: Excellent type definitions
6. **Browser Compatibility**: Works in all modern browsers and IE11+

### TanStack Query Integration

WebSocket events will update TanStack Query cache using `queryClient.setQueryData`:

```typescript
socket.on('message:new', (message) => {
  // Update conversation detail cache
  queryClient.setQueryData(
    conversationKeys.detail(message.conversationId),
    (old) => {
      if (!old) return old;
      return {
        ...old,
        messages: [...old.messages, message],
      };
    }
  );

  // Update conversation list cache (last message)
  queryClient.setQueryData(
    conversationKeys.lists(),
    (old) => {
      if (!old) return old;
      return old.map((conv) =>
        conv.id === message.conversationId
          ? { ...conv, lastMessage: message }
          : conv
      );
    }
  );
});
```

### Layout State Management

Layout state (sidebar collapsed, mobile menu open) will be managed with React Context to avoid prop drilling:

```typescript
const LayoutContext = createContext<LayoutContextValue>(null);

function DashboardLayout({ children }) {
  const [state, setState] = useState<LayoutState>({
    sidebarCollapsed: false,
    mobileMenuOpen: false,
    pageTitle: '',
  });

  return (
    <LayoutContext.Provider value={{ state, setState }}>
      {/* Layout structure */}
    </LayoutContext.Provider>
  );
}
```

### File Structure Changes

```
packages/mukti-web/src/
├── components/
│   ├── layouts/
│   │   ├── dashboard-layout.tsx (NEW)
│   │   ├── dashboard-layout-skeleton.tsx (NEW)
│   │   └── index.ts
│   ├── coming-soon.tsx (NEW)
│   ├── conversations/
│   │   ├── connection-status.tsx (NEW)
│   │   ├── conversation-detail.tsx (UPDATED - add WebSocket)
│   │   ├── message-input.tsx (UPDATED - add queue support)
│   │   └── ...
│   └── ...
├── lib/
│   ├── hooks/
│   │   ├── use-websocket.ts (NEW)
│   │   └── ...
│   ├── providers/
│   │   ├── websocket-provider.tsx (NEW)
│   │   └── ...
│   └── ...
├── types/
│   ├── websocket.types.ts (NEW)
│   ├── layout.types.ts (NEW)
│   └── ...
└── app/
    └── dashboard/
        ├── page.tsx (UPDATED - use DashboardLayout)
        ├── loading.tsx (UPDATED - use DashboardLayoutSkeleton)
        ├── conversations/
        │   ├── page.tsx (UPDATED - use DashboardLayout, remove duplicate button)
        │   ├── loading.tsx (UPDATED - use DashboardLayoutSkeleton)
        │   ├── [id]/
        │   │   ├── page.tsx (UPDATED - use DashboardLayout, add WebSocket)
        │   │   └── loading.tsx (UPDATED - use DashboardLayoutSkeleton)
        │   └── new/ (DELETE entire folder - page.tsx, loading.tsx, error.tsx)
        ├── community/
        │   └── page.tsx (NEW - Coming Soon)
        ├── resources/
        │   └── page.tsx (NEW - Coming Soon)
        ├── sessions/
        │   └── page.tsx (MOVED from /dashboard/sessions, Coming Soon for inquiry sessions)
        ├── security/
        │   └── page.tsx (NEW - moved auth sessions management here)
        ├── messages/
        │   └── page.tsx (NEW - Coming Soon)
        ├── reports/
        │   └── page.tsx (NEW - Coming Soon)
        ├── settings/
        │   └── page.tsx (NEW - Coming Soon)
        └── help/
            └── page.tsx (NEW - Coming Soon)
```

### Backend Requirements

The backend (mukti-api) will need to implement:

1. **WebSocket Gateway** (NestJS @nestjs/websockets)
   - Socket.IO server configuration
   - JWT authentication middleware
   - Room management for conversations
   - Event handlers for message:send, typing:start, typing:stop

2. **Event Emission in Conversation Service**
   - Emit message:new when AI response is generated
   - Emit message:processing when job is queued
   - Emit message:complete when processing finishes
   - Emit message:error on processing failure

3. **Room Authorization**
   - Verify user has access to conversation before joining room
   - Disconnect unauthorized users
   - Log security events

## Performance Considerations

1. **WebSocket Connection Pooling**: Reuse single Socket.IO connection for all conversations
2. **Message Batching**: Batch multiple cache updates into single re-render
3. **Lazy Loading**: Load WebSocket provider only on dashboard pages
4. **Memory Management**: Clean up event listeners on component unmount
5. **Throttling**: Throttle typing indicators to max 1 event per 2 seconds

## Security Considerations

1. **Authentication**: Include JWT token in Socket.IO handshake
2. **Authorization**: Verify user access to conversation room on join
3. **Rate Limiting**: Limit message send rate per user (10 messages/minute)
4. **Input Validation**: Validate all WebSocket event payloads
5. **XSS Prevention**: Sanitize message content before rendering

## Accessibility Considerations

1. **Screen Reader Announcements**: Announce new messages via aria-live regions
2. **Keyboard Navigation**: Ensure all dialogs and menus are keyboard accessible
3. **Focus Management**: Trap focus in dialogs, restore focus on close
4. **Connection Status**: Provide text alternative for connection indicator
5. **Error Messages**: Ensure error messages are announced to screen readers

## Migration Strategy

1. **Phase 1**: Implement DashboardLayout and DashboardLayoutSkeleton components
2. **Phase 2**: Migrate existing pages to use new layout components
3. **Phase 3**: Reorganize sessions routes and create Coming Soon pages
4. **Phase 4**: Remove duplicate conversation creation UI and redundant files
5. **Phase 5**: Implement WebSocket provider and connection management
6. **Phase 6**: Add real-time messaging to conversation detail
7. **Phase 7**: Add typing indicators and connection status
8. **Phase 8**: Implement message queueing and retry logic
9. **Phase 9**: Testing and refinement

Each phase can be deployed independently, allowing for incremental rollout and testing.

## Files to Delete

The following files should be completely removed as part of this implementation:

1. **Entire /dashboard/conversations/new/ folder:**
   - `packages/mukti-web/src/app/dashboard/conversations/new/page.tsx`
   - `packages/mukti-web/src/app/dashboard/conversations/new/loading.tsx`
   - `packages/mukti-web/src/app/dashboard/conversations/new/error.tsx`

2. **Inline skeleton code:**
   - Remove `DashboardSkeleton` function from `packages/mukti-web/src/app/dashboard/page.tsx`

3. **Duplicate layout code:**
   - All sidebar/navbar rendering code from individual page components (will be replaced by DashboardLayout)

## Files to Move/Rename

1. **Sessions route reorganization:**
   - Move `packages/mukti-web/src/app/dashboard/sessions/page.tsx` → `packages/mukti-web/src/app/dashboard/security/page.tsx`
   - Create new `packages/mukti-web/src/app/dashboard/sessions/page.tsx` with Coming Soon component
