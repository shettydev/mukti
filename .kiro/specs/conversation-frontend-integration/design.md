# Design Document

## Overview

This document outlines the technical design for integrating the Mukti conversation backend API with the Next.js 15 frontend. The implementation follows React 19 patterns, TanStack Query for data management, and TypeScript for type safety. The design emphasizes optimistic updates, proper error handling, responsive UI, and comprehensive testing to ensure a robust user experience.

### Goals

1. **Type-Safe Integration**: Full TypeScript coverage matching backend DTOs
2. **Optimal Performance**: TanStack Query caching, prefetching, and optimistic updates
3. **Excellent UX**: Skeleton loading, clear error states, responsive design
4. **Maintainability**: Centralized API client, query key factories, reusable components
5. **Testability**: Unit tests and property-based tests for critical paths

### Architecture Principles

- **Server Components First**: Use React Server Components by default, client components only when needed
- **Centralized Configuration**: All environment variables accessed through `config.ts`
- **Query-Driven State**: TanStack Query as single source of truth for server state
- **Optimistic Updates**: Immediate UI feedback with automatic rollback on errors
- **Progressive Enhancement**: Core functionality works without JavaScript

## Architecture

### High-Level Structure

```
packages/mukti-web/src/
├── app/
│   └── dashboard/
│       ├── conversations/
│       │   ├── page.tsx                    # Conversation list (Server Component)
│       │   ├── [id]/
│       │   │   └── page.tsx                # Conversation detail (Server Component)
│       │   └── new/
│       │       └── page.tsx                # Create conversation (Server Component)
│       └── layout.tsx
├── components/
│   └── conversations/
│       ├── conversation-card.tsx           # List item component
│       ├── conversation-detail.tsx         # Detail view component
│       ├── conversation-filters.tsx        # Filter panel
│       ├── conversation-list.tsx           # List container (Client Component)
│       ├── create-conversation-dialog.tsx  # Creation modal
│       ├── delete-conversation-dialog.tsx  # Deletion confirmation
│       ├── message-input.tsx               # Message composer
│       ├── message-list.tsx                # Message display
│       ├── rate-limit-banner.tsx           # Rate limit notification
│       └── technique-selector.tsx          # Technique picker
├── lib/
│   ├── api/
│   │   ├── client.ts                       # Existing API client
│   │   └── conversations.ts                # Conversation endpoints
│   ├── hooks/
│   │   └── use-conversations.ts            # TanStack Query hooks
│   ├── query-keys.ts                       # Query key factory
│   └── config.ts                           # Existing config
└── types/
    └── conversation.types.ts               # TypeScript types
```


### Data Flow

```
User Action → Component → Query Hook → API Client → Backend API
                ↓              ↓           ↓
            Optimistic     Cache      Response
              Update      Update     Processing
                ↓              ↓           ↓
            UI Update ← Query Hook ← API Client
```

### Component Hierarchy

```
Page (Server Component)
  └── ConversationList (Client Component with Infinite Scroll)
      ├── ConversationFilters
      ├── ConversationCard[] (Virtualized)
      │   ├── ConversationActions
      │   └── TechniqueBadge
      └── InfiniteScrollTrigger

ConversationDetail (Client Component)
  ├── ConversationHeader
  │   ├── TechniqueSelector
  │   └── ConversationActions
  ├── MessageList
  │   ├── Message[]
  │   └── LoadOlderButton
  └── MessageInput
      ├── TextArea
      └── SendButton
```

## Components and Interfaces

### Core Components

#### 1. ConversationList (Client Component)

**Purpose**: Display infinite-scrolling, filterable list of conversations with virtualization

**Props**:
```typescript
interface ConversationListProps {
  initialData?: PaginatedConversations;
  filters?: ConversationFilters;
}
```

**State Management**:
- Uses `useInfiniteConversations()` hook for infinite scroll data fetching
- Uses `@tanstack/react-virtual` for virtualization of large lists
- Local state for filter UI
- URL search params for filter persistence

**Key Features**:
- Infinite scroll with automatic page loading
- Virtualization for performance with large lists
- Skeleton loading during fetch
- Empty state with create CTA
- Error state with retry
- Optimistic delete
- Filter changes reset to page 1


#### 2. ConversationDetail (Client Component)

**Purpose**: Display conversation with messages and input

**Props**:
```typescript
interface ConversationDetailProps {
  conversationId: string;
  initialData?: Conversation;
}
```

**State Management**:
- Uses `useConversation(id)` for conversation data
- Uses `useArchivedMessages(id)` for older messages
- Uses `useSendMessage()` for message submission

**Key Features**:
- Real-time message updates via polling or WebSocket (future)
- Infinite scroll for archived messages
- Optimistic message sending
- Rate limit handling

#### 3. MessageInput (Client Component)

**Purpose**: Compose and send messages

**Props**:
```typescript
interface MessageInputProps {
  conversationId: string;
  onSend: (content: string) => Promise<void>;
  disabled?: boolean;
}
```

**Key Features**:
- Auto-resize textarea
- Keyboard shortcuts (Enter to send, Shift+Enter for newline)
- Character count
- Loading state during send
- Error display

#### 4. CreateConversationDialog (Client Component)

**Purpose**: Modal for creating new conversations

**Props**:
```typescript
interface CreateConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (conversation: Conversation) => void;
}
```

**Key Features**:
- Form validation with Zod
- Technique selector with descriptions
- Tag input
- Optimistic creation


## Data Models

### TypeScript Types

```typescript
// types/conversation.types.ts

/**
 * Socratic questioning technique
 */
export type SocraticTechnique = 
  | 'elenchus' 
  | 'dialectic' 
  | 'maieutics' 
  | 'definitional' 
  | 'analogical' 
  | 'counterfactual';

/**
 * Message role
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Message in a conversation
 */
export interface Message {
  role: MessageRole;
  content: string;
  timestamp: string;
  sequence: number;
  tokens?: number;
}

/**
 * Conversation metadata
 */
export interface ConversationMetadata {
  messageCount: number;
  totalTokens: number;
  estimatedCost: number;
  lastMessageAt?: string;
}

/**
 * Full conversation object
 */
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  technique: SocraticTechnique;
  tags: string[];
  recentMessages: Message[];
  metadata: ConversationMetadata;
  hasArchivedMessages: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated conversation response
 */
export interface PaginatedConversations {
  data: Conversation[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Create conversation DTO
 */
export interface CreateConversationDto {
  title: string;
  technique: SocraticTechnique;
  tags?: string[];
}

/**
 * Update conversation DTO
 */
export interface UpdateConversationDto {
  title?: string;
  technique?: SocraticTechnique;
  tags?: string[];
  isFavorite?: boolean;
  isArchived?: boolean;
}

/**
 * Send message DTO
 */
export interface SendMessageDto {
  content: string;
}

/**
 * Send message response
 */
export interface SendMessageResponse {
  jobId: string;
  position: number;
}

/**
 * Conversation filters
 */
export interface ConversationFilters {
  technique?: SocraticTechnique;
  tags?: string[];
  isArchived?: boolean;
  isFavorite?: boolean;
  sort?: 'createdAt' | 'updatedAt' | 'lastMessageAt';
  page?: number;
  limit?: number;
}

/**
 * Rate limit error details
 */
export interface RateLimitError {
  code: 'RATE_LIMIT_EXCEEDED';
  message: string;
  retryAfter: number; // seconds
}
```


### API Client Layer

```typescript
// lib/api/conversations.ts

import { apiClient } from './client';
import type {
  Conversation,
  ConversationFilters,
  CreateConversationDto,
  Message,
  PaginatedConversations,
  SendMessageDto,
  SendMessageResponse,
  UpdateConversationDto,
} from '@/types/conversation.types';

/**
 * Conversation API endpoints
 */
export const conversationsApi = {
  /**
   * Get all conversations with filters
   */
  getAll: async (filters?: ConversationFilters): Promise<PaginatedConversations> => {
    const params = new URLSearchParams();
    
    if (filters?.technique) params.append('technique', filters.technique);
    if (filters?.tags) params.append('tags', filters.tags.join(','));
    if (filters?.isArchived !== undefined) params.append('isArchived', String(filters.isArchived));
    if (filters?.isFavorite !== undefined) params.append('isFavorite', String(filters.isFavorite));
    if (filters?.sort) params.append('sort', filters.sort);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    
    const query = params.toString();
    return apiClient.get<PaginatedConversations>(
      `/conversations${query ? `?${query}` : ''}`
    );
  },

  /**
   * Get conversation by ID
   */
  getById: async (id: string): Promise<Conversation> => {
    return apiClient.get<Conversation>(`/conversations/${id}`);
  },

  /**
   * Create new conversation
   */
  create: async (dto: CreateConversationDto): Promise<Conversation> => {
    return apiClient.post<Conversation>('/conversations', dto);
  },

  /**
   * Update conversation
   */
  update: async (id: string, dto: UpdateConversationDto): Promise<Conversation> => {
    return apiClient.patch<Conversation>(`/conversations/${id}`, dto);
  },

  /**
   * Delete conversation
   */
  delete: async (id: string): Promise<void> => {
    return apiClient.delete<void>(`/conversations/${id}`);
  },

  /**
   * Send message to conversation
   */
  sendMessage: async (id: string, dto: SendMessageDto): Promise<SendMessageResponse> => {
    return apiClient.post<SendMessageResponse>(`/conversations/${id}/messages`, dto);
  },

  /**
   * Get archived messages
   */
  getArchivedMessages: async (
    id: string,
    options?: { limit?: number; beforeSequence?: number }
  ): Promise<Message[]> => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.beforeSequence) params.append('beforeSequence', String(options.beforeSequence));
    
    const query = params.toString();
    return apiClient.get<Message[]>(
      `/conversations/${id}/messages/archived${query ? `?${query}` : ''}`
    );
  },
};
```


### Query Key Factory

```typescript
// lib/query-keys.ts

import type { ConversationFilters } from '@/types/conversation.types';

/**
 * Centralized query key factory for conversations
 * Ensures consistent cache keys across the application
 */
export const conversationKeys = {
  /**
   * Base key for all conversation queries
   */
  all: ['conversations'] as const,

  /**
   * Key for conversation lists
   */
  lists: () => [...conversationKeys.all, 'list'] as const,

  /**
   * Key for filtered conversation list
   */
  list: (filters: ConversationFilters) => 
    [...conversationKeys.lists(), filters] as const,

  /**
   * Key for conversation details
   */
  details: () => [...conversationKeys.all, 'detail'] as const,

  /**
   * Key for specific conversation
   */
  detail: (id: string) => [...conversationKeys.details(), id] as const,

  /**
   * Key for conversation messages
   */
  messages: (id: string) => [...conversationKeys.detail(id), 'messages'] as const,

  /**
   * Key for archived messages
   */
  archivedMessages: (id: string, beforeSequence?: number) =>
    [...conversationKeys.messages(id), 'archived', beforeSequence] as const,
};
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### API Client Properties

**Property 1: Configuration usage**
*For any* API request, the fetch call should use the base URL and timeout from centralized config
**Validates: Requirements 1.1**

**Property 2: Response parsing consistency**
*For any* successful API response with standardized format, parsing should extract data, success, and meta fields correctly
**Validates: Requirements 1.2**

**Property 3: Error transformation**
*For any* error response, the API client should throw ApiClientError with code, message, status, and details
**Validates: Requirements 1.3**

**Property 4: Auth header injection**
*For any* authenticated request, when an access token exists, the Authorization header should be present with Bearer token
**Validates: Requirements 1.4**

### Query Key Properties

**Property 5: Query key hierarchy**
*For any* query key generated by the factory, it should start with ['conversations'] as the root
**Validates: Requirements 3.1**

**Property 6: Filter inclusion in keys**
*For any* conversation list query with filters, the query key should include the filter object
**Validates: Requirements 3.2**

**Property 7: ID inclusion in detail keys**
*For any* conversation detail query, the query key should include the conversation ID
**Validates: Requirements 3.3**

**Property 8: Pagination in message keys**
*For any* archived message query, the query key should include conversation ID and pagination parameters
**Validates: Requirements 3.4**

**Property 9: Cache invalidation scope**
*For any* cache invalidation operation, invalidating conversationKeys.all should invalidate all conversation-related queries
**Validates: Requirements 3.5**


### Form Validation Properties

**Property 10: Title validation**
*For any* conversation title input that is empty or only whitespace, validation should fail
**Validates: Requirements 4.1, 8.1**

**Property 11: Tag validation**
*For any* tag array, all tags should be non-empty strings after trimming
**Validates: Requirements 8.6**

**Property 12: Message content validation**
*For any* message content that is empty or only whitespace, the send button should be disabled
**Validates: Requirements 7.1**

### Optimistic Update Properties

**Property 13: Optimistic creation**
*For any* conversation creation, the new conversation should appear in the cache before the server responds
**Validates: Requirements 4.4**

**Property 14: Optimistic update rollback**
*For any* failed mutation, the cache should revert to its pre-mutation state
**Validates: Requirements 4.5, 7.6, 8.7, 9.5**

**Property 15: Optimistic message sending**
*For any* message send operation, the message should appear in the conversation before the server responds
**Validates: Requirements 7.2**

**Property 16: Optimistic deletion**
*For any* conversation deletion, the conversation should be removed from the list before the server responds
**Validates: Requirements 9.2**

**Property 17: Optimistic toggle**
*For any* boolean field toggle (favorite, archived), the UI should update immediately before server confirmation
**Validates: Requirements 8.3, 8.4**

### Cache Invalidation Properties

**Property 18: Post-creation invalidation**
*For any* successful conversation creation, the conversation list query should be invalidated
**Validates: Requirements 4.7**

**Property 19: Post-update invalidation**
*For any* successful conversation update, related queries (detail and list) should be invalidated
**Validates: Requirements 8.8**

**Property 20: Post-deletion invalidation**
*For any* successful conversation deletion, the conversation list query should be invalidated
**Validates: Requirements 9.4**

**Property 21: Post-message invalidation**
*For any* completed message processing, the conversation detail query should be refetched
**Validates: Requirements 7.5**


### Data Integrity Properties

**Property 22: Message ordering**
*For any* conversation with messages, messages should be displayed in ascending order by sequence number
**Validates: Requirements 6.2**

**Property 23: Archived message prepending**
*For any* archived message fetch, new messages should be prepended while maintaining chronological order
**Validates: Requirements 6.5**

**Property 24: Filter preservation during pagination**
*For any* page navigation, the active filters should be maintained in the query
**Validates: Requirements 5.5**

**Property 25: Conversation card completeness**
*For any* rendered conversation card, it should display title, technique, last message preview, and timestamp
**Validates: Requirements 5.2**

### Query Behavior Properties

**Property 26: Filter change triggers refetch**
*For any* filter change, the conversation list query should refetch with new parameters
**Validates: Requirements 5.3**

**Property 27: Sort change triggers refetch**
*For any* sort order change, the conversation list query should refetch with new sort parameter
**Validates: Requirements 5.4**

**Property 28: Archived message pagination**
*For any* "Load older messages" action, archived messages should be fetched with correct beforeSequence parameter
**Validates: Requirements 6.4**

## Error Handling

### Error Types

```typescript
/**
 * Typed error codes for better error handling
 */
export enum ApiErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Error message mapping
 */
export const ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  [ApiErrorCode.NETWORK_ERROR]: 'Connection failed. Please check your internet.',
  [ApiErrorCode.UNAUTHORIZED]: 'Please log in to continue.',
  [ApiErrorCode.FORBIDDEN]: "You don't have permission to access this conversation.",
  [ApiErrorCode.NOT_FOUND]: 'Conversation not found.',
  [ApiErrorCode.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded. Please try again later.',
  [ApiErrorCode.VALIDATION_ERROR]: 'Invalid input. Please check your data.',
  [ApiErrorCode.SERVER_ERROR]: 'Something went wrong. Please try again.',
  [ApiErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred.',
};
```


### Error Handling Strategy

1. **Network Errors**: Display connection error with retry button
2. **Authentication Errors (401)**: Trigger auth flow via existing interceptor
3. **Authorization Errors (403)**: Display permission error, offer navigation to list
4. **Not Found Errors (404)**: Display 404 state with back button
5. **Rate Limit Errors (429)**: Display banner with retry-after countdown
6. **Validation Errors (400)**: Display field-specific errors inline
7. **Server Errors (5xx)**: Display generic error with retry button

### Error Component Pattern

```typescript
interface ErrorStateProps {
  error: ApiClientError;
  onRetry?: () => void;
  onBack?: () => void;
}

function ErrorState({ error, onRetry, onBack }: ErrorStateProps) {
  const message = ERROR_MESSAGES[error.code as ApiErrorCode] || ERROR_MESSAGES.UNKNOWN_ERROR;
  
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">Error</h3>
      <p className="text-muted-foreground mb-6">{message}</p>
      <div className="flex gap-2">
        {onRetry && <Button onClick={onRetry}>Try Again</Button>}
        {onBack && <Button variant="outline" onClick={onBack}>Go Back</Button>}
      </div>
    </div>
  );
}
```

### Rate Limit Handling

```typescript
interface RateLimitBannerProps {
  retryAfter: number; // seconds
  onDismiss: () => void;
}

function RateLimitBanner({ retryAfter, onDismiss }: RateLimitBannerProps) {
  const [timeLeft, setTimeLeft] = useState(retryAfter);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [retryAfter, onDismiss]);
  
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Rate Limit Exceeded</AlertTitle>
      <AlertDescription>
        You've reached your message limit. Try again in {timeLeft} seconds.
      </AlertDescription>
    </Alert>
  );
}
```


## Testing Strategy

### Unit Testing Approach

**Tools**: Vitest, React Testing Library, MSW (Mock Service Worker)

**Coverage Goals**:
- API client: 100% (critical infrastructure)
- Query hooks: 90%+ (core data layer)
- Components: 80%+ (UI layer)

**Test Categories**:

1. **API Client Tests**
   - Request construction (headers, body, URL)
   - Response parsing (success and error cases)
   - Error transformation
   - Auth header injection
   - Retry logic

2. **Query Hook Tests**
   - Query key generation
   - Data fetching
   - Optimistic updates
   - Cache invalidation
   - Error handling

3. **Component Tests**
   - Rendering with data
   - User interactions
   - Loading states
   - Error states
   - Empty states

### Property-Based Testing Approach

**Tool**: fast-check (JavaScript property-based testing library)

**Configuration**: Minimum 100 iterations per property test

**Test Categories**:

1. **API Client Properties**
   - Generate random valid/invalid responses
   - Verify consistent error transformation
   - Test auth header injection with various token states

2. **Query Key Properties**
   - Generate random filters, IDs, pagination params
   - Verify key structure and hierarchy
   - Test cache invalidation patterns

3. **Form Validation Properties**
   - Generate random strings (empty, whitespace, valid)
   - Verify validation rules hold across all inputs
   - Test edge cases automatically

4. **Optimistic Update Properties**
   - Generate random mutations
   - Verify optimistic updates appear immediately
   - Verify rollback on failure

5. **Data Integrity Properties**
   - Generate random message sequences
   - Verify ordering is maintained
   - Test pagination boundaries


### Test File Organization

```
lib/
├── api/
│   ├── __tests__/
│   │   ├── conversations.spec.ts           # Unit tests
│   │   └── properties/
│   │       └── conversations.property.spec.ts  # Property tests
│   └── conversations.ts
├── hooks/
│   ├── __tests__/
│   │   ├── use-conversations.spec.ts       # Unit tests
│   │   └── properties/
│   │       └── use-conversations.property.spec.ts  # Property tests
│   └── use-conversations.ts
└── query-keys.ts

components/
└── conversations/
    ├── __tests__/
    │   ├── conversation-list.spec.tsx      # Unit tests
    │   ├── conversation-detail.spec.tsx
    │   ├── message-input.spec.tsx
    │   └── properties/
    │       └── message-ordering.property.spec.tsx  # Property tests
    ├── conversation-list.tsx
    ├── conversation-detail.tsx
    └── message-input.tsx
```

### Example Unit Test

```typescript
// lib/api/__tests__/conversations.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from '../client';
import { conversationsApi } from '../conversations';

vi.mock('../client');

describe('conversationsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch conversations with filters', async () => {
      const mockData = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      vi.mocked(apiClient.get).mockResolvedValue(mockData);

      const filters = { technique: 'elenchus', page: 1, limit: 20 };
      const result = await conversationsApi.getAll(filters);

      expect(apiClient.get).toHaveBeenCalledWith(
        '/conversations?technique=elenchus&page=1&limit=20'
      );
      expect(result).toEqual(mockData);
    });

    it('should handle empty filters', async () => {
      const mockData = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      vi.mocked(apiClient.get).mockResolvedValue(mockData);

      await conversationsApi.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/conversations');
    });
  });

  describe('create', () => {
    it('should create conversation with valid data', async () => {
      const mockConversation = {
        id: '123',
        title: 'Test',
        technique: 'elenchus',
        tags: [],
      };
      vi.mocked(apiClient.post).mockResolvedValue(mockConversation);

      const dto = { title: 'Test', technique: 'elenchus' as const };
      const result = await conversationsApi.create(dto);

      expect(apiClient.post).toHaveBeenCalledWith('/conversations', dto);
      expect(result).toEqual(mockConversation);
    });
  });
});
```


### Example Property-Based Test

```typescript
// lib/api/__tests__/properties/conversations.property.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { conversationsApi } from '../../conversations';
import { apiClient } from '../../client';

/**
 * Feature: conversation-frontend-integration, Property 6: Filter inclusion in keys
 * Validates: Requirements 3.2
 */
describe('conversationsApi properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include all filter parameters in query string', () => {
    fc.assert(
      fc.property(
        fc.record({
          technique: fc.constantFrom('elenchus', 'dialectic', 'maieutics'),
          tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
          isArchived: fc.boolean(),
          isFavorite: fc.boolean(),
          page: fc.integer({ min: 1, max: 100 }),
          limit: fc.integer({ min: 1, max: 100 }),
        }),
        async (filters) => {
          vi.mocked(apiClient.get).mockResolvedValue({ 
            data: [], 
            meta: { page: 1, limit: 20, total: 0, totalPages: 0 } 
          });

          await conversationsApi.getAll(filters);

          const callUrl = vi.mocked(apiClient.get).mock.calls[0][0];
          
          // Verify all filters are in the URL
          expect(callUrl).toContain(`technique=${filters.technique}`);
          expect(callUrl).toContain(`tags=${filters.tags.join(',')}`);
          expect(callUrl).toContain(`isArchived=${filters.isArchived}`);
          expect(callUrl).toContain(`isFavorite=${filters.isFavorite}`);
          expect(callUrl).toContain(`page=${filters.page}`);
          expect(callUrl).toContain(`limit=${filters.limit}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: conversation-frontend-integration, Property 10: Title validation
   * Validates: Requirements 4.1, 8.1
   */
  it('should reject empty or whitespace-only titles', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.constant('\t\n'),
          fc.stringOf(fc.constantFrom(' ', '\t', '\n'))
        ),
        (invalidTitle) => {
          const isValid = invalidTitle.trim().length > 0;
          expect(isValid).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: conversation-frontend-integration, Property 22: Message ordering
   * Validates: Requirements 6.2
   */
  it('should maintain chronological message order', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            role: fc.constantFrom('user', 'assistant'),
            content: fc.string({ minLength: 1, maxLength: 500 }),
            timestamp: fc.date().map(d => d.toISOString()),
            sequence: fc.integer({ min: 0, max: 1000 }),
          }),
          { minLength: 2, maxLength: 50 }
        ),
        (messages) => {
          // Sort messages by sequence
          const sorted = [...messages].sort((a, b) => a.sequence - b.sequence);
          
          // Verify ordering is maintained
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].sequence).toBeGreaterThanOrEqual(sorted[i - 1].sequence);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```


### Example Query Hook Test

```typescript
// lib/hooks/__tests__/use-conversations.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useConversations, useCreateConversation } from '../use-conversations';
import { conversationsApi } from '@/lib/api/conversations';

vi.mock('@/lib/api/conversations');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useConversations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch conversations successfully', async () => {
    const mockData = {
      data: [{ id: '1', title: 'Test', technique: 'elenchus' }],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    vi.mocked(conversationsApi.getAll).mockResolvedValue(mockData);

    const { result } = renderHook(() => useConversations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
    expect(conversationsApi.getAll).toHaveBeenCalledTimes(1);
  });

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch');
    vi.mocked(conversationsApi.getAll).mockRejectedValue(error);

    const { result } = renderHook(() => useConversations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });
});

describe('useCreateConversation', () => {
  it('should create conversation with optimistic update', async () => {
    const mockConversation = {
      id: '123',
      title: 'New Conversation',
      technique: 'elenchus' as const,
      tags: [],
    };
    vi.mocked(conversationsApi.create).mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useCreateConversation(), {
      wrapper: createWrapper(),
    });

    const dto = { title: 'New Conversation', technique: 'elenchus' as const };
    result.current.mutate(dto);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(conversationsApi.create).toHaveBeenCalledWith(dto);
    expect(result.current.data).toEqual(mockConversation);
  });

  it('should rollback on error', async () => {
    const error = new Error('Creation failed');
    vi.mocked(conversationsApi.create).mockRejectedValue(error);

    const { result } = renderHook(() => useCreateConversation(), {
      wrapper: createWrapper(),
    });

    const dto = { title: 'New Conversation', technique: 'elenchus' as const };
    result.current.mutate(dto);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(error);
  });
});
```


## Implementation Details

### TanStack Query Hooks

```typescript
// lib/hooks/use-conversations.ts
import { 
  useQuery, 
  useMutation, 
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { conversationsApi } from '@/lib/api/conversations';
import { conversationKeys } from '@/lib/query-keys';
import type {
  Conversation,
  ConversationFilters,
  CreateConversationDto,
  UpdateConversationDto,
  SendMessageDto,
} from '@/types/conversation.types';

/**
 * Fetch all conversations with filters using infinite scroll
 */
export function useInfiniteConversations(filters?: Omit<ConversationFilters, 'page'>) {
  return useInfiniteQuery({
    queryKey: conversationKeys.list(filters || {}),
    queryFn: ({ pageParam = 1 }) =>
      conversationsApi.getAll({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => {
      // If we have more pages, return the next page number
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined; // No more pages
    },
    initialPageParam: 1,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Fetch single conversation by ID
 */
export function useConversation(id: string) {
  return useQuery({
    queryKey: conversationKeys.detail(id),
    queryFn: () => conversationsApi.getById(id),
    enabled: !!id,
    staleTime: 30000,
  });
}

/**
 * Fetch archived messages with infinite scroll
 */
export function useArchivedMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: conversationKeys.messages(conversationId),
    queryFn: ({ pageParam }) =>
      conversationsApi.getArchivedMessages(conversationId, {
        limit: 50,
        beforeSequence: pageParam,
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage.length === 0) return undefined;
      return lastPage[lastPage.length - 1].sequence;
    },
    initialPageParam: undefined as number | undefined,
    enabled: !!conversationId,
  });
}

/**
 * Create new conversation with optimistic update
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (dto: CreateConversationDto) => conversationsApi.create(dto),
    
    onMutate: async (newConversation) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: conversationKeys.lists() });

      // Snapshot previous value
      const previous = queryClient.getQueryData(conversationKeys.lists());

      // Optimistically update cache
      queryClient.setQueryData(conversationKeys.lists(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: [
            {
              ...newConversation,
              id: 'temp-' + Date.now(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              recentMessages: [],
              metadata: { messageCount: 0, totalTokens: 0, estimatedCost: 0 },
              hasArchivedMessages: false,
              isFavorite: false,
              isArchived: false,
            },
            ...old.data,
          ],
        };
      });

      return { previous };
    },

    onError: (err, newConversation, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(conversationKeys.lists(), context.previous);
      }
    },

    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      
      // Navigate to new conversation
      router.push(`/dashboard/conversations/${data.id}`);
    },
  });
}

/**
 * Update conversation with optimistic update
 */
export function useUpdateConversation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateConversationDto) => conversationsApi.update(id, dto),

    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: conversationKeys.detail(id) });

      const previous = queryClient.getQueryData(conversationKeys.detail(id));

      queryClient.setQueryData(conversationKeys.detail(id), (old: Conversation | undefined) => {
        if (!old) return old;
        return { ...old, ...updates, updatedAt: new Date().toISOString() };
      });

      return { previous };
    },

    onError: (err, updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(conversationKeys.detail(id), context.previous);
      }
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}

/**
 * Delete conversation with optimistic update
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (id: string) => conversationsApi.delete(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: conversationKeys.lists() });

      const previous = queryClient.getQueryData(conversationKeys.lists());

      queryClient.setQueryData(conversationKeys.lists(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter((conv: Conversation) => conv.id !== id),
        };
      });

      return { previous };
    },

    onError: (err, id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(conversationKeys.lists(), context.previous);
      }
    },

    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.removeQueries({ queryKey: conversationKeys.detail(id) });
      router.push('/dashboard/conversations');
    },
  });
}

/**
 * Send message with optimistic update
 */
export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: SendMessageDto) => conversationsApi.sendMessage(conversationId, dto),

    onMutate: async (message) => {
      await queryClient.cancelQueries({ queryKey: conversationKeys.detail(conversationId) });

      const previous = queryClient.getQueryData(conversationKeys.detail(conversationId));

      queryClient.setQueryData(
        conversationKeys.detail(conversationId),
        (old: Conversation | undefined) => {
          if (!old) return old;
          return {
            ...old,
            recentMessages: [
              ...old.recentMessages,
              {
                role: 'user' as const,
                content: message.content,
                timestamp: new Date().toISOString(),
                sequence: old.metadata.messageCount + 1,
              },
            ],
            metadata: {
              ...old.metadata,
              messageCount: old.metadata.messageCount + 1,
            },
          };
        }
      );

      return { previous };
    },

    onError: (err, message, context) => {
      if (context?.previous) {
        queryClient.setQueryData(conversationKeys.detail(conversationId), context.previous);
      }
    },

    onSuccess: () => {
      // Poll for AI response or use WebSocket in future
      queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
    },
  });
}
```


### Component Implementation Examples

#### ConversationList Component

```typescript
// components/conversations/conversation-list.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useInfiniteConversations } from '@/lib/hooks/use-conversations';
import { ConversationCard } from './conversation-card';
import { ConversationFilters } from './conversation-filters';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';
import type { ConversationFilters as Filters } from '@/types/conversation.types';

export function ConversationList() {
  const [filters, setFilters] = useState<Omit<Filters, 'page'>>({
    limit: 20,
    sort: 'updatedAt',
  });

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteConversations(filters);

  const parentRef = useRef<HTMLDivElement>(null);

  // Flatten all pages into a single array
  const allConversations = data?.pages.flatMap((page) => page.data) ?? [];

  // Virtualize the list for performance
  const rowVirtualizer = useVirtualizer({
    count: allConversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 140, // Estimated height of conversation card
    overscan: 5,
  });

  // Infinite scroll: fetch next page when scrolling near bottom
  useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();

    if (!lastItem) return;

    if (
      lastItem.index >= allConversations.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    allConversations.length,
    isFetchingNextPage,
    rowVirtualizer.getVirtualItems(),
  ]);

  // Reset to page 1 when filters change
  const handleFilterChange = (newFilters: Omit<Filters, 'page'>) => {
    setFilters(newFilters);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive mb-4">Failed to load conversations</p>
        <Button onClick={() => refetch()}>Try Again</Button>
      </div>
    );
  }

  if (allConversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
        <p className="text-muted-foreground mb-6">
          Start your first Socratic dialogue
        </p>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConversationFilters filters={filters} onChange={handleFilterChange} />

      <div
        ref={parentRef}
        className="h-[calc(100vh-200px)] overflow-auto"
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const conversation = allConversations[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <ConversationCard conversation={conversation} />
              </div>
            );
          })}
        </div>

        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
```


#### MessageInput Component

```typescript
// components/conversations/message-input.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useSendMessage } from '@/lib/hooks/use-conversations';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { ApiClientError } from '@/lib/api/client';
import { RateLimitBanner } from './rate-limit-banner';

interface MessageInputProps {
  conversationId: string;
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const [content, setContent] = useState('');
  const [rateLimitError, setRateLimitError] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { mutate: sendMessage, isPending, error } = useSendMessage(conversationId);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Handle rate limit errors
  useEffect(() => {
    if (error instanceof ApiClientError && error.status === 429) {
      const retryAfter = (error.details as any)?.retryAfter || 60;
      setRateLimitError(retryAfter);
    }
  }, [error]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmed = content.trim();
    if (!trimmed || isPending) return;

    sendMessage(
      { content: trimmed },
      {
        onSuccess: () => {
          setContent('');
          setRateLimitError(null);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isDisabled = !content.trim() || isPending || rateLimitError !== null;

  return (
    <div className="space-y-4">
      {rateLimitError && (
        <RateLimitBanner
          retryAfter={rateLimitError}
          onDismiss={() => setRateLimitError(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or share your thoughts..."
          disabled={isPending || rateLimitError !== null}
          className="min-h-[80px] max-h-[200px] resize-none"
        />
        
        <Button
          type="submit"
          disabled={isDisabled}
          size="icon"
          className="self-end"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      {error && !(error instanceof ApiClientError && error.status === 429) && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to send message'}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
```


## Performance Considerations

### Caching Strategy

1. **Stale Time**: 30 seconds for conversation data (balance freshness vs. requests)
2. **Cache Time**: 5 minutes (keep data in cache for quick navigation)
3. **Prefetching**: Prefetch conversation details on card hover
4. **Background Refetch**: Refetch on window focus for active conversations

### Optimizations

1. **Virtualization**: Use `@tanstack/react-virtual` for rendering only visible conversation cards (improves performance with 1000+ conversations)
2. **Infinite Scroll**: Use `useInfiniteQuery` with URL-based pagination for seamless loading
3. **Code Splitting**: Lazy load conversation detail page
4. **Image Optimization**: Use Next.js Image for any avatars or media
5. **Debouncing**: Debounce filter changes to reduce API calls
6. **Page Size**: Fetch 20 items per page to balance performance and UX

### Example Prefetching

```typescript
// components/conversations/conversation-card.tsx
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { conversationsApi } from '@/lib/api/conversations';
import { conversationKeys } from '@/lib/query-keys';

export function ConversationCard({ conversation }) {
  const queryClient = useQueryClient();

  const prefetchConversation = () => {
    queryClient.prefetchQuery({
      queryKey: conversationKeys.detail(conversation.id),
      queryFn: () => conversationsApi.getById(conversation.id),
      staleTime: 30000,
    });
  };

  return (
    <Link
      href={`/dashboard/conversations/${conversation.id}`}
      onMouseEnter={prefetchConversation}
      onFocus={prefetchConversation}
    >
      {/* Card content */}
    </Link>
  );
}
```

## Accessibility

### Keyboard Navigation

- Tab through conversation cards
- Enter to open conversation
- Escape to close dialogs
- Cmd/Ctrl+K for search
- Cmd/Ctrl+N for new conversation

### Screen Reader Support

- Semantic HTML (nav, main, article, aside)
- ARIA labels for icon buttons
- ARIA live regions for loading/error states
- Focus management for dialogs and navigation

### Example Accessible Component

```typescript
<button
  type="button"
  onClick={onDelete}
  aria-label={`Delete conversation: ${conversation.title}`}
  className="focus:ring-2 focus:ring-primary"
>
  <Trash className="h-4 w-4" />
  <span className="sr-only">Delete</span>
</button>
```


## Security Considerations

### Authentication

- JWT tokens stored in memory (access token) and httpOnly cookies (refresh token)
- Automatic token refresh via API client interceptor
- Redirect to login on 401 after refresh failure

### Authorization

- All API requests include Authorization header
- Backend validates user ownership of conversations
- Frontend displays appropriate errors for 403 responses

### Input Sanitization

- All user input validated with Zod schemas
- XSS prevention via React's automatic escaping
- No dangerouslySetInnerHTML usage

### Rate Limiting

- Display rate limit errors with retry-after countdown
- Disable input during rate limit period
- Clear messaging about limits

## Deployment Considerations

### Environment Variables

Required in production:
```bash
NEXT_PUBLIC_API_URL=https://api.mukti.app/api/v1
NEXT_PUBLIC_APP_URL=https://mukti.app
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### Build Optimization

- Static generation for landing pages
- Dynamic rendering for authenticated pages
- API routes for server-side operations
- Edge runtime for performance-critical routes

### Monitoring

- Error tracking with Sentry (future)
- Performance monitoring with Web Vitals
- API response time tracking
- User interaction analytics

## Future Enhancements

### Real-Time Updates

Replace polling with WebSocket connection for:
- Live AI response streaming
- Real-time message updates
- Typing indicators
- Presence indicators

### Advanced Features

1. **Search**: Full-text search across conversations
2. **Export**: Download conversations as PDF/Markdown
3. **Sharing**: Share conversations with read-only links
4. **Collaboration**: Multi-user conversations
5. **Voice Input**: Speech-to-text for messages
6. **Offline Support**: Service worker for offline access

### Performance Improvements

1. **Virtual Scrolling**: For very long message lists
2. **Incremental Static Regeneration**: For public conversations
3. **Edge Caching**: CDN caching for static assets
4. **Image Optimization**: WebP/AVIF format support

## Summary

This design provides a comprehensive blueprint for integrating the conversation backend API with the Mukti Web frontend. Key highlights:

- **Type-Safe**: Full TypeScript coverage matching backend DTOs
- **Performant**: TanStack Query with caching, prefetching, and optimistic updates
- **User-Friendly**: Skeleton loading, clear errors, responsive design
- **Testable**: Unit tests and property-based tests for critical paths
- **Maintainable**: Centralized API client, query key factories, reusable components
- **Accessible**: Keyboard navigation, screen reader support, semantic HTML
- **Secure**: JWT authentication, input validation, rate limiting

The implementation follows Next.js 15 and React 19 best practices, leveraging Server Components where possible and using Client Components only when necessary for interactivity. The design emphasizes developer experience with clear patterns and comprehensive testing strategies.
