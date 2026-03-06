# Mukti RFCs (Request for Comments)

This directory contains major technical design proposals for Mukti.

## Directory Layout

- `active/`: canonical active RFC folders (`rfc-####-short-title/index.md`)
- `archive/` (optional): archived RFC folders (`rfc-####-short-title/index.md`)
- `STANDARDS.md`: canonical RFC structure and governance rules

## RFC Index

### Active RFCs

| RFC #                                                                 | Title                          | Status    | Author                                         | Date       |
| --------------------------------------------------------------------- | ------------------------------ | --------- | ---------------------------------------------- | ---------- |
| [RFC-0001](./active/rfc-0001-knowledge-gap-detection/index.md)        | Knowledge Gap Detection System | In Review | [Prathik Shetty](https://github.com/shettydev) | 2026-02-28 |
| [RFC-0002](./active/rfc-0002-adaptive-scaffolding-framework/index.md) | Adaptive Scaffolding Framework | In Review | [Prathik Shetty](https://github.com/shettydev) | 2026-02-28 |

### Implemented RFCs

No implemented RFCs yet.

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
