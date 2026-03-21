<!-- Context: development/backend/nestjs-patterns | Priority: critical | Version: 1.0 | Updated: 2026-03-21 -->

# NestJS Patterns — Mukti API

**Purpose**: Module, controller, service, and guard patterns for `@mukti/api`

---

## Module Structure

Every feature module follows this layout:

```
modules/feature/
├── feature.module.ts       # DI wiring only
├── feature.controller.ts   # HTTP routing
├── feature.service.ts      # Business logic (or services/)
├── dto/
│   ├── create-feature.dto.ts
│   ├── update-feature.dto.ts
│   └── feature.swagger.ts  # ALL Swagger decorators go here
└── services/               # Split if >1 service
    └── feature.service.ts
```

**Rule**: Swagger decorators (`@ApiProperty`, `@ApiOperation`, etc.) belong exclusively in `dto/feature.swagger.ts`, never inline in controllers.

---

## Module Registration

```typescript
@Module({
  controllers: [CanvasController],
  exports: [CanvasService],
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: CanvasSession.name, schema: CanvasSessionSchema },
      { name: NodeDialogue.name, schema: NodeDialogueSchema },
    ]),
  ],
  providers: [CanvasService],
})
export class CanvasModule {}
```

**Rule**: Use `MongooseModule.forFeature()` per-module. Never register schemas globally.

---

## Controllers

```typescript
@ApiTags('Conversations')
@Controller('conversations')
@UseGuards(JwtAuthGuard) // Module-level auth guard
export class ConversationController {
  @ApiCreateConversation() // Swagger decorator from .swagger.ts
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: User // Custom decorator — always typed
  ) {
    const result = await this.service.create(user._id, dto);
    return {
      data: result,
      meta: { requestId: this.generateRequestId(), timestamp: new Date().toISOString() },
      success: true,
    };
  }
}
```

**Response envelope** (all routes must return this shape):

```typescript
{ success: true, data: T, meta: { requestId, timestamp } }
{ success: false, error: { code, message, details }, meta: { requestId, timestamp } }
```

**Async queue route** (202 pattern):

```typescript
@HttpCode(HttpStatus.ACCEPTED)
@Post(':id/messages')
async sendMessage(...) {
  const result = await this.queueService.enqueueRequest(...);
  return { data: { jobId: result.jobId, position: result.position }, ... };
}
```

---

## Services

```typescript
@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>
  ) {}

  async findById(id: string, userId: Types.ObjectId): Promise<ConversationDocument> {
    const doc = await this.conversationModel.findOne({ _id: id, userId }).lean();
    if (!doc) throw new NotFoundException(`Conversation ${id} not found`);
    return doc;
  }
}
```

**Rules**:

- Always use `private readonly logger = new Logger(ClassName.name)`
- Throw NestJS HTTP exceptions (`NotFoundException`, `ForbiddenException`, etc.) — never raw `Error`
- Use `@InjectModel(ModelName.name)` for Mongoose injection

---

## Guards & Decorators

| Guard/Decorator      | Location                                            | Purpose                       |
| -------------------- | --------------------------------------------------- | ----------------------------- |
| `JwtAuthGuard`       | `modules/auth/guards/jwt-auth.guard.ts`             | Global via `APP_GUARD`        |
| `@Public()`          | `modules/auth/decorators/public.decorator.ts`       | Opt-out of global JWT guard   |
| `@CurrentUser()`     | `modules/auth/decorators/current-user.decorator.ts` | Extract user from JWT context |
| `EmailVerifiedGuard` | `modules/auth/guards/`                              | Require verified email        |
| `RolesGuard`         | `modules/auth/guards/`                              | Role-based access             |
| `@Roles('admin')`    | `modules/auth/decorators/`                          | Mark role requirement         |

**Global guard registration** (in `app.module.ts`):

```typescript
{ provide: APP_GUARD, useClass: JwtAuthGuard }
```

---

## DTOs

```typescript
export class CreateConversationDto {
  @IsEnum(['elenchus', 'dialectic', 'maieutics', 'definitional', 'analogical', 'counterfactual'])
  technique: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
```

**Rules**:

- `class-validator` decorators always; never Zod on the backend
- `ValidationPipe` (global, with `transform: true`) handles conversion
- `@IsOptional()` before other validators on optional fields

---

## App Bootstrap (`main.ts`)

```
Global prefix:   api/v1
Swagger:         /api/docs  (SwaggerModule)
Scalar:          /api/reference  (ApiReference)
ValidationPipe:  transform: true, whitelist: true, forbidNonWhitelisted: true
CSRF:            production only (cookie-based)
Helmet:          security headers (CSP exempt on /api/docs, /api/reference)
```

---

## Codebase References

- Module example: `packages/mukti-api/src/modules/canvas/canvas.module.ts`
- Controller example: `packages/mukti-api/src/modules/conversations/conversation.controller.ts`
- Queue + SSE: `packages/mukti-api/src/modules/conversations/services/queue.service.ts`
- Guard setup: `packages/mukti-api/src/modules/auth/`
- Schema registration: `packages/mukti-api/src/schemas/index.ts`
