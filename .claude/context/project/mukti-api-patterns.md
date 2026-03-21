<!-- Context: project/mukti-api-patterns | Priority: high | Version: 1.0 | Updated: 2026-03-21 -->

# Mukti API — NestJS Design Patterns

**Purpose**: Definitive guide for writing backend code in `packages/mukti-api/`.

---

## 1. Module Architecture

Every module follows this registration pattern:

```typescript
@Module({
  controllers: [FeatureController],
  exports: [
    /* services needed by other modules */
  ],
  imports: [
    MongooseModule.forFeature([{ name: Entity.name, schema: EntitySchema }]),
    ConfigModule,
    // other module dependencies
  ],
  providers: [
    FeatureService,
    // guards, strategies, queue services
  ],
})
export class FeatureModule {}
```

---

## 2. Controller Pattern

```typescript
@Controller('resource')
@UseGuards(JwtAuthGuard)
export class ResourceController {
  constructor(private readonly service: ResourceService) {}

  @ApiOperation({ summary: 'Create resource' })
  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(@Body() dto: CreateDto, @CurrentUser() user: User) {
    const result = await this.service.create(user._id, dto);
    return {
      success: true,
      data: result,
      meta: {
        requestId: generateRequestId(),
        timestamp: new Date().toISOString(),
      },
    };
  }
}
```

**Rules**:

- All routes JWT-protected globally — use `@Public()` to opt out
- Swagger docs in separate `{feature}.swagger.ts` file
- Response envelope: `{ success, data, meta: { requestId, timestamp } }`
- Use `@CurrentUser()` decorator for authenticated user
- Use `@CurrentUser('_id')` to extract specific property

---

## 3. Service Pattern

```typescript
@Injectable()
export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);

  constructor(
    @InjectModel(Entity.name) private readonly entityModel: Model<EntityDocument>,
    private readonly configService: ConfigService
  ) {}

  async create(userId: string, dto: CreateDto): Promise<EntityResponseDto> {
    this.logger.log(`Creating entity for user ${userId}`);

    const entity = await this.entityModel.create({
      userId,
      ...dto,
    });

    return EntityResponseDto.fromDocument(entity);
  }
}
```

**Rules**:

- Logger: `private readonly logger = new Logger(ClassName.name)`
- Models: `@InjectModel(Schema.name)` injection
- Dependencies: `private readonly serviceName: ServiceClass`
- Throw NestJS exceptions, never raw `Error`

---

## 4. DTO Pattern

### Request DTO (validation)

```typescript
export class CreateConversationDto {
  @ApiProperty({ description: 'Conversation title', example: 'My thinking session' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Socratic technique', example: 'elenchus' })
  @IsOptional()
  @IsString()
  technique?: string;
}
```

### Response DTO (transformation)

```typescript
export class ConversationResponseDto {
  @Expose() _id: string;
  @Expose() title: string;
  @Exclude() shareToken?: string;

  static fromDocument(doc: Conversation): ConversationResponseDto {
    const dto = new ConversationResponseDto();
    dto._id = doc._id?.toString();
    dto.title = doc.title;
    return dto;
  }
}
```

---

## 5. Guard & Decorator Pattern

### Custom Guard

```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

### Custom Decorator

```typescript
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  }
);
```

---

## 6. Queue + SSE Streaming Pattern

POST → 202 Accepted with `{ jobId, position }` → SSE stream for real-time response.

### Enqueueing

```typescript
const job = await this.queue.add('process-message', data, {
  priority: isPaidTier ? 10 : 1,
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
});
return { jobId: job.id, position };
```

### SSE Endpoint

```typescript
@Sse('stream/:sessionId')
streamConversation(@Param('sessionId') sessionId: string): Observable<MessageEvent> {
  return this.streamService.getStream(sessionId);
}
```

**Event sequence**: `processing → message → complete | error`

---

## 7. Schema Registration

All Mongoose schemas registered centrally in `src/schemas/index.ts`:

```typescript
export const ALL_SCHEMAS = [
  { name: User.name, schema: UserSchema },
  { name: Conversation.name, schema: ConversationSchema },
  // ...all schemas
];
```

`DatabaseModule` registers ALL_SCHEMAS. Individual modules also register the specific schemas they need via `MongooseModule.forFeature()`.

---

## 8. HTTP Status Codes

| Method        | Success Code   | Pattern                            |
| ------------- | -------------- | ---------------------------------- |
| POST (create) | 201 Created    | `@HttpCode(HttpStatus.CREATED)`    |
| POST (action) | 200 OK         | `@HttpCode(HttpStatus.OK)`         |
| POST (queue)  | 202 Accepted   | `@HttpCode(HttpStatus.ACCEPTED)`   |
| GET           | 200 OK         | default                            |
| PATCH         | 200 OK         | `@HttpCode(HttpStatus.OK)`         |
| DELETE        | 204 No Content | `@HttpCode(HttpStatus.NO_CONTENT)` |

---

## 9. Domain-Specific Patterns

### Canvas Node IDs

```
seed              # Singleton — the problem statement
soil-{index}      # Constraints (0-indexed)
root-{index}      # Assumptions (0-indexed)
insight-{index}   # Insights (0-indexed)
```

### Dialogue Technique Mapping

| Node Type | Socratic Technique |
| --------- | ------------------ |
| seed      | maieutics          |
| root      | elenchus           |
| soil      | counterfactual     |
| insight   | dialectic          |

### BYOK (Bring Your Own Key)

`AiPolicyService.resolveEffectiveModel()` resolves which API key and model to use. Default: `openai/gpt-5-mini`.

---

## 10. Testing Patterns (TDD)

Follow TDD: write tests first, implement second. All tests in `__tests__/` directories.

### 10.1 Test Directory Structure

```
modules/{feature}/
├── services/
│   ├── {service}.service.ts
│   └── __tests__/
│       ├── {service}.spec.ts
│       └── properties/
│           └── {name}.property.spec.ts
├── __tests__/
│   └── {feature}.controller.spec.ts
└── guards/
    └── __tests__/
        ├── {guard}.spec.ts
        └── properties/
            └── {name}.property.spec.ts
```

### 10.2 Unit Test Pattern

```typescript
describe('ThoughtMapService', () => {
  let service: ThoughtMapService;
  const mockModel = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThoughtMapService,
        { provide: getModelToken(ThoughtMap.name), useValue: mockModel },
      ],
    }).compile();
    service = module.get<ThoughtMapService>(ThoughtMapService);
    jest.clearAllMocks();
  });

  describe('createMap', () => {
    it('should create a map for the user', async () => {
      /* ... */
    });
    it('should throw ForbiddenException for non-owner', async () => {
      /* ... */
    });
    it('should throw NotFoundException when map not found', async () => {
      /* ... */
    });
  });
});
```

**Key patterns**:

- Use factory functions for test data: `createOwnedMap(overrides?)`
- Mock Mongoose query chains: `createExecQuery<T>()`, `createLeanQuery<T>()`
- Test authorization (ForbiddenException), validation (BadRequestException), not-found (NotFoundException)
- `jest.clearAllMocks()` in `beforeEach` or `afterEach`

### 10.3 Property-Based Test Pattern

Located in `__tests__/properties/*.property.spec.ts`. Use for security-critical paths.

```typescript
import * as fc from 'fast-check';

// Arbitraries
const hexLikeString = (len: number) =>
  fc.string({ minLength: len, maxLength: len }).filter((s) => /^[a-f0-9]+$/.test(s));

const userPayloadArb = fc.record({
  email: fc.emailAddress(),
  role: fc.constantFrom('user', 'moderator', 'admin'),
  sub: hexLikeString(24),
});

// Property test — 20 runs per property
it('should reject tokens signed with wrong secret', async () => {
  await fc.assert(
    fc.asyncProperty(userPayloadArb, async (payload) => {
      // Sign with wrong secret, verify rejects
    }),
    { numRuns: 20 }
  );
});
```

### 10.4 E2E Test Pattern

Located in `test/*.e2e-spec.ts`. Tests full middleware stack.

```typescript
describe('Security', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    // Mirror main.ts middleware exactly
    app.use(helmet());
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterEach(() => app.close());

  it('should set X-Content-Type-Options header', () =>
    request(app.getHttpServer()).get('/api/v1/health').expect('x-content-type-options', 'nosniff'));
});
```

### 10.5 What to Test

| Layer          | Must Test                                      | Property Test?          |
| -------------- | ---------------------------------------------- | ----------------------- |
| Auth guards    | Token validation, role checking, rate limiting | Yes — security-critical |
| Services       | CRUD, ownership validation, business logic     | Yes — for invariants    |
| Controllers    | HTTP status codes, response shape              | No — unit tests suffice |
| DTOs           | Validation decorators, transformation          | Yes — arbitrary inputs  |
| Queue services | Job creation, processing logic                 | No — unit tests suffice |

---

## 📂 Codebase References

**Controllers**:

- `packages/mukti-api/src/modules/auth/auth.controller.ts`
- `packages/mukti-api/src/modules/canvas/canvas.controller.ts`
- `packages/mukti-api/src/modules/conversations/conversation.controller.ts`

**Services**:

- `packages/mukti-api/src/modules/auth/services/auth.service.ts`
- `packages/mukti-api/src/modules/canvas/services/canvas.service.ts`
- `packages/mukti-api/src/modules/conversations/services/conversation.service.ts`

**Queue/Streaming**:

- `packages/mukti-api/src/modules/conversations/services/queue.service.ts`
- `packages/mukti-api/src/modules/dialogue/services/dialogue-queue.service.ts`

**Error Handling**:

- `packages/mukti-api/src/common/filters/http-exception.filter.ts`

**Schemas**:

- `packages/mukti-api/src/schemas/index.ts` — ALL_SCHEMAS registry

---

## Related

- **Codebase Standards** → `../CODEBASE_STANDARDS.md`
- **Frontend Patterns** → `mukti-web-patterns.md`
