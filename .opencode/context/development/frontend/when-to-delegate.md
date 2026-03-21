<!-- Context: development/frontend/when-to-delegate | Priority: high | Version: 2.0 | Updated: 2026-03-21 -->

# Frontend Patterns — Mukti Web (`@mukti/web`)

**Purpose**: Next.js 15 / React 19 patterns, state management, and data fetching for `@mukti/web`

---

## App Router Structure

```
packages/mukti-web/src/app/
├── (auth)/auth/            # Login, forgot/reset password, verify email, OAuth callbacks
│   └── [callback]/         # Google OAuth callback
├── dashboard/              # Authenticated app — catch-all [[...slug]]
│   ├── canvas/[id]/        # Thinking Canvas session (XyFlow)
│   ├── conversations/[id]/ # Text conversation (SSE stream)
│   ├── community/          # Technique community
│   ├── settings/           # User settings + BYOK keys
│   └── ...                 # help, messages, reports, resources, security, sessions
├── canvas/[id]/            # Public canvas viewer (unauthenticated)
├── chat/[id]/              # Public chat viewer (unauthenticated)
└── api/waitlist/           # Next.js API route (waitlist signup)
```

---

## Server vs. Client Components

**Server Components (default)** — use for:

- Initial data fetch (with TanStack Query prefetch)
- SEO-critical pages
- Layout wrappers that don't need interactivity

**Client Components (`'use client'`)** — use for:

- Zustand store access (`useAuthStore`, `useCanvasStore`, etc.)
- TanStack Query hooks (`useQuery`, `useMutation`)
- Event handlers, `useState`, `useEffect`
- SSE streams (`useConversationStream`, `useDialogueStream`)
- React Flow canvas (`canvas/[id]/` page)

**Rule**: Keep client boundary as deep as possible. Page-level `'use client'` is a smell.

---

## State Management (Zustand Stores)

| Store                | File                          | Persisted | Purpose                                     |
| -------------------- | ----------------------------- | --------- | ------------------------------------------- |
| `useAuthStore`       | `stores/auth-store.ts`        | user only | Auth state; access token in **memory only** |
| `useCanvasStore`     | `stores/canvas-store.ts`      | No        | React Flow nodes/edges + optimistic updates |
| `useAiStore`         | `stores/ai-store.ts`          | No        | Active model, AI settings                   |
| `useChatStore`       | `stores/chat-store.ts`        | No        | Conversation state                          |
| `useWizardStore`     | `stores/wizard-store.ts`      | No        | Canvas setup wizard step state              |
| `useThoughtMapStore` | `stores/thought-map-store.ts` | No        | Thought map state                           |

### Auth Store Pattern

```typescript
// Access token: in-memory ONLY (cleared on reload)
// User: persisted to localStorage ('mukti-auth-storage')
// isAuthenticated: derived — requires BOTH user + accessToken

const { user, isAuthenticated, accessToken, setAuth, clearAuth } = useAuthStore();

// Selector hooks (preferred — prevent full-store re-renders)
const user = useUser();
const isAuthenticated = useIsAuthenticated();
const accessToken = useAccessToken();
```

On reload: `accessToken = null`, `isAuthenticated = false`, `user` from localStorage.  
`useAuth` hook restores session via refresh token cookie (httpOnly).

### Canvas Store Optimistic Updates

```typescript
// Pattern: apply optimistically, rollback on API failure
const prevNodes = useCanvasStore.getState().nodes;
updateNodes(optimisticNodes); // Apply immediately
try {
  await api.updateCanvas(id, data);
} catch {
  setNodes(prevNodes); // Rollback
}
```

---

## Data Fetching (TanStack Query v5)

```typescript
// Always use query keys from the factory
import { queryKeys } from '@/lib/query-keys';

// Server query
const { data: conversations } = useQuery({
  queryKey: queryKeys.conversations.list(),
  queryFn: () => conversationsApi.list(),
});

// Mutation with optimistic update
const mutation = useMutation({
  mutationFn: (data) => canvasApi.update(id, data),
  onMutate: async (data) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.canvas.session(id) });
    const prev = queryClient.getQueryData(queryKeys.canvas.session(id));
    queryClient.setQueryData(queryKeys.canvas.session(id), updater);
    return { prev };
  },
  onError: (_, __, context) =>
    queryClient.setQueryData(queryKeys.canvas.session(id), context?.prev),
  onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.canvas.session(id) }),
});
```

---

## API Client

```typescript
// Singleton client with interceptor pipeline:
// 1. Auth header (Bearer token from Zustand)
// 2. CSRF token (X-CSRF-Token, state-mutating methods only)
// 3. 401 → token refresh via httpOnly cookie → retry
// 4. Retry on 5xx / 429 with exponential backoff

import { apiClient } from '@/lib/api/client';
const data = await apiClient.get<Conversation[]>('/conversations');
const result = await apiClient.post<{ jobId: string }>(`/conversations/${id}/messages`, body);
```

API modules: `lib/api/auth.ts`, `lib/api/canvas.ts`, `lib/api/conversations.ts`, `lib/api/dialogue.ts`, `lib/api/ai.ts`

---

## SSE Streams (Conversation / Dialogue)

```typescript
// useConversationStream hook manages EventSource lifecycle
const { events, isConnected } = useConversationStream(conversationId);

// Events: processing | progress | message | complete | error
// Hook connects when conversationId changes, disconnects on unmount
```

---

## UI Stack

| Concern       | Library                      | Notes                                   |
| ------------- | ---------------------------- | --------------------------------------- |
| Canvas        | XyFlow/React v12             | `canvas/[id]/` — React Flow nodes       |
| UI primitives | Radix UI                     | Dialog, Dropdown, Tabs, Tooltip, etc.   |
| Animations    | Framer Motion v12            | Page transitions, node animations       |
| 3D / scenes   | Three.js + React Three Fiber | Background scenes only                  |
| Styling       | Tailwind v4 + `japandi.css`  | Japandi aesthetic — earthy, minimal     |
| Forms         | React Hook Form v7 + Zod v4  | Zod on frontend, class-validator on API |
| Notifications | Sonner                       | Toast notifications                     |
| Theme         | next-themes                  | light / dark / system                   |
| Icons         | Lucide React                 | Only Lucide — never mix icon libraries  |
| Fonts         | Geist Sans + Geist Mono      | From `next/font/google`                 |

---

## When to Use Frontend Specialist

**Delegate** (`OpenFrontendSpecialist`):

- New visual design from scratch (Japandi theme extensions, new palette)
- Complex animation sequences (Framer Motion orchestration)
- Design system extensions (new Tailwind v4 tokens, CSS custom properties)
- Accessibility-focused UI builds (WCAG compliance)

**Handle directly**:

- Single component edits or bug fixes
- Adding new pages following existing patterns
- Form integration with React Hook Form + Zod
- TanStack Query / Zustand wiring

---

## Codebase References

- Stores: `packages/mukti-web/src/lib/stores/`
- API client: `packages/mukti-web/src/lib/api/client.ts`
- API modules: `packages/mukti-web/src/lib/api/`
- Query keys: `packages/mukti-web/src/lib/query-keys.ts`
- Hooks: `packages/mukti-web/src/lib/hooks/`
- App routes: `packages/mukti-web/src/app/`
