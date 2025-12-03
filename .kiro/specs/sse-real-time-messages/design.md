# Design Document

## Overview

This design implements Server-Sent Events (SSE) to enable real-time message delivery in the Mukti conversation system. The solution addresses the current limitation where users must manually reload the page to see AI responses after sending messages.

The implementation consists of three main components:
1. **Backend SSE Endpoint**: A NestJS controller endpoint that establishes and maintains SSE connections
2. **Event Emission System**: Integration with the BullMQ queue service to emit events when messages are processed
3. **Frontend SSE Client**: A React hook that manages SSE connections and updates the UI in real-time

The design follows NestJS best practices for SSE implementation and integrates seamlessly with the existing queue-based message processing architecture.

## Architecture

### High-Level Flow

```
User sends message
    ↓
Frontend: POST /conversations/:id/messages (returns 202 + jobId)
    ↓
Frontend: Establishes SSE connection to /conversations/:id/stream
    ↓
Backend: Queue processes message
    ↓
Backend: Emits events through SSE stream
    ↓
Frontend: Receives events and updates UI in real-time
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  useConversationStream Hook                          │  │
│  │  - Manages SSE connection                            │  │
│  │  - Handles reconnection logic                        │  │
│  │  - Updates TanStack Query cache                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↕ SSE Connection
┌─────────────────────────────────────────────────────────────┐
│                        Backend                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ConversationController                              │  │
│  │  - GET /conversations/:id/stream                     │  │
│  │  - Establishes SSE connection                        │  │
│  │  - Sends events to client                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↕                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  StreamService                                       │  │
│  │  - Manages active SSE connections                    │  │
│  │  - Emits events to specific conversations           │  │
│  │  - Handles connection cleanup                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                            ↕                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  QueueService (Enhanced)                             │  │
│  │  - Processes messages                                │  │
│  │  - Emits events via StreamService                    │  │
│  │  - Sends progress updates                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## UI/UX Design Specifications

### Loading States

The system will implement multiple loading states to provide clear feedback during message processing:

#### 1. Initial Loading State (0-1 seconds)
- Display a message bubble with AI avatar
- Show animated dots (three dots that pulse in sequence)
- Text: "AI is thinking..."
- Subtle fade-in animation (200ms)

#### 2. Processing State (1-5 seconds)
- Continue showing animated dots
- Update text: "Generating response..."
- Add subtle pulsing effect to the message bubble border

#### 3. Extended Processing State (5+ seconds)
- Update text: "Still working on it..."
- Show queue position if available: "You're #2 in queue"
- Add progress indicator or estimated time if available

#### 4. Response Arrival
- Smooth transition from loading state to actual message (300ms fade)
- Brief highlight effect on new message (subtle glow that fades over 1 second)
- Auto-scroll to new message if user is at bottom

### Visual Design Elements

#### Loading Message Bubble
```
┌─────────────────────────────────────┐
│  [AI Avatar]  AI is thinking...     │
│               ● ● ●                 │
│               (animated dots)        │
└─────────────────────────────────────┘
```

**Styling:**
- Background: Slightly different shade from regular messages (e.g., `bg-muted/50`)
- Border: Subtle animated border or glow effect
- Padding: Same as regular messages for consistency
- Border radius: Matches message bubble design
- Animation: Pulsing opacity on dots (0.3s interval per dot)

#### Typing Indicator Animation
```typescript
// Three dots that pulse in sequence
const TypingIndicator = () => (
  <div className="flex gap-1">
    <span className="animate-pulse-dot delay-0">●</span>
    <span className="animate-pulse-dot delay-100">●</span>
    <span className="animate-pulse-dot delay-200">●</span>
  </div>
);
```

#### Status Text Progression
1. **0-1s**: "AI is thinking..."
2. **1-5s**: "Generating response..."
3. **5-10s**: "Still working on it..."
4. **10s+**: "This is taking longer than usual. Your response will arrive shortly."

### Animation Specifications

#### Fade-In Animation
```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

#### Pulse Animation (for dots)
```css
@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}
```

#### Shimmer Animation (for skeleton loader)
```css
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
```

#### Highlight Animation (for new message)
```css
@keyframes highlight {
  0% { box-shadow: 0 0 0 0 rgba(var(--primary), 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(var(--primary), 0.1); }
  100% { box-shadow: 0 0 0 0 rgba(var(--primary), 0); }
}
```

### Accessibility Considerations

1. **Screen Readers**
   - Announce "AI is generating a response" when loading starts
   - Announce "Response received" when message arrives
   - Use `aria-live="polite"` for status updates

2. **Reduced Motion**
   - Respect `prefers-reduced-motion` media query
   - Disable animations for users who prefer reduced motion
   - Use simple opacity changes instead of complex animations

3. **Keyboard Navigation**
   - Ensure loading states don't interfere with keyboard navigation
   - Maintain focus management during state transitions

### Component Hierarchy

```
ConversationDetail
  └── MessageList
      ├── Message (existing messages)
      ├── LoadingMessage (when processing)
      │   ├── Avatar
      │   ├── StatusText
      │   └── TypingIndicator
      └── Message (new AI response)
```

## Components and Interfaces

### Backend Components

#### 1. StreamService

A new service that manages SSE connections and event emission.

```typescript
interface StreamConnection {
  conversationId: string;
  userId: string;
  response: Response;
  controller: ReadableStreamDefaultController;
}

class StreamService {
  // Store active connections
  private connections: Map<string, StreamConnection[]>;
  
  // Add a new SSE connection
  addConnection(conversationId: string, userId: string, response: Response, controller: ReadableStreamDefaultController): void;
  
  // Remove a connection when client disconnects
  removeConnection(conversationId: string, userId: string): void;
  
  // Emit event to all connections for a conversation
  emitToConversation(conversationId: string, event: StreamEvent): void;
  
  // Emit event to specific user's connection
  emitToUser(conversationId: string, userId: string, event: StreamEvent): void;
  
  // Clean up all connections for a conversation
  cleanupConversation(conversationId: string): void;
}
```

#### 2. Enhanced ConversationController

Add a new SSE endpoint to the existing controller.

```typescript
@Controller('conversations')
export class ConversationController {
  // Existing methods...
  
  /**
   * Establishes SSE connection for real-time conversation updates
   * 
   * @param id - Conversation ID
   * @param req - Request with authenticated user
   * @returns SSE stream
   */
  @Get(':id/stream')
  @Sse()
  async streamConversation(
    @Param('id') id: string,
    @Request() req: any
  ): Promise<Observable<MessageEvent>> {
    // Validate conversation ownership
    // Establish SSE connection
    // Return observable stream
  }
}
```

#### 3. Enhanced QueueService

Modify the existing queue service to emit events through StreamService.

```typescript
@Processor('conversation-requests')
export class QueueService extends WorkerHost {
  constructor(
    // Existing dependencies...
    private readonly streamService: StreamService,
  ) {}
  
  async process(job: Job<ConversationRequestJobData>): Promise<ConversationRequestJobResult> {
    const { conversationId, userId } = job.data;
    
    try {
      // Emit processing started event
      this.streamService.emitToConversation(conversationId, {
        type: 'processing',
        data: { jobId: job.id, status: 'started' }
      });
      
      // Existing processing logic...
      
      // Emit message received event
      this.streamService.emitToConversation(conversationId, {
        type: 'message',
        data: { role: 'assistant', content: response.content, timestamp: new Date() }
      });
      
      // Emit completion event
      this.streamService.emitToConversation(conversationId, {
        type: 'complete',
        data: { jobId: job.id, tokens: response.totalTokens, cost: response.cost }
      });
      
      return result;
    } catch (error) {
      // Emit error event
      this.streamService.emitToConversation(conversationId, {
        type: 'error',
        data: { message: error.message, retriable: true }
      });
      throw error;
    }
  }
}
```

### Frontend Components

#### 1. useConversationStream Hook

A custom React hook that manages SSE connections.

```typescript
interface StreamEvent {
  type: 'processing' | 'message' | 'complete' | 'error' | 'progress';
  data: any;
}

interface UseConversationStreamOptions {
  conversationId: string;
  enabled?: boolean;
  onMessage?: (event: StreamEvent) => void;
  onError?: (error: Error) => void;
}

function useConversationStream(options: UseConversationStreamOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!options.enabled) return;
    
    // Establish SSE connection
    const eventSource = new EventSource(
      `${API_URL}/conversations/${options.conversationId}/stream`,
      { withCredentials: true }
    );
    
    // Handle connection open
    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };
    
    // Handle messages
    eventSource.addEventListener('message', (e) => {
      const event: StreamEvent = JSON.parse(e.data);
      
      // Update TanStack Query cache
      if (event.type === 'message') {
        queryClient.setQueryData(
          conversationKeys.detail(options.conversationId),
          (old) => {
            // Add new message to conversation
          }
        );
      }
      
      // Call custom handler
      options.onMessage?.(event);
    });
    
    // Handle errors
    eventSource.onerror = (error) => {
      setIsConnected(false);
      setError(new Error('SSE connection failed'));
      options.onError?.(error);
      
      // Attempt reconnection with exponential backoff
    };
    
    eventSourceRef.current = eventSource;
    
    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, [options.conversationId, options.enabled]);
  
  return { isConnected, error };
}
```

#### 2. Enhanced ConversationDetail Component

Integrate the SSE hook into the existing component.

```typescript
export function ConversationDetail({ conversationId }: ConversationDetailProps) {
  const { data: conversation } = useConversation(conversationId);
  const [processingState, setProcessingState] = useState<{
    isProcessing: boolean;
    status: string;
    queuePosition?: number;
  }>({
    isProcessing: false,
    status: '',
  });
  
  // Establish SSE connection
  const { isConnected } = useConversationStream({
    conversationId,
    enabled: true,
    onMessage: (event) => {
      if (event.type === 'processing') {
        setProcessingState({
          isProcessing: true,
          status: 'AI is thinking...',
          queuePosition: event.data.position,
        });
      } else if (event.type === 'generating') {
        setProcessingState({
          isProcessing: true,
          status: 'Generating response...',
        });
      } else if (event.type === 'complete') {
        setProcessingState({
          isProcessing: false,
          status: '',
        });
      }
    },
    onError: (error) => {
      console.error('Stream error:', error);
    }
  });
  
  // Existing component logic...
}
```

#### 3. LoadingMessage Component

A new component to display the loading state during message processing.

```typescript
interface LoadingMessageProps {
  status: string;
  queuePosition?: number;
  duration?: number; // Time elapsed in seconds
}

export function LoadingMessage({ status, queuePosition, duration = 0 }: LoadingMessageProps) {
  // Update status text based on duration
  const displayStatus = useMemo(() => {
    if (duration > 10) {
      return 'This is taking longer than usual. Your response will arrive shortly.';
    }
    if (duration > 5) {
      return queuePosition 
        ? `Still working on it... You're #${queuePosition} in queue`
        : 'Still working on it...';
    }
    return status;
  }, [status, queuePosition, duration]);
  
  return (
    <div 
      className="flex items-start gap-3 animate-fade-in"
      role="status"
      aria-live="polite"
      aria-label="AI is generating a response"
    >
      {/* AI Avatar with pulse animation */}
      <div className="relative">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
      </div>
      
      {/* Loading message bubble */}
      <div className="flex-1 max-w-[80%]">
        <div className="rounded-lg bg-muted/50 border border-muted px-4 py-3 animate-pulse-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{displayStatus}</span>
            <TypingIndicator />
          </div>
        </div>
      </div>
    </div>
  );
}

// Typing indicator with animated dots
function TypingIndicator() {
  return (
    <div className="flex gap-1" aria-hidden="true">
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" style={{ animationDelay: '0ms' }} />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" style={{ animationDelay: '150ms' }} />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot" style={{ animationDelay: '300ms' }} />
    </div>
  );
}
```

## Data Models

### Stream Event Types

```typescript
// Base event structure
interface BaseStreamEvent {
  type: string;
  timestamp: string;
  conversationId: string;
}

// Processing started
interface ProcessingEvent extends BaseStreamEvent {
  type: 'processing';
  data: {
    jobId: string;
    status: 'started';
  };
}

// New message received
interface MessageEvent extends BaseStreamEvent {
  type: 'message';
  data: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    sequence: number;
    tokens?: number;
  };
}

// Processing complete
interface CompleteEvent extends BaseStreamEvent {
  type: 'complete';
  data: {
    jobId: string;
    tokens: number;
    cost: number;
    latency: number;
  };
}

// Error occurred
interface ErrorEvent extends BaseStreamEvent {
  type: 'error';
  data: {
    code: string;
    message: string;
    retriable: boolean;
  };
}

// Progress update
interface ProgressEvent extends BaseStreamEvent {
  type: 'progress';
  data: {
    jobId: string;
    status: string;
    position?: number;
  };
}

type StreamEvent = ProcessingEvent | MessageEvent | CompleteEvent | ErrorEvent | ProgressEvent;
```

### SSE Message Format

SSE messages follow the standard format:

```
event: message
data: {"type":"message","data":{"role":"assistant","content":"What do you mean by...?"},"timestamp":"2024-01-01T00:00:00Z"}

event: complete
data: {"type":"complete","data":{"jobId":"123","tokens":200,"cost":0.0004},"timestamp":"2024-01-01T00:00:01Z"}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Connection Ownership
*For any* SSE connection request, the system should only establish a connection if the requesting user owns the conversation
**Validates: Requirements 4.2**

### Property 2: Event Delivery Order
*For any* sequence of events emitted for a conversation, all connected clients should receive events in the same order they were emitted
**Validates: Requirements 5.5**

### Property 3: Connection Cleanup
*For any* SSE connection that is closed (by client or server), the system should remove the connection from the active connections map and release all associated resources
**Validates: Requirements 2.4**

### Property 4: Message Persistence
*For any* message event emitted through SSE, the message should also be persisted in the database before the event is sent
**Validates: Requirements 1.3**

### Property 5: Reconnection Idempotency
*For any* SSE reconnection attempt, re-establishing the connection should not cause duplicate message delivery or state inconsistency
**Validates: Requirements 1.5, 7.2**

### Property 6: Authentication Validation
*For any* SSE connection attempt, the system should validate the authentication token before establishing the connection
**Validates: Requirements 4.1**

### Property 7: Error Event Emission
*For any* error that occurs during message processing, the system should emit an error event through the SSE stream before throwing the error
**Validates: Requirements 7.4**

### Property 8: Auto-scroll Preservation
*For any* new message received via SSE, if the user is scrolled to the bottom, the system should auto-scroll to show the new message; otherwise, it should preserve the current scroll position
**Validates: Requirements 6.1, 6.2**

### Property 9: Multiple Connection Support
*For any* conversation, the system should support multiple concurrent SSE connections from different clients without event duplication or loss
**Validates: Requirements 2.5**

### Property 10: Stream Closure on Navigation
*For any* SSE connection, when the user navigates away from the conversation, the connection should be closed and cleaned up
**Validates: Requirements 1.4**

### Property 11: Loading State Visibility
*For any* message processing event, the LoadingMessage component should be visible in the UI until a "complete" or "error" event is received
**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 12: Status Text Progression
*For any* loading state that persists for more than 5 seconds, the status text should update to provide progressive feedback to the user
**Validates: Requirements 3.8, 9.8**

## Error Handling

### Backend Error Scenarios

1. **Connection Establishment Failures**
   - Invalid conversation ID → 404 Not Found
   - User doesn't own conversation → 403 Forbidden
   - Authentication failure → 401 Unauthorized
   - Server error → 500 Internal Server Error

2. **During Active Connection**
   - Message processing error → Emit error event, keep connection alive
   - Database error → Emit error event, attempt retry
   - OpenRouter API error → Emit error event with retry information
   - Connection timeout → Close connection, client will reconnect

3. **Connection Cleanup**
   - Client disconnect → Remove from connections map
   - Server shutdown → Close all connections gracefully
   - Memory pressure → Implement connection limits per user

### Frontend Error Scenarios

1. **Connection Failures**
   - Network error → Retry with exponential backoff (1s, 2s, 4s, 8s, max 30s)
   - 401/403 error → Redirect to login, don't retry
   - 404 error → Show "conversation not found", don't retry
   - 500 error → Retry with backoff

2. **During Active Connection**
   - Parse error → Log error, continue listening
   - Invalid event type → Log warning, ignore event
   - Connection lost → Attempt reconnection
   - Rate limit → Show banner, pause reconnection

3. **Reconnection Logic**
   ```typescript
   const MAX_RETRIES = 5;
   const BASE_DELAY = 1000;
   
   function calculateBackoff(attempt: number): number {
     return Math.min(BASE_DELAY * Math.pow(2, attempt), 30000);
   }
   ```

## Testing Strategy

### Unit Tests

1. **StreamService Tests**
   - Test adding/removing connections
   - Test event emission to specific conversations
   - Test event emission to specific users
   - Test connection cleanup
   - Test handling multiple connections per conversation

2. **QueueService Tests**
   - Test event emission during message processing
   - Test error event emission on failures
   - Test progress event emission
   - Test event ordering

3. **useConversationStream Hook Tests**
   - Test connection establishment
   - Test event handling
   - Test reconnection logic
   - Test cleanup on unmount
   - Test TanStack Query cache updates

### Property-Based Tests

1. **Property 1: Connection Ownership**
   - Generate random user IDs and conversation IDs
   - Attempt to establish SSE connections
   - Verify only owners can connect

2. **Property 2: Event Delivery Order**
   - Generate random sequences of events
   - Emit events through StreamService
   - Verify all clients receive events in same order

3. **Property 4: Message Persistence**
   - Generate random messages
   - Process through queue
   - Verify database contains message before SSE event is emitted

4. **Property 5: Reconnection Idempotency**
   - Establish connection, disconnect, reconnect
   - Verify no duplicate messages in UI
   - Verify conversation state is consistent

5. **Property 8: Auto-scroll Preservation**
   - Generate random scroll positions
   - Receive new messages
   - Verify scroll behavior matches specification

### Integration Tests

1. **End-to-End SSE Flow**
   - Send message via POST /conversations/:id/messages
   - Establish SSE connection
   - Verify events are received in correct order
   - Verify message appears in UI
   - Verify conversation is updated in database

2. **Multiple Clients**
   - Establish multiple SSE connections to same conversation
   - Send message
   - Verify all clients receive events
   - Verify no duplicate events

3. **Error Scenarios**
   - Test connection with invalid auth token
   - Test connection to non-existent conversation
   - Test connection to conversation user doesn't own
   - Test message processing error
   - Test network disconnection and reconnection

4. **Performance Tests**
   - Test with 100 concurrent SSE connections
   - Test with rapid message sending
   - Test memory usage over time
   - Test connection cleanup

## Security Considerations

1. **Authentication**
   - All SSE connections must include valid JWT token
   - Token validation on connection establishment
   - Token expiration handling

2. **Authorization**
   - Verify user owns conversation before establishing connection
   - Prevent users from subscribing to other users' conversations

3. **Rate Limiting**
   - Limit number of concurrent SSE connections per user (e.g., 5)
   - Limit reconnection attempts (exponential backoff)
   - Integrate with existing rate limit system

4. **Resource Management**
   - Set maximum connection duration (e.g., 1 hour)
   - Implement connection pooling limits
   - Monitor memory usage
   - Implement graceful degradation under load

5. **Data Validation**
   - Validate all event data before emission
   - Sanitize message content
   - Prevent XSS in streamed content

## Performance Optimization

1. **Connection Management**
   - Use Map for O(1) connection lookup
   - Implement connection pooling
   - Set reasonable keep-alive intervals (30s)

2. **Event Batching**
   - Batch multiple events if they occur rapidly
   - Reduce number of SSE messages sent
   - Improve client-side rendering performance

3. **Memory Management**
   - Implement connection limits per user
   - Clean up stale connections
   - Monitor memory usage with metrics

4. **Frontend Optimization**
   - Debounce scroll position checks
   - Use React.memo for message components
   - Implement virtual scrolling for long conversations
   - Batch TanStack Query cache updates

## Implementation Notes

### NestJS SSE Implementation

NestJS provides built-in support for SSE through the `@Sse()` decorator and RxJS observables:

```typescript
import { Controller, Sse, Param, Request } from '@nestjs/common';
import { Observable, interval } from 'rxjs';
import { map } from 'rxjs/operators';

@Controller('conversations')
export class ConversationController {
  @Sse(':id/stream')
  streamConversation(
    @Param('id') id: string,
    @Request() req: any
  ): Observable<MessageEvent> {
    // Return an observable that emits SSE events
    return this.streamService.getConversationStream(id, req.user.id);
  }
}
```

### EventSource API (Frontend)

The browser's native EventSource API handles SSE connections:

```typescript
const eventSource = new EventSource(url, {
  withCredentials: true // Include cookies for authentication
});

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  // Handle event
});

eventSource.onerror = (error) => {
  // Handle error and reconnection
};

// Cleanup
eventSource.close();
```

### Integration with Existing Code

1. **Minimal Changes to QueueService**
   - Add StreamService dependency
   - Add event emission calls at key points
   - No changes to core processing logic

2. **Minimal Changes to Frontend**
   - Add useConversationStream hook
   - Integrate hook in ConversationDetail component
   - TanStack Query cache automatically updates

3. **New Files Required**
   - Backend: `stream.service.ts`
   - Backend: `conversation.swagger.ts` (add SSE endpoint docs)
   - Frontend: `use-conversation-stream.ts`

## Migration Strategy

1. **Phase 1: Backend Implementation**
   - Implement StreamService
   - Add SSE endpoint to ConversationController
   - Integrate with QueueService
   - Add unit tests

2. **Phase 2: Frontend Implementation**
   - Implement useConversationStream hook
   - Add hook tests
   - Integrate with ConversationDetail component

3. **Phase 3: Testing & Refinement**
   - Run integration tests
   - Test with multiple concurrent users
   - Monitor performance metrics
   - Fix any issues

4. **Phase 4: Deployment**
   - Deploy backend changes
   - Deploy frontend changes
   - Monitor error rates
   - Gather user feedback

## Future Enhancements

1. **Streaming AI Responses**
   - Stream AI response token-by-token as it's generated
   - Requires OpenRouter streaming API support
   - Provides even more real-time feel

2. **Presence Indicators**
   - Show when other users are viewing the same conversation
   - Useful for collaborative features

3. **Typing Indicators**
   - Show when AI is "typing" (generating response)
   - Improve perceived responsiveness

4. **Message Reactions**
   - Real-time delivery of message reactions
   - Enhance collaborative features

5. **WebSocket Alternative**
   - Consider WebSocket for bidirectional communication
   - May be needed for future collaborative features
   - SSE is simpler for current use case
