# Mukti V2: Resolution Flow + Smart Canvas

## TL;DR

> **Quick Summary**: Transform Mukti from an "endless questioning" tool into a complete thinking companion by adding intelligent resolution detection, session reports, and a smart auto-generating thinking canvas from chat conversations.
>
> **Deliverables**:
>
> - Resolution Flow: Multi-signal detection + AI-suggested conclusions + Session Reports
> - Chat-to-Canvas: Auto-generated thinking tree with always-visible minimap
> - AI-Assisted Setup: AI suggests Context/Assumptions from problem statement
>
> **Estimated Effort**: Medium (2-4 weeks)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Resolution Logic -> Session Reports -> Chat Integration

---

## Context

### Original Request

User identified three key pain points:

1. Constant questioning with no resolution - AI never concludes
2. No post-session review or performance tracking
3. Collaborative mode missing (deferred to future)

Plus the desire to make the React Flow visualization a standout feature rather than a basic wrapper.

### Interview Summary

**Key Discussions**:

- **Resolution approach**: Multi-signal detection (exploration depth + sentiment + message count)
- **Canvas innovation**: Auto-generate thinking tree from chat + always-visible minimap
- **Setup friction**: AI should suggest Context/Assumptions based on Seed
- **Session outcome**: Full report with insights, action items, lessons learned
- **Timeline**: 2-4 weeks with ruthless prioritization

**Research Findings**:

- `prompt-builder.ts:75` explicitly says "Never provide direct answers" - resolution must preserve Socratic principles
- Canvas already supports Insight nodes - can extend for auto-generation
- MCP server has rich questioning logic but is disconnected from main app
- Reports page is a placeholder (`ComingSoon` component)

### Self-Conducted Gap Analysis (Metis Review)

**Identified Gaps** (addressed in plan):

1. **Unclear resolution thresholds**: Need to define specific metrics for "sufficient exploration"
2. **Sentiment detection complexity**: May require NLP library or simpler heuristics
3. **Minimap performance**: Real-time tree generation in chat could impact performance
4. **Export format undefined**: Session Report needs clear export format (PDF? Markdown?)
5. **AI suggestion quality**: Need fallback when AI generates poor suggestions
6. **Mobile responsiveness**: Minimap on mobile devices not discussed

**Guardrails Applied**:

- Resolution MUST NOT violate Socratic principles (no direct answers)
- AI suggestions are always editable - never forced
- Minimap is collapsible if user finds it distracting
- Session Reports are generated but user can skip

---

## Work Objectives

### Core Objective

Fix the "endless questioning" UX by adding intelligent resolution detection and session conclusion, while making the React Flow canvas a dynamic, auto-generating visualization of user thinking.

### Concrete Deliverables

1. **Resolution Detection Service**: Backend logic analyzing exploration signals
2. **Session Report Component**: UI for displaying insights, actions, lessons
3. **Chat Minimap Component**: Always-visible thinking tree in chat view
4. **Conversation-to-Tree Parser**: Logic to extract problem structure from chat
5. **AI Suggestion Service**: Generate Context/Assumptions from Seed
6. **Updated Setup Wizard**: Integrate AI suggestions into wizard flow

### Definition of Done

- [ ] User receives resolution suggestion after deep exploration
- [ ] Session Report exports as downloadable markdown
- [ ] Minimap appears in chat after 3+ meaningful exchanges
- [ ] AI generates 2-3 Context and 2-3 Assumption suggestions from Seed
- [ ] All new features work on desktop browsers

### Must Have

- Resolution detection that preserves Socratic principles
- Exportable Session Report with all three elements (insights, actions, lessons)
- Functional minimap in chat view
- AI suggestions during setup wizard

### Must NOT Have (Guardrails)

- ❌ AI providing direct answers or solutions (violates core philosophy)
- ❌ Forced acceptance of AI suggestions (always editable)
- ❌ Complex NLP/ML sentiment analysis (use simpler heuristics for 2-4 week timeline)
- ❌ Collaborative/multi-user features (future scope)
- ❌ Full analytics dashboard (future scope)
- ❌ Mobile-specific optimizations (desktop-first for this release)
- ❌ PDF export (markdown only for now)

---

## Verification Strategy

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision

- **Infrastructure exists**: YES (Jest configured with Bun compatibility)
- **Automated tests**: Tests-after (add tests for critical paths after implementation)
- **Framework**: bun test / jest
- **Agent-Executed QA**: ALWAYS (mandatory for all tasks)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Resolution Detection Service (backend)
├── Task 4: Conversation-to-Tree Parser (utility logic)
└── Task 5: AI Suggestion Service (backend)

Wave 2 (After Wave 1):
├── Task 2: Session Report Component (frontend, depends: 1)
├── Task 6: Updated Setup Wizard (frontend, depends: 5)
└── Task 7: Chat Minimap Component (frontend, depends: 4)

Wave 3 (After Wave 2):
├── Task 3: Resolution UI Integration (depends: 1, 2)
└── Task 8: End-to-End Integration Testing (depends: all)

Critical Path: Task 1 → Task 2 → Task 3
Parallel Speedup: ~40% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
| ---- | ---------- | ------ | -------------------- |
| 1    | None       | 2, 3   | 4, 5                 |
| 2    | 1          | 3      | 6, 7                 |
| 3    | 1, 2       | 8      | None                 |
| 4    | None       | 7      | 1, 5                 |
| 5    | None       | 6      | 1, 4                 |
| 6    | 5          | 8      | 2, 7                 |
| 7    | 4          | 8      | 2, 6                 |
| 8    | 3, 6, 7    | None   | None (final)         |

### Agent Dispatch Summary

| Wave | Tasks   | Recommended Agents                                                                                             |
| ---- | ------- | -------------------------------------------------------------------------------------------------------------- |
| 1    | 1, 4, 5 | delegate_task(category="unspecified-high", load_skills=[], run_in_background=false) - Launch all 3 in parallel |
| 2    | 2, 6, 7 | dispatch parallel after Wave 1 completes                                                                       |
| 3    | 3, 8    | final integration tasks                                                                                        |

---

## TODOs

### FEATURE 1: Resolution Flow

- [ ] 1. Resolution Detection Service

  **What to do**:
  - Create new service `resolution-detection.service.ts` in `packages/mukti-api/src/modules/dialogue/services/`
  - Implement multi-signal resolution detection:
    - **Exploration depth**: Track how many nodes have been explored (threshold: 60%+ of nodes)
    - **Message count per node**: Minimum 3 exchanges per core node before suggesting resolution
    - **Clarity signals**: Detect phrases like "I understand now", "that makes sense", "I see", "got it"
  - Create endpoint: `POST /dialogue/sessions/:sessionId/check-resolution`
  - Return: `{ readyForResolution: boolean, signals: { depth: number, messageCount: number, clarityScore: number }, suggestedNextStep: string }`
  - Preserve Socratic principles: Resolution suggestion is a QUESTION not an answer ("You've explored this deeply. Are you ready to summarize your insights?")

  **Must NOT do**:
  - Do NOT use complex ML/NLP for sentiment (simple keyword matching is fine)
  - Do NOT auto-close sessions (user must confirm)
  - Do NOT provide answers or solutions in the resolution suggestion

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Backend service requiring careful design to preserve philosophy
  - **Skills**: `[]`
    - No special skills needed - pure NestJS service

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 4, 5)
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None (can start immediately)

  **References**:
  - `packages/mukti-api/src/modules/dialogue/dialogue-ai.service.ts` - Existing AI service pattern to follow
  - `packages/mukti-api/src/modules/dialogue/utils/prompt-builder.ts:75` - Line that says "Never provide direct answers" - must preserve this principle
  - `packages/mukti-api/src/schemas/node-dialogue.schema.ts` - NodeDialogue schema with messageCount field
  - `packages/mukti-api/src/schemas/canvas-session.schema.ts:69` - exploredNodes array to check exploration depth

  **Acceptance Criteria**:

  **Automated Tests:**
  - [ ] Test file created: `packages/mukti-api/src/modules/dialogue/services/__tests__/resolution-detection.service.spec.ts`
  - [ ] Test covers: Returns `readyForResolution: false` when < 60% nodes explored
  - [ ] Test covers: Returns `readyForResolution: true` when depth + messages + clarity signals all pass
  - [ ] Test covers: Suggested message is a question, not a statement
  - [ ] bun nx run @mukti/api:test -- resolution-detection → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Resolution NOT suggested for shallow exploration
    Tool: Bash (curl)
    Preconditions: Dev server running, test session with 2/5 nodes explored
    Steps:
      1. POST /dialogue/sessions/{sessionId}/check-resolution
      2. Assert: HTTP status is 200
      3. Assert: response.readyForResolution === false
      4. Assert: response.signals.depth < 0.6
    Expected Result: Resolution not suggested prematurely
    Evidence: Response body saved

  Scenario: Resolution suggested after deep exploration
    Tool: Bash (curl)
    Preconditions: Session with 4/5 nodes explored, 15+ messages with clarity signals
    Steps:
      1. POST /dialogue/sessions/{sessionId}/check-resolution
      2. Assert: HTTP status is 200
      3. Assert: response.readyForResolution === true
      4. Assert: response.suggestedNextStep contains "?"
    Expected Result: Resolution suggested as a question
    Evidence: Response body captured
  ```

  **Commit**: YES
  - Message: `feat(dialogue): add resolution detection service with multi-signal approach`
  - Files: `packages/mukti-api/src/modules/dialogue/services/resolution-detection.service.ts`
  - Pre-commit: `bun nx run @mukti/api:lint`

---

- [ ] 2. Session Report Component

  **What to do**:
  - Create new component `session-report.tsx` in `packages/mukti-web/src/components/canvas/`
  - Display three sections:
    1. **Insights Summary**: List all Insight nodes created during session
    2. **Action Items**: User-editable list of next steps (AI can suggest initial items)
    3. **Lessons Learned**: Key takeaways from the exploration
  - Add "Export as Markdown" button
  - Style with existing card/glassmorphism patterns from the codebase
  - Create modal/dialog that appears when user accepts resolution

  **Must NOT do**:
  - Do NOT implement PDF export (markdown only)
  - Do NOT auto-populate without user confirmation
  - Do NOT make it blocking (user can dismiss and continue exploring)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Frontend component with UI/UX considerations
  - **Skills**: `["frontend-ui-ux"]`
    - frontend-ui-ux: For polished component design matching existing patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 7)
  - **Blocks**: Task 3
  - **Blocked By**: Task 1

  **References**:
  - `packages/mukti-web/src/components/canvas/review-step.tsx` - Similar card-based review UI pattern
  - `packages/mukti-web/src/components/ui/card.tsx` - Card component to use
  - `packages/mukti-web/src/components/ui/dialog.tsx` - Dialog component for modal
  - `packages/mukti-web/src/components/reactbits/glass-surface.tsx` - Glassmorphism effect
  - `packages/mukti-web/src/types/canvas.types.ts` - InsightNode type definition

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Session Report displays all insight nodes
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, session with 3 insight nodes created
    Steps:
      1. Navigate to: http://localhost:3000/canvas/{sessionId}
      2. Trigger resolution flow (mock or use test data)
      3. Wait for: [data-testid="session-report-dialog"] visible (timeout: 5s)
      4. Assert: .insight-list contains 3 items
      5. Assert: section[data-section="insights"] visible
      6. Assert: section[data-section="action-items"] visible
      7. Assert: section[data-section="lessons"] visible
      8. Screenshot: .sisyphus/evidence/task-2-report-displays.png
    Expected Result: All three sections visible with insights populated
    Evidence: .sisyphus/evidence/task-2-report-displays.png

  Scenario: Export as Markdown works
    Tool: Playwright (playwright skill)
    Preconditions: Session report dialog open
    Steps:
      1. Click: button[data-testid="export-markdown"]
      2. Wait for: download to start
      3. Assert: Downloaded file ends with .md
    Expected Result: Markdown file downloaded
    Evidence: Download verification
  ```

  **Commit**: YES
  - Message: `feat(canvas): add session report component with export`
  - Files: `packages/mukti-web/src/components/canvas/session-report.tsx`
  - Pre-commit: `bun nx run @mukti/web:lint`

---

- [ ] 3. Resolution UI Integration

  **What to do**:
  - Add resolution checking to the NodeChatPanel component
  - After each AI response, call resolution detection endpoint
  - When `readyForResolution: true`, show subtle banner: "Ready to wrap up? [Conclude Session]"
  - On click, open Session Report dialog
  - Add "Conclude Session" button to canvas toolbar (always available)
  - Update canvas store with session conclusion state

  **Must NOT do**:
  - Do NOT make resolution banner intrusive (subtle, dismissible)
  - Do NOT auto-open report (user must click)
  - Do NOT prevent continued exploration after dismissing

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI integration with state management
  - **Skills**: `["frontend-ui-ux"]`
    - frontend-ui-ux: For subtle, non-intrusive UX

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 1, 2

  **References**:
  - `packages/mukti-web/src/components/canvas/chat/node-chat-panel.tsx` - Chat panel to modify
  - `packages/mukti-web/src/lib/stores/canvas-store.ts` - Canvas state management
  - `packages/mukti-web/src/components/canvas/thinking-canvas.tsx` - Main canvas for toolbar addition
  - `packages/mukti-web/src/components/ui/badge.tsx` - For subtle resolution indicator

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Resolution banner appears after deep exploration
    Tool: Playwright (playwright skill)
    Preconditions: Session with sufficient exploration to trigger resolution
    Steps:
      1. Navigate to: http://localhost:3000/canvas/{sessionId}
      2. Click on a node to open chat panel
      3. Send message that triggers resolution check
      4. Wait for: [data-testid="resolution-banner"] visible (timeout: 10s)
      5. Assert: Banner contains "Ready to wrap up?" text
      6. Assert: Button "Conclude Session" is clickable
      7. Screenshot: .sisyphus/evidence/task-3-resolution-banner.png
    Expected Result: Subtle banner appears with conclude option
    Evidence: .sisyphus/evidence/task-3-resolution-banner.png

  Scenario: Clicking Conclude opens Session Report
    Tool: Playwright (playwright skill)
    Preconditions: Resolution banner visible
    Steps:
      1. Click: button[data-testid="conclude-session"]
      2. Wait for: [data-testid="session-report-dialog"] visible
      3. Assert: Dialog is open with report content
      4. Screenshot: .sisyphus/evidence/task-3-report-opens.png
    Expected Result: Session Report dialog opens
    Evidence: .sisyphus/evidence/task-3-report-opens.png
  ```

  **Commit**: YES
  - Message: `feat(canvas): integrate resolution flow with chat panel and toolbar`
  - Files: `packages/mukti-web/src/components/canvas/chat/node-chat-panel.tsx`, `packages/mukti-web/src/components/canvas/thinking-canvas.tsx`
  - Pre-commit: `bun nx run @mukti/web:lint`

---

### FEATURE 2: Smart Thinking Canvas

- [ ] 4. Conversation-to-Tree Parser

  **What to do**:
  - Create utility `conversation-parser.ts` in `packages/mukti-web/src/lib/utils/`
  - Parse chat messages to extract:
    - **Seed**: First substantial problem statement (user's initial question)
    - **Soil**: Constraints/context mentioned ("but I can't...", "the limitation is...", "given that...")
    - **Roots**: Assumptions mentioned ("I assume...", "I think...", "probably because...")
  - Return ProblemStructure compatible object
  - Use simple keyword/pattern matching (no heavy NLP)
  - Only trigger after 3+ user messages

  **Must NOT do**:
  - Do NOT use external NLP libraries (keep it lightweight)
  - Do NOT process messages in real-time on every keystroke (batch after message sent)
  - Do NOT guarantee 100% accuracy (this is assistive, not authoritative)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Utility logic requiring careful pattern design
  - **Skills**: `[]`
    - No special skills needed - pure TypeScript utility

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 5)
  - **Blocks**: Task 7
  - **Blocked By**: None (can start immediately)

  **References**:
  - `packages/mukti-api/src/schemas/canvas-session.schema.ts:22-29` - ProblemStructure interface to match
  - `packages/mukti-web/src/lib/stores/chat-store.ts` - Chat store for accessing messages
  - `packages/mukti-api/src/modules/dialogue/utils/prompt-builder.ts` - Existing prompt building patterns (for keyword matching approach)

  **Acceptance Criteria**:

  **Automated Tests:**
  - [ ] Test file created: `packages/mukti-web/src/lib/utils/__tests__/conversation-parser.test.ts`
  - [ ] Test covers: Extracts seed from first substantive message
  - [ ] Test covers: Identifies constraints from "but I can't", "limitation is" patterns
  - [ ] Test covers: Identifies assumptions from "I assume", "I think" patterns
  - [ ] Test covers: Returns empty arrays when no patterns found
  - [ ] bun nx run @mukti/web:test -- conversation-parser → PASS

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Parser extracts problem structure from conversation
    Tool: Bash (bun test)
    Preconditions: Test file exists with mock conversations
    Steps:
      1. Run: bun nx run @mukti/web:test -- conversation-parser
      2. Assert: All tests pass
      3. Assert: Output shows seed, soil, roots extraction
    Expected Result: Parser correctly identifies structure elements
    Evidence: Test output captured
  ```

  **Commit**: YES
  - Message: `feat(utils): add conversation-to-tree parser for auto-generating canvas`
  - Files: `packages/mukti-web/src/lib/utils/conversation-parser.ts`
  - Pre-commit: `bun nx run @mukti/web:lint`

---

- [ ] 5. AI Suggestion Service

  **What to do**:
  - Create new endpoint in `packages/mukti-api/src/modules/canvas/canvas.controller.ts`
  - Endpoint: `POST /canvas-sessions/suggest` with body `{ seed: string }`
  - Use OpenRouter to generate 2-3 suggested Context items and 2-3 Assumptions
  - Prompt should analyze the problem and infer likely constraints/assumptions
  - Return: `{ suggestedSoil: string[], suggestedRoots: string[] }`
  - Add to existing OpenRouter integration

  **Must NOT do**:
  - Do NOT make suggestions mandatory (always optional)
  - Do NOT use more than 500 tokens per suggestion call
  - Do NOT cache suggestions (each request is fresh)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Backend AI integration requiring prompt engineering
  - **Skills**: `[]`
    - No special skills needed - NestJS + OpenRouter

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 4)
  - **Blocks**: Task 6
  - **Blocked By**: None (can start immediately)

  **References**:
  - `packages/mukti-api/src/modules/canvas/canvas.controller.ts` - Existing canvas controller to extend
  - `packages/mukti-api/src/modules/dialogue/dialogue-ai.service.ts` - Pattern for OpenRouter integration
  - `packages/mukti-api/src/modules/ai/services/openrouter-client.factory.ts` - Client factory to use
  - `packages/mukti-api/src/modules/dialogue/utils/prompt-builder.ts` - Prompt building patterns

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: AI generates suggestions from seed
    Tool: Bash (curl)
    Preconditions: Dev server running with valid OpenRouter API key
    Steps:
      1. POST /canvas-sessions/suggest
         Body: {"seed": "My team is burned out and productivity has dropped"}
      2. Assert: HTTP status is 200
      3. Assert: response.suggestedSoil is array with 2-3 items
      4. Assert: response.suggestedRoots is array with 2-3 items
      5. Assert: Each suggestion is 5-200 characters
    Expected Result: AI returns relevant suggestions
    Evidence: Response body captured

  Scenario: Suggestions handle edge case of vague seed
    Tool: Bash (curl)
    Preconditions: Dev server running
    Steps:
      1. POST /canvas-sessions/suggest
         Body: {"seed": "help"}
      2. Assert: HTTP status is 200
      3. Assert: response.suggestedSoil is empty array OR has generic items
      4. Assert: No server error
    Expected Result: Graceful handling of vague input
    Evidence: Response body captured
  ```

  **Commit**: YES
  - Message: `feat(canvas): add AI suggestion endpoint for context and assumptions`
  - Files: `packages/mukti-api/src/modules/canvas/canvas.controller.ts`, `packages/mukti-api/src/modules/canvas/canvas.service.ts`
  - Pre-commit: `bun nx run @mukti/api:lint`

---

- [ ] 6. Updated Setup Wizard with AI Suggestions

  **What to do**:
  - Modify `packages/mukti-web/src/components/canvas/setup-wizard-dialog.tsx`
  - After user enters Seed, show "Get AI Suggestions" button
  - Call `/canvas-sessions/suggest` endpoint
  - Display suggestions as clickable chips that add to Soil/Roots arrays
  - User can accept, modify, or ignore suggestions
  - Add loading state during suggestion fetch

  **Must NOT do**:
  - Do NOT auto-accept suggestions (user must click)
  - Do NOT block wizard flow if suggestions fail (show error, allow manual entry)
  - Do NOT remove manual entry option

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Frontend UX enhancement
  - **Skills**: `["frontend-ui-ux"]`
    - frontend-ui-ux: For smooth suggestion UX

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 7)
  - **Blocks**: Task 8
  - **Blocked By**: Task 5

  **References**:
  - `packages/mukti-web/src/components/canvas/setup-wizard-dialog.tsx` - Wizard to modify
  - `packages/mukti-web/src/components/canvas/seed-step.tsx` - Seed step component
  - `packages/mukti-web/src/lib/stores/wizard-store.ts` - Wizard state management
  - `packages/mukti-web/src/lib/api/canvas.ts` - Canvas API to extend

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: AI suggestions appear after entering seed
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, user authenticated
    Steps:
      1. Navigate to: http://localhost:3000/dashboard/canvas
      2. Click: button to create new session
      3. Wait for: setup wizard dialog visible
      4. Fill: input[name="seed"] with "My team is burned out"
      5. Click: button[data-testid="get-suggestions"]
      6. Wait for: [data-testid="suggestion-chips"] visible (timeout: 15s)
      7. Assert: At least 2 suggestion chips displayed
      8. Screenshot: .sisyphus/evidence/task-6-suggestions.png
    Expected Result: AI suggestions appear as clickable chips
    Evidence: .sisyphus/evidence/task-6-suggestions.png

  Scenario: Clicking suggestion adds it to form
    Tool: Playwright (playwright skill)
    Preconditions: Suggestions are visible
    Steps:
      1. Click: first suggestion chip
      2. Assert: Chip is now selected/added to list
      3. Navigate to next step
      4. Assert: Selected suggestion appears in review
    Expected Result: Suggestion is added when clicked
    Evidence: Screenshot captured
  ```

  **Commit**: YES
  - Message: `feat(canvas): integrate AI suggestions into setup wizard`
  - Files: `packages/mukti-web/src/components/canvas/setup-wizard-dialog.tsx`
  - Pre-commit: `bun nx run @mukti/web:lint`

---

- [ ] 7. Chat Minimap Component

  **What to do**:
  - Create new component `chat-minimap.tsx` in `packages/mukti-web/src/components/conversations/`
  - Use React Flow in miniature mode (view-only, no interactions)
  - Position in corner of chat view (bottom-right, collapsible)
  - Subscribe to conversation parser output
  - Update tree as new messages arrive (after 3+ user messages)
  - Show Seed in center, Soil above, Roots below (same layout as main canvas)
  - Add "Expand to Full Canvas" button

  **Must NOT do**:
  - Do NOT make minimap interactive (view-only)
  - Do NOT show before 3 user messages (not enough data)
  - Do NOT block chat rendering while updating minimap

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex React Flow visualization component
  - **Skills**: `["frontend-ui-ux"]`
    - frontend-ui-ux: For polished minimap UX

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 6)
  - **Blocks**: Task 8
  - **Blocked By**: Task 4

  **References**:
  - `packages/mukti-web/src/components/canvas/thinking-canvas.tsx` - Main canvas to reference for layout
  - `packages/mukti-web/src/lib/utils/canvas-layout.ts` - Layout utility to reuse
  - `packages/mukti-web/src/app/chat/[id]/page.tsx` - Chat page to integrate with
  - `packages/mukti-web/src/lib/stores/chat-store.ts` - Chat store for message access

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Minimap appears after 3 messages
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, user authenticated
    Steps:
      1. Navigate to: http://localhost:3000/chat
      2. Start new conversation
      3. Send 3 messages about a problem
      4. Wait for: [data-testid="chat-minimap"] visible (timeout: 10s)
      5. Assert: Minimap contains seed node
      6. Screenshot: .sisyphus/evidence/task-7-minimap-appears.png
    Expected Result: Minimap appears with initial structure
    Evidence: .sisyphus/evidence/task-7-minimap-appears.png

  Scenario: Minimap updates as conversation progresses
    Tool: Playwright (playwright skill)
    Preconditions: Minimap visible with initial structure
    Steps:
      1. Send message containing "I assume that..."
      2. Wait for: minimap to update (timeout: 5s)
      3. Assert: Minimap contains root node (assumption)
      4. Screenshot: .sisyphus/evidence/task-7-minimap-updates.png
    Expected Result: New assumption node appears in minimap
    Evidence: .sisyphus/evidence/task-7-minimap-updates.png

  Scenario: Minimap can be collapsed
    Tool: Playwright (playwright skill)
    Preconditions: Minimap visible
    Steps:
      1. Click: button[data-testid="collapse-minimap"]
      2. Assert: Minimap is collapsed/hidden
      3. Click: button[data-testid="expand-minimap"]
      4. Assert: Minimap is visible again
    Expected Result: Collapse/expand works
    Evidence: Screenshots captured
  ```

  **Commit**: YES
  - Message: `feat(chat): add minimap component with auto-generated thinking tree`
  - Files: `packages/mukti-web/src/components/conversations/chat-minimap.tsx`
  - Pre-commit: `bun nx run @mukti/web:lint`

---

### INTEGRATION & TESTING

- [ ] 8. End-to-End Integration Testing

  **What to do**:
  - Create comprehensive E2E test for complete user flow
  - Test scenarios:
    1. New user creates session with AI-assisted setup
    2. User explores nodes until resolution suggested
    3. User accepts resolution and exports report
    4. Chat mode generates minimap and offers canvas expansion
  - Verify all features work together
  - Document any edge cases found

  **Must NOT do**:
  - Do NOT skip any critical path
  - Do NOT rely only on unit tests (must have E2E)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Integration testing across full stack
  - **Skills**: `["playwright"]`
    - playwright: For browser-based E2E testing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential, final task)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 3, 6, 7

  **References**:
  - All component files from Tasks 1-7
  - `packages/mukti-web/src/app/` - All page routes to test
  - `packages/mukti-api/test/` - Existing E2E test patterns

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios:**

  ```
  Scenario: Complete Resolution Flow E2E
    Tool: Playwright (playwright skill)
    Preconditions: Both servers running, test user authenticated
    Steps:
      1. Navigate to: http://localhost:3000/dashboard/canvas
      2. Create new session with seed "My team is burned out"
      3. Use AI suggestions to add context and assumptions
      4. Complete wizard and enter canvas
      5. Click on seed node, open chat
      6. Have extended conversation (5+ exchanges)
      7. Wait for resolution banner
      8. Click "Conclude Session"
      9. Verify report shows insights
      10. Click "Export as Markdown"
      11. Verify download starts
      12. Screenshot: .sisyphus/evidence/task-8-complete-flow.png
    Expected Result: Full flow works end-to-end
    Evidence: .sisyphus/evidence/task-8-complete-flow.png

  Scenario: Chat-to-Canvas E2E
    Tool: Playwright (playwright skill)
    Preconditions: Servers running, user authenticated
    Steps:
      1. Navigate to: http://localhost:3000/chat
      2. Start conversation about a problem
      3. Send 5+ messages including constraints and assumptions
      4. Verify minimap appears with structure
      5. Click "Expand to Full Canvas"
      6. Verify canvas opens with same structure
      7. Screenshot: .sisyphus/evidence/task-8-chat-to-canvas.png
    Expected Result: Chat minimap expands to full canvas
    Evidence: .sisyphus/evidence/task-8-chat-to-canvas.png
  ```

  **Commit**: YES
  - Message: `test(e2e): add comprehensive integration tests for v2 features`
  - Files: E2E test files
  - Pre-commit: `bun nx run @mukti/web:lint`

---

## Commit Strategy

| After Task | Message                                            | Files                                    | Verification               |
| ---------- | -------------------------------------------------- | ---------------------------------------- | -------------------------- |
| 1          | `feat(dialogue): add resolution detection service` | resolution-detection.service.ts          | bun nx run @mukti/api:test |
| 2          | `feat(canvas): add session report component`       | session-report.tsx                       | bun nx run @mukti/web:lint |
| 3          | `feat(canvas): integrate resolution flow`          | node-chat-panel.tsx, thinking-canvas.tsx | bun nx run @mukti/web:lint |
| 4          | `feat(utils): add conversation parser`             | conversation-parser.ts                   | bun nx run @mukti/web:test |
| 5          | `feat(canvas): add AI suggestion endpoint`         | canvas.controller.ts, canvas.service.ts  | bun nx run @mukti/api:test |
| 6          | `feat(canvas): integrate AI suggestions in wizard` | setup-wizard-dialog.tsx                  | bun nx run @mukti/web:lint |
| 7          | `feat(chat): add minimap component`                | chat-minimap.tsx                         | bun nx run @mukti/web:lint |
| 8          | `test(e2e): add v2 integration tests`              | e2e test files                           | E2E tests pass             |

---

## Success Criteria

### Verification Commands

```bash
# All API tests pass
bun nx run @mukti/api:test  # Expected: All tests pass

# All Web tests pass
bun nx run @mukti/web:test  # Expected: All tests pass

# Both apps build successfully
bun nx run @mukti/api:build  # Expected: Build succeeds
bun nx run @mukti/web:build  # Expected: Build succeeds

# No lint errors
bun run lint  # Expected: No errors
```

### Final Checklist

- [ ] Resolution detection triggers after sufficient exploration
- [ ] Session Report displays insights, actions, lessons
- [ ] Markdown export downloads correctly
- [ ] Chat minimap appears after 3+ messages
- [ ] Minimap shows Seed, Soil, Roots structure
- [ ] AI suggestions appear in setup wizard
- [ ] Suggestions can be accepted, modified, or ignored
- [ ] No direct answers ever given (Socratic principles preserved)
- [ ] All E2E tests pass
