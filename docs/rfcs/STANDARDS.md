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

## Enforcement

CI enforces these standards via:

- `bun run docs:rfc:check`
- `bun run docs:structure:check`
- `bun run docs:check`
