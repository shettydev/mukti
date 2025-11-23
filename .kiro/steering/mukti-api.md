# Backend Guidelines - Mukti API

## NestJS Architecture Principles

### Module Organization

- **Feature-based modules**: Group related functionality (controllers, services, DTOs, entities) in feature modules under `src/modules/`
- **Shared modules**: Common utilities, guards, interceptors, and pipes go in `src/common/`
- **Core modules**: Database, config, and infrastructure in `src/modules/core/`
- **One module per domain**: Each business domain gets its own module (e.g., `users`, `conversations`, `inquiry`)

### Dependency Injection

- Always use constructor injection for dependencies
- Mark services with `@Injectable()` decorator
- Use interface-based injection for better testability
- Avoid circular dependencies - use `forwardRef()` only as last resort

```typescript
// Good
@Injectable()
export class ConversationService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    private readonly userService: UserService,
    private readonly logger: LoggerService,
  ) {}
}
```

## File and Folder Naming Conventions

### Files

- **Controllers**: `{feature}.controller.ts` (e.g., `conversation.controller.ts`)
- **Services**: `{feature}.service.ts` (e.g., `conversation.service.ts`)
- **Modules**: `{feature}.module.ts` (e.g., `conversation.module.ts`)
- **DTOs**: `{action}-{feature}.dto.ts` (e.g., `create-conversation.dto.ts`)
- **Entities/Schemas**: `{entity}.schema.ts` (e.g., `conversation.schema.ts`)
- **Interfaces**: `{name}.interface.ts` (e.g., `conversation-metadata.interface.ts`)
- **Guards**: `{name}.guard.ts` (e.g., `jwt-auth.guard.ts`)
- **Interceptors**: `{name}.interceptor.ts` (e.g., `logging.interceptor.ts`)
- **Pipes**: `{name}.pipe.ts` (e.g., `validation.pipe.ts`)
- **Filters**: `{name}.filter.ts` (e.g., `http-exception.filter.ts`)
- **Tests**: `{filename}.spec.ts` for unit tests, `{filename}.e2e-spec.ts` for E2E

### Folders

```
src/
├── common/                    # Shared utilities
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── utils/
├── config/                    # Configuration files
│   ├── database.config.ts
│   └── app.config.ts
├── modules/                   # Feature modules
│   ├── auth/
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── strategies/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.module.ts
│   ├── users/
│   ├── conversations/
│   └── inquiry/
├── schemas/                   # Mongoose schemas
└── main.ts                    # Application entry point
```

## Class and Method Naming

### Classes

- **PascalCase** for all class names
- Descriptive names that indicate purpose
- Suffix with type: `UserController`, `ConversationService`, `CreateUserDto`

### Methods

- **camelCase** for all method names
- Use verb prefixes for actions: `create`, `update`, `delete`, `find`, `get`
- Be specific: `findConversationsByUserId()` not `getConversations()`
- Boolean methods start with `is`, `has`, `can`: `isActive()`, `hasPermission()`, `canAccess()`

```typescript
// Good method naming
class ConversationService {
  async createConversation(dto: CreateConversationDto): Promise<Conversation> {}
  async findConversationById(id: string): Promise<Conversation> {}
  async updateConversationTitle(id: string, title: string): Promise<Conversation> {}
  async deleteConversation(id: string): Promise<void> {}
  async findConversationsByUserId(userId: string): Promise<Conversation[]> {}
  async isConversationOwner(conversationId: string, userId: string): Promise<boolean> {}
}
```

### Variables and Constants

- **camelCase** for variables: `userId`, `conversationData`
- **UPPER_SNAKE_CASE** for constants: `MAX_RECENT_MESSAGES`, `DEFAULT_PAGE_SIZE`
- **PascalCase** for enums: `UserRole`, `ConversationTechnique`

## API Design Standards

### RESTful Conventions

- Use plural nouns for resources: `/conversations`, `/users`, `/resources`
- Use HTTP methods correctly:
  - `GET` - Retrieve resources (idempotent)
  - `POST` - Create new resources
  - `PUT` - Replace entire resource
  - `PATCH` - Partial update
  - `DELETE` - Remove resource (idempotent)

### URL Structure

```
GET    /conversations              # List all conversations
GET    /conversations/:id          # Get specific conversation
POST   /conversations              # Create new conversation
PATCH  /conversations/:id          # Update conversation
DELETE /conversations/:id          # Delete conversation
GET    /conversations/:id/messages # Nested resource
POST   /conversations/:id/fork     # Action on resource
```

### Versioning

- Use URI versioning: `/api/v1/conversations`
- Set global prefix in `main.ts`: `app.setGlobalPrefix('api/v1')`

### Response Format

Standardize all API responses:

```typescript
// Success response
{
  "success": true,
  "data": { /* resource data */ },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "uuid"
  }
}

// List response with pagination
{
  "success": true,
  "data": [ /* array of resources */ ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "CONVERSATION_NOT_FOUND",
    "message": "Conversation with ID xyz not found",
    "details": { /* optional additional info */ }
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "requestId": "uuid"
  }
}
```

### HTTP Status Codes

Use appropriate status codes:
- `200 OK` - Successful GET, PATCH, PUT
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation errors
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Resource conflict (e.g., duplicate email)
- `422 Unprocessable Entity` - Semantic validation errors
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server errors

## DTOs and Validation

### DTO Structure

- Use `class-validator` decorators for validation
- Use `class-transformer` for type transformation
- Create separate DTOs for create, update, and response
- Use `PartialType`, `PickType`, `OmitType` from `@nestjs/mapped-types`

```typescript
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

## Swagger/OpenAPI Documentation

### Abstracted API Documentation

To keep controllers clean and maintainable, create separate Swagger documentation files in the `dto/` folder:

**File Structure:**
```
src/modules/users/
├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   ├── user-response.dto.ts
│   └── user.swagger.ts          # Swagger documentation
├── user.controller.ts
├── user.service.ts
└── user.module.ts
```

**Example: `dto/user.swagger.ts`**

```typescript
import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';
import { UserResponseDto } from './user-response.dto';

/**
 * Swagger documentation for creating a new user
 */
export const ApiCreateUser = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Create a new user',
      description: 'Registers a new user account with email and password',
    }),
    ApiBody({ type: CreateUserDto }),
    ApiResponse({
      status: 201,
      description: 'User successfully created',
      type: UserResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid input data',
      schema: {
        example: {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: 'Validation failed',
            details: {
              email: ['email must be a valid email address'],
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 409,
      description: 'User with this email already exists',
      schema: {
        example: {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'User with email john@example.com already exists',
          },
        },
      },
    }),
  );

/**
 * Swagger documentation for getting user by ID
 */
export const ApiGetUserById = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get user by ID',
      description: 'Retrieves a user by their unique identifier',
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: 'User ID',
      example: '507f1f77bcf86cd799439011',
    }),
    ApiResponse({
      status: 200,
      description: 'User found',
      type: UserResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'User not found',
      schema: {
        example: {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'User with ID 507f1f77bcf86cd799439011 not found',
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - JWT token missing or invalid',
    }),
  );

/**
 * Swagger documentation for listing users
 */
export const ApiGetUsers = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List all users',
      description: 'Retrieves a paginated list of users',
    }),
    ApiBearerAuth(),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number',
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Items per page',
      example: 20,
    }),
    ApiQuery({
      name: 'search',
      required: false,
      type: String,
      description: 'Search by name or email',
      example: 'john',
    }),
    ApiResponse({
      status: 200,
      description: 'Users retrieved successfully',
      schema: {
        example: {
          success: true,
          data: [
            {
              id: '507f1f77bcf86cd799439011',
              email: 'john@example.com',
              name: 'John Doe',
              role: 'user',
              createdAt: '2024-01-01T00:00:00Z',
            },
          ],
          meta: {
            page: 1,
            limit: 20,
            total: 100,
            totalPages: 5,
          },
        },
      },
    }),
  );

/**
 * Swagger documentation for updating a user
 */
export const ApiUpdateUser = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Update user',
      description: 'Updates user information',
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: 'User ID',
      example: '507f1f77bcf86cd799439011',
    }),
    ApiBody({ type: UpdateUserDto }),
    ApiResponse({
      status: 200,
      description: 'User updated successfully',
      type: UserResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: 'User not found',
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden - Cannot update other users',
    }),
  );

/**
 * Swagger documentation for deleting a user
 */
export const ApiDeleteUser = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Delete user',
      description: 'Permanently deletes a user account',
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: 'User ID',
      example: '507f1f77bcf86cd799439011',
    }),
    ApiResponse({
      status: 204,
      description: 'User deleted successfully',
    }),
    ApiResponse({
      status: 404,
      description: 'User not found',
    }),
    ApiResponse({
      status: 403,
      description: 'Forbidden - Insufficient permissions',
    }),
  );
```

**Using in Controller:**

```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiCreateUser,
  ApiGetUserById,
  ApiGetUsers,
  ApiUpdateUser,
  ApiDeleteUser,
} from './dto/user.swagger';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiCreateUser()
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.createUser(createUserDto);
  }

  @Get()
  @ApiGetUsers()
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.userService.findAllUsers({ page, limit, search });
  }

  @Get(':id')
  @ApiGetUserById()
  async findOne(@Param('id') id: string) {
    return this.userService.findUserById(id);
  }

  @Patch(':id')
  @ApiUpdateUser()
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.updateUser(id, updateUserDto);
  }

  @Delete(':id')
  @ApiDeleteUser()
  async remove(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }
}
```

### Swagger Configuration in main.ts

```typescript
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Mukti API')
    .setDescription('Cognitive Liberation Platform - Thinking Workspace API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Users', 'User management endpoints')
    .addTag('Conversations', 'Conversation and inquiry session endpoints')
    .addTag('Auth', 'Authentication and authorization endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
```

### Benefits of Abstracted Swagger Docs

1. **Clean Controllers**: Controllers remain focused on routing and delegation
2. **Reusability**: Documentation decorators can be reused across similar endpoints
3. **Maintainability**: All API documentation for a feature is in one place
4. **Consistency**: Enforces consistent documentation patterns
5. **Testability**: Controllers are easier to test without decorator clutter
6. **Readability**: Easier to review and update API documentation

### Swagger Best Practices

- Always include example responses for success and error cases
- Document all query parameters, path parameters, and request bodies
- Use `ApiBearerAuth()` for protected endpoints
- Group related endpoints with `@ApiTags()`
- Provide meaningful descriptions for operations
- Include HTTP status codes for all possible responses
- Use response DTOs to define response schemas
- Create one `.swagger.ts` file per feature module in the `dto/` folder
- Name swagger decorator functions with `Api` prefix: `ApiCreateUser`, `ApiGetUsers`

### Validation Pipe

Enable global validation in `main.ts`:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Strip non-whitelisted properties
    forbidNonWhitelisted: true, // Throw error on non-whitelisted properties
    transform: true, // Auto-transform payloads to DTO instances
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
);
```

## Logging Standards

### Logger Service

- Use NestJS built-in logger or custom logger service
- Inject logger into services via constructor
- Set context for each logger instance

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  async createConversation(dto: CreateConversationDto): Promise<Conversation> {
    this.logger.log(`Creating conversation for user ${dto.userId}`);
    try {
      const conversation = await this.conversationModel.create(dto);
      this.logger.log(`Conversation created: ${conversation._id}`);
      return conversation;
    } catch (error) {
      this.logger.error(`Failed to create conversation: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

### Log Levels

- `logger.log()` - General information (successful operations)
- `logger.debug()` - Detailed debugging information
- `logger.warn()` - Warning messages (deprecated features, potential issues)
- `logger.error()` - Error messages with stack traces
- `logger.verbose()` - Verbose operational information

### What to Log

**DO log:**
- Service method entry/exit for important operations
- External API calls and responses
- Database operations (create, update, delete)
- Authentication/authorization events
- Error conditions with context
- Performance metrics for slow operations

**DON'T log:**
- Sensitive data (passwords, tokens, PII)
- Full request/response bodies in production
- Excessive debug info in production

## TSDoc Documentation

### Required Documentation

Document all public APIs with TSDoc comments:

```typescript
/**
 * Service responsible for managing user conversations and Socratic inquiry sessions.
 * Handles CRUD operations, message management, and conversation analytics.
 *
 * @remarks
 * This service implements the core Thinking Workspace paradigm, ensuring
 * conversations guide users through structured inquiry rather than providing
 * direct answers.
 */
@Injectable()
export class ConversationService {
  /**
   * Creates a new conversation for a user with specified Socratic technique.
   *
   * @param dto - The conversation creation data
   * @returns The newly created conversation
   * @throws {BadRequestException} If the technique is invalid
   * @throws {NotFoundException} If the user doesn't exist
   *
   * @example
   * ```typescript
   * const conversation = await conversationService.createConversation({
   *   userId: '507f1f77bcf86cd799439011',
   *   title: 'React Performance',
   *   technique: 'elenchus'
   * });
   * ```
   */
  async createConversation(dto: CreateConversationDto): Promise<Conversation> {
    // Implementation
  }

  /**
   * Retrieves a conversation by ID with optional user population.
   *
   * @param id - The conversation ID
   * @param populateUser - Whether to populate user details (default: false)
   * @returns The conversation if found
   * @throws {NotFoundException} If conversation doesn't exist
   */
  async findConversationById(
    id: string,
    populateUser = false,
  ): Promise<Conversation> {
    // Implementation
  }
}
```

### TSDoc Tags

- `@param` - Parameter description
- `@returns` - Return value description
- `@throws` - Exceptions that may be thrown
- `@example` - Usage examples
- `@remarks` - Additional implementation notes
- `@see` - References to related code
- `@deprecated` - Mark deprecated methods

## Error Handling

### Exception Filters

Create custom exception filters for consistent error responses:

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    response.status(status).json({
      success: false,
      error: {
        code: exception.name,
        message: exception.message,
        details: typeof exceptionResponse === 'object' ? exceptionResponse : {},
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: ctx.getRequest().url,
      },
    });
  }
}
```

### Custom Exceptions

Create domain-specific exceptions:

```typescript
import { NotFoundException } from '@nestjs/common';

export class ConversationNotFoundException extends NotFoundException {
  constructor(conversationId: string) {
    super(`Conversation with ID ${conversationId} not found`);
  }
}
```

### Error Handling Pattern

```typescript
async findConversationById(id: string): Promise<Conversation> {
  try {
    const conversation = await this.conversationModel.findById(id);
    
    if (!conversation) {
      throw new ConversationNotFoundException(id);
    }
    
    return conversation;
  } catch (error) {
    if (error instanceof ConversationNotFoundException) {
      throw error;
    }
    
    this.logger.error(`Error finding conversation ${id}: ${error.message}`, error.stack);
    throw new InternalServerErrorException('Failed to retrieve conversation');
  }
}
```

## Testing Standards

### Unit Tests

- Test file next to source: `conversation.service.spec.ts`
- Mock all dependencies
- Test happy paths and edge cases
- Use descriptive test names

```typescript
describe('ConversationService', () => {
  let service: ConversationService;
  let model: Model<ConversationDocument>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        {
          provide: getModelToken(Conversation.name),
          useValue: mockConversationModel,
        },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    model = module.get<Model<ConversationDocument>>(getModelToken(Conversation.name));
  });

  describe('createConversation', () => {
    it('should create a conversation successfully', async () => {
      // Arrange
      const dto: CreateConversationDto = {
        userId: 'user123',
        title: 'Test Conversation',
        technique: 'elenchus',
      };

      // Act
      const result = await service.createConversation(dto);

      // Assert
      expect(result).toBeDefined();
      expect(result.title).toBe(dto.title);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Test implementation
    });
  });
});
```

### E2E Tests

- Place in `test/` directory
- Test complete request/response cycles
- Use test database

## Security Guidelines

### Input Validation

- Always validate and sanitize user input
- Use DTOs with class-validator
- Enable whitelist and forbidNonWhitelisted in ValidationPipe

### Authentication & Authorization

- Use guards for route protection
- Implement JWT-based authentication
- Use role-based access control (RBAC)

```typescript
@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  @Get(':id')
  @UseGuards(ConversationOwnerGuard)
  async findOne(@Param('id') id: string) {
    return this.conversationService.findConversationById(id);
  }
}
```

### Sensitive Data

- Never log passwords, tokens, or PII
- Use environment variables for secrets
- Implement proper password hashing (bcrypt)
- Remove sensitive fields in schema transforms

## Performance Optimization

### Database

- Add indexes for frequently queried fields
- Use lean queries when virtuals not needed: `.lean()`
- Implement pagination for list endpoints
- Use projection to limit returned fields

```typescript
async findConversationsByUserId(
  userId: string,
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<Conversation>> {
  const skip = (page - 1) * limit;
  
  const [conversations, total] = await Promise.all([
    this.conversationModel
      .find({ userId })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.conversationModel.countDocuments({ userId }),
  ]);

  return {
    data: conversations,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

### Caching

- Implement Redis caching for frequently accessed data
- Use cache interceptors
- Set appropriate TTL values

## Code Style

### Import Organization

Use perfectionist plugin for automatic import sorting:
1. Type imports
2. External dependencies
3. Internal modules
4. Relative imports

### Formatting

- Single quotes for strings
- Trailing commas
- 2-space indentation
- Max line length: 100 characters

### TypeScript

- Enable strict mode
- Avoid `any` - use `unknown` or proper types
- Use type imports: `import type { ... }`
- Prefer interfaces for object shapes
- Use enums for fixed sets of values

## Environment Configuration

### Configuration Module

Use `@nestjs/config` for environment management:

```typescript
// config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri: process.env.MONGODB_URI,
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
}));
```

### Environment Variables

Required variables in `.env`:
- `NODE_ENV` - Environment (development, production, test)
- `PORT` - Server port
- `MONGODB_URI` - Database connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRATION` - Token expiration time

## Checklist for New Features

- [ ] Create feature module with proper structure
- [ ] Define DTOs with validation decorators
- [ ] Create abstracted Swagger documentation file (`{feature}.swagger.ts` in dto folder)
- [ ] Implement service with business logic
- [ ] Add controller with proper decorators and Swagger imports
- [ ] Write TSDoc comments for public APIs
- [ ] Add logging for important operations
- [ ] Implement error handling
- [ ] Write unit tests (>80% coverage)
- [ ] Write E2E tests for endpoints
- [ ] Add database indexes if needed
- [ ] Verify Swagger documentation at `/api/docs`
- [ ] Test with Postman/Insomnia
- [ ] Review security implications
