# RFC Standards

## Scope

These standards apply to all files in `docs/rfcs/`.

## Required Layout

- Canonical RFCs: `docs/rfcs/active/rfc-####-short-title/index.md`
- Optional lifecycle/history docs may live under additional folders, but `active/` remains the source of truth for current RFCs

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
- RFCs marked `Implemented`, `Rejected`, or `Superseded` must be explicitly noted in their status and can be moved out of `active/` when archival structure is introduced

## Index Rules

- `docs/rfcs/README.md` is maintained manually
- Every RFC folder in `active/` must appear exactly once in the Active RFC index with a valid link

## Companion Document Policy

- Non-canonical docs that apply to one RFC should live in that RFC folder

## Enforcement

CI enforces these standards via:

- `bun run docs:rfc:check`
- `bun run docs:structure:check`
- `bun run docs:check`
