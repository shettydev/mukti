# Project Structure

## Monorepo Organization

Mukti uses an Nx-powered monorepo with workspace packages under `packages/`.

```
mukti/
├── packages/
│   ├── mukti-api/          # NestJS backend API
│   ├── mukti-web/          # Next.js landing page
│   └── mukti-docs/         # Architecture documentation
├── mukti-mcp-server/       # MCP server (separate from workspace)
├── scripts/                # Build and utility scripts
├── .husky/                 # Git hooks
├── .nx/                    # Nx cache and workspace data
└── .kiro/                  # Kiro AI steering rules
```

## Package: mukti-api

NestJS backend implementing the Thinking Workspace paradigm.

```
packages/mukti-api/
├── src/
│   ├── modules/            # Feature modules
│   │   ├── database/       # Database configuration
│   │   └── feat-abc/
│   │       └──__tests__/    # Tests
│   │
│   ├── schemas/            # MongoDB schemas (Mongoose)
│   │   ├── user.schema.ts
│   │   ├── conversation.schema.ts
│   │   ├── technique.schema.ts
│   │   └── ...
│   ├── app.module.ts       # Root module
│   ├── app.controller.ts   # Root controller
│   ├── app.service.ts      # Root service
│   └── main.ts             # Application entry point
├── test/                   # E2E tests
└── dist/                   # Build output
```

### Key Schemas

- **user.schema.ts**: User accounts and profiles
- **conversation.schema.ts**: Thinking session conversations
- **technique.schema.ts**: Socratic questioning techniques
- **resource.schema.ts**: Curated learning resources
- **usage-event.schema.ts**: Analytics and tracking
- **subscription.schema.ts**: User subscriptions
- **rate-limit.schema.ts**: API rate limiting

## Package: mukti-web

Next.js 15 frontend with App Router.

```
packages/mukti-web/
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── api/            # API routes
│   │   │   └── waitlist/   # Waitlist endpoint
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Home page
│   │   └── globals.css     # Global styles
│   ├── components/         # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── magicui/        # Magic UI components
│   │   ├── reactbits/      # Custom UI components
│   │   ├── hero.tsx
│   │   ├── feature.tsx
│   │   ├── waitlist.tsx
│   │   └── ...
│   └── lib/                # Utilities and hooks
│       ├── db/             # Database clients
│       ├── hooks/          # Custom React hooks
│       └── utils.ts        # Helper functions
├── public/                 # Static assets
└── .next/                  # Next.js build output
```

## Package: mukti-docs

Architecture diagrams and documentation.

```
packages/mukti-docs/
├── data/
│   └── data-modelling.md
├── mukti-architecture.png
└── mukti-data-modelling.png
```

## MCP Server

Standalone Model Context Protocol server (not in workspace).

```
mukti-mcp-server/
├── src/
│   ├── index.ts                  # Server entry point
│   ├── types.ts                  # Type definitions
│   ├── response-strategies.ts   # Socratic response logic
│   └── tests/
├── build/                        # Compiled output
└── package.json                  # Independent package
```

## Configuration Files

- **nx.json**: Nx workspace configuration
- **tsconfig.json**: Root TypeScript config (strict mode)
- **package.json**: Root workspace dependencies and scripts
- **.prettierrc**: Code formatting rules
- **commitlint.config.js**: Commit message linting
- **.env**: Environment variables (not committed)

## Naming Conventions

- **Packages**: kebab-case with `@mukti/` scope (e.g., `@mukti/api`)
- **Files**: kebab-case for components, PascalCase for classes
- **Components**: PascalCase (e.g., `Hero.tsx`, `WaitlistForm.tsx`)
- **Schemas**: kebab-case with `.schema.ts` suffix
- **Tests**: `.spec.ts` for unit tests, `.e2e-spec.ts` for E2E tests

## Module Organization

Follow NestJS conventions:

- Group related features in modules under `src/modules/`
- Keep schemas in `src/schemas/`
- Use dependency injection for services
- Implement DTOs for request/response validation
