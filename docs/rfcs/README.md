# Mukti RFCs (Request for Comments)

This directory contains technical design documents (RFCs) for major features and architectural decisions in the Mukti project.

## RFC Index

### Active RFCs

| RFC #                                                    | Title                          | Status | Author     | Date       | Target           |
| -------------------------------------------------------- | ------------------------------ | ------ | ---------- | ---------- | ---------------- |
| [RFC-0001](./RFC-0001-Adaptive-Scaffolding-Framework.md) | Adaptive Scaffolding Framework | Draft  | Mukti Team | 2026-02-28 | v1.0.0 / Q2 2026 |

### Quick Links

- **[RFC-0001 Full Specification](./RFC-0001-Adaptive-Scaffolding-Framework.md)** (1034 lines, implementation-ready)
- **[RFC-0001 Executive Summary](./RFC-0001-SUMMARY.md)** (TL;DR for stakeholders)
- **[RFC-0001 Implementation Checklist](./RFC-0001-IMPLEMENTATION-CHECKLIST.md)** (12-week development plan)

---

## RFC-0001: Adaptive Scaffolding Framework

**Status**: Draft → Awaiting Review  
**Target**: Mukti v1.0.0 / Q2 2026  
**Estimated Effort**: 12 weeks (3 months) with 5-person team

### What It Does

Implements a **5-level progressive hint system** with **struggle detection** and **learning profile tracking** to provide adaptive scaffolding that balances Socratic inquiry with minimal assistance.

### Key Features

- **5-Level Hints**: Conceptual → Strategic → Tactical → Computational → Answer
- **Struggle Detection**: Attempt-based thresholds (1, 3, 5+) with time/sentiment signals
- **Learning Profiles**: Tracks gaps, strengths, mastery levels per user
- **Credit System**: 200/week allowance, 0-25 cost per hint, earning opportunities
- **Socratic Integrity**: Never gives direct answers until level 5; maintains inquiry-first approach

### Expected Impact

- **+64% learning improvement** (vs 30% for on-demand help) — Wharton Study 2026
- **+4-9% mastery rate** — Tutor CoPilot production data
- **Reduced cognitive debt** — Per MIT research on AI assistance

### Evidence Base

- **Production Systems**: Khanmigo (1M+ students), Tutor CoPilot (+4% mastery)
- **Research**: Wharton 2026, SEELE Framework, MIT "Brain on ChatGPT"
- **Open-Source**: 4 repositories analyzed (Math Tutor, Socratic Tutor, AI Tutor, GenMentor)

### Documents

1. **[Full RFC](./RFC-0001-Adaptive-Scaffolding-Framework.md)** (41KB) — Complete technical specification with:
   - 15 sections covering motivation, design, API, database, security, observability, rollout
   - Architecture diagrams (Mermaid)
   - Code examples (TypeScript)
   - Database schema (ER diagrams)
   - 5 open questions for team discussion

2. **[Executive Summary](./RFC-0001-SUMMARY.md)** (7KB) — High-level overview for stakeholders:
   - TL;DR
   - Core components
   - API summary
   - Rollout plan
   - Evidence base

3. **[Implementation Checklist](./RFC-0001-IMPLEMENTATION-CHECKLIST.md)** (19KB) — Step-by-step development plan:
   - 8 phases (Pre-Implementation → Post-Launch)
   - 200+ actionable tasks with checkboxes
   - 12-week timeline
   - Success metrics
   - Risk mitigation

### Next Steps

1. **Review**: Engineering, Product, Design, Security, DBA sign-off
2. **Open Questions**: Resolve 5 open questions (Section 13 of RFC)
3. **Implementation**: Begin Phase 1 (Data Layer) after approvals
4. **Tracking**: Use implementation checklist to track progress

---

## RFC Process

### 1. Proposal

- Create RFC document using [RFC template](../templates/RFC-TEMPLATE.md)
- Follow numbering convention: `RFC-NNNN-Title.md`
- Include all required sections (Abstract, Motivation, Design, etc.)

### 2. Review

- Post RFC in `#rfcs` Slack channel
- Tag relevant stakeholders for review
- Address feedback and update RFC
- Mark status: Draft → In Review

### 3. Approval

- Collect sign-offs from required reviewers (Engineering, Product, Security, etc.)
- Update Decision Log (Section 14) with approvals
- Mark status: In Review → Accepted

### 4. Implementation

- Create tracking issue (GitHub/Linear/Jira)
- Link RFC in issue description
- Use implementation checklist to track progress
- Update RFC with any design changes during implementation

### 5. Completion

- Document learnings in post-launch retrospective
- Update README with "Implemented in vX.Y.Z"
- Archive RFC (move to `archive/` if needed)

---

## RFC Status Definitions

| Status          | Definition                                  |
| --------------- | ------------------------------------------- |
| **Draft**       | Initial proposal; actively seeking feedback |
| **In Review**   | Under formal review by stakeholders         |
| **Accepted**    | Approved for implementation                 |
| **Rejected**    | Not moving forward; see rationale in RFC    |
| **Superseded**  | Replaced by a newer RFC (link provided)     |
| **Implemented** | Shipped to production; archived             |

---

## Templates

- **[RFC Template](../templates/RFC-TEMPLATE.md)** — Use this to create new RFCs

---

## Questions?

- **Slack**: Post in `#rfcs` channel
- **Email**: engineering@mukti.dev
- **GitHub**: Open discussion in [mukti/discussions](https://github.com/mukti/mukti/discussions)
