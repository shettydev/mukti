<!-- Context: core/standards | Priority: critical | Version: 1.0 | Updated: 2026-03-21 -->

# Mukti Codebase Standards

**Complete Reference Guide**
_Last Updated: Mar 2026_
_Monorepo: `packages/mukti-api/` (NestJS 11) + `packages/mukti-web/` (Next.js 15)_

---

## Table of Contents

1. [Naming Conventions](#1-naming-conventions)
2. [File & Directory Structure](#2-file--directory-structure)
3. [Import Organization](#3-import-organization)
4. [TypeScript Patterns](#4-typescript-patterns)
5. [Error Handling](#5-error-handling)
6. [Testing Standards](#6-testing-standards)
7. [Formatting Rules](#7-formatting-rules)
8. [Git & Commit Standards](#8-git--commit-standards)

---

## 1. Naming Conventions

### 1.1 File Naming (kebab-case everywhere)

```
# Backend (mukti-api)
{feature}.controller.ts       # auth.controller.ts
{feature}.service.ts          # conversation.service.ts
{feature}.module.ts           # canvas.module.ts
{action}.dto.ts               # login.dto.ts, change-password.dto.ts
{purpose}.guard.ts            # jwt-auth.guard.ts
{name}.decorator.ts           # current-user.decorator.ts
{entity}.schema.ts            # user.schema.ts
{provider}.strategy.ts        # google.strategy.ts
{feature}.swagger.ts          # auth.swagger.ts

# Frontend (mukti-web)
{component-name}.tsx          # sign-in-form.tsx, message-input.tsx
use-{feature}.ts              # use-auth.ts, use-conversations.ts
{feature}-store.ts            # auth-store.ts, canvas-store.ts
{feature}-schemas.ts          # auth-schemas.ts (Zod validation)
```

### 1.2 Class & Component Naming (PascalCase)

```typescript
// Backend
class AuthService {}
class CanvasController {}
class LoginDto {}
class JwtAuthGuard {}

// Frontend
function SignInForm() {}
function CreateConversationDialog() {}
function SeedNode() {}
```

### 1.3 Method Naming (camelCase)

```typescript
// Async methods
async login() {}
async createConversation() {}
async addAssumption() {}

// Query methods
findById() {}
getUserSessions() {}
getMessages() {}

// Validation methods
validateSessionOwnership() {}
validateModelOrThrow() {}
```

### 1.4 Constants (SCREAMING_SNAKE_CASE)

```typescript
const DEFAULT_MODEL = 'openai/gpt-5-mini';
const MAX_ASSUMPTIONS = 8;
const MIN_PANEL_WIDTH = 320;
const ACCESS_TOKEN_EXPIRATION_MS = 15 * 60 * 1000;
```

### 1.5 Hook Naming

```typescript
// Custom hooks: use + CamelCase
useAuth();
useConversations();
useCanvasActions();

// Store selectors: use + Entity
useCanvasEdges(); // from useCanvasStore((state) => state.edges)
useAccessToken(); // from useAuthStore
useIsAuthenticated(); // from useAuthStore
```

---

## 2. File & Directory Structure

### 2.1 Backend Module Structure

```
modules/{feature}/
├── {feature}.controller.ts
├── {feature}.module.ts
├── services/
│   ├── {service}.service.ts
│   ├── __tests__/
│   │   ├── {service}.spec.ts
│   │   └── properties/
│   │       └── {property}.property.spec.ts
│   └── index.ts
├── dto/
│   ├── {action}.dto.ts
│   ├── {feature}-response.dto.ts
│   ├── {feature}.swagger.ts
│   └── index.ts
├── guards/
│   ├── {purpose}.guard.ts
│   └── index.ts
├── decorators/
│   ├── {name}.decorator.ts
│   └── index.ts
└── strategies/
    └── {provider}.strategy.ts
```

### 2.2 Frontend Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/auth/        # Auth pages (login, signup, etc.)
│   ├── dashboard/          # Authenticated app
│   └── api/                # Next.js API routes
├── components/
│   ├── ui/                 # Radix UI primitives (shadcn)
│   ├── auth/               # Auth components
│   ├── canvas/             # Canvas components
│   │   ├── nodes/          # React Flow node components
│   │   ├── edges/          # React Flow edge components
│   │   └── controls/       # Canvas controls
│   └── conversations/      # Conversation components
├── lib/
│   ├── api/                # API client & modules
│   │   ├── client.ts       # ApiClient singleton
│   │   ├── auth.ts         # authApi endpoints
│   │   ├── canvas.ts       # canvasApi endpoints
│   │   └── conversations.ts
│   ├── hooks/              # Custom hooks
│   │   ├── use-auth.ts
│   │   ├── use-canvas.ts
│   │   └── use-conversations.ts
│   ├── stores/             # Zustand stores
│   │   ├── auth-store.ts
│   │   ├── canvas-store.ts
│   │   └── chat-store.ts
│   ├── validation/         # Zod schemas
│   │   ├── auth-schemas.ts
│   │   └── conversation-schemas.ts
│   ├── query-keys.ts       # TanStack Query key factory
│   ├── config.ts           # Centralized config
│   └── utils/              # Utility functions
└── types/                  # TypeScript types
```

### 2.3 Barrel Exports

Each module subdirectory has an `index.ts` exporting all public members:

```typescript
// dto/index.ts
export { LoginDto } from './login.dto';
export { CreateCanvasSessionDto } from './create-canvas-session.dto';

// guards/index.ts
export { JwtAuthGuard } from './jwt-auth.guard';
export { RolesGuard } from './roles.guard';
```

---

## 3. Import Organization

### 3.1 Backend Import Order

```typescript
// 1. Node/external modules
import type { Request, Response } from 'express';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';

// 2. Schemas
import type { User } from '../../schemas/user.schema';
import { CanvasSession } from '../../schemas/canvas-session.schema';

// 3. Sibling module imports (decorators, guards)
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// 4. Local DTOs
import type { CreateConversationDto } from './dto/create-conversation.dto';

// 5. Local services
import { ConversationService } from './services/conversation.service';

// 6. Utilities
import { PromptBuilder } from './utils/prompt-builder';
```

### 3.2 Frontend Import Order

```typescript
'use client';

// 1. External dependencies
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

// 2. Types
import type { LoginFormData } from '@/lib/validation';

// 3. UI components
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField } from '@/components/ui/form';

// 4. Hooks
import { useLogin } from '@/lib/hooks/use-auth';

// 5. Utilities and config
import { showErrorToast } from '@/lib/utils/error-handler';
import { loginSchema } from '@/lib/validation';
```

### 3.3 Import Rules

- **Always** use `@/` alias for absolute paths in frontend (never relative across folders)
- **Always** use `import type` for type-only imports
- **Never** use `import *` — named imports only

---

## 4. TypeScript Patterns

### 4.1 Type vs Value Imports

```typescript
// Types → import type
import type { User } from '../../schemas/user.schema';
import type { CreateConversationDto } from './dto';

// Values (classes, functions, enums) → regular import
import { User } from '../../schemas/user.schema'; // when used as value
import { Injectable } from '@nestjs/common';
```

### 4.2 Interface Definitions

```typescript
// Frontend: Props interfaces at top of component files
interface SignInFormProps {
  onSuccess?: () => void;
  redirectPath?: string;
}

// Backend: Use DTOs with class-validator decorators (not interfaces) for request validation
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
```

### 4.3 Zod Schema + Type Inference (Frontend)

```typescript
// Define schema, infer type — never duplicate
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginFormData = z.infer<typeof loginSchema>;
```

---

## 5. Error Handling

### 5.1 Backend — NestJS Exceptions

```typescript
// Throw NestJS built-in exceptions — never raw Error()
throw new NotFoundException('Canvas session not found');
throw new BadRequestException('Invalid technique');
throw new UnauthorizedException('Access token has expired');
throw new ForbiddenException('Not authorized to access this resource');
```

### 5.2 Backend — Error Response Envelope

```typescript
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",     // UPPER_SNAKE_CASE
    message: "Human readable message",
    details: { /* optional */ }
  },
  meta: {
    requestId: "uuid",
    timestamp: "ISO-8601"
  }
}
```

### 5.3 Frontend — Error Handling

```typescript
// Use showErrorToast for user-facing errors
import { showErrorToast } from '@/lib/utils/error-handler';

// In mutations
onError: (error) => {
  showErrorToast(error);
};
```

---

## 6. Testing Standards

### 6.0 TDD Workflow

**Follow Test-Driven Development**: Write tests first, then implement.

```
1. Write a failing test for the behavior you want
2. Implement the minimum code to pass the test
3. Refactor while keeping tests green
4. Repeat
```

**When adding a new feature**: Write unit tests → implement → add property tests for edge cases → verify coverage.
**When fixing a bug**: Write a test that reproduces the bug → fix it → confirm the test passes.

### 6.1 Test File Location — Always `__tests__/`

All tests live in `__tests__/` directories colocated with their source code. Never place tests alongside source files.

```
# Backend (mukti-api)
modules/{feature}/services/__tests__/{service}.spec.ts
modules/{feature}/services/__tests__/properties/{name}.property.spec.ts
modules/{feature}/__tests__/{feature}.controller.spec.ts
modules/{feature}/guards/__tests__/{guard}.spec.ts
modules/{feature}/guards/__tests__/properties/{name}.property.spec.ts
common/filters/__tests__/{filter}.spec.ts
schemas/__tests__/{schema}.spec.ts

# Backend E2E (separate directory)
test/{feature}.e2e-spec.ts

# Frontend (mukti-web)
src/components/{feature}/__tests__/{component}.test.tsx
src/components/{feature}/__tests__/properties/{name}.property.spec.tsx
src/lib/hooks/__tests__/{hook}.spec.ts
src/lib/hooks/__tests__/properties/{name}.property.spec.ts
src/lib/api/__tests__/{module}.spec.ts
src/lib/__tests__/{utility}.spec.ts
```

### 6.2 Test Types & When to Use

| Type                 | File Pattern               | When                                                   | Framework                    |
| -------------------- | -------------------------- | ------------------------------------------------------ | ---------------------------- |
| Unit test (backend)  | `*.spec.ts`                | Every service, guard, controller                       | Jest + NestJS Testing        |
| Unit test (frontend) | `*.test.tsx` / `*.spec.ts` | Components, hooks, API modules, utilities              | Jest + React Testing Library |
| Property-based test  | `*.property.spec.ts`       | Security-critical paths, input validation, cache logic | fast-check                   |
| E2E test (backend)   | `*.e2e-spec.ts`            | Full middleware stack, API contracts                   | Jest + supertest             |

### 6.3 Backend Test Setup Pattern

```typescript
describe('ConversationService', () => {
  let service: ConversationService;

  const mockModel = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: getModelToken(Conversation.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    jest.clearAllMocks();
  });
});
```

### 6.4 Frontend Test Setup Pattern

```typescript
// Component test with React Testing Library
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Hook test with renderHook
import { renderHook } from '@testing-library/react';

const { result } = renderHook(() => useConversation(id), {
  wrapper: createWrapper(),
});
```

### 6.5 Frontend Testing Rules

- **Test user behavior, not implementation** — use `screen.getByRole()`, `getByLabelText()`, `getByText()`
- **Use `userEvent` over `fireEvent`** — `userEvent.setup()` then `user.click()`, `user.type()`
- **Mock stores** with selector pattern: `jest.mock('@/lib/stores/auth-store')`
- **Mock APIs** at module boundary: `jest.mock('@/lib/api/conversations')`
- **Async**: use `waitFor()` or `findBy*` queries for async assertions
- **Coverage threshold**: 70% branches, functions, lines, statements

### 6.6 Property-Based Tests (fast-check)

```typescript
import * as fc from 'fast-check';

// Define arbitraries
const emailArb = fc.emailAddress();
const passwordArb = fc.string({ minLength: 8, maxLength: 20 });

// Property test
it('should handle any valid technique', async () => {
  await fc.assert(
    fc.asyncProperty(fc.constantFrom('elenchus', 'maieutics', 'dialectic'), async (technique) => {
      // invariant assertions
    }),
    { numRuns: 20 }
  );
});
```

**When to use property tests**:

- Auth/security paths (JWT verification, password handling, rate limiting)
- Form validation (arbitrary inputs, unicode, edge cases)
- Optimistic update/rollback logic (cache consistency)
- Any invariant that should hold for ALL inputs

### 6.7 E2E Test Pattern (Backend)

```typescript
describe('Security E2E', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Apply full middleware stack (mirrors main.ts)
    app.use(helmet());
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterEach(() => app.close());

  it('should set security headers', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect('x-content-type-options', 'nosniff');
  });
});
```

### 6.8 Test Commands

```bash
# Backend
bun nx run @mukti/api:test              # All unit tests
bun nx run @mukti/api:test:watch        # Watch mode (TDD)
bun nx run @mukti/api:test:cov          # With coverage
bun nx run @mukti/api:test:e2e          # E2E tests

# Frontend
bun nx run @mukti/web:test              # All unit tests
bun nx run @mukti/web:test:watch        # Watch mode (TDD)
bun nx run @mukti/web:test:coverage     # With coverage
```

---

## 7. Formatting Rules

| Rule            | Value     |
| --------------- | --------- |
| Line width      | 100 chars |
| Quotes          | Single    |
| Indent          | 2 spaces  |
| Semicolons      | Required  |
| Trailing commas | ES5       |

---

## 8. Git & Commit Standards

### Format

```
<type>(<scope>): <subject>
```

### Types

`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`, `wip`, `init`

### Scopes

`api`, `web`, `mcp-server`, `config`, `ci`, `deps`, `docker`, `deployment`, `monorepo`, `docs`, `readme`, `db`, `redis`, `ui`, `components`, `styles`, `test`, `e2e`, `release`

### Commit Tools

```bash
git add .
bun run commit          # Interactive (czg)
bun run ai:commit       # AI-generated (OpenCommit)
```

---

## 📂 Codebase References

**Backend Entry**:

- `packages/mukti-api/src/main.ts` — Bootstrap, global prefix, pipes, guards
- `packages/mukti-api/src/app.module.ts` — Root module with all imports

**Frontend Entry**:

- `packages/mukti-web/src/app/layout.tsx` — Root layout
- `packages/mukti-web/src/lib/api/client.ts` — ApiClient singleton

**Schemas**:

- `packages/mukti-api/src/schemas/index.ts` — ALL_SCHEMAS barrel export

**Config**:

- `packages/mukti-web/src/lib/config.ts` — Centralized frontend config
- `packages/mukti-api/.env.example` — Backend env vars
