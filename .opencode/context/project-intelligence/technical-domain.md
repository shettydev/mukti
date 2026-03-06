<!-- Context: project-intelligence/technical | Priority: critical | Version: 1.0 | Updated: 2026-03-07 -->

# Technical Domain

**Purpose**: Tech stack, architecture, and development patterns for the Mukti monorepo.
**Last Updated**: 2026-03-07

## Quick Reference

**Update Triggers**: Tech stack changes | New patterns | Architecture decisions
**Audience**: Developers, AI agents

## Primary Stack

| Layer          | Technology            | Version | Rationale                                          |
| -------------- | --------------------- | ------- | -------------------------------------------------- |
| Runtime        | Bun                   | latest  | Fast JS runtime + package manager, auto-loads .env |
| Monorepo       | Nx                    | 21.6    | Task orchestration, caching, affected commands     |
| Backend        | NestJS                | 11      | Modular architecture, decorators, DI container     |
| Frontend       | Next.js               | 15.4    | App Router, server components, React 19            |
| Language       | TypeScript            | strict  | Type safety across all packages                    |
| Database       | MongoDB               | 7       | Document store via Mongoose 8                      |
| Queue          | BullMQ                | 5       | Async AI processing with Redis 7                   |
| Styling        | Tailwind CSS          | v4      | Utility-first + custom Japandi design system       |
| UI Primitives  | Radix UI              | latest  | Accessible Dialog, Dropdown, Tabs, Tooltip         |
| State (client) | Zustand               | 5       | Lightweight stores with persistence                |
| State (server) | TanStack Query        | v5      | Cache, mutations, optimistic updates               |
| Forms          | React Hook Form + Zod | v7 + v4 | Validation with schema inference                   |
| Canvas         | XyFlow/React          | v12     | Node-based visualization                           |

## Code Patterns

### API Controller (NestJS)

```typescript
@ApiTags('Resource')
@Controller('resource')
@UseGuards(JwtAuthGuard)
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @ApiCreateResource()              // Swagger decorator from .swagger.ts
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(
    @Body() createDto: CreateResourceDto,
    @CurrentUser() user: User,
  ) {
    const resource = await this.resourceService.create(user._id, createDto);
    return {
      success: true,
      data: resource,
      meta: { requestId: this.generateRequestId(), timestamp: new Date().toISOString() },
    };
  }

  // Queue-based AI: POST → 202 Accepted → SSE stream
  @HttpCode(HttpStatus.ACCEPTED)
  @Post(':id/messages')
  async sendMessage(...) {
    const result = await this.queueService.enqueueRequest(...);
    return { success: true, data: { jobId: result.jobId, position: result.position }, meta: {...} };
  }

  @Sse(':id/stream')
  async stream(...): Promise<Observable<MessageEvent>> { ... }

  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
```

### React Component (Next.js)

```typescript
'use client';

import { Brain } from 'lucide-react';
import type { CanvasSession } from '@/types/canvas.types';
import { Button } from '@/components/ui/button';
import { useDeleteCanvasSession } from '@/lib/hooks/use-canvas';
import { cn } from '@/lib/utils';

interface SessionCardProps {
  session: CanvasSession;
}

export function SessionCard({ session }: SessionCardProps) {
  const { isPending, mutate: deleteSession } = useDeleteCanvasSession();
  return (
    <Card className={cn('cursor-pointer transition-all hover:border-primary/50')}
          onClick={() => router.push(`/dashboard/canvas/${session.id}`)}>
      ...
    </Card>
  );
}
```

## Naming Conventions

| Type            | Convention           | Example                                                |
| --------------- | -------------------- | ------------------------------------------------------ |
| Files           | kebab-case           | `ai-policy.service.ts`, `seed-node.tsx`                |
| Components      | PascalCase           | `SeedNode`, `SessionCard`, `ChatHeader`                |
| Functions/hooks | camelCase            | `useDeleteCanvasSession`, `generateRequestId`          |
| DB schemas      | PascalCase           | `CanvasSession`, `NodeDialogue`                        |
| API routes      | kebab-case           | `/api/v1/conversations/:id/messages`                   |
| NestJS services | PascalCase class     | `AiPolicyService` → `ai-policy.service.ts`             |
| DTOs            | PascalCase class     | `CreateConversationDto` → `create-conversation.dto.ts` |
| Commits         | type(scope): subject | `feat(api): add canvas endpoints`                      |

## Code Standards

- TypeScript strict mode across all packages
- Prettier: 100 char width, single quotes, 2-space indent, semicolons, trailing commas (ES5)
- ESLint + lint-staged via Husky pre-commit hooks
- Mongoose 8 for DB (schemas in `ALL_SCHEMAS` array at `src/schemas/index.ts`)
- Zod v4 for frontend validation, NestJS `ValidationPipe` for backend
- BullMQ for async AI processing (queue-based, never inline)
- Prefer server components — `'use client'` only when needed
- Zustand for client state, TanStack Query for server state
- Bun as runtime/package manager (not npm/node)
- Commitlint: `<type>(<scope>): <subject>`
- Property-based testing with fast-check on security-critical paths
- Swagger isolation — each module has a `.swagger.ts` file
- Response envelope: `{ success, data, meta: { requestId, timestamp } }`
- Named exports only (`export function X`) — no default exports
- Alphabetical prop ordering on JSX elements
- Path aliases: `@/components/`, `@/lib/`, `@/types/`

## Security Requirements

- JWT auth globally via `APP_GUARD` — `@Public()` to opt out
- Refresh token rotation on use (httpOnly cookies + DB)
- Email verification required (`EmailVerifiedGuard`)
- CSRF protection in production (cookie-based)
- Helmet security headers (CSP exempt on docs routes)
- Ownership validation on every endpoint
- BYOK key encryption at rest (`AiSecretsService`)
- Rate limiting via `LoginRateLimitGuard`
- Role-based access: `user`, `moderator`, `admin` via `@Roles()` + `RolesGuard`
- Input validation: global `ValidationPipe` (backend), Zod (frontend)
- Access token in memory only — never in localStorage
- Mongoose handles query injection prevention

## Codebase References

| Reference           | Path                                            | Description              |
| ------------------- | ----------------------------------------------- | ------------------------ |
| API controllers     | `packages/mukti-api/src/modules/*/`             | NestJS module structure  |
| Schemas             | `packages/mukti-api/src/schemas/`               | All Mongoose schemas     |
| Schema registry     | `packages/mukti-api/src/schemas/index.ts`       | `ALL_SCHEMAS` array      |
| Frontend components | `packages/mukti-web/src/components/`            | React components         |
| UI primitives       | `packages/mukti-web/src/components/ui/`         | Radix-based primitives   |
| Hooks               | `packages/mukti-web/src/lib/hooks/`             | TanStack Query hooks     |
| API client          | `packages/mukti-web/src/lib/api/`               | API modules              |
| Stores              | `packages/mukti-web/src/lib/stores/`            | Zustand stores           |
| App routes          | `packages/mukti-web/src/app/`                   | Next.js App Router pages |
| Config              | `package.json`, `nx.json`, `tsconfig.base.json` | Monorepo config          |

## Related Files

- `business-domain.md` — Product philosophy and user context
- `decisions-log.md` — Architecture decision records
- `living-notes.md` — Active issues and technical debt
