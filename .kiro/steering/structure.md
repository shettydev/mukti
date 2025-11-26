# Project Structure Guidelines

## Monorepo Organization

Mukti uses an Nx-powered monorepo with workspace packages under `packages/`.

```
mukti/
├── packages/           # Workspace packages
│   ├── mukti-api/      # NestJS backend API
│   ├── mukti-web/      # Next.js frontend
│   └── mukti-docs/     # Documentation
├── mukti-mcp-server/   # MCP server (standalone)
├── scripts/            # Build and utility scripts
├── .husky/             # Git hooks
└── .kiro/              # Kiro AI configuration
    ├── specs/          # Feature specifications
    └── steering/       # AI guidance rules
```

## Backend Structure (mukti-api)

### Top-Level Organization

```
packages/mukti-api/
├── src/
│   ├── common/         # Shared utilities (decorators, filters, guards, pipes, utils)
│   ├── config/         # Configuration files
│   ├── modules/        # Feature modules (see below)
│   ├── schemas/        # MongoDB schemas (centralized)
│   ├── app.module.ts   # Root module
│   └── main.ts         # Application entry point
├── test/               # E2E tests
└── .env.example        # Environment template
```

### Feature Module Structure

Each feature module should follow this structure:

```
src/modules/{feature}/
├── dto/                           # Data Transfer Objects
│   ├── create-{feature}.dto.ts    # Creation DTO
│   ├── update-{feature}.dto.ts    # Update DTO
│   ├── {feature}-response.dto.ts  # Response DTO
│   ├── {feature}.swagger.ts       # Swagger documentation (abstracted)
│   └── index.ts                   # Barrel export
├── guards/                        # Feature-specific guards (optional)
│   └── __tests__/
│       └── properties/            # Property-based tests
├── decorators/                    # Feature-specific decorators (optional)
├── strategies/                    # Passport strategies (auth only)
├── services/                      # Business logic (if multiple services)
│   ├── {feature}.service.ts
│   ├── {other}.service.ts
│   └── __tests__/
│       ├── *.spec.ts              # Unit tests
│       └── properties/            # Property-based tests
├── {feature}.controller.ts        # HTTP endpoints
├── {feature}.service.ts           # Main service (if single service)
├── {feature}.module.ts            # Module definition
└── README.md                      # Feature documentation (optional)
```

### Naming Conventions

- **Controllers**: `{feature}.controller.ts`
- **Services**: `{feature}.service.ts` or `{specific-name}.service.ts`
- **Modules**: `{feature}.module.ts`
- **DTOs**: `{action}-{feature}.dto.ts` (e.g., `create-user.dto.ts`)
- **Response DTOs**: `{feature}-response.dto.ts`
- **Swagger Docs**: `{feature}.swagger.ts` (in dto folder)
- **Schemas**: `{entity}.schema.ts` (in `src/schemas/`)
- **Guards**: `{name}.guard.ts`
- **Strategies**: `{name}.strategy.ts`
- **Decorators**: `{name}.decorator.ts`
- **Tests**: `{name}.spec.ts` for unit tests, `{name}.e2e-spec.ts` for E2E
- **Property Tests**: `{name}.property.spec.ts` in `__tests__/properties/`

### Key Principles

- **Feature-based modules**: Group related functionality together
- **Centralized schemas**: All Mongoose schemas in `src/schemas/`
- **Abstracted Swagger docs**: Keep controllers clean by moving Swagger decorators to `{feature}.swagger.ts` files
- **Co-located tests**: Place tests in `__tests__/` folders next to source code
- **Property-based tests**: Use `__tests__/properties/` for critical business logic
- **Dependency injection**: Use constructor injection for all dependencies
- **DTOs for validation**: Always validate input/output with class-validator

## Frontend Structure (mukti-web)

### Top-Level Organization

```
packages/mukti-web/
├── src/
│   ├── app/            # Next.js App Router (pages, layouts, API routes)
│   ├── components/     # React components
│   ├── lib/            # Utilities, hooks, API clients, stores
│   └── types/          # TypeScript type definitions
├── public/             # Static assets
└── .env.local          # Environment variables
```

### App Router Structure

```
src/app/
├── (auth)/             # Route groups for auth pages
├── (dashboard)/        # Route groups for dashboard
├── api/                # API routes
├── layout.tsx          # Root layout
├── page.tsx            # Home page
├── loading.tsx         # Loading UI
├── error.tsx           # Error boundary
├── not-found.tsx       # 404 page
└── providers.tsx       # Context providers (TanStack Query, etc.)
```

### Components Organization

```
src/components/
├── ui/                 # shadcn/ui base components
├── magicui/            # Magic UI components
├── reactbits/          # Custom reusable components
├── forms/              # Form components
├── layouts/            # Layout components
└── sections/           # Page section components
```

### Lib Organization

```
src/lib/
├── api/                # API client layer
│   ├── client.ts       # Base fetch client
│   └── {resource}.ts   # Resource-specific endpoints
├── hooks/              # Custom React hooks (TanStack Query hooks)
│   └── use-{resource}.ts
├── stores/             # Zustand stores
│   └── {name}-store.ts
├── query-keys.ts       # TanStack Query key factory
├── config.ts           # App configuration
└── utils.ts            # Helper functions
```

### Naming Conventions

- **Components**: kebab-case files, PascalCase exports (e.g., `hero-section.tsx` → `HeroSection`)
- **Hooks**: `use-{name}.ts` (e.g., `use-conversations.ts`)
- **API Clients**: `{resource}.ts` (e.g., `conversations.ts`)
- **Stores**: `{name}-store.ts` (e.g., `conversation-store.ts`)
- **Types**: `{name}.types.ts` (e.g., `conversation.types.ts`)

### Key Principles

- **Server Components by default**: Only use `'use client'` when needed
- **TanStack Query for all API calls**: Never bypass the query cache
- **Centralized query keys**: Use query key factory pattern
- **Co-located components**: Group related components together
- **Type safety**: Define types in `src/types/`

## General Principles

### File Organization

- **Co-locate related files**: Keep tests, DTOs, and services together
- **Barrel exports**: Use `index.ts` for clean imports
- **Flat when possible**: Avoid deep nesting unless necessary

### Testing Structure

- **Unit tests**: Next to source files in `__tests__/` folders
- **Property-based tests**: In `__tests__/properties/` for critical logic
- **E2E tests**: In `test/` directory at package root

### Documentation

- **README.md**: Add to complex modules for context
- **TSDoc comments**: Document all public APIs
- **Swagger docs**: Abstract into separate `.swagger.ts` files
