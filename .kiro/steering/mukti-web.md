# Frontend Guidelines - Mukti Web

## Next.js 15 & React 19 Architecture

### App Router Structure

- **Use App Router exclusively** - No Pages Router patterns
- **Server Components by default** - Add 'use client' only when needed (hooks, event handlers, browser APIs, animations)
- **File-based routing** - Leverage Next.js conventions

```
src/app/
├── (auth)/              # Route groups
├── (dashboard)/
├── api/                 # API routes
├── layout.tsx
├── page.tsx
├── loading.tsx
├── error.tsx
└── not-found.tsx
```

## Naming Conventions

### Files

- **Components**: `kebab-case.tsx` (e.g., `hero-section.tsx`)
- **Hooks**: `use-{name}.ts` (e.g., `use-waitlist.ts`)
- **Types**: `{name}.types.ts` (e.g., `conversation.types.ts`)
- **Constants**: `{name}.constants.ts`

### Folders

```
src/
├── app/                      # Next.js App Router
├── components/               # React components
│   ├── ui/                   # shadcn/ui base
│   ├── forms/
│   ├── layouts/
│   └── sections/
├── lib/                      # Utilities
│   ├── hooks/
│   ├── api/
│   └── utils/
└── types/                    # TypeScript types
```

## Component Best Practices

### Component Template

```typescript
'use client'; // Only if needed

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ComponentProps {
  title: string;
  className?: string;
  children?: ReactNode;
}

export function Component({ title, className, children }: ComponentProps) {
  return (
    <div className={cn('base-styles', className)}>
      {/* Component JSX */}
    </div>
  );
}
```

### TypeScript Rules

- Use interfaces for props
- Always destructure props
- Avoid `any` - use `unknown` or proper types
- Use type imports: `import type { ... }`

## Configuration Management

### Centralized Configuration (MANDATORY)

**All environment variables and app settings MUST be accessed through the centralized config file.**

```typescript
// ✅ GOOD - Use centralized config
import { config } from '@/lib/config';

const apiUrl = config.api.baseUrl;
const isDebugEnabled = config.features.enableDebug;

// ❌ BAD - Direct environment variable access
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

### Configuration Structure

The `src/lib/config.ts` file provides:

1. **API Configuration** - Base URL, timeout settings
2. **Authentication** - Token expiry, refresh buffer
3. **OAuth** - Google/Apple client IDs, redirect URIs
4. **App Settings** - Base URL, name, description
5. **Feature Flags** - Enable/disable features
6. **Environment Info** - isDevelopment, isProduction, isServer, isClient
7. **Pagination** - Default page size, max page size
8. **Cache Settings** - TanStack Query stale/cache times

### Usage Examples

```typescript
// API calls
import { config } from '@/lib/config';

const response = await fetch(`${config.api.baseUrl}/users`);

// Feature flags
if (config.features.enableOAuth) {
  // Show OAuth buttons
}

// Environment checks
if (config.env.isDevelopment) {
  console.log('Debug info');
}

// Helper functions
import { getApiUrl, getAppUrl, isFeatureEnabled } from '@/lib/config';

const endpoint = getApiUrl('/auth/login');
const homeUrl = getAppUrl('/dashboard');
const showAnalytics = isFeatureEnabled('enableAnalytics');
```

### Environment Variables

All environment variables are defined in `.env.example`. Copy to `.env.local` and configure:

```bash
# Required
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1

# Optional (with defaults)
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_ENABLE_OAUTH=true
NEXT_PUBLIC_DEFAULT_PAGE_SIZE=20
```

### Configuration Best Practices

1. **Never access `process.env` directly** - Always use `config` object
2. **Add new env vars to config.ts** - Maintain single source of truth
3. **Update .env.example** - Document all new variables
4. **Use type-safe access** - TypeScript will catch typos
5. **Provide sensible defaults** - App should work with minimal config
6. **Document all options** - Add JSDoc comments in config.ts

### ❌ ANTI-PATTERNS - DO NOT DO THIS

```typescript
// ❌ BAD - Direct env access scattered throughout codebase
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ❌ BAD - Hardcoded values
const API_URL = 'http://localhost:3000/api/v1';

// ❌ BAD - Duplicate configuration
const timeout = 30000; // Should come from config

// ✅ GOOD - Use centralized config
import { config } from '@/lib/config';
const apiUrl = config.api.baseUrl;
const timeout = config.api.timeout;
```

## Styling with Tailwind CSS v4

### Best Practices

- **Mobile-first** - Start with mobile, add responsive breakpoints (sm:, md:, lg:, xl:, 2xl:)
- **Use `cn()` utility** for conditional classes
- **Group classes** - Layout, typography, colors, states
- **Avoid arbitrary values** - Use Tailwind's predefined values
- **Use CSS variables** - `bg-background`, `text-foreground`, `bg-primary`

```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  'flex flex-col gap-4 text-sm',
  'sm:flex-row sm:gap-6 sm:text-base',
  isActive && 'border-primary bg-primary/5',
  className
)} />
```

## UI/UX Principles

### Accessibility

- Use semantic HTML and proper ARIA labels
- Ensure keyboard navigation and visible focus states
- Maintain WCAG AA color contrast (4.5:1 for text)

```typescript
<button
  type="button"
  aria-label="Close dialog"
  className="focus:ring-2 focus:ring-primary"
  onClick={onClose}
>
  <X className="h-4 w-4" />
  <span className="sr-only">Close</span>
</button>
```

### Loading States

- **Use skeleton loading** for content (not spinners)
- **Use inline spinners** for buttons
- Match skeleton structure to actual content

```typescript
// Skeleton for lists
function ListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

// Button with loading state
<Button disabled={isLoading}>
  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
</Button>
```

### Error & Empty States

Provide clear, actionable messages with icons and helpful text.

```typescript
// Error state
{error && (
  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
    <AlertCircle className="h-5 w-5 text-destructive" />
    <p>{error.message}</p>
  </div>
)}

// Empty state
if (items.length === 0) {
  return (
    <div className="text-center py-12">
      <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3>No items yet</h3>
      <Button onClick={onCreate}>Create Item</Button>
    </div>
  );
}
```

## Forms with React Hook Form + Zod

```typescript
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(2, 'Name too short'),
});

type FormData = z.infer<typeof schema>;

export function Form() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('email')} />
      {errors.email && <p className="text-destructive">{errors.email.message}</p>}
      <Button type="submit" disabled={isSubmitting}>Submit</Button>
    </form>
  );
}
```

## API Integration with TanStack Query

**MANDATORY: All API calls MUST use TanStack Query** for caching and optimistic updates.

### Setup

```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000, retry: 1 },
      mutations: { retry: 1 },
    },
  }));

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

### API Client

```typescript
// lib/api/client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'API Error');
  return data.data;
}

// lib/api/conversations.ts
export const conversationsApi = {
  getAll: () => fetchApi<Conversation[]>('/conversations'),
  getById: (id: string) => fetchApi<Conversation>(`/conversations/${id}`),
  create: (dto) =>
    fetchApi<Conversation>('/conversations', { method: 'POST', body: JSON.stringify(dto) }),
  update: (id, dto) =>
    fetchApi<Conversation>(`/conversations/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  delete: (id) => fetchApi<void>(`/conversations/${id}`, { method: 'DELETE' }),
};
```

### Query Hooks (MANDATORY)

```typescript
// lib/hooks/use-conversations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query Keys Factory
export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  detail: (id: string) => [...conversationKeys.all, 'detail', id] as const,
};

// Fetch all
export function useConversations() {
  return useQuery({
    queryKey: conversationKeys.lists(),
    queryFn: conversationsApi.getAll,
  });
}

// Fetch one
export function useConversation(id: string) {
  return useQuery({
    queryKey: conversationKeys.detail(id),
    queryFn: () => conversationsApi.getById(id),
    enabled: !!id,
  });
}

// Create with optimistic updates
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: conversationsApi.create,
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: conversationKeys.lists() });
      const previous = queryClient.getQueryData(conversationKeys.lists());
      queryClient.setQueryData(conversationKeys.lists(), (old) => [newItem, ...(old || [])]);
      return { previous };
    },
    onError: (err, newItem, context) => {
      queryClient.setQueryData(conversationKeys.lists(), context?.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}

// Delete with optimistic updates
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: conversationsApi.delete,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: conversationKeys.lists() });
      const previous = queryClient.getQueryData(conversationKeys.lists());
      queryClient.setQueryData(conversationKeys.lists(), (old) =>
        old?.filter((item) => item.id !== id)
      );
      return { previous };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(conversationKeys.lists(), context?.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}
```

### Using Query Hooks

```typescript
'use client';

import { useConversations, useDeleteConversation } from '@/lib/hooks/use-conversations';

export function ConversationList() {
  const { data, isLoading, error } = useConversations();
  const deleteMutation = useDeleteConversation();

  if (isLoading) return <ListSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {data?.map((item) => (
        <div key={item.id}>
          <h3>{item.title}</h3>
          <Button
            onClick={() => deleteMutation.mutate(item.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? <Loader2 className="animate-spin" /> : <Trash />}
          </Button>
        </div>
      ))}
    </div>
  );
}
```

### Advanced Patterns

```typescript
// Prefetching on hover
export function ItemLink({ id, title }) {
  const queryClient = useQueryClient();

  const prefetch = () => {
    queryClient.prefetchQuery({
      queryKey: itemKeys.detail(id),
      queryFn: () => api.getById(id),
    });
  };

  return <Link href={`/items/${id}`} onMouseEnter={prefetch}>{title}</Link>;
}

// Infinite scroll
export function useInfiniteItems() {
  return useInfiniteQuery({
    queryKey: itemKeys.lists(),
    queryFn: ({ pageParam = 1 }) => api.getPage(pageParam),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
  });
}

// Dependent queries
export function useItemWithDetails(id: string) {
  const itemQuery = useItem(id);
  const detailsQuery = useQuery({
    queryKey: ['details', id],
    queryFn: () => api.getDetails(id),
    enabled: !!itemQuery.data,
  });
  return { item: itemQuery.data, details: detailsQuery.data };
}
```

### TanStack Query Guidelines

1. **Always use query keys factory** - Centralize query keys for consistency and easy invalidation
2. **Implement optimistic updates** - Better UX with instant feedback before server response
3. **Use staleTime wisely** - Balance data freshness vs. unnecessary network requests
4. **Prefetch on hover/focus** - Improve perceived performance with predictive loading
5. **Handle loading and error states** - Always provide clear feedback to users
6. **Use enabled option** - Prevent unnecessary requests with conditional fetching
7. **Invalidate queries after mutations** - Keep data in sync across the application
8. **Use React Query DevTools** - Debug cache and queries during development
9. **Set appropriate gcTime** - Control how long unused data stays in cache
10. **Never bypass TanStack Query** - All API calls must go through query/mutation hooks

### ❌ ANTI-PATTERNS - DO NOT DO THIS

```typescript
// ❌ BAD - Direct fetch in component (bypasses caching)
export function ConversationList() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch('/api/conversations')
      .then(r => r.json())
      .then(setData);
  }, []);

  return <div>{/* render */}</div>;
}

// ✅ GOOD - Use TanStack Query
export function ConversationList() {
  const { data, isLoading } = useConversations();
  return <div>{/* render */}</div>;
}
```

```typescript
// ❌ BAD - Manual state management for API data
const [conversations, setConversations] = useState([]);
const [isLoading, setIsLoading] = useState(false);

const fetchConversations = async () => {
  setIsLoading(true);
  const data = await conversationsApi.getAll();
  setConversations(data);
  setIsLoading(false);
};

// ✅ GOOD - Let TanStack Query handle it
const { data: conversations, isLoading } = useConversations();
```

```typescript
// ❌ BAD - No query key factory
useQuery({
  queryKey: ['conversations', id],
  queryFn: () => getConversation(id),
});

// ✅ GOOD - Use centralized query keys
useQuery({
  queryKey: conversationKeys.detail(id),
  queryFn: () => conversationsApi.getById(id),
});
```

```typescript
// ❌ BAD - Not using optimistic updates
const mutation = useMutation({
  mutationFn: conversationsApi.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  },
});

// ✅ GOOD - Implement optimistic updates
const mutation = useMutation({
  mutationFn: conversationsApi.create,
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: conversationKeys.lists() });
    const previous = queryClient.getQueryData(conversationKeys.lists());
    queryClient.setQueryData(conversationKeys.lists(), (old) => [newData, ...old]);
    return { previous };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(conversationKeys.lists(), context.previous);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
  },
});
```

### Query Key Factory Pattern

Always create a centralized query key factory:

```typescript
// lib/query-keys.ts
export const queryKeys = {
  conversations: {
    all: ['conversations'] as const,
    lists: () => [...queryKeys.conversations.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.conversations.lists(), { filters }] as const,
    details: () => [...queryKeys.conversations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.conversations.details(), id] as const,
  },
  users: {
    all: ['users'] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
  messages: {
    all: ['messages'] as const,
    byConversation: (conversationId: string) =>
      [...queryKeys.messages.all, conversationId] as const,
  },
};
```

### Server Actions (Next.js 15)

Use Server Actions for form submissions and mutations:

```typescript
// app/actions/waitlist.ts
'use server';

import { z } from 'zod';

const waitlistSchema = z.object({
  email: z.string().email(),
});

export async function joinWaitlist(formData: FormData) {
  const validatedFields = waitlistSchema.safeParse({
    email: formData.get('email'),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      error: 'Invalid email address',
    };
  }

  try {
    // Database operation
    await db.waitlist.create({
      data: { email: validatedFields.data.email },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to join waitlist',
    };
  }
}
```

```typescript
// Component using Server Action
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { joinWaitlist } from '@/app/actions/waitlist';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Joining...' : 'Join Waitlist'}
    </Button>
  );
}

export function WaitlistForm() {
  const [state, formAction] = useFormState(joinWaitlist, null);

  return (
    <form action={formAction}>
      <Input name="email" type="email" required />
      {state?.error && <p className="text-destructive">{state.error}</p>}
      {state?.success && <p className="text-green-600">Successfully joined!</p>}
      <SubmitButton />
    </form>
  );
}
```

## Performance Optimization

### Image Optimization

Always use Next.js Image component:

```typescript
import Image from 'next/image';

// ✅ Good - Optimized
<Image
  src="/hero-image.png"
  alt="Mukti platform interface"
  width={1200}
  height={600}
  priority // For above-the-fold images
  className="rounded-lg"
/>

// ✅ Good - Responsive
<Image
  src="/hero-image.png"
  alt="Mukti platform interface"
  fill
  className="object-cover"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>

// ❌ Bad - Not optimized
<img src="/hero-image.png" alt="Mukti platform interface" />
```

### Code Splitting

- **Dynamic imports** - Lazy load heavy components
- **Route-based splitting** - Automatic with App Router

```typescript
import dynamic from 'next/dynamic';

// ✅ Good - Lazy load heavy component
const ConversationEditor = dynamic(
  () => import('@/components/conversation/conversation-editor'),
  {
    loading: () => <div>Loading editor...</div>,
    ssr: false, // Disable SSR if component uses browser APIs
  }
);

// ✅ Good - Lazy load animation library
const AnimatedSection = dynamic(
  () => import('@/components/animated-section'),
  { ssr: true }
);
```

### Memoization

Use React memoization wisely:

```typescript
import { memo, useMemo, useCallback } from 'react';

// ✅ Good - Memoize expensive computations
export function ConversationList({ conversations }: ConversationListProps) {
  const sortedConversations = useMemo(
    () => conversations.sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations]
  );

  const handleDelete = useCallback((id: string) => {
    // Handle delete
  }, []);

  return <div>{/* Render */}</div>;
}

// ✅ Good - Memoize component
export const ConversationCard = memo(function ConversationCard({
  conversation
}: ConversationCardProps) {
  return <div>{/* Render */}</div>;
});
```

## State Management

### Local State (useState)

For component-level state:

```typescript
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

### Zustand

For shared state across components and for global state management:

```typescript
// lib/stores/conversation-store.ts
import { create } from 'zustand';
import type { Conversation } from '@/types/conversation.types';

interface ConversationState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (id: string) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  activeConversationId: null,
  isLoading: false,
  error: null,

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === id ? { ...conv, ...updates } : conv
      ),
    })),

  deleteConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((conv) => conv.id !== id),
      activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
    })),
}));
```

```typescript
// Usage in component
'use client';

import { useConversationStore } from '@/lib/stores/conversation-store';

export function ConversationList() {
  const { conversations, addConversation } = useConversationStore();

  return <div>{/* Render conversations */}</div>;
}
```

## Testing Guidelines

### Component Testing

Use React Testing Library:

```typescript
// components/__tests__/waitlist-form.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WaitlistForm } from '../waitlist-form';

describe('WaitlistForm', () => {
  it('renders form fields', () => {
    render(<WaitlistForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /join waitlist/i })).toBeInTheDocument();
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<WaitlistForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /join waitlist/i });

    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<WaitlistForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /join waitlist/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('test@example.com');
    });
  });
});
```

## SEO Best Practices

### Metadata API

Use Next.js 15 Metadata API:

```typescript
// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Mukti - Cognitive Liberation Platform',
    template: '%s | Mukti',
  },
  description:
    'AI mentor that uses the Socratic method to guide you toward your own insights. Break free from cognitive dependency.',
  keywords: ['AI', 'Socratic method', 'critical thinking', 'cognitive liberation'],
  authors: [{ name: 'Mukti Team' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://mukti.app',
    siteName: 'Mukti',
    title: 'Mukti - Cognitive Liberation Platform',
    description: 'Think for yourself, not through AI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Mukti Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mukti - Cognitive Liberation Platform',
    description: 'Think for yourself, not through AI',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};
```

```typescript
// app/conversations/[id]/page.tsx
import type { Metadata } from 'next';

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const conversation = await getConversation(params.id);

  return {
    title: conversation.title,
    description: `Socratic inquiry session: ${conversation.title}`,
  };
}
```

### Structured Data

Add JSON-LD for rich snippets:

```typescript
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Mukti',
    description: 'Cognitive Liberation Platform',
    url: 'https://mukti.app',
    applicationCategory: 'EducationalApplication',
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

## Environment Variables

### Configuration

```typescript
// lib/config.ts
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  environment: process.env.NODE_ENV,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
} as const;

// Usage
import { config } from '@/lib/config';

const response = await fetch(`${config.apiUrl}/conversations`);
```

### Environment Variables Naming

- **Public variables**: `NEXT_PUBLIC_*` (exposed to browser)
- **Private variables**: No prefix (server-only)

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Server-only
DATABASE_URL=mongodb://localhost:27017/mukti
JWT_SECRET=your-secret-key
```

## Error Boundaries

### Global Error Handling

```typescript
// app/error.tsx
'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center max-w-md">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-6">
          We encountered an unexpected error. Please try again.
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
```

### Not Found Page

```typescript
// app/not-found.tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page not found</h2>
        <p className="text-muted-foreground mb-6">
          The page you're looking for doesn't exist.
        </p>
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
```

## Code Quality

### ESLint Configuration

Follow project ESLint rules:

- Use `eslint-plugin-perfectionist` for import sorting
- Enable TypeScript strict mode
- Use `@typescript-eslint` recommended rules

### Code Comments

- **TSDoc for functions** - Document public APIs
- **Type/interface JSDoc** - Use a single block with `@property` tags; do not add separate docblocks on each property
- **Inline comments** - Explain complex logic
- **TODO comments** - Track future improvements

```typescript
/**
 * Sidebar navigation item
 * @property {number | string} [badge] - Badge content (e.g., count)
 * @property {boolean} [disabled] - Whether item is disabled
 * @property {string} href - Navigation path
 * @property {ReactNode} icon - Icon component
 * @property {boolean} [isActive] - Whether item is active
 * @property {string} label - Display label
 */
export interface SidebarNavItem {
  badge?: number | string;
  disabled?: boolean;
  href: string;
  icon: ReactNode;
  isActive?: boolean;
  label: string;
}
```

Avoid per-property docblocks inside the interface (e.g., separate `/** ... */` blocks above each field).

````typescript
/**
 * Formats a conversation timestamp into a human-readable relative time.
 *
 * @param timestamp - ISO 8601 timestamp string
 * @returns Formatted relative time (e.g., "2 hours ago")
 *
 * @example
 * ```typescript
 * formatRelativeTime('2024-01-01T12:00:00Z') // "2 hours ago"
 * ```
 */
export function formatRelativeTime(timestamp: string): string {
  // Implementation
}
````

## Checklist for New Features

- Component follows naming conventions (kebab-case file, PascalCase export)
- Uses 'use client' only when necessary
- TypeScript interfaces defined for props
- Responsive design implemented (mobile-first)
- Accessibility features included (ARIA labels, keyboard navigation)
- **Skeleton loading implemented for async content**
- Loading and error states handled
- Tailwind classes organized with `cn()` utility
- Images optimized with Next.js Image component
- Forms use React Hook Form + Zod validation
- **API calls use TanStack Query hooks (MANDATORY)**
- **Query keys defined in centralized factory**
- **Optimistic updates implemented for mutations**
- **Proper staleTime and gcTime configured**
- **Loading, error, and success states handled for queries**
- Animations are subtle and respect user preferences
- Component is tested (if critical functionality)
- SEO metadata added (if new page)
- Code follows ESLint rules
- Imports are properly organized

---

## Summary

This document establishes frontend standards for Mukti Web to ensure:

- **Consistent code organization** with clear naming conventions
- **Type-safe development** with TypeScript and Zod
- **Accessible UI** following WCAG guidelines
- **Performant applications** with Next.js 15 optimizations
- **Smart data fetching** with TanStack Query for automatic caching and optimistic updates
- **Maintainable codebase** with clear patterns and best practices
- **Excellent UX** with proper loading, error, and empty states

**Critical Rule: ALL API calls must use TanStack Query.** Direct fetch calls, manual state management for server data, or bypassing the query cache is strictly prohibited. This ensures consistent caching behavior, automatic background refetching, and optimal performance across the application.

Follow these guidelines to maintain code quality and deliver a polished user experience aligned with Mukti's philosophy of cognitive liberation.
