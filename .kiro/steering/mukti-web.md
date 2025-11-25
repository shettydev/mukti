# Frontend Guidelines - Mukti Web

## Next.js 15 & React 19 Architecture

### App Router Structure

- **Use App Router exclusively** - No Pages Router patterns
- **Server Components by default** - Add 'use client' only when needed
- **File-based routing** - Leverage Next.js conventions

```
src/app/
├── (auth)/              # Route groups for layout sharing
│   ├── login/
│   └── signup/
├── (dashboard)/
│   ├── conversations/
│   └── settings/
├── api/                 # API routes
│   └── waitlist/
├── layout.tsx           # Root layout
├── page.tsx             # Home page
├── loading.tsx          # Loading UI
├── error.tsx            # Error boundary
└── not-found.tsx        # 404 page
```

### When to Use 'use client'

Only add 'use client' directive when you need:

- React hooks (useState, useEffect, useContext, etc.)
- Event handlers (onClick, onChange, etc.)
- Browser APIs (localStorage, window, document)
- Third-party libraries that use client-only features

- Animation libraries (Framer Motion, GSAP)

**Keep Server Components when possible** for better performance and SEO.

```typescript
// ❌ Bad - Unnecessary client component
'use client';

export function StaticCard({ title, description }) {
  return (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

// ✅ Good - Server component (no directive needed)
export function StaticCard({ title, description }) {
  return (
    <div>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

// ✅ Good - Client component only when needed
'use client';

import { useState } from 'react';

export function InteractiveCard({ title, description }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div onClick={() => setIsExpanded(!isExpanded)}>
      <h2>{title}</h2>
      {isExpanded && <p>{description}</p>}
    </div>
  );
}
```

## File and Folder Naming Conventions

### Files

- **Components**: `kebab-case.tsx` (e.g., `hero-section.tsx`, `waitlist-form.tsx`)

- **Pages**: `page.tsx` (Next.js convention)
- **Layouts**: `layout.tsx` (Next.js convention)
- **API Routes**: `route.ts` (Next.js convention)
- **Hooks**: `use-{name}.ts` (e.g., `use-waitlist.ts`, `use-theme.ts`)
- **Utils**: `{name}.ts` (e.g., `utils.ts`, `cn.ts`, `format-date.ts`)
- **Types**: `{name}.types.ts` or `types.ts` (e.g., `conversation.types.ts`)
- **Constants**: `{name}.constants.ts` or `constants.ts`

### Folders

```
src/
├── app/                      # Next.js App Router
│   ├── (marketing)/          # Route group
│   ├── api/                  # API routes
│   └── [dynamic]/            # Dynamic routes
├── components/               # React components
│   ├── ui/                   # shadcn/ui base components
│   ├── magicui/              # Magic UI components
│   ├── reactbits/            # Custom animated components
│   ├── forms/                # Form components
│   ├── layouts/              # Layout components
│   └── sections/             # Page sections (hero, features, etc.)
├── lib/                      # Utilities and configurations
│   ├── hooks/                # Custom React hooks
│   ├── db/                   # Database clients
│   ├── api/                  # API client functions
│   └── utils/                # Utility functions
├── types/                    # TypeScript type definitions
├── styles/                   # Global styles (if needed beyond globals.css)
└── config/                   # App configuration
```

## Component Organization

### Component Structure

Organize components by feature or type:

```
components/
├── ui/                       # Base UI components (shadcn/ui)
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   └── dialog.tsx
├── forms/                    # Form-specific components
│   ├── waitlist-form.tsx
│   ├── contact-form.tsx
│   └── field-error.tsx
├── layouts/                  # Layout components
│   ├── navbar.tsx
│   ├── footer.tsx
│   └── sidebar.tsx
├── sections/                 # Page sections
│   ├── hero.tsx
│   ├── features.tsx
│   ├── testimonials.tsx
│   └── pricing.tsx
├── conversation/             # Feature-specific components
│   ├── conversation-list.tsx
│   ├── conversation-card.tsx
│   ├── message-bubble.tsx
│   └── technique-selector.tsx
└── shared/                   # Shared/common components
    ├── loading-spinner.tsx
    ├── error-message.tsx
    └── empty-state.tsx
```

### Component Naming

- **PascalCase** for component names and files export
- **Descriptive names** that indicate purpose
- **Avoid generic names** like `Component1`, `Wrapper`, `Container`

```typescript
// ✅ Good
export function WaitlistForm() {}
export function ConversationCard() {}
export function HeroSection() {}

// ❌ Bad
export function Form() {}
export function Card() {}
export function Section() {}
```

### Component Template

Follow this structure for consistency:

```typescript
'use client'; // Only if needed

import type { ComponentProps } from 'react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Types/Interfaces
interface WaitlistFormProps {
  onSubmit?: (email: string) => void;
  className?: string;
}

// Component
export function WaitlistForm({ onSubmit, className }: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onSubmit?.(email);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      {/* Component JSX */}
    </form>
  );
}
```

## TypeScript Practices

### Type Definitions

- **Use interfaces for props** - More extensible than types
- **Export types** - Make them reusable
- **Avoid `any`** - Use `unknown` or proper types
- **Use type imports** - `import type { ... }`

```typescript
// ✅ Good
```

import type { ReactNode } from 'react';

interface CardProps {
title: string;
description: string;
children?: ReactNode;
onClick?: () => void;
}

// ❌ Bad
interface CardProps {
title: any;
description: any;
children: any;
onClick: any;
}

````

### Props Destructuring

Always destructure props for clarity:

```typescript
// ✅ Good
export function Card({ title, description, className }: CardProps) {
  return <div className={className}>{title}</div>;
}

// ❌ Bad
export function Card(props: CardProps) {
  return <div className={props.className}>{props.title}</div>;
}
````

## Styling with Tailwind CSS v4

### Class Organization

Use `cn()` utility for conditional classes:

```typescript
import { cn } from '@/lib/utils';

// ✅ Good - Organized and readable
<div
  className={cn(
    // Base styles
    'rounded-lg border bg-card p-6',
    // Responsive styles
    'sm:p-8 md:p-10',
    // State styles
    isActive && 'border-primary bg-primary/5',
    isDisabled && 'opacity-50 cursor-not-allowed',
    // Custom className
    className
  )}
>

// ❌ Bad - Hard to read
<div className={`rounded-lg border bg-card p-6 sm:p-8 md:p-10 ${isActive ? 'border-primary bg-primary/5' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
```

### Tailwind Best Practices

1. **Mobile-first approach** - Start with mobile styles, add responsive breakpoints
2. **Use design tokens** - Leverage Tailwind's color palette and spacing scale
3. **Avoid arbitrary values** - Use Tailwind's predefined values when possible
4. **Group related classes** - Layout, typography, colors, states

```typescript
// ✅ Good - Mobile-first, organized
<div className={cn(
  // Layout
  'flex flex-col gap-4',
  'sm:flex-row sm:gap-6',
  'md:gap-8',
  // Typography
  'text-sm font-medium',
  'sm:text-base',
  // Colors
  'text-foreground bg-background',
  // States
  'hover:bg-accent transition-colors'
)}>

// ❌ Bad - Desktop-first, arbitrary values
<div className="flex-row gap-[24px] text-[16px] text-[#000000] hover:bg-[#f5f5f5]">
```

### CSS Variables for Theming

Use CSS variables defined in `globals.css`:

```css
/* globals.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
  }
}
```

```typescript
// Use in components
<div className="bg-background text-foreground">
<Button className="bg-primary text-primary-foreground">
```

## UI/UX Design Principles

### Accessibility First

- **Semantic HTML** - Use proper HTML elements
- **ARIA labels** - Add labels for screen readers
- **Keyboard navigation** - Ensure all interactive elements are keyboard accessible
- **Focus indicators** - Visible focus states for keyboard users
- **Color contrast** - WCAG AA minimum (4.5:1 for text)

```typescript
// ✅ Good - Accessible
<button
  type="button"
  aria-label="Close dialog"
  className="focus:ring-2 focus:ring-primary focus:outline-none"
  onClick={onClose}
>
  <X className="h-4 w-4" />
  <span className="sr-only">Close</span>
</button>

// ❌ Bad - Not accessible
<div onClick={onClose}>
  <X className="h-4 w-4" />
</div>
```

### Responsive Design

- **Mobile-first** - Design for mobile, enhance for desktop
- **Breakpoints** - Use Tailwind's responsive prefixes consistently
  - `sm:` - 640px
  - `md:` - 768px
  - `lg:` - 1024px
  - `xl:` - 1280px
  - `2xl:` - 1536px

```typescript
// ✅ Good - Progressive enhancement
<div className={cn(
  'grid grid-cols-1 gap-4',
  'sm:grid-cols-2 sm:gap-6',
  'lg:grid-cols-3 lg:gap-8',
  'xl:grid-cols-4'
)}>
```

### Loading States

**Use skeleton loading for better perceived performance.** Skeleton screens provide visual placeholders that match the content structure, creating a smoother loading experience than spinners.

#### Skeleton Component

```typescript
// components/ui/skeleton.tsx
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}
```

#### Button Loading States

For buttons, use inline spinners:

```typescript
// ✅ GOOD - Icon button with loading state
export function DeleteButton({ onDelete }: { onDelete: () => Promise<void> }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash className="h-4 w-4" />
      )}
    </Button>
  );
}
```

#### Loading State Best Practices

1. **Match content structure** - Skeleton should mirror the actual content layout
2. **Use appropriate count** - Show 3-5 skeleton items for lists
3. **Maintain spacing** - Keep the same padding and margins as real content
4. **Avoid full-page spinners** - Use skeletons for better UX
5. **Combine with suspense** - Use React Suspense boundaries where appropriate

```typescript
// ❌ BAD - Generic spinner
export function ConversationList() {
  const { data, isLoading } = useConversations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return <div>{/* content */}</div>;
}

// ✅ GOOD - Skeleton matching content structure
export function ConversationList() {
  const { data, isLoading } = useConversations();

  if (isLoading) {
    return <ConversationListSkeleton />;
  }

  return <div>{/* content */}</div>;
}
```

### Error Handling

Provide clear, actionable error messages:

```typescript
// ✅ Good - Helpful error message
{error && (
  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
    <div className="flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
      <div>
        <h4 className="font-semibold text-destructive">Failed to join waitlist</h4>
        <p className="text-sm text-muted-foreground mt-1">
          {error.message || 'Please check your email and try again.'}
        </p>
      </div>
    </div>
  </div>
)}

// ❌ Bad - Generic error
{error && <p className="text-red-500">Error!</p>}
```

### Empty States

Design meaningful empty states:

```typescript
// ✅ Good
export function ConversationList({ conversations }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Start your first Socratic inquiry session to begin your journey toward cognitive liberation.
        </p>
        <Button onClick={onCreateConversation}>
          <Plus className="mr-2 h-4 w-4" />
          Start Conversation
        </Button>
      </div>
    );
  }

  return <div>{/* Render conversations */}</div>;
}
```

## Custom Hooks

### Hook Naming

- **Prefix with `use`** - React convention
- **Descriptive names** - `useWaitlist`, `useConversation`, `useAuth`
- **Return objects** - For multiple values, return an object

## Form Handling

### React Hook Form + Zod

Use React Hook Form with Zod for type-safe validation:

```typescript
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Schema definition
const waitlistSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

type WaitlistFormData = z.infer<typeof waitlistSchema>;

export function WaitlistForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
  });

  const onSubmit = async (data: WaitlistFormData) => {
    // Handle form submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="John Doe"
          aria-invalid={errors.name ? 'true' : 'false'}
        />
        {errors.name && (
          <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="john@example.com"
          aria-invalid={errors.email ? 'true' : 'false'}
        />
        {errors.email && (
          <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Joining...' : 'Join Waitlist'}
      </Button>
    </form>
  );
}
```

## API Integration with TanStack Query

**MANDATORY: All API calls MUST use TanStack Query** for automatic caching, background refetching, and optimistic updates.

### Installation

```bash
bun add @tanstack/react-query
bun add -D @tanstack/react-query-devtools
```

### Setup TanStack Query

```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
            retry: 1,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

```typescript
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### API Client Pattern

Create centralized API client functions:

```typescript
// lib/api/client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.error?.message || 'An error occurred',
      response.status,
      data.error?.code
    );
  }

  return data.data;
}
```

```typescript
// lib/api/conversations.ts
import type { Conversation, CreateConversationDto } from '@/types/conversation.types';
import { fetchApi } from './client';

export const conversationsApi = {
  getAll: () => fetchApi<Conversation[]>('/conversations'),

  getById: (id: string) => fetchApi<Conversation>(`/conversations/${id}`),

  create: (dto: CreateConversationDto) =>
    fetchApi<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  update: (id: string, dto: Partial<CreateConversationDto>) =>
    fetchApi<Conversation>(`/conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  delete: (id: string) =>
    fetchApi<void>(`/conversations/${id}`, {
      method: 'DELETE',
    }),
};
```

### Query Hooks Pattern (MANDATORY)

**All API interactions MUST use TanStack Query hooks.** Create custom hooks for each resource:

```typescript
// lib/hooks/use-conversations.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Conversation, CreateConversationDto } from '@/types/conversation.types';
import { conversationsApi } from '@/lib/api/conversations';

// Query Keys - Centralized for consistency
export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (filters: string) => [...conversationKeys.lists(), { filters }] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
};

// ✅ Fetch all conversations with automatic caching
export function useConversations() {
  return useQuery({
    queryKey: conversationKeys.lists(),
    queryFn: conversationsApi.getAll,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  });
}

// ✅ Fetch single conversation with automatic caching
export function useConversation(id: string) {
  return useQuery({
    queryKey: conversationKeys.detail(id),
    queryFn: () => conversationsApi.getById(id),
    enabled: !!id, // Only fetch if id exists
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
  });
}

// ✅ Create conversation with optimistic updates
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: conversationsApi.create,
    onMutate: async (newConversation) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: conversationKeys.lists() });

      // Snapshot previous value
      const previousConversations = queryClient.getQueryData(conversationKeys.lists());

      // Optimistically update cache
      queryClient.setQueryData<Conversation[]>(conversationKeys.lists(), (old) => [
        { ...newConversation, id: 'temp-id', createdAt: new Date().toISOString() } as Conversation,
        ...(old || []),
      ]);

      return { previousConversations };
    },
    onError: (err, newConversation, context) => {
      // Rollback on error
      queryClient.setQueryData(conversationKeys.lists(), context?.previousConversations);
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      // Set the new conversation in cache
      queryClient.setQueryData(conversationKeys.detail(data.id), data);
    },
  });
}

// ✅ Update conversation with optimistic updates
export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateConversationDto> }) =>
      conversationsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: conversationKeys.detail(id) });

      const previousConversation = queryClient.getQueryData(conversationKeys.detail(id));

      queryClient.setQueryData<Conversation>(conversationKeys.detail(id), (old) => ({
        ...old!,
        ...data,
      }));

      return { previousConversation };
    },
    onError: (err, { id }, context) => {
      queryClient.setQueryData(conversationKeys.detail(id), context?.previousConversation);
    },
    onSuccess: (data, { id }) => {
      queryClient.setQueryData(conversationKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}

// ✅ Delete conversation with optimistic updates
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: conversationsApi.delete,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: conversationKeys.lists() });

      const previousConversations = queryClient.getQueryData(conversationKeys.lists());

      queryClient.setQueryData<Conversation[]>(
        conversationKeys.lists(),
        (old) => old?.filter((conv) => conv.id !== id) || []
      );

      return { previousConversations };
    },
    onError: (err, id, context) => {
      queryClient.setQueryData(conversationKeys.lists(), context?.previousConversations);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
      queryClient.removeQueries({ queryKey: conversationKeys.detail(id) });
    },
  });
}
```

### Using Query Hooks in Components

```typescript
// components/conversation/conversation-list.tsx
'use client';

import { useConversations, useDeleteConversation } from '@/lib/hooks/use-conversations';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Trash } from 'lucide-react';

function ConversationListSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
          <Skeleton className="h-6 w-[250px]" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function ConversationList() {
  const { data: conversations, isLoading, error } = useConversations();
  const deleteMutation = useDeleteConversation();

  if (isLoading) {
    return <ConversationListSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load conversations</p>
        <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {conversations?.map((conversation) => (
        <div key={conversation.id} className="flex items-center justify-between p-4 border rounded-lg">
          <h3>{conversation.title}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteMutation.mutate(conversation.id)}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash className="h-4 w-4" />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
```

```typescript
// components/conversation/create-conversation-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateConversation } from '@/lib/hooks/use-conversations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  technique: z.enum(['elenchus', 'maieutic', 'dialectic']),
});

type FormData = z.infer<typeof schema>;

export function CreateConversationForm() {
  const { toast } = useToast();
  const createMutation = useCreateConversation();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createMutation.mutateAsync(data);
      toast({
        title: 'Success',
        description: 'Conversation created successfully',
      });
      reset();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create conversation',
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input {...register('title')} placeholder="Conversation title" />
      {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}

      <Button type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? 'Creating...' : 'Create Conversation'}
      </Button>
    </form>
  );
}
```

### Advanced Caching Patterns

#### Prefetching Data

Prefetch data before navigation for instant page loads:

```typescript
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { conversationKeys } from '@/lib/hooks/use-conversations';
import { conversationsApi } from '@/lib/api/conversations';
import Link from 'next/link';

export function ConversationLink({ id, title }: { id: string; title: string }) {
  const queryClient = useQueryClient();

  const prefetchConversation = () => {
    queryClient.prefetchQuery({
      queryKey: conversationKeys.detail(id),
      queryFn: () => conversationsApi.getById(id),
      staleTime: 60 * 1000,
    });
  };

  return (
    <Link
      href={`/conversations/${id}`}
      onMouseEnter={prefetchConversation}
      onFocus={prefetchConversation}
    >
      {title}
    </Link>
  );
}
```

#### Infinite Queries (Pagination)

For infinite scroll or load-more patterns:

```typescript
// lib/hooks/use-conversations.ts
import { useInfiniteQuery } from '@tanstack/react-query';

export function useInfiniteConversations() {
  return useInfiniteQuery({
    queryKey: conversationKeys.lists(),
    queryFn: ({ pageParam = 1 }) =>
      fetchApi<{ data: Conversation[]; nextPage: number | null }>(
        `/conversations?page=${pageParam}&limit=20`
      ),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
  });
}
```

```typescript
// Component using infinite scroll
'use client';

import { useInfiniteConversations } from '@/lib/hooks/use-conversations';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';

export function InfiniteConversationList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteConversations();

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  return (
    <div>
      {data?.pages.map((page) =>
        page.data.map((conversation) => (
          <div key={conversation.id}>{conversation.title}</div>
        ))
      )}
      <div ref={ref}>{isFetchingNextPage && 'Loading more...'}</div>
    </div>
  );
}
```

#### Dependent Queries

Fetch data that depends on other queries:

```typescript
// Fetch conversation, then fetch messages
export function useConversationWithMessages(conversationId: string) {
  const conversationQuery = useConversation(conversationId);

  const messagesQuery = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => fetchApi(`/conversations/${conversationId}/messages`),
    enabled: !!conversationQuery.data, // Only fetch when conversation is loaded
  });

  return {
    conversation: conversationQuery.data,
    messages: messagesQuery.data,
    isLoading: conversationQuery.isLoading || messagesQuery.isLoading,
  };
}
```

### TanStack Query Best Practices

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
- **Inline comments** - Explain complex logic
- **TODO comments** - Track future improvements

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

## Common Patterns

### Modal/Dialog Pattern

```typescript
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function CreateConversationDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Conversation</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Conversation</DialogTitle>
          <DialogDescription>
            Start a new Socratic inquiry session
          </DialogDescription>
        </DialogHeader>
        {/* Form content */}
      </DialogContent>
    </Dialog>
  );
}
```

### Dropdown Menu Pattern

```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash } from 'lucide-react';

export function ConversationActions({ conversationId }: { conversationId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleEdit(conversationId)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleDelete(conversationId)}
          className="text-destructive"
        >
          <Trash className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Toast Notification Pattern

```typescript
'use client';

import { useToast } from '@/components/ui/use-toast';

export function ConversationForm() {
  const { toast } = useToast();

  const handleSubmit = async () => {
    try {
      await createConversation();

      toast({
        title: 'Success',
        description: 'Conversation created successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create conversation',
        variant: 'destructive',
      });
    }
  };

  return <form onSubmit={handleSubmit}>{/* Form fields */}</form>;
}
```

## Performance Monitoring

### Web Vitals

Monitor Core Web Vitals:

```typescript
// app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
```

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
