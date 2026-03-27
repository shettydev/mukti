# Mukti RFCs (Request for Comments)

This directory contains major technical design proposals for Mukti.

## Directory Layout

- `active/`: canonical active RFC folders (`rfc-####-short-title/index.md`)
- `archive/` (optional): archived RFC folders (`rfc-####-short-title/index.md`)
- `STANDARDS.md`: canonical RFC structure and governance rules

## RFC Index

### Active RFCs

| RFC #                                                                        | Title                                   | Status    | Author                                         | Date       |
| ---------------------------------------------------------------------------- | --------------------------------------- | --------- | ---------------------------------------------- | ---------- |
| [RFC-0001](./active/rfc-0001-knowledge-gap-detection/index.md)               | Knowledge Gap Detection System          | In Review | [Prathik Shetty](https://github.com/shettydev) | 2026-02-28 |
| [RFC-0002](./active/rfc-0002-adaptive-scaffolding-framework/index.md)        | Adaptive Scaffolding Framework          | In Review | [Prathik Shetty](https://github.com/shettydev) | 2026-02-28 |
| [RFC-0004](./active/rfc-0004-socratic-dialogue-quality-guardrails/index.md)  | Socratic Dialogue Quality Guardrails    | Draft     | [Prathik Shetty](https://github.com/shettydev) | 2026-03-17 |
| [RFC-0005](./active/rfc-0005-session-continuity-temporal-awareness/index.md) | Session Continuity & Temporal Awareness | Draft     | [Prathik Shetty](https://github.com/shettydev) | 2026-03-17 |
| [RFC-0006](./active/rfc-0006-mukti-api-architecture-restructure/index.md)    | Mukti API Architecture Restructure      | Draft     | [Prathik Shetty](https://github.com/shettydev) | 2026-03-26 |

### Implemented RFCs

| RFC #                                              | Title                                        | Status      | Author                                         | Date       |
| -------------------------------------------------- | -------------------------------------------- | ----------- | ---------------------------------------------- | ---------- |
| [RFC-0003](./active/rfc-0003-thought-map/index.md) | Thought Map — Unified Visual Thinking Canvas | Implemented | [Prathik Shetty](https://github.com/shettydev) | 2026-03-08 |

### Archive

No archived RFCs yet.

## RFC Process

1. Create RFC using [`docs/templates/RFC-TEMPLATE.md`](../templates/RFC-TEMPLATE.md)
2. Place it in `active/rfc-####-short-title/index.md`
3. Add it to the `Active RFCs` table above
4. Review and iterate
5. Keep `Implemented` RFCs in `active/` and list them in `Implemented RFCs`
6. Move `Rejected` and `Superseded` RFCs to `archive/` and list them in `Archive`
7. Update metadata (`Status`, `Last Updated`) as lifecycle state evolves

## Status Definitions

| Status      | Definition                                                |
| ----------- | --------------------------------------------------------- |
| Draft       | Initial proposal seeking feedback                         |
| In Review   | Under formal stakeholder review                           |
| Accepted    | Approved for implementation                               |
| Implemented | Implemented and retained in `active/` for discoverability |
| Rejected    | Declined proposal moved to `archive/`                     |
| Superseded  | Replaced by newer direction and moved to `archive/`       |

## Standards

See [`STANDARDS.md`](./STANDARDS.md) for naming, file layout, metadata requirements, and CI enforcement rules.
