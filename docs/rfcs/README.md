# Mukti RFCs (Request for Comments)

This directory contains major technical design proposals for Mukti.

## Directory Layout

- `active/`: RFCs that are `Draft`, `In Review`, or `Accepted`
- `STANDARDS.md`: canonical RFC structure and governance rules

## RFC Index

### Active RFCs

| RFC #                                                                 | Title                          | Status    | Author                                         | Date       |
| --------------------------------------------------------------------- | ------------------------------ | --------- | ---------------------------------------------- | ---------- |
| [RFC-0001](./active/rfc-0001-knowledge-gap-detection/index.md)        | Knowledge Gap Detection System | In Review | [Prathik Shetty](https://github.com/shettydev) | 2026-02-28 |
| [RFC-0002](./active/rfc-0002-adaptive-scaffolding-framework/index.md) | Adaptive Scaffolding Framework | In Review | [Prathik Shetty](https://github.com/shettydev) | 2026-02-28 |

## RFC Process

1. Create RFC using [`docs/templates/RFC-TEMPLATE.md`](../templates/RFC-TEMPLATE.md)
2. Place it in `active/rfc-####-short-title/index.md`
3. Add it to the Active RFCs table above
4. Review and iterate
5. Keep lifecycle status in sync with implementation progress

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
