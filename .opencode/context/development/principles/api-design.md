<!-- Context: development/api-design | Priority: high | Version: 2.0 | Updated: 2026-03-21 -->

# API Design — Mukti NestJS Patterns

**Purpose**: How APIs are designed in `@mukti/api` — response shapes, error codes, versioning, and conventions

---

## URL Structure

```
Base:     /api/v1
Swagger:  /api/docs
Scalar:   /api/reference
Health:   /api/v1/health
```

URI versioning: all routes under `/api/v1`. Version bump only when breaking changes are unavoidable.

---

## Resource URLs

Use nouns, not verbs. RESTful resource naming:

```
GET    /conversations              # List user's conversations
POST   /conversations              # Create conversation (201 Created)
GET    /conversations/:id          # Get one
PATCH  /conversations/:id          # Update (partial)
DELETE /conversations/:id          # Delete (204 No Content)

POST   /conversations/:id/messages # Send message (202 Accepted — queued)
GET    /conversations/:id/stream   # SSE stream (text/event-stream)
GET    /conversations/:id/messages/archived  # Archived messages
```

---

## Response Envelope

**All routes** return this shape:

```typescript
// Success
{ success: true, data: T, meta: { requestId: string, timestamp: string } }

// Paginated success
{ success: true, data: T[], meta: { requestId, timestamp, page, limit, total, totalPages } }

// 202 Accepted (queue)
{ success: true, data: { jobId: string, position: number }, meta: { ... } }

// 204 No Content — body is empty (DELETE, etc.)

// Error
{ success: false, error: { code: string, message: string, details?: unknown }, meta: { requestId, timestamp } }
```

Never return raw data arrays or plain objects — always wrap.

---

## HTTP Status Codes

| Operation          | Status                    | Notes                                  |
| ------------------ | ------------------------- | -------------------------------------- |
| Create resource    | 201 Created               | `@HttpCode(HttpStatus.CREATED)`        |
| Enqueue AI message | 202 Accepted              | Returns `{ jobId, position }`          |
| Delete resource    | 204 No Content            | Empty body                             |
| Validation error   | 400 Bad Request           | `ValidationPipe` handles automatically |
| Unauthenticated    | 401 Unauthorized          | `JwtAuthGuard` throws                  |
| Forbidden          | 403 Forbidden             | Ownership checks                       |
| Not found          | 404 Not Found             | Throw `NotFoundException`              |
| Server error       | 500 Internal Server Error | Global exception filter                |

---

## Error Codes

Use specific error codes in the `error.code` field:

| Code                     | Meaning                                        |
| ------------------------ | ---------------------------------------------- |
| `MODEL_NOT_ALLOWED`      | Requested model not in curated list (non-BYOK) |
| `OPENROUTER_KEY_MISSING` | User has BYOK flag but no key stored           |
| `RATE_LIMIT_EXCEEDED`    | Too many requests                              |
| `PROCESSING_ERROR`       | AI worker failed (retriable)                   |
| `VALIDATION_ERROR`       | DTO validation failed                          |

---

## Async Pattern (POST → 202 → SSE)

Mukti's core AI processing is **non-blocking**:

1. `POST /conversations/:id/messages` → **202** + `{ jobId, position }`
2. Worker processes job in BullMQ
3. `GET /conversations/:id/stream` → SSE events as worker progresses

Never block an HTTP response waiting for AI completion.

---

## Authentication

- Global `JwtAuthGuard` via `APP_GUARD` — protects all routes by default
- Use `@Public()` to opt out (e.g., health check, waitlist)
- JWT in `Authorization: Bearer <token>` header
- Refresh tokens in `httpOnly` cookies — rotated on use

```typescript
@Public()                           // Opt out of global JWT guard
@Get('health')
getHealth() { ... }

@Controller('conversations')
@UseGuards(JwtAuthGuard)            // Explicit guard (redundant with APP_GUARD, but documents intent)
export class ConversationController { ... }
```

---

## Swagger

All Swagger decorators live in `dto/[module].swagger.ts`:

```typescript
// conversation.swagger.ts
export function ApiCreateConversation() {
  return applyDecorators(
    ApiOperation({ summary: 'Create a conversation' }),
    ApiResponse({ status: 201, description: 'Created' }),
    // ...
  );
}

// In controller:
@ApiCreateConversation()  // Single decorator — controller stays clean
@Post()
async create(...) { ... }
```

Never add `@ApiOperation`, `@ApiResponse`, etc. directly to controllers.

---

## Input Validation

```typescript
// DTOs only — no manual validation in controllers or services
export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;

  @IsString()
  @IsOptional()
  model?: string;

  @IsBoolean()
  @IsOptional()
  wrapUpRequested?: boolean;
}
```

`ValidationPipe` (global): `transform: true`, `whitelist: true`, `forbidNonWhitelisted: true`.

---

## Codebase References

- Controller example: `packages/mukti-api/src/modules/conversations/conversation.controller.ts`
- Swagger isolation: `packages/mukti-api/src/modules/conversations/dto/conversation.swagger.ts`
- DTO example: `packages/mukti-api/src/modules/conversations/dto/send-message.dto.ts`
- App bootstrap: `packages/mukti-api/src/main.ts`
