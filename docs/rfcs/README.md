# Mukti RFCs (Request for Comments)

This directory contains major technical design proposals for Mukti.

## Directory Layout

- `active/`: RFCs that are `Draft`, `In Review`, or `Accepted`
- `archive/`: RFCs that are `Implemented`, `Rejected`, or `Superseded`
- `archive/legacy/`: historical files excluded from strict RFC numbering checks
- `initiatives/`: companion docs shared across multiple RFCs
- `STANDARDS.md`: canonical RFC structure and governance rules

## RFC Index

### Active RFCs

| RFC #                                                                 | Title                          | Status | Author     | Date       | Target           |
| --------------------------------------------------------------------- | ------------------------------ | ------ | ---------- | ---------- | ---------------- |
| [RFC-0001](./active/rfc-0001-knowledge-gap-detection/index.md)        | Knowledge Gap Detection System | Draft  | Mukti Team | 2026-02-28 | v1.0.0 / Q2 2026 |
| [RFC-0002](./active/rfc-0002-adaptive-scaffolding-framework/index.md) | Adaptive Scaffolding Framework | Draft  | Mukti Team | 2026-02-28 | v1.0.0 / Q2 2026 |

### Initiative Documents

- [Knowledge Gap Summary](./initiatives/knowledge-gap/summary.md)
- [Knowledge Gap Implementation Checklist](./initiatives/knowledge-gap/implementation-checklist.md)

### Archive

- [Legacy RFC Files](./archive/legacy/)

## Compatibility Notes

Top-level compatibility stubs currently exist for old canonical RFC paths:

- `./RFC-0001-knowledge-gap-detection.md`
- `./RFC-0002-adaptive-scaffolding-framework.md`

These are transitional and should be removed after the migration window.

## RFC Process

1. Create RFC using [`docs/templates/RFC-TEMPLATE.md`](../templates/RFC-TEMPLATE.md)
2. Place it in `active/rfc-####-short-title/index.md`
3. Add it to the Active RFCs table above
4. Review and iterate
5. Move folder to `archive/` when lifecycle state is no longer active

## Status Definitions

| Status      | Definition                        |
| ----------- | --------------------------------- |
| Draft       | Initial proposal seeking feedback |
| In Review   | Under formal stakeholder review   |
| Accepted    | Approved for implementation       |
| Rejected    | Not moving forward                |
| Superseded  | Replaced by a newer RFC           |
| Implemented | Shipped to production             |

## Standards

See [`STANDARDS.md`](./STANDARDS.md) for naming, file layout, metadata requirements, and CI enforcement rules.
