<!-- Context: project-intelligence/notes | Priority: high | Version: 2.0 | Updated: 2026-03-21 -->

# Living Notes

> Active RFCs, technical debt, open questions, and insights. Updated as status changes.

## Active RFCs

| RFC      | Title                   | Status                | Key Impact                                             |
| -------- | ----------------------- | --------------------- | ------------------------------------------------------ |
| RFC-0001 | Knowledge Gap Detection | Partially implemented | Bayesian Knowledge Tracing in `KnowledgeTracingModule` |
| RFC-0002 | Adaptive Scaffolding    | Partially implemented | Schema fields exist on `NodeDialogue`, logic pending   |

### RFC-0001: Knowledge Gap Detection

_Status_: Partial — `KnowledgeTracingModule` exists, BKT core implemented
_Purpose_: Detect when Socratic questioning fails due to missing foundational knowledge
_Approach_: Multi-signal detection (behavioral, linguistic, temporal)
_Key schemas_: `Concept`, `KnowledgeState` (unique on userId + conceptId)
_Remaining_: Signal integration, threshold tuning, UI indicators
_Location_: `packages/mukti-api/src/modules/knowledge-tracing/`

### RFC-0002: Adaptive Scaffolding

_Status_: Partial — schema fields exist, scaffold logic pending
_Purpose_: 5-level system (Level 0 = pure Socratic → Level 4 = direct instruction with guided practice)
_Key fields on `NodeDialogue`_: `currentScaffoldLevel`, `consecutiveSuccesses`, `consecutiveFailures`, `scaffoldHistory`
_Remaining_: Level transition logic, auto-fading on consecutive success/failure, UI scaffold indicators
_Rule_: Level 4 (direct instruction) must always include guided practice — never raw answers

## Technical Debt

| Item                                                 | Impact                                      | Priority | Status                       |
| ---------------------------------------------------- | ------------------------------------------- | -------- | ---------------------------- |
| Generic OAC context files in `.claude/context/core/` | Context references wrong project (OpenCode) | Low      | Being updated (this session) |
| `project-context.md` deprecated but not removed      | Confusing for agents                        | Low      | Acknowledged                 |

## Open Questions

| Question                                                          | Status | Next Action                                              |
| ----------------------------------------------------------------- | ------ | -------------------------------------------------------- |
| How should scaffold levels interact with knowledge gap detection? | Open   | Design decision needed — RFC-0001 + RFC-0002 integration |
| Should Thought Maps replace or complement Thinking Canvas?        | Open   | Evaluate new Thought Map feature in progress             |

## Patterns & Conventions Worth Preserving

- **Queue + SSE streaming** — Both ConversationsModule and DialogueModule use the same pattern. Any new AI-powered feature should follow it.
- **Optimistic updates with rollback** — Canvas store pattern for responsive UI. Always store previous state before optimistic update.
- **Technique auto-selection by node type** — seed→maieutics, root→elenchus, soil→counterfactual, insight→dialectic. Don't let users manually override this.
- **Response envelope** — `{ success, data, meta }` on all API responses. Never return raw data.

## Gotchas for Developers

- **Bun, not npm** — `bun install`, `bun run`, never `npm` or `node`
- **No dotenv** — Bun loads `.env` automatically
- **Canvas node IDs** — `seed` (singleton), `soil-{index}`, `root-{index}`, `insight-{index}`. Services parse these strings to determine node type.
- **Access tokens are memory-only** — Frontend auth store does NOT persist access tokens to localStorage. Only `user` object is persisted.
- **ALL_SCHEMAS registry** — New schemas must be added to `src/schemas/index.ts` barrel export AND registered in `DatabaseModule`
- **CSRF in production only** — CSRF protection is disabled in development

## Related Files

- `decisions-log.md` — Past decisions that inform current state
- `business-domain.md` — Business context for current priorities
- `technical-domain.md` — Technical context for current state
- `../../docs/rfcs/` — Full RFC documents
