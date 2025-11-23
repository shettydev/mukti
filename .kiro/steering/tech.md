# Technology Stack

## Build System & Package Management

- **Monorepo**: Nx workspace with npm/yarn workspaces
- **Runtime**: Bun (preferred) - use `bun` instead of npm/yarn/pnpm
- **TypeScript**: v5+ with strict mode enabled
- **Node.js**: v18+ required

## Frontend Stack (mukti-web)

- **Framework**: Next.js 15 (App Router)
- **React**: v19
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI, shadcn/ui patterns
- **Animations**: Framer Motion, GSAP
- **Forms**: React Hook Form + Zod validation
- **Theme**: next-themes for dark/light mode

## Backend Stack (mukti-api)

- **Framework**: NestJS v11
- **Database**: MongoDB (via Mongoose)
- **Authentication**: Planned integration with Supabase
- **Validation**: class-validator, class-transformer
- **Testing**: Jest

## Infrastructure & Services

- **Database**: PostgreSQL (Supabase), MongoDB
- **Cache**: Redis (planned)
- **Storage**: S3-compatible object storage (planned)
- **CDN**: CloudFlare
- **Deployment**: Kubernetes clusters

## Code Quality Tools

- **Linting**: ESLint v9 with typescript-eslint
- **Formatting**: Prettier
- **Git Hooks**: Husky + lint-staged
- **Commits**: Commitizen with conventional commits (commitlint)
- **AI Commits**: Custom script at `scripts/ai-commit.js`

## Common Commands

```bash
# Development (all packages)
bun run dev

# Development (specific package)
bun nx run mukti-web:dev
bun nx run mukti-api:start:dev

# Build all packages
bun run build

# Lint & format
bun run lint
bun run lint:fix
bun run format
bun run format:check

# Testing
bun run test
bun run test:cov

# Nx utilities
bun nx graph                    # View dependency graph
bun nx affected --target=build  # Build affected projects
bun nx affected --target=test   # Test affected projects

# Commits
bun run commit      # Interactive commit with commitizen
bun run ai:commit   # AI-assisted commit message generation
```

## Development Workflow

1. Use Bun for all package management and script execution
2. Follow conventional commits format
3. Run linting and formatting before commits (enforced by Husky)
4. Use Nx for efficient monorepo task execution
5. Leverage Nx caching for faster builds and tests
