# RFC Standards

## Scope

These standards apply to all files in `docs/rfcs/`.

## Required Layout

- Active RFCs: `docs/rfcs/active/rfc-####-short-title/index.md`
- Archived RFCs: `docs/rfcs/archive/rfc-####-short-title/index.md`
- Shared companion docs: `docs/rfcs/initiatives/<topic>/...`
- Legacy one-off historical files: `docs/rfcs/archive/legacy/`

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
- `Rejected`
- `Superseded`
- `Implemented`

## Lifecycle Rules

- `active/` may only contain RFCs with status: `Draft`, `In Review`, `Accepted`
- RFCs marked `Implemented`, `Rejected`, or `Superseded` must live under `archive/`

## Index Rules

- `docs/rfcs/README.md` is maintained manually
- Every RFC folder in `active/` must appear exactly once in the Active RFC index with a valid link

## Legacy Collision Policy

- Historical RFC number collisions are allowed only under `docs/rfcs/archive/legacy/`
- Files in `archive/legacy/` are excluded from strict RFC numbering checks

## Companion Document Policy

- Non-canonical docs that apply to one RFC should live in that RFC folder
- Docs shared by multiple RFCs should live under `docs/rfcs/initiatives/<topic>/`

## Compatibility Stub Policy

- Temporary compatibility stubs are allowed only for previously top-level canonical RFC files
- Stubs must point to the new canonical location
- Stubs should be removed after one minor release or 60 days

## Enforcement

CI enforces these standards via:

- `bun run docs:rfc:check`
- `bun run docs:structure:check`
- `bun run docs:check`
