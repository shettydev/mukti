<!-- Context: project-intelligence/notes | Priority: high | Version: 1.0 | Updated: 2026-03-21 -->

# Living Notes

**Purpose**: Active state — in-progress RFCs, known gaps, gotchas, and open questions.
**Last Updated**: 2026-03-21

## Quick Reference

- **Update**: When RFC status changes, tech debt is discovered, or issues surface
- **Archive**: Move resolved items to bottom with resolution date

---

## Active RFCs

| RFC      | Title                                   | Status     | What's Missing / Next Step                                                                    |
| -------- | --------------------------------------- | ---------- | --------------------------------------------------------------------------------------------- |
| RFC-0001 | Knowledge Gap Detection                 | 🔄 Partial | BKT algorithm done; behavioral/linguistic/temporal signals not fully wired to dialogue flow   |
| RFC-0002 | Adaptive Scaffolding Framework          | 🔄 Partial | Schema fields exist on `NodeDialogue`; scaffold service not integrated into dialogue pipeline |
| RFC-0003 | Thought Map                             | ✅ Shipped | `ThoughtMapModule` complete; `ThoughtMapCanvas` + extraction + share link working             |
| RFC-0004 | Socratic Dialogue Quality Guardrails    | ✅ Shipped | All 7 services in `DialogueQualityModule` complete and tested                                 |
| RFC-0005 | Session Continuity & Temporal Awareness | 📋 Planned | RFC in design phase; no implementation started                                                |

---

## Technical Debt

| Item                          | Impact                                                                                                                | Priority | Status       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------- | ------------ |
| RFC-0002 scaffold integration | `currentScaffoldLevel` / `consecutiveSuccesses` fields unused in practice                                             | High     | Acknowledged |
| RFC-0001 signal aggregation   | `KnowledgeTracingModule` is wired but signals from live dialogue not fully plumbed                                    | High     | In Progress  |
| `components/old-landing/`     | 12 legacy landing components unused since Japandi redesign                                                            | Low      | Deferred     |
| `ThoughtMapCanvas` naming     | Some thought-map components use PascalCase filenames (e.g., `CreateNodeDialog.tsx`) vs. project kebab-case convention | Low      | Acknowledged |

---

## Known Gotchas

**Canvas node IDs are structural, not random**
Format: `seed` (singleton), `soil-{index}`, `root-{index}`, `insight-{index}`. Services parse these strings to determine node type and auto-select Socratic technique. Do not use UUIDs for canvas nodes — the structure carries semantic meaning.

**Access token lives in memory only — empty until hydration**
`auth-store.ts` stores `accessToken` in Zustand memory (not persisted). On page reload, `useAuth` hook silently re-fetches via httpOnly refresh token cookie. Any code reading `accessToken` directly from the store may see `null` until hydration completes. Use `useAuth` hook, not raw store access.

**`ALL_SCHEMAS` registry is mandatory for every new schema**
All Mongoose schemas must be added to `packages/mukti-api/src/schemas/index.ts` → `ALL_SCHEMAS` array. `DatabaseModule` registers schemas exclusively from this array. Missing entries cause "Schema not registered" runtime errors.

**SSE connections are keyed by `sessionId:nodeId`**
`DialogueStreamService` (per-node canvas) and `StreamService` (conversations) manage independent connection maps. Each node dialogue has its own SSE channel. Canvas dialogues and text conversations use separate stream managers — they are not interchangeable.

**Swagger decorators live in `.swagger.ts` files, not controllers**
Each module has a dedicated `[module].swagger.ts` file exporting decorator functions (e.g., `@ApiCreateConversation()`). Controllers import and apply these. Never add `@ApiOperation`, `@ApiResponse`, or `@ApiBearerAuth` directly to controller methods — it breaks the isolation pattern.

**`@Public()` is required on any truly open endpoint**
Global `JwtAuthGuard` protects everything by default. OAuth callbacks, the health endpoint, waitlist join, and Swagger docs use `@Public()`. Forgetting this returns 401. New endpoints are private unless explicitly opted out.

---

## Open Questions

| Question                                                    | Stakeholders | Status | Next Action                         |
| ----------------------------------------------------------- | ------------ | ------ | ----------------------------------- |
| How should scaffold level reset between sessions?           | Engineering  | Open   | Needs RFC-0002 completion to decide |
| Should `mukti-mcp` be brought into the Nx workspace?        | Engineering  | Open   | Evaluate Nx plugin compatibility    |
| RFC-0005 scope: session memory vs. full temporal awareness? | Product      | Open   | RFC design phase not started        |

---

## Patterns Worth Preserving

- **Queue + SSE for all AI calls** — never inline AI calls in HTTP handlers; this is the core reliability pattern
- **Swagger isolation** — `.swagger.ts` files keep controllers at ~20 lines, readable and clean
- **`@Public()` opt-out** — forces intentional security decisions on every new endpoint
- **Property-based tests for auth/ownership** — see `modules/auth/guards/__tests__/properties/` and `modules/conversations/__tests__/properties/`
- **`cn()` utility for className merging** — always use `cn(...)` from `@/lib/utils`, never string concatenation

---

## Archive (Resolved)

### Resolved: `project/project-context.md` deprecated and removed

- **Resolved**: 2026-03-21
- **Resolution**: File deleted. Content was a generic OpenCode agent template — not Mukti-specific. All technical context now lives in `project-intelligence/technical-domain.md`.
- **Learning**: Project intelligence belongs in `project-intelligence/` from the start; generic templates add noise.

## Related Files

- `decisions-log.md` — Permanent decisions behind the current state
- `business-domain.md` — Product context for current priorities
- `technical-domain.md` — Technical context for all patterns
- `business-tech-bridge.md` — Context for current trade-offs
