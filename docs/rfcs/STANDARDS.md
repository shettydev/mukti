# RFC Standards

## Scope

These standards apply to all files in `docs/rfcs/`.

## Required Layout

- Active RFCs: `docs/rfcs/active/rfc-####-short-title/index.md`
- Archived RFCs (optional path): `docs/rfcs/archive/rfc-####-short-title/index.md`

## Naming Rules

- RFC folder names must match: `rfc-[0-9]{4}-[a-z0-9-]+`
- Canonical RFC file must be named `index.md`

## Metadata Rules

Each RFC `index.md` must keep the existing header table format and include:

- `RFC Number`
- `Title`
- `Status`
- `Author(s)`
- `Created`
- `Last Updated`

Allowed status values:

- `Draft`
- `In Review`
- `Accepted`
- `Implemented`
- `Rejected`
- `Superseded`

## Lifecycle Rules

- `active/` may contain only: `Draft`, `In Review`, `Accepted`, `Implemented`
- `archive/` may contain only: `Rejected`, `Superseded`
- `archive/` is optional and only validated when present

## Index Rules

- `docs/rfcs/README.md` is maintained manually
- Every RFC folder must appear exactly once in `README.md` with a valid link
- Section mapping by status is strict:
  - `Active RFCs`: `Draft`, `In Review`, `Accepted`
  - `Implemented RFCs`: `Implemented`
  - `Archive`: `Rejected`, `Superseded`

## Diagram & Code Block Policy

RFCs communicate **design intent**, not implementation code. Prefer visual diagrams over code blocks.

### Use Mermaid Diagrams For

- Architecture and component relationships (`graph`, `flowchart`)
- Data flow and processing pipelines (`graph LR`)
- Interaction sequences (`sequenceDiagram`)
- Entity relationships and data models (`erDiagram`)
- Class structures and service interfaces (`classDiagram`)
- State machines and level transitions (`stateDiagram-v2`)
- Algorithm logic and decision trees (`flowchart`)

### Use Code Blocks Only When

- **API contracts**: JSON request/response examples where exact shape matters
- **Prompt templates**: AI prompt text where exact wording is the design decision
- **Configuration snippets**: Feature flags, environment variables, threshold constants
- **Mathematical formulas**: When prose or diagrams cannot express the formula clearly

### Never Use Code Blocks For

- Full class or service implementations (use class diagrams + prose)
- Method bodies or function implementations (use flowcharts + prose)
- Interface definitions (use class diagrams)
- Regex patterns or marker arrays (use categorized tables)
- Schema definitions (use ER diagrams + prose field descriptions)

### Rationale

Code blocks in RFCs create a false sense of finality — reviewers debate syntax instead of design. Mermaid diagrams keep the focus on architecture, data flow, and component relationships. Implementation details belong in the codebase, not the RFC.

## Enforcement

CI enforces these standards via:

- `bun run docs:rfc:check`
- `bun run docs:structure:check`
- `bun run docs:check`
