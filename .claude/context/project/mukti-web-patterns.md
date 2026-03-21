<!-- Context: project/mukti-web-patterns | Priority: high | Version: 1.0 | Updated: 2026-03-21 -->

# Mukti Web — Next.js Frontend Patterns

**Purpose**: Definitive guide for writing frontend code in `packages/mukti-web/`.

---

## 1. TanStack Query — Data Fetching

### 1.1 Query Key Factory

Centralized in `src/lib/query-keys.ts`. Hierarchical keys with nesting:

```typescript
export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (filters: Filters) => [...conversationKeys.lists(), filters] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
  messages: (id: string) => [...conversationKeys.detail(id), 'messages'] as const,
};
```

**Rule**: Always use the factory — never hardcode query keys.

### 1.2 Query Hooks

```typescript
export function useConversations(filters?: Filters) {
  return useQuery({
    queryKey: conversationKeys.list(filters),
    queryFn: () => conversationsApi.getAll(filters),
    staleTime: STALE_TIME,
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: conversationKeys.detail(id),
    queryFn: () => conversationsApi.getById(id),
    enabled: !!id,
  });
}
```

### 1.3 Mutation Pattern

```typescript
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateConversationData) => conversationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });
    },
    onError: (error) => {
      showErrorToast(error);
    },
  });
}
```

### 1.4 Cache Configuration

Centralized in `src/lib/config.ts`:

```typescript
const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes
const DEFAULT_STALE_TIME = 1 * 60 * 1000; // 1 minute
const DEFAULT_PAGE_SIZE = 20;
```

### 1.5 Optimistic Updates (Canvas Store)

```typescript
// Optimistic update → API call → rollback on error
addAssumption: async (sessionId, data) => {
  const previousNodes = get().nodes;

  // Optimistic: add node immediately
  set({ nodes: [...previousNodes, newNode] });

  try {
    await canvasApi.addAssumption(sessionId, data);
  } catch (error) {
    // Rollback on failure
    set({ nodes: previousNodes });
    showErrorToast(error);
  }
};
```

---

## 2. API Client

### 2.1 Singleton Pattern

```typescript
// src/lib/api/client.ts
export const apiClient = new ApiClient();
```

Methods: `get<T>()`, `post<T>()`, `patch<T>()`, `put<T>()`, `delete<T>()`

### 2.2 Interceptor Pipeline

1. **Request**: Auth header injection → CSRF token injection
2. **Response**: 401 → refresh token → retry with new access token
3. **Error**: Transform to `ApiClientError` with `{ message, code, status, details }`

### 2.3 API Module Pattern

Each domain has its own API module exporting an object:

```typescript
// src/lib/api/conversations.ts
export const conversationsApi = {
  create: (data: CreateData) => apiClient.post<Conversation>('/conversations', data),
  getAll: (filters?: Filters) =>
    apiClient.get<Conversation[]>('/conversations', { params: filters }),
  getById: (id: string) => apiClient.get<Conversation>(`/conversations/${id}`),
  delete: (id: string) => apiClient.delete(`/conversations/${id}`),
};
```

### 2.4 Response Types

```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: { requestId: string; timestamp: string; page?: number; limit?: number; total?: number };
}

interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}
```

### 2.5 Data Transformation

Backend uses `_id`, frontend uses `id`. Transform at API module boundary:

```typescript
function transformConversation(raw: RawConversation): Conversation {
  return { id: raw._id, title: raw.title /* ... */ };
}
```

---

## 3. Zustand Stores

### 3.1 Store Structure

```typescript
// src/lib/stores/{feature}-store.ts

// 1. Types
interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  addAssumption: (sessionId: string, data: Data) => Promise<void>;
}

// 2. Store
export const useCanvasStore = create<CanvasState>()((set, get) => ({
  nodes: [],
  edges: [],
  addAssumption: async (sessionId, data) => {
    /* ... */
  },
}));

// 3. Selector Hooks (for performance)
export const useCanvasNodes = () => useCanvasStore((state) => state.nodes);
export const useCanvasEdges = () => useCanvasStore((state) => state.edges);
export const useCanvasActions = () =>
  useCanvasStore(
    useShallow((state) => ({
      addAssumption: state.addAssumption,
      removeNode: state.removeNode,
    }))
  );
```

### 3.2 Auth Store — Token Security

```typescript
// Access token: memory-only (cleared on reload)
// User object: persisted to localStorage
// Refresh token: httpOnly cookie (handled by API client)

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null, // NOT persisted
      isAuthenticated: false,
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }), // Only persist user
    }
  )
);
```

### 3.3 Rules

- Use `useShallow` for multi-property selectors to prevent re-renders
- Export individual selector hooks (not the raw store)
- Persist only what's needed — security-sensitive data stays in memory

---

## 4. Component Patterns

### 4.1 Component Structure

```typescript
'use client';

// Imports (see import order in CODEBASE_STANDARDS.md)

interface ComponentProps {
  onSuccess?: () => void;
  // ... props with JSDoc
}

export function ComponentName({ onSuccess, ...props }: ComponentProps) {
  // 1. Hooks
  const router = useRouter();
  const { data, isLoading } = useQuery();

  // 2. State
  const [isOpen, setIsOpen] = useState(false);

  // 3. Handlers
  const handleSubmit = async (data: FormData) => { /* ... */ };

  // 4. JSX
  return ( /* ... */ );
}
```

### 4.2 Form Components (React Hook Form + Zod)

```typescript
const form = useForm<LoginFormData>({
  defaultValues: { email: '', password: '' },
  resolver: zodResolver(loginSchema),
});

return (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </form>
  </Form>
);
```

### 4.3 Dialog Components

```typescript
interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (id: string) => void;
}

export function CreateDialog({ open, onOpenChange, onSuccess }: CreateDialogProps) {
  const mutation = useCreateResource();

  const handleSubmit = async (data: FormData) => {
    const result = await mutation.mutateAsync(data);
    onSuccess?.(result.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* ... */}
    </Dialog>
  );
}
```

---

## 5. Styling — Tailwind + Japandi Theme

### 5.1 Custom Theme Classes

```
text-japandi-label       # Label text color
bg-japandi-cream         # Cream background
border-japandi-sand      # Sand border color
```

### 5.2 Common Patterns

```typescript
// Conditional classes with cn() utility
className={cn(
  'base-classes',
  isActive && 'active-classes',
  variant === 'primary' && 'primary-classes',
)}

// Focus states
'focus-visible:ring-2 focus-visible:ring-primary/30'

// Disabled states
'disabled:cursor-not-allowed disabled:opacity-50'

// Selection ring (canvas nodes)
'ring-2 ring-primary/30 ring-offset-2'

// Rounded corners
'rounded-2xl'  // large containers
'rounded-xl'   // cards
'rounded-lg'   // inputs, buttons
```

### 5.3 Icons

Lucide React for all icons:

```typescript
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
```

---

## 6. Auth Pattern

### 6.1 Token Flow

1. Login → access token (memory) + refresh token (httpOnly cookie)
2. Page reload → `useAuth` hook calls refresh endpoint → restores session
3. 401 response → ApiClient intercepts → auto-refresh → retry request
4. Single-instance refresh guard prevents duplicate refresh calls

### 6.2 Protected Pages

```typescript
// Dashboard layout wraps all authenticated routes
// useAuth hook manages session restoration on hydration
```

---

## 7. Testing Patterns (TDD)

Follow TDD: write tests first, implement second. All tests in `__tests__/` directories colocated with source.

**Reference**: See `TESTING.md` in `packages/mukti-web/` for the full testing guide.

### 7.1 Test Directory Structure

```
src/
├── components/{feature}/__tests__/
│   ├── {component}.test.tsx           # Component tests
│   └── properties/
│       └── {name}.property.spec.tsx   # Property tests
├── lib/hooks/__tests__/
│   ├── {hook}.spec.ts                 # Hook tests
│   └── properties/
│       └── {name}.property.spec.ts    # Property tests
├── lib/api/__tests__/
│   └── {module}.spec.ts               # API module tests
└── lib/__tests__/
    └── {utility}.spec.ts              # Utility tests
```

### 7.2 Component Test Pattern

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock stores
jest.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: (selector: any) => selector(mockState),
}));

// Mock APIs
jest.mock('@/lib/api/auth', () => ({
  authApi: { login: jest.fn() },
}));

describe('SignInForm', () => {
  const user = userEvent.setup();

  it('should submit form with valid data', async () => {
    render(<SignInForm />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });
});
```

### 7.3 Hook Test Pattern (TanStack Query)

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useConversation', () => {
  it('should fetch conversation by id', async () => {
    conversationsApi.getById.mockResolvedValue(mockConversation);

    const { result } = renderHook(() => useConversation('123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data.id).toBe('123');
  });
});
```

### 7.4 API Module Test Pattern

```typescript
jest.mock('@/lib/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('conversationsApi', () => {
  afterEach(() => jest.clearAllMocks());

  it('should transform _id to id', async () => {
    apiClient.get.mockResolvedValue({
      data: { _id: '123', title: 'Test' },
    });

    const result = await conversationsApi.getById('123');
    expect(result.id).toBe('123');
    expect(result).not.toHaveProperty('_id');
  });
});
```

### 7.5 Property-Based Tests (Frontend)

For form validation, optimistic updates, and cache consistency:

```typescript
import * as fc from 'fast-check';

describe('Form Validation Properties', () => {
  it('should reject empty/whitespace titles', () => {
    fc.assert(
      fc.property(fc.stringOf(fc.constantFrom(' ', '\t', '\n', '')), (whitespace) => {
        const result = titleSchema.safeParse(whitespace);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Optimistic Update Properties', () => {
  it('should rollback on error', async () => {
    await fc.assert(
      fc.asyncProperty(conversationArb, async (conversation) => {
        // Optimistic add → simulate error → verify rollback
      }),
      { numRuns: 50 }
    );
  });
});
```

### 7.6 Testing Rules

- **Semantic queries**: `getByRole`, `getByLabelText`, `getByText` — never `getByTestId` unless no alternative
- **`userEvent` over `fireEvent`**: Always use `const user = userEvent.setup()`
- **Async**: `waitFor()` or `findBy*` for anything async
- **Coverage threshold**: 70% branches, functions, lines, statements
- **No implementation details**: Don't test state values directly — test rendered output

### 7.7 What to Test

| Layer            | Must Test                                       | Property Test?           |
| ---------------- | ----------------------------------------------- | ------------------------ |
| Components       | Rendering, user interaction, form submission    | Yes — form validation    |
| Hooks (TanStack) | Data fetching, mutations, cache invalidation    | Yes — optimistic updates |
| API modules      | Request/response transformation, error handling | No — unit tests suffice  |
| Stores (Zustand) | Actions, state transitions, persistence         | Yes — rollback logic     |
| Utilities        | Pure function behavior                          | Optional                 |

---

## 📂 Codebase References

**API Client**:

- `packages/mukti-web/src/lib/api/client.ts` — Singleton, interceptors, refresh logic
- `packages/mukti-web/src/lib/api/auth.ts` — Auth endpoints
- `packages/mukti-web/src/lib/api/canvas.ts` — Canvas endpoints
- `packages/mukti-web/src/lib/api/conversations.ts` — Conversation endpoints

**Query Keys**:

- `packages/mukti-web/src/lib/query-keys.ts` — Centralized key factory

**Stores**:

- `packages/mukti-web/src/lib/stores/auth-store.ts` — Auth state + localStorage
- `packages/mukti-web/src/lib/stores/canvas-store.ts` — React Flow + optimistic updates
- `packages/mukti-web/src/lib/stores/chat-store.ts` — Chat panel state

**Hooks**:

- `packages/mukti-web/src/lib/hooks/use-auth.ts` — Session management
- `packages/mukti-web/src/lib/hooks/use-conversations.ts` — TanStack Query hooks
- `packages/mukti-web/src/lib/hooks/use-canvas.ts` — Canvas operations

**Validation**:

- `packages/mukti-web/src/lib/validation/auth-schemas.ts` — Auth form schemas
- `packages/mukti-web/src/lib/validation/conversation-schemas.ts` — Conversation schemas

**Config**:

- `packages/mukti-web/src/lib/config.ts` — Cache times, pagination, env vars

---

## Related

- **Codebase Standards** → `../CODEBASE_STANDARDS.md`
- **API Patterns** → `mukti-api-patterns.md`
