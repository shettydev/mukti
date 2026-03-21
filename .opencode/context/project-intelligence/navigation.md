<!-- Context: project-intelligence/nav | Priority: high | Version: 1.2 | Updated: 2026-03-21 -->

# Project Intelligence

> Start here for quick project understanding. These files bridge business and technical domains.

## Structure

```
.opencode/context/project-intelligence/
├── navigation.md              # This file - quick overview
├── business-domain.md         # Business context and problem statement ✅ POPULATED
├── technical-domain.md        # Stack, architecture, technical decisions ✅ POPULATED
├── business-tech-bridge.md    # How business needs map to solutions    ✅ POPULATED
├── decisions-log.md           # Major decisions with rationale         ✅ POPULATED
└── living-notes.md            # Active issues, debt, open questions    ✅ POPULATED
```

## Quick Routes

| What You Need         | File                      | Status      | Description                                      |
| --------------------- | ------------------------- | ----------- | ------------------------------------------------ |
| Tech stack & patterns | `technical-domain.md`     | ✅ Complete | Stack, API/component/testing patterns, security  |
| Understand the "why"  | `business-domain.md`      | ✅ Complete | Problem, users, value proposition, 5 active RFCs |
| See the connection    | `business-tech-bridge.md` | ✅ Complete | Business → technical mapping, trade-offs log     |
| Know the context      | `decisions-log.md`        | ✅ Complete | 7 architectural decisions with full rationale    |
| Current state         | `living-notes.md`         | ✅ Complete | Active RFCs, tech debt, gotchas, open questions  |

## Usage

**New Team Member / Agent**:

1. Start with `navigation.md` (this file)
2. Read `technical-domain.md` for stack, patterns, and conventions
3. Read `business-domain.md` for product philosophy and feature status
4. Read remaining files as needed for decision context and current state

**Quick Reference**:

- Tech stack & patterns → `technical-domain.md`
- Product philosophy & RFCs → `business-domain.md`
- Why decisions were made → `decisions-log.md`
- Current gotchas & debt → `living-notes.md`

## Integration

This folder is referenced from:

- `.opencode/context/core/standards/project-intelligence.md` (standards and patterns)
- `.opencode/context/core/system/context-guide.md` (context loading)

See `.opencode/context/core/context-system.md` for the broader context architecture.

## Maintenance

Keep this folder current:

- Update `technical-domain.md` when stack changes or new patterns emerge
- Update `business-domain.md` when RFCs ship or product direction changes
- Log new decisions in `decisions-log.md` as they are made
- Keep `living-notes.md` fresh — review weekly, archive resolved items

**Management Guide**: See `.opencode/context/core/standards/project-intelligence-management.md` for complete lifecycle management including:

- How to update, add, and remove files
- How to create new subfolders
- Version tracking and frontmatter standards
- Quality checklists and anti-patterns
- Governance and ownership

See `.opencode/context/core/standards/project-intelligence.md` for the standard itself.
