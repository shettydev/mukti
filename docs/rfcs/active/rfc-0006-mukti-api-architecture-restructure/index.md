# RFC-0006: Mukti API Architecture Restructure

<!-- HEADER BLOCK: Identifies the RFC and its current lifecycle state at a glance. -->

| Field            | Value                                                                  |
| ---------------- | ---------------------------------------------------------------------- |
| **RFC Number**   | 0006                                                                   |
| **Title**        | Mukti API Architecture Restructure                                     |
| **Status**       | ![Status: Accepted](https://img.shields.io/badge/Status-Accepted-blue) |
| **Author(s)**    | [Prathik Shetty](https://github.com/shettydev)                         |
| **Created**      | 2026-03-26                                                             |
| **Last Updated** | 2026-03-27                                                             |

> **Status options:** `Draft` | `In Review` | `Accepted` | `Implemented` | `Rejected` | `Superseded`

---

## 1. Abstract

This RFC proposes a comprehensive architectural restructure of `@mukti/api` to address ten systemic structural issues that have accumulated as the codebase grew from 4 modules to 12. The core problems: all 24 Mongoose schemas live in a flat global `src/schemas/` directory divorced from their domain modules; cross-cutting concerns (guards, decorators, interceptors) are buried inside `modules/auth/`; BullMQ Redis configuration is duplicated across three modules; every controller manually constructs the response envelope; and test file placement follows no consistent convention. This RFC introduces a layered architecture with three tiers — **Core** (shared infrastructure), **Common** (cross-cutting concerns), and **Domain** (feature modules with co-located schemas) — along with standardized internal module layouts and a phased migration strategy that maintains backwards compatibility at every step.

---

## 2. Motivation

The `@mukti/api` codebase has grown organically from an initial 4-module structure (Auth, Canvas, Conversations, Database) to 12 modules spanning authentication, AI integration, Socratic dialogue, knowledge tracing, scaffolding, dialogue quality guardrails, and thought mapping. Each new module was added independently, inheriting whatever patterns existed at the time. The result is a codebase where finding something requires knowing which module "owns" a particular schema, guard, or utility — knowledge that exists only in developer memory.

### Current Pain Points

- **Pain Point 1: Schema Scattering** — All 24 Mongoose schemas live in `src/schemas/` as a flat list. The `User` schema is used by 8 different modules, but the `ThoughtMapShareLink` schema is only used by `ThoughtMapModule`. Both sit in the same directory with identical import paths (`../../schemas/`). There is no signal about which domain owns which schema. Adding a new schema means updating `schemas/index.ts`, the `ALL_SCHEMAS` array, and then re-registering it via `MongooseModule.forFeature()` in the consuming module — a three-step process spread across two files.

- **Pain Point 2: Cross-Cutting Concerns Buried in Auth** — `@Public()`, `@CurrentUser()`, `@Roles()`, `JwtAuthGuard`, `RolesGuard`, and `EmailVerifiedGuard` are used globally across every authenticated module, but they live inside `modules/auth/guards/` and `modules/auth/decorators/`. Every new module must import from `../auth/` to use foundational infrastructure. This creates a false dependency: `ThoughtMapModule` has no business dependency on `AuthModule`, yet it imports auth's decorators.

- **Pain Point 3: Duplicated Infrastructure Configuration** — `ConversationsModule`, `DialogueModule`, and `ThoughtMapModule` each independently configure `BullModule.forRootAsync()` with identical Redis connection parameters. The same 12-line Redis factory function exists in three places. Changing the Redis configuration (e.g., adding TLS) requires editing three files.

- **Pain Point 4: Manual Response Envelope Construction** — Every controller method manually constructs `{ success: true, data, meta: { requestId, timestamp } }`. There is no shared interceptor or utility. A count of response envelope constructions across all controllers yields 40+ manual constructions. If the envelope shape changes (e.g., adding `version` to `meta`), every controller must be updated.

- **Pain Point 5: Nearly Empty `common/` Directory** — The `src/common/` directory contains only `filters/` (1 file) and `seeds/` (2 files). There are no shared decorators, no shared guards, no shared interceptors, no shared interfaces, no shared constants. The directory exists but serves almost no organizational purpose.

- **Pain Point 6: Inconsistent Module Internal Structure** — `AuthModule` has 5 subdirectories (`services/`, `guards/`, `decorators/`, `strategies/`, `dto/`). `CanvasModule` has flat files (`canvas.service.ts`, `canvas.controller.ts`) with no `services/` subdirectory. `KnowledgeTracingModule` has an `examples/` directory containing a runtime integration example — a pattern used nowhere else. There is no canonical internal layout that all modules follow.

- **Pain Point 7: Dual Schema Registration** — `DatabaseModule` registers ALL schemas globally via `MongooseModule.forFeature(ALL_SCHEMAS)`, but each domain module also registers the specific schemas it needs via its own `MongooseModule.forFeature([...])`. This dual registration works at runtime (Mongoose deduplicates), but it creates confusion about which module "owns" schema registration and makes it unclear whether the per-module registrations are necessary.

- **Pain Point 8: Test Placement Chaos** — Auth tests are in `services/__tests__/`. Conversation tests exist both in module-root `__tests__/` and `services/__tests__/`. Knowledge-tracing has `bkt-algorithm.service.spec.ts` directly in `services/` (no `__tests__/` subdirectory). Property tests are consistently in `__tests__/properties/` — the one bright spot. There is no documented convention.

- **Pain Point 9: Invisible Module Dependencies** — `ScaffoldingModule` and `DialogueQualityModule` are critical parts of the system (RFC-0001, RFC-0002, RFC-0004) but do not appear in `app.module.ts`. They are imported transitively via `ConversationsModule` and `DialogueModule`. A developer reading `app.module.ts` sees 10 modules, but the actual dependency graph has 12. The application topology is invisible.

- **Pain Point 10: No Shared Type/Interface Layer** — Common types like `PaginationOptions`, `ResponseEnvelope`, `NodeType`, and queue job data interfaces are defined inline in whichever module needed them first. There is no shared type layer for cross-module interfaces.

---

## 3. Goals & Non-Goals

### Goals

- [ ] Co-locate schemas with their owning domain module, eliminating the flat `src/schemas/` directory
- [x] Extract cross-cutting concerns (guards, decorators, filters, interceptors) into `src/common/`
- [x] Centralize BullMQ/Redis configuration into a shared `QueueModule` — configure once, import everywhere
- [ ] Introduce a `ResponseInterceptor` that automatically wraps controller return values in the standard envelope
- [ ] Define and enforce a canonical internal module layout (controller, services, dto, interfaces, tests)
- [ ] Standardize test file placement: all tests in `__tests__/` subdirectories, property tests in `__tests__/properties/`
- [ ] Make all module dependencies visible in `app.module.ts`
- [ ] Create a shared types/interfaces layer for cross-module contracts
- [ ] Maintain full backwards compatibility at each migration phase — no big-bang rewrites

### Non-Goals

- **Changing the NestJS module-per-feature architecture**: The current modular approach is correct (ADR: NestJS 11 over Express). This RFC restructures _within_ that architecture.
- **Splitting `@mukti/api` into separate packages**: The API remains a single deployable. No Nx library extraction.
- **Modifying API contracts or response shapes**: External API behavior is unchanged. The response envelope format stays the same — only _how_ it's constructed changes (interceptor vs. manual).
- **Rearchitecting the Queue + SSE pattern**: The BullMQ + SSE pattern (ADR: Queue-Based AI Processing) is preserved. Only the _configuration_ is centralized.
- **Migrating away from MongoDB or Mongoose**: The data layer technology stack is unchanged.
- **Implementing new features**: This RFC is purely structural. No new endpoints, schemas, or business logic.

---

## 4. Background & Context

### Prior Art

| Reference                    | Relevance                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| ADR: NestJS 11 over Express  | Established module-per-feature architecture — this RFC restructures within it                                          |
| ADR: MongoDB + Mongoose      | Schemas use Mongoose decorators; co-location must preserve `@Schema()` patterns                                        |
| ADR: Queue-Based AI (BullMQ) | Three modules use BullMQ; centralized config is the fix for duplication                                                |
| RFC-0001                     | Added `KnowledgeTracingModule` and `ScaffoldingModule` — modules that first exposed the "invisible dependency" problem |
| RFC-0002                     | Added scaffold fields to `NodeDialogue` schema — cross-module schema coupling                                          |
| RFC-0003                     | Added `ThoughtMapModule` (largest module, 5 services, 2 controllers) — first module to strain the architecture         |
| RFC-0004                     | Added `DialogueQualityModule` — pure service module with no controller, unusual in current structure                   |
| NestJS Docs: Modules         | Official guidance on module organization, re-exporting, and global modules                                             |

### System Context Diagram

```mermaid
graph TB
    subgraph "Current Architecture (Flat)"
        SCHEMAS["src/schemas/<br/>24 flat files + ALL_SCHEMAS"]
        COMMON["src/common/<br/>filters/ + seeds/ only"]
        APP[app.module.ts]

        subgraph "modules/"
            AUTH[auth/]
            AI[ai/]
            CANVAS[canvas/]
            CONV[conversations/]
            DLG[dialogue/]
            TM[thought-map/]
            KT[knowledge-tracing/]
            SCAF[scaffolding/]
            DQ[dialogue-quality/]
            DB[database/]
            HEALTH[health/]
            WAIT[waitlist/]
        end
    end

    AUTH -.->|"guards, decorators<br/>used globally"| CONV
    AUTH -.->|"guards, decorators"| DLG
    AUTH -.->|"guards, decorators"| TM
    SCHEMAS -->|"../../schemas/"| AUTH
    SCHEMAS -->|"../../schemas/"| CONV
    SCHEMAS -->|"../../schemas/"| DLG
    SCHEMAS -->|"../../schemas/"| TM
    SCHEMAS -->|"../../schemas/"| DB

    style SCHEMAS fill:#f88,stroke:#333
    style AUTH fill:#ff9,stroke:#333
    style COMMON fill:#f88,stroke:#333
```

---

## 5. Proposed Solution

### Overview

The restructure introduces a three-tier layered architecture that separates infrastructure, cross-cutting concerns, and domain logic into distinct directories. Schemas move from the global `src/schemas/` directory into their owning domain modules. A new `CoreModule` centralizes BullMQ/Redis configuration. Cross-cutting guards, decorators, and interceptors move from `modules/auth/` to `src/common/`. A `ResponseInterceptor` replaces 40+ manual envelope constructions. Every domain module adopts a canonical internal layout. The migration is phased: each phase produces a working, tested codebase.

### Architecture Diagram

```mermaid
graph TB
    subgraph "Proposed Architecture (Layered)"
        direction TB

        subgraph "Layer 1: Core Infrastructure"
            CORE_MOD[core/<br/>CoreModule]
            QUEUE_MOD[core/<br/>QueueModule]
            DB_MOD[core/<br/>DatabaseModule]
        end

        subgraph "Layer 2: Common Cross-Cutting"
            GUARDS[common/guards/]
            DECORATORS[common/decorators/]
            INTERCEPTORS[common/interceptors/]
            FILTERS[common/filters/]
            INTERFACES[common/interfaces/]
            CONSTANTS[common/constants/]
        end

        subgraph "Layer 3: Domain Modules"
            AUTH_D[modules/auth/<br/>+ co-located schemas]
            AI_D[modules/ai/<br/>+ co-located schemas]
            CANVAS_D[modules/canvas/<br/>+ co-located schemas]
            CONV_D[modules/conversations/<br/>+ co-located schemas]
            DLG_D[modules/dialogue/<br/>+ co-located schemas]
            TM_D[modules/thought-map/<br/>+ co-located schemas]
            KT_D[modules/knowledge-tracing/<br/>+ co-located schemas]
            SCAF_D[modules/scaffolding/]
            DQ_D[modules/dialogue-quality/]
            HEALTH_D[modules/health/]
            WAIT_D[modules/waitlist/<br/>+ co-located schemas]
        end
    end

    CORE_MOD --> DB_MOD
    CORE_MOD --> QUEUE_MOD

    AUTH_D --> CORE_MOD
    CONV_D --> CORE_MOD
    DLG_D --> CORE_MOD
    TM_D --> CORE_MOD

    AUTH_D --> GUARDS
    CONV_D --> GUARDS
    DLG_D --> GUARDS
    TM_D --> GUARDS

    style CORE_MOD fill:#8f8,stroke:#333
    style QUEUE_MOD fill:#8f8,stroke:#333
    style DB_MOD fill:#8f8,stroke:#333
    style GUARDS fill:#8bf,stroke:#333
    style DECORATORS fill:#8bf,stroke:#333
    style INTERCEPTORS fill:#8bf,stroke:#333
```

### Detailed Design

#### 5.1 Directory Structure — Target State

The restructured `src/` directory follows a layered convention where each layer has clear responsibilities and import rules.

```mermaid
graph LR
    subgraph "Import Rules"
        L3[Layer 3: Domain Modules] -->|can import| L2[Layer 2: Common]
        L3 -->|can import| L1[Layer 1: Core]
        L2 -->|can import| L1
        L1 -.->|never imports| L2
        L1 -.->|never imports| L3
        L2 -.->|never imports| L3
    end

    style L1 fill:#8f8,stroke:#333
    style L2 fill:#8bf,stroke:#333
    style L3 fill:#ff9,stroke:#333
```

**Layer 1 — Core Infrastructure** (`src/core/`):

| Directory        | Responsibility                                                        |
| ---------------- | --------------------------------------------------------------------- |
| `core/database/` | MongoDB connection, `DatabaseModule` with `forRootAsync()`            |
| `core/queue/`    | `QueueModule` — centralized BullMQ/Redis config, exported `forRoot()` |

**Layer 2 — Common Cross-Cutting** (`src/common/`):

| Directory              | Responsibility                                                        |
| ---------------------- | --------------------------------------------------------------------- |
| `common/decorators/`   | `@Public()`, `@CurrentUser()`, `@Roles()` — framework decorators      |
| `common/guards/`       | `JwtAuthGuard`, `RolesGuard`, `EmailVerifiedGuard` — framework guards |
| `common/interceptors/` | `ResponseInterceptor` — automatic response envelope wrapping          |
| `common/filters/`      | `HttpExceptionFilter` — global exception handling (already exists)    |
| `common/interfaces/`   | Shared types: `PaginationOptions`, `ResponseEnvelope`, `NodeType`     |
| `common/constants/`    | Shared constants: roles, default values, queue names                  |
| `common/pipes/`        | Shared validation pipes (future use)                                  |

**Layer 3 — Domain Modules** (`src/modules/`):

Each domain module follows the canonical internal layout defined in §5.2.

#### 5.2 Canonical Module Layout

Every domain module must follow this internal structure. This replaces the ad-hoc layouts currently in use.

```mermaid
classDiagram
    class CanonicalModule {
        +feature.module.ts
        +feature.controller.ts
    }

    class DTOLayer {
        +create-feature.dto.ts
        +update-feature.dto.ts
        +feature-response.dto.ts
        +feature.swagger.ts
        +index.ts
    }

    class ServiceLayer {
        +feature.service.ts
        +feature-queue.service.ts
        +feature-stream.service.ts
        +index.ts
    }

    class SchemaLayer {
        +feature.schema.ts
        +feature-related.schema.ts
        +index.ts
    }

    class InterfaceLayer {
        +feature.interface.ts
    }

    class TestLayer {
        +feature.controller.spec.ts
        +feature.service.spec.ts
    }

    class PropertyTestLayer {
        +feature.property.spec.ts
    }

    CanonicalModule --> DTOLayer : dto/
    CanonicalModule --> ServiceLayer : services/
    CanonicalModule --> SchemaLayer : schemas/
    CanonicalModule --> InterfaceLayer : interfaces/
    CanonicalModule --> TestLayer : __tests__/
    TestLayer --> PropertyTestLayer : properties/
```

**Rules**:

| Rule                        | Description                                                            |
| --------------------------- | ---------------------------------------------------------------------- |
| `feature.module.ts`         | DI wiring only — no business logic                                     |
| `feature.controller.ts`     | HTTP routing only — delegates to services                              |
| `services/`                 | Always a subdirectory (even for single-service modules like `canvas/`) |
| `dto/`                      | DTOs, swagger decorators, barrel `index.ts`                            |
| `schemas/`                  | Co-located Mongoose schemas owned by this module                       |
| `interfaces/`               | Module-specific TypeScript interfaces                                  |
| `__tests__/`                | All test files at module root level                                    |
| `__tests__/properties/`     | Property-based tests using fast-check                                  |
| No `examples/`              | Remove runtime example files (move to documentation)                   |
| No `utils/` at module level | Utility functions belong in `services/` or `common/`                   |

#### 5.3 Schema Co-location Strategy

Schemas move from `src/schemas/` into their owning domain module's `schemas/` subdirectory.

```mermaid
graph LR
    subgraph "Before: Global Schemas"
        GS["src/schemas/<br/>user.schema.ts<br/>conversation.schema.ts<br/>canvas-session.schema.ts<br/>thought-map.schema.ts<br/>... (24 files)"]
    end

    subgraph "After: Co-located Schemas"
        AUTH_S["modules/auth/schemas/<br/>user.schema.ts<br/>refresh-token.schema.ts<br/>session.schema.ts<br/>rate-limit.schema.ts"]
        CONV_S["modules/conversations/schemas/<br/>conversation.schema.ts<br/>archived-message.schema.ts<br/>request-queue.schema.ts"]
        CANVAS_S["modules/canvas/schemas/<br/>canvas-session.schema.ts<br/>insight-node.schema.ts<br/>shared-link.schema.ts"]
        DLG_S["modules/dialogue/schemas/<br/>node-dialogue.schema.ts<br/>dialogue-message.schema.ts"]
        TM_S["modules/thought-map/schemas/<br/>thought-map.schema.ts<br/>thought-node.schema.ts<br/>thought-map-share-link.schema.ts"]
        KT_S["modules/knowledge-tracing/schemas/<br/>knowledge-state.schema.ts<br/>concept.schema.ts"]
        AI_S["modules/ai/schemas/<br/>subscription.schema.ts<br/>usage-event.schema.ts<br/>daily-usage-aggregate.schema.ts"]
        WAIT_S["modules/waitlist/schemas/<br/>waitlist.schema.ts"]
        SHARED_S["common/schemas/<br/>technique.schema.ts<br/>resource.schema.ts<br/>vote.schema.ts"]
    end

    GS -->|migrate| AUTH_S
    GS -->|migrate| CONV_S
    GS -->|migrate| CANVAS_S
    GS -->|migrate| DLG_S
    GS -->|migrate| TM_S
    GS -->|migrate| KT_S
    GS -->|migrate| AI_S
    GS -->|migrate| WAIT_S
    GS -->|migrate| SHARED_S
```

**Schema ownership rules**:

| Schema                                              | Owner Module         | Rationale                    |
| --------------------------------------------------- | -------------------- | ---------------------------- |
| `User`, `RefreshToken`, `Session`, `RateLimit`      | `auth/`              | Auth domain entities         |
| `Conversation`, `ArchivedMessage`, `RequestQueue`   | `conversations/`     | Conversation domain entities |
| `CanvasSession`, `InsightNode`, `SharedLink`        | `canvas/`            | Canvas domain entities       |
| `NodeDialogue`, `DialogueMessage`                   | `dialogue/`          | Dialogue domain entities     |
| `ThoughtMap`, `ThoughtNode`, `ThoughtMapShareLink`  | `thought-map/`       | Thought map domain entities  |
| `KnowledgeState`, `Concept`                         | `knowledge-tracing/` | Knowledge domain entities    |
| `Subscription`, `UsageEvent`, `DailyUsageAggregate` | `ai/`                | AI/billing domain entities   |
| `Waitlist`                                          | `waitlist/`          | Waitlist domain entity       |
| `Technique`, `Resource`, `Vote`                     | `common/schemas/`    | Shared cross-domain entities |

**Cross-module schema access**: When Module B needs a schema owned by Module A, Module A exports its schema registration via `MongooseModule.forFeature()` in its `exports` array. Module B imports Module A. This makes schema dependencies explicit in the NestJS dependency graph.

#### 5.4 CoreModule — Centralized Infrastructure

```mermaid
classDiagram
    class CoreModule {
        <<global>>
        +DatabaseModule
        +QueueModule
        +ConfigModule
    }

    class DatabaseModule {
        +MongooseModule.forRootAsync()
        +Connection monitoring
        +Index sync on init
    }

    class QueueModule {
        <<dynamic>>
        +forRoot() BullModule.forRootAsync with Redis config
        +registerQueue(name, options) BullModule.registerQueue
    }

    CoreModule --> DatabaseModule
    CoreModule --> QueueModule

    note for QueueModule "Single Redis config.\nModules call QueueModule.registerQueue()\ninstead of duplicating BullModule.forRootAsync()"
```

**QueueModule** exposes two static methods:

- `forRoot()` — Configures the Redis connection once (replaces 3 duplicate `BullModule.forRootAsync()` calls)
- `registerQueue(name, options)` — Registers a named queue with default job options (replaces per-module `BullModule.registerQueue()`)

This eliminates the 12-line Redis configuration factory duplicated across `ConversationsModule`, `DialogueModule`, and `ThoughtMapModule`.

#### 5.5 ResponseInterceptor — Automatic Envelope Wrapping

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant Interceptor as ResponseInterceptor
    participant Service

    Client->>Controller: GET /api/v1/conversations
    Controller->>Service: findAll(userId)
    Service-->>Controller: ConversationDocument[]
    Controller-->>Interceptor: { data: [...], meta?: {...} }
    Interceptor->>Interceptor: Wrap in standard envelope
    Interceptor-->>Client: { success: true, data: [...], meta: { requestId, timestamp } }

    Note over Interceptor: Controllers return raw data.<br/>Interceptor adds envelope automatically.
```

**Behavior**:

- Wraps all successful responses in `{ success: true, data, meta: { requestId, timestamp } }`
- If controller returns an object with a `meta` property, merges it (for pagination metadata)
- SSE endpoints and 202 Accepted responses opt out via a `@SkipEnvelope()` decorator
- Error responses continue to use `HttpExceptionFilter` (unchanged)

#### 5.6 Cross-Cutting Concern Extraction

```mermaid
graph TB
    subgraph "Before"
        AUTH_GUARDS["modules/auth/guards/<br/>jwt-auth.guard.ts<br/>roles.guard.ts<br/>email-verified.guard.ts<br/>login-rate-limit.guard.ts<br/>password-reset-rate-limit.guard.ts"]
        AUTH_DECS["modules/auth/decorators/<br/>public.decorator.ts<br/>current-user.decorator.ts<br/>roles.decorator.ts"]
    end

    subgraph "After"
        COMMON_GUARDS["common/guards/<br/>jwt-auth.guard.ts<br/>roles.guard.ts<br/>email-verified.guard.ts"]
        COMMON_DECS["common/decorators/<br/>public.decorator.ts<br/>current-user.decorator.ts<br/>roles.decorator.ts<br/>skip-envelope.decorator.ts"]
        AUTH_GUARDS_LOCAL["modules/auth/guards/<br/>login-rate-limit.guard.ts<br/>password-reset-rate-limit.guard.ts"]
    end

    AUTH_GUARDS -->|"globally used"| COMMON_GUARDS
    AUTH_DECS -->|"globally used"| COMMON_DECS
    AUTH_GUARDS -->|"auth-specific"| AUTH_GUARDS_LOCAL

    style COMMON_GUARDS fill:#8bf,stroke:#333
    style COMMON_DECS fill:#8bf,stroke:#333
    style AUTH_GUARDS_LOCAL fill:#ff9,stroke:#333
```

**Migration rule**: If a guard/decorator is imported by 2+ modules outside `auth/`, it moves to `common/`. If it is only used within `auth/` (like `LoginRateLimitGuard`), it stays in `modules/auth/guards/`.

#### 5.7 Test Organization Standard

```mermaid
graph TB
    subgraph "Canonical Test Layout"
        MOD["modules/feature/"]
        TESTS["__tests__/"]
        PROPS["__tests__/properties/"]
        CTRL_TEST["feature.controller.spec.ts"]
        SVC_TEST["feature.service.spec.ts"]
        PROP_TEST["feature-ownership.property.spec.ts"]
    end

    MOD --> TESTS
    TESTS --> CTRL_TEST
    TESTS --> SVC_TEST
    TESTS --> PROPS
    PROPS --> PROP_TEST
```

**Rules**:

| Convention                                   | Description                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| All tests in `__tests__/`                    | No test files at service or module level (fixes `bkt-algorithm.service.spec.ts` placement) |
| Controller tests at module `__tests__/` root | Not inside `services/__tests__/`                                                           |
| Service tests at module `__tests__/` root    | Flattened from `services/__tests__/`                                                       |
| Property tests in `__tests__/properties/`    | Consistent with current good practice                                                      |
| Naming: `{file-name}.spec.ts`                | Unit tests                                                                                 |
| Naming: `{file-name}.property.spec.ts`       | Property-based tests                                                                       |

#### 5.8 Explicit Module Registration

All 12 modules become visible in `app.module.ts`:

```mermaid
graph TB
    APP[AppModule]

    subgraph "Core"
        CORE[CoreModule]
    end

    subgraph "Feature Modules"
        AUTH[AuthModule]
        AI[AiModule]
        CANVAS[CanvasModule]
        CONV[ConversationsModule]
        DLG[DialogueModule]
        TM[ThoughtMapModule]
        KT[KnowledgeTracingModule]
        SCAF[ScaffoldingModule]
        DQ[DialogueQualityModule]
        HEALTH[HealthModule]
        WAIT[WaitlistModule]
    end

    APP --> CORE
    APP --> AUTH
    APP --> AI
    APP --> CANVAS
    APP --> CONV
    APP --> DLG
    APP --> TM
    APP --> KT
    APP --> SCAF
    APP --> DQ
    APP --> HEALTH
    APP --> WAIT

    CORE -.->|"provides"| APP
```

`ScaffoldingModule` and `DialogueQualityModule` are explicitly listed in `AppModule.imports[]`. While NestJS resolves transitive imports correctly, explicit registration makes the full module graph visible at a glance.

---

## 6. API / Interface Design

### Service Interfaces

This RFC does not introduce new API endpoints. All existing endpoints remain unchanged.

The primary new internal interface is the `QueueModule` static API:

```mermaid
classDiagram
    class QueueModule {
        <<dynamic module>>
        +forRoot() DynamicModule
        +registerQueue(name: string, options?: QueueOptions) DynamicModule
    }

    class QueueOptions {
        +number attempts
        +BackoffOptions backoff
        +RemoveOnCompleteOptions removeOnComplete
        +RemoveOnFailOptions removeOnFail
    }

    QueueModule ..> QueueOptions : accepts
```

### Interceptor Contract

```mermaid
classDiagram
    class ResponseInterceptor {
        +intercept(context, next) Observable~ResponseEnvelope~
    }

    class ResponseEnvelope {
        +boolean success
        +T data
        +ResponseMeta meta
    }

    class ResponseMeta {
        +string requestId
        +string timestamp
    }

    ResponseInterceptor ..> ResponseEnvelope : produces
    ResponseEnvelope --> ResponseMeta
```

---

## 7. Data Model Changes

Not applicable. This RFC restructures code organization — no schema fields, indexes, or collections are added, removed, or modified. Schemas are _moved_ to new file locations but their content is identical.

### Migration Notes

- **Migration type:** File moves only (no data migration)
- **Backwards compatible:** Yes — no schema changes, no API changes
- **Estimated migration duration:** N/A (code restructure, not data migration)

---

## 8. Alternatives Considered

### Alternative A: Nx Library Extraction

Extract shared code (`common/`, `core/`) into separate Nx libraries within the monorepo (e.g., `packages/mukti-shared-api/`).

| Pros                                             | Cons                                    |
| ------------------------------------------------ | --------------------------------------- |
| Strong boundary enforcement via Nx project rules | Adds Nx library configuration overhead  |
| Could be shared with future services             | Only one consumer exists (`@mukti/api`) |
| Clear import paths (`@mukti/shared-api`)         | Slower builds due to additional project |

**Reason for rejection:** Over-engineering for a single-consumer scenario. The layered directory structure achieves the same organizational goals without Nx library overhead. Can revisit if a second backend service is introduced.

### Alternative B: Keep Global Schemas, Fix Everything Else

Leave `src/schemas/` as-is and only address the other 9 issues.

| Pros                               | Cons                                           |
| ---------------------------------- | ---------------------------------------------- |
| Smaller migration scope            | Schema ownership remains ambiguous             |
| No risk of breaking schema imports | `ALL_SCHEMAS` array continues growing linearly |
| Familiar to current developers     | No domain encapsulation for data layer         |

**Reason for rejection:** Schema co-location is the single highest-impact change. It establishes domain ownership, reduces import path depth, and makes each module self-contained. Skipping it would leave the most impactful problem unsolved.

### Alternative C: NestJS Global Module for All Schemas

Make `DatabaseModule` a `@Global()` module that registers all schemas, then remove per-module `MongooseModule.forFeature()` calls entirely.

| Pros                                 | Cons                                                     |
| ------------------------------------ | -------------------------------------------------------- |
| Zero schema registration duplication | Hides dependencies — modules don't declare what they use |
| Simplest possible schema setup       | Violates NestJS explicit-dependency principle            |
| One-line fix                         | Makes testing harder (every test gets all schemas)       |

**Reason for rejection:** NestJS's module system is designed for explicit dependency declaration. Global schema registration undermines this principle and makes it impossible to understand which schemas a module uses without reading its service code.

---

## 9. Security & Privacy Considerations

No new security or privacy implications. This RFC restructures file locations without changing:

- Authentication or authorization logic
- Guard behavior or middleware order
- CSRF protection or Helmet configuration
- Encryption of BYOK API keys
- Rate limiting behavior

The `JwtAuthGuard` and `RolesGuard` move to `common/guards/` but their implementation and registration (via `APP_GUARD`) remain identical.

---

## 10. Performance & Scalability

No performance impact. This RFC moves files and reorganizes imports — no runtime behavior changes.

| Metric          | Current Baseline | Expected After Change | Acceptable Threshold |
| --------------- | ---------------- | --------------------- | -------------------- |
| Cold start time | ~2.5s            | ~2.5s (no change)     | < 5s                 |
| Request latency | Unchanged        | Unchanged             | N/A                  |
| Build time      | ~18s             | ~18s (no change)      | < 30s                |

The `ResponseInterceptor` adds negligible overhead (one `map()` operator on the response observable). NestJS interceptors are optimized for this pattern.

---

## 11. Observability

No new observability requirements. Existing logging patterns are preserved:

- `private readonly logger = new Logger(ClassName.name)` remains the standard
- `DatabaseModule` connection logging is unchanged
- Queue metrics remain accessible via existing `getQueueMetrics()` service methods

---

## 12. Rollout Plan

### Phases

| Phase | Description                                     | Status          | Entry Criteria   | Exit Criteria                                                                                       |
| ----- | ----------------------------------------------- | --------------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| 1     | Extract cross-cutting concerns to `common/`     | ✅ **Complete** | RFC accepted     | All guards/decorators moved; all imports updated; tests pass                                        |
| 2     | Create `CoreModule` with `QueueModule`          | ✅ **Complete** | Phase 1 complete | BullMQ config centralized; 2 duplicate configs removed; tests pass                                  |
| 3     | Introduce `ResponseInterceptor`                 | ⬜ Not started  | Phase 2 complete | Interceptor active globally; manual envelope removed from all controllers; tests pass               |
| 4     | Co-locate schemas into domain modules           | ⬜ Not started  | Phase 3 complete | `src/schemas/` deleted; all schemas in domain `schemas/` dirs; `ALL_SCHEMAS` eliminated; tests pass |
| 5     | Standardize module internals and test placement | ⬜ Not started  | Phase 4 complete | All modules follow canonical layout; all tests in `__tests__/`; linter rules enforced               |
| 6     | Explicit module registration and cleanup        | ⬜ Not started  | Phase 5 complete | All 12 modules in `app.module.ts`; `common/seeds/` relocated; `seed.ts` cleaned up                  |

### Phase Details

#### Phase 1: Extract Cross-Cutting Concerns

**Scope**: Move globally-used guards, decorators to `src/common/`. Create barrel `index.ts` files.

**Files moved**:

- `modules/auth/guards/jwt-auth.guard.ts` → `common/guards/jwt-auth.guard.ts`
- `modules/auth/guards/roles.guard.ts` → `common/guards/roles.guard.ts`
- `modules/auth/guards/email-verified.guard.ts` → `common/guards/email-verified.guard.ts`
- `modules/auth/decorators/public.decorator.ts` → `common/decorators/public.decorator.ts`
- `modules/auth/decorators/current-user.decorator.ts` → `common/decorators/current-user.decorator.ts`
- `modules/auth/decorators/roles.decorator.ts` → `common/decorators/roles.decorator.ts`

**Files remaining in `modules/auth/`**:

- `guards/login-rate-limit.guard.ts` (auth-specific)
- `guards/password-reset-rate-limit.guard.ts` (auth-specific)

**Validation**: All existing tests pass. Import paths updated via IDE refactoring.

> **✅ Completed: 2026-03-27**
>
> - `git mv` used throughout to preserve git blame/history
> - `common/guards/` created: `jwt-auth.guard.ts`, `roles.guard.ts`, `email-verified.guard.ts` + barrel `index.ts`
> - `common/decorators/` created: `public.decorator.ts`, `current-user.decorator.ts`, `roles.decorator.ts` + barrel `index.ts`
> - `modules/auth/guards/index.ts` updated to export only auth-specific guards (`login-rate-limit`, `password-reset-rate-limit`)
> - `modules/auth/decorators/` directory removed (all files moved; barrel deleted)
> - Import paths updated across 14 files: `app.module.ts`, `auth.module.ts`, `auth.controller.ts`, all 9 domain controllers, and 2 property test specs
> - Build (`bun nx run @mukti/api:build`) and tests (`bun nx run @mukti/api:test`) pass with zero regressions

#### Phase 2: Create CoreModule with QueueModule

**Scope**: Create `src/core/` directory. Move `DatabaseModule` from `modules/database/` to `core/database/`. Create `QueueModule` in `core/queue/`.

**Key change**: `ConversationsModule`, `DialogueModule`, and `ThoughtMapModule` replace their `BullModule.forRootAsync()` with `QueueModule.forRoot()` import and `QueueModule.registerQueue()` for named queues.

**Validation**: Queue tests pass. Redis connection established once (verify via logs).

> **✅ Completed: 2026-03-27**
>
> - `git mv` used to move `modules/database/database.module.ts` → `core/database/database.module.ts` (preserves git blame)
> - `core/queue/queue.module.ts` created: `QueueModule` with `forRoot()` (global Redis config) and `registerQueue(name, options?)` (default job options + per-queue overrides via deep merge)
> - `core/core.module.ts` created: bundles `DatabaseModule` + `QueueModule.forRoot()`, imported once in `AppModule`
> - Barrel files created: `core/index.ts`, `core/database/index.ts`, `core/queue/index.ts`
> - `ConversationsModule`: removed 16-line `BullModule.forRootAsync()` block, replaced `BullModule.registerQueue()` with `QueueModule.registerQueue('conversation-requests')`
> - `DialogueModule`: removed 16-line `BullModule.forRootAsync()` block, replaced `BullModule.registerQueue()` with `QueueModule.registerQueue('dialogue-requests')`
> - `ThoughtMapModule`: replaced 3× `BullModule.registerQueue()` with `QueueModule.registerQueue()` — `thought-map-dialogue-requests` (defaults), `thought-map-suggestion-requests` (custom: attempts=2, backoff=500ms, 6h retention), `thought-map-extraction-requests` (custom: attempts=2, 48h fail retention)
> - `app.module.ts`: `DatabaseModule` → `CoreModule`
> - `common/seeds/seed.module.ts`: import path updated `../../modules/database/` → `../../core/database/`
> - Empty `modules/database/` directory removed
> - Discovery: only 2 modules had `BullModule.forRootAsync()` duplication (not 3 as RFC stated — `ThoughtMapModule` inherited the Redis connection transitively via `DialogueModule`)
> - Build (`bun nx run @mukti/api:build`) passes
> - Tests: 566 pass, 23 fail (3 pre-existing test failures due to missing `SubscriptionModel` mock — unrelated to Phase 2)

#### Phase 3: Introduce ResponseInterceptor

**Scope**: Create `common/interceptors/response.interceptor.ts`. Register globally in `AppModule`. Create `@SkipEnvelope()` decorator for SSE and 202 endpoints.

**Migration**: Gradually remove manual `{ success, data, meta }` constructions from controllers, one module at a time. Each controller can be migrated independently.

**Validation**: API response format unchanged (integration tests verify). Manual envelope constructions eliminated.

#### Phase 4: Co-locate Schemas

**Scope**: Move each schema file to its owning module's `schemas/` subdirectory. Update all import paths. Remove `src/schemas/index.ts` and `ALL_SCHEMAS` array. Each module registers its own schemas via `MongooseModule.forFeature()` (which most already do — the global registration is simply removed).

**Validation**: Application boots. All schema-dependent tests pass. No `../../schemas/` imports remain.

#### Phase 5: Standardize Module Internals

**Scope**: Apply canonical layout (§5.2) to all modules. Move tests to `__tests__/` directories. Remove `examples/` directory from `knowledge-tracing/`. Move `dialogue/utils/` to `dialogue/services/`.

**Validation**: All tests pass from new locations. Lint rules verify structure.

#### Phase 6: Explicit Registration and Cleanup

**Scope**: Add `ScaffoldingModule` and `DialogueQualityModule` to `AppModule.imports[]`. Move `common/seeds/` to `core/database/seeds/`. Clean up root `seed.ts`.

**Validation**: Full test suite passes. `app.module.ts` lists all 12 modules.

### Rollback Strategy

Each phase is an independent, merge-ready PR. Rollback = revert the PR.

1. Phases are ordered by risk (lowest first: file moves → new modules → interceptor → schema migration)
2. No phase depends on a future phase
3. Each phase produces a working, deployable codebase
4. Git history preserves file moves via `git mv` (maintains blame/history)

---

## 13. Open Questions

1. **Should `Subscription` schema live in `auth/` or `ai/`?** — Currently used by both `AuthModule` (user linking) and `AiModule` (quota enforcement). The "primary owner" is debatable. Recommendation: `ai/` since subscription primarily governs AI usage limits, but this needs team input.

2. **Should `User` schema exports be centralized?** — `User` is imported by 8 modules. After co-location in `auth/`, all 7 other modules must import `AuthModule` to access `User` schema. This is semantically correct (user data is owned by auth), but creates a wide dependency surface. Alternative: keep `User` in `common/schemas/`.

3. **Should we introduce ESLint rules to enforce the canonical layout?** — An `eslint-plugin-import` rule could enforce import layering (domain never imports from another domain module's internals). This adds CI enforcement but increases linter config complexity.

4. **How should `Technique`, `Resource`, and `Vote` schemas be organized?** — These are community/social features with no dedicated module. Options: (a) `common/schemas/`, (b) new `CommunityModule`, (c) keep in `conversations/` since techniques are primarily used there.

5. **Should the `ResponseInterceptor` be opt-in or opt-out?** — Opt-out (global with `@SkipEnvelope()`) is proposed. Alternative: opt-in via `@UseInterceptors(ResponseInterceptor)` on each controller. Opt-out is recommended since the envelope is the default expectation.

> **Reviewers:** Please reference open questions by number (e.g., "Regarding OQ-2, ...") in your comments.

---

## 14. Decision Log

| Date       | Decision                       | Rationale                                                                                                                                             | Decided By     |
| ---------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 2026-03-26 | RFC created as Draft           | Address accumulated structural debt across 12 modules                                                                                                 | Prathik Shetty |
| 2026-03-27 | RFC accepted; Phase 1 complete | Implementation validated: build passes, all guard/decorator imports migrated, no test regressions                                                     | Prathik Shetty |
| 2026-03-27 | Phase 2 complete               | CoreModule + QueueModule created; 2 duplicate BullModule.forRootAsync() removed; 5 queues migrated to QueueModule.registerQueue(); build + tests pass | Prathik Shetty |

---

## 15. References

- [ADR: NestJS 11 over Express](../../STANDARDS.md) — Architecture decision that established module-per-feature pattern
- [ADR: Queue-Based AI Processing](../../STANDARDS.md) — BullMQ + SSE pattern this RFC centralizes
- [RFC-0001: Knowledge Gap Detection](../rfc-0001-knowledge-gap-detection/index.md) — Added KnowledgeTracingModule and ScaffoldingModule
- [RFC-0002: Adaptive Scaffolding Framework](../rfc-0002-adaptive-scaffolding-framework/index.md) — Added scaffold fields to NodeDialogue schema
- [RFC-0003: Thought Map](../rfc-0003-thought-map/index.md) — Largest module that exposed architectural strain
- [RFC-0004: Socratic Dialogue Quality Guardrails](../rfc-0004-socratic-dialogue-quality-guardrails/index.md) — Added DialogueQualityModule
- [NestJS Modules Documentation](https://docs.nestjs.com/modules) — Official guidance on module organization
- [NestJS Dynamic Modules](https://docs.nestjs.com/fundamentals/dynamic-modules) — Pattern for QueueModule.forRoot()
- [NestJS Interceptors](https://docs.nestjs.com/interceptors) — Pattern for ResponseInterceptor

---

> **Reviewer Notes:**
>
> This RFC is purely structural — no business logic, API contracts, or data models change. Each phase is independently deployable and reversible. The primary risk is import path breakage during schema co-location (Phase 4), mitigated by IDE refactoring tools and comprehensive test coverage.
>
> WARNING: Phase 4 (schema co-location) touches the most files and has the highest risk of merge conflicts with concurrent feature work. Recommend scheduling it during a low-activity window.
