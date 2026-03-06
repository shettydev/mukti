<!-- Context: project-intelligence/nav | Priority: high | Version: 1.1 | Updated: 2026-03-07 -->

# Project Intelligence

> Start here for quick project understanding. These files bridge business and technical domains.

## Structure

```
.opencode/context/project-intelligence/
├── navigation.md              # This file - quick overview
├── business-domain.md         # Business context and problem statement
├── technical-domain.md        # Stack, architecture, technical decisions ✅ POPULATED
├── business-tech-bridge.md    # How business needs map to solutions
├── decisions-log.md           # Major decisions with rationale
└── living-notes.md            # Active issues, debt, open questions
```

## Quick Routes

| What You Need         | File                      | Status      | Description                             |
| --------------------- | ------------------------- | ----------- | --------------------------------------- |
| Tech stack & patterns | `technical-domain.md`     | ✅ Complete | Stack, API/component patterns, security |
| Understand the "why"  | `business-domain.md`      | 📝 Template | Problem, users, value proposition       |
| See the connection    | `business-tech-bridge.md` | 📝 Template | Business → technical mapping            |
| Know the context      | `decisions-log.md`        | 📝 Template | Why decisions were made                 |
| Current state         | `living-notes.md`         | 📝 Template | Active issues and open questions        |

## Usage

**New Team Member / Agent**:

1. Start with `navigation.md` (this file)
2. Read `technical-domain.md` for stack, patterns, and conventions
3. Read remaining files as needed

**Quick Reference**:

- Tech stack & patterns → `technical-domain.md`
- Business focus → `business-domain.md`
- Decision context → `decisions-log.md`

## Integration

This folder is referenced from:

- `.opencode/context/core/standards/project-intelligence.md` (standards and patterns)
- `.opencode/context/core/system/context-guide.md` (context loading)

See `.opencode/context/core/context-system.md` for the broader context architecture.

## Maintenance

Keep this folder current:

- Update when business direction changes
- Document decisions as they're made
- Review `living-notes.md` regularly
- Archive resolved items from decisions-log.md

**Management Guide**: See `.opencode/context/core/standards/project-intelligence-management.md` for complete lifecycle management including:

- How to update, add, and remove files
- How to create new subfolders
- Version tracking and frontmatter standards
- Quality checklists and anti-patterns
- Governance and ownership

See `.opencode/context/core/standards/project-intelligence.md` for the standard itself.
