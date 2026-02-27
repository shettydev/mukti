# Knowledge Gap Solution: Implementation Checklist

**RFCs**: RFC-0001 (Detection) + RFC-0002 (Scaffolding)  
**Status**: Draft → Implementation  
**Target**: Mukti v1.0.0 / Q2 2026

---

## Phase 0: Pre-Implementation

- [ ] **RFC Approval**: Get stakeholder sign-off on RFC-0001 and RFC-0002
- [ ] **Open Questions Resolved**: Address all open questions in Section 13 of each RFC
- [ ] **API Contract Review**: Frontend team validates API endpoints
- [ ] **Database Review**: DBA approves schema changes
- [ ] **Security Review**: Security team approves mitigations
- [ ] **Create Feature Flags**: Set up flags in LaunchDarkly/ConfigCat/etc.
  - [ ] `knowledge_gap_detection_enabled`
  - [ ] `adaptive_scaffolding_enabled`
  - [ ] `adaptive_scaffolding.prerequisite_tracking`
  - [ ] `adaptive_scaffolding.emergency_disable`

---

## Phase 1: Data Layer (Week 1-2)

### Database Schema

- [ ] **Create migration script** for new tables
  - [ ] `learning_profile` table
  - [ ] `credit_account` table
  - [ ] `credit_transaction` table
  - [ ] `struggle_record` table
  - [ ] `hint_usage_record` table
- [ ] **Add indexes** (Section 7 of RFC)
  - [ ] `idx_learning_profile_user_id`
  - [ ] `idx_credit_account_user_id`
  - [ ] `idx_credit_transaction_account_id`
  - [ ] `idx_hint_usage_record_user_problem`
  - [ ] `idx_struggle_record_profile_id`
- [ ] **Test migration** on staging database
- [ ] **Write rollback script** (in case of issues)

### Data Models (TypeScript/NestJS)

- [ ] **Create entities/schemas**
  - [ ] `LearningProfile` entity
  - [ ] `CreditAccount` entity
  - [ ] `CreditTransaction` entity
  - [ ] `StruggleRecord` entity
  - [ ] `HintUsageRecord` entity
- [ ] **Create DTOs** for API requests/responses
  - [ ] `RequestHintDto`
  - [ ] `HintResponseDto`
  - [ ] `LearningProfileDto`
  - [ ] `CreditAccountDto`
- [ ] **Write unit tests** for data models (validation, serialization)

---

## Phase 2: Core Logic (Week 3-4)

### Struggle Detector

**File**: `packages/mukti-api/src/scaffolding/struggle-detector.service.ts`

- [ ] **Implement `StruggleDetectorService`**
  - [ ] `detectStruggle(attemptCount, timeOnTask, sentiment, config)`
  - [ ] Attempt-based thresholds (1, 3, 5)
  - [ ] Time-based thresholds (120s, 300s, 600s)
  - [ ] Sentiment keyword detection
  - [ ] Return `StruggleLevel` (0-3)
- [ ] **Write unit tests**
  - [ ] Test attempt escalation (1→2→3 attempts)
  - [ ] Test time escalation
  - [ ] Test sentiment override
  - [ ] Test edge cases (0 attempts, negative time, null sentiment)
- [ ] **Integration tests**
  - [ ] Mock user with 5+ attempts → level 3
  - [ ] Mock user with "I give up" → level 2 minimum

### Hint Engine

**File**: `packages/mukti-api/src/scaffolding/hint-engine.service.ts`

- [ ] **Implement `HintEngineService`**
  - [ ] `dispatchHint(struggleLevel, question, profile, history, config)`
  - [ ] Map struggle level → hint level (0-3 → 1-4)
  - [ ] Enforce max hints per problem (3)
  - [ ] Enforce 30-second cooldown
  - [ ] Call appropriate hint generator (1-5)
  - [ ] Return `HintResponse` (hint, level, cost, blocked)
- [ ] **Implement hint generators** (5 functions)
  - [ ] `generateConceptualHint(question, context, profile, history)` — Level 1
  - [ ] `generateStrategicHint(...)` — Level 2
  - [ ] `generateTacticalHint(...)` — Level 3
  - [ ] `generateComputationalHint(...)` — Level 4
  - [ ] `generateAnswerHint(...)` — Level 5
- [ ] **Socratic prompt engineering**
  - [ ] Create system prompt template (Section 5.2 of RFC)
  - [ ] Inject user profile (gaps, strengths) into prompts
  - [ ] Test prompts with Claude/GPT-4 (verify no direct answers for levels 1-3)
- [ ] **Write unit tests**
  - [ ] Test struggle→hint level mapping
  - [ ] Test max hints enforcement
  - [ ] Test cooldown enforcement
  - [ ] Mock LLM responses (use fixtures)
- [ ] **Integration tests**
  - [ ] Test full hint generation pipeline (struggle → dispatch → LLM → response)
  - [ ] Test blocked responses (max hints, cooldown)

### Learning Profile Manager

**File**: `packages/mukti-api/src/scaffolding/learning-profile.service.ts`

- [ ] **Implement `LearningProfileService`**
  - [ ] `getProfile(userId)` — Fetch or create profile
  - [ ] `identifyGaps(userId, recentAttempts)` — Automated gap detection
  - [ ] `updateProfile(userId, updates)` — Update gaps/strengths/mastery
  - [ ] `adaptScaffolding(baseLevel, profile, concept)` — Profile-based adaptation
- [ ] **Gap detection algorithm** (Section 5.3 of RFC)
  - [ ] Analyze recent attempts (last 20)
  - [ ] Calculate concept success rates
  - [ ] Flag gaps: <30% = high, 30-60% = medium
  - [ ] Return `ConceptGap[]`
- [ ] **Write unit tests**
  - [ ] Test gap detection with mock attempts
  - [ ] Test profile creation/updates
  - [ ] Test adaptation logic (escalate for gaps, de-escalate for strengths)
- [ ] **Integration tests**
  - [ ] Test profile persistence (save → retrieve)
  - [ ] Test gap detection with real DB queries

### Credit/Cost Tracker

**File**: `packages/mukti-api/src/scaffolding/credit-tracker.service.ts`

- [ ] **Implement `CreditTrackerService`**
  - [ ] `getBalance(userId)` — Fetch credit account
  - [ ] `deductCredits(userId, amount, reason, problemId)` — Spend credits
  - [ ] `earnCredits(userId, amount, reason, problemId)` — Earn credits
  - [ ] `refreshWeeklyAllowance(userId)` — Weekly reset (cron job)
  - [ ] `shouldWarnLowBalance(balance, allowance)` — 20% threshold
- [ ] **Write unit tests**
  - [ ] Test deduction (sufficient balance)
  - [ ] Test deduction failure (insufficient balance)
  - [ ] Test earning credits
  - [ ] Test weekly refresh
  - [ ] Test low balance warning
- [ ] **Integration tests**
  - [ ] Test transactions with real DB (atomicity, rollback)
  - [ ] Test concurrent deductions (race conditions)

---

## Phase 3: API Layer (Week 5)

### Endpoints

**Controller**: `packages/mukti-api/src/scaffolding/scaffolding.controller.ts`

- [ ] **`POST /api/v1/scaffolding/hint`**
  - [ ] Validate `RequestHintDto` (Joi/class-validator)
  - [ ] Call `StruggleDetectorService.detectStruggle(...)`
  - [ ] Call `HintEngineService.dispatchHint(...)`
  - [ ] Call `CreditTrackerService.deductCredits(...)`
  - [ ] Call `LearningProfileService.updateProfile(...)` (log hint usage)
  - [ ] Return `HintResponseDto`
  - [ ] Handle errors (400, 402, 429, 500)
- [ ] **`GET /api/v1/scaffolding/profile`**
  - [ ] Validate authentication (JWT)
  - [ ] Call `LearningProfileService.getProfile(userId)`
  - [ ] Return `LearningProfileDto`
- [ ] **`GET /api/v1/scaffolding/credits`**
  - [ ] Validate authentication (JWT)
  - [ ] Call `CreditTrackerService.getBalance(userId)`
  - [ ] Return `CreditAccountDto` with recent transactions
- [ ] **Write API tests** (e2e with supertest)
  - [ ] Test hint request flow (happy path)
  - [ ] Test 402 Insufficient Credits
  - [ ] Test 429 Cooldown Active
  - [ ] Test 429 Max Hints Reached
  - [ ] Test profile retrieval
  - [ ] Test credits retrieval

### Authentication & Authorization

- [ ] **Add auth guards** to all endpoints
  - [ ] JWT validation (existing Mukti auth)
  - [ ] User can only access own profile/credits
- [ ] **Add rate limiting** (global: 100 req/min per user)
- [ ] **Add input sanitization** (prevent prompt injection)

---

## Phase 4: Observability (Week 6)

### Logging

- [ ] **Structured logging** (Winston/Pino)
  - [ ] Log hint requests: `{ user_id, problem_id, hint_level, struggle_level, cost, latency }`
  - [ ] Log struggle detection: `{ user_id, problem_id, attempt_count, time_on_task, detected_level }`
  - [ ] Log credit transactions: `{ user_id, type, amount, reason, balance_before, balance_after }`
  - [ ] Log profile updates: `{ user_id, updated_fields, timestamp }`

### Metrics

- [ ] **Instrumentation** (Prometheus/StatsD/OpenTelemetry)
  - [ ] `scaffolding.hints.requests` (counter) — labels: `{hint_level, user_id, problem_id}`
  - [ ] `scaffolding.hints.latency_ms` (histogram) — buckets: [100, 500, 1000, 2000, 5000]
  - [ ] `scaffolding.credits.balance` (gauge) — sampled every 5 minutes
  - [ ] `scaffolding.struggle.level` (histogram) — buckets: [0, 1, 2, 3]
  - [ ] `scaffolding.gaps.detected` (counter) — labels: `{concept, severity}`
- [ ] **Grafana dashboards**
  - [ ] Hint usage dashboard (requests/sec, latency, level distribution)
  - [ ] Credit dashboard (balance distribution, earn/spend rates)
  - [ ] Struggle dashboard (struggle level distribution, escalation rate)

### Tracing

- [ ] **Distributed tracing** (Jaeger/Honeycomb/DataDog)
  - [ ] Span: `scaffolding.hint_request` (parent)
  - [ ] Span: `scaffolding.struggle_detection` (child)
  - [ ] Span: `scaffolding.profile_lookup` (child)
  - [ ] Span: `scaffolding.credit_check` (child)
  - [ ] Span: `scaffolding.hint_generation` (child, includes LLM call)
  - [ ] Span: `scaffolding.credit_deduction` (child)

### Alerting

- [ ] **Create alerts** (PagerDuty/Opsgenie/AlertManager)
  - [ ] `HighHintLatency` — p95 > 5s for 5m (Warning)
  - [ ] `LLMTimeouts` — timeout rate > 10% for 5m (Critical)
  - [ ] `CreditBalanceAnomalies` — negative balance detected (Critical)
  - [ ] `UnusualHintLevel5Usage` — level 5 > 20% for 1h (Warning)
- [ ] **Write runbooks** for each alert (link in alert description)

---

## Phase 5: Frontend Integration (Week 7)

### UI Components

**Package**: `packages/mukti-web`

- [ ] **Hint Button Component** (`components/scaffolding/HintButton.tsx`)
  - [ ] Display hint level progression (1→2→3→4→5)
  - [ ] Show cost per level (0, 5, 10, 15, 25)
  - [ ] Disable if cooldown active (show countdown timer)
  - [ ] Disable if max hints reached (show message)
  - [ ] Show credit balance
- [ ] **Hint Display Component** (`components/scaffolding/HintDisplay.tsx`)
  - [ ] Render hint text (markdown support)
  - [ ] Show hint level badge (Conceptual/Strategic/Tactical/Computational/Answer)
  - [ ] Show cost deducted
  - [ ] Show remaining credits after deduction
- [ ] **Credit Dashboard Widget** (`components/scaffolding/CreditDashboard.tsx`)
  - [ ] Display current balance
  - [ ] Display weekly allowance
  - [ ] Display time until next refresh
  - [ ] Display recent transactions (last 10)
  - [ ] Show earning opportunities ("Solve without hints: +10")
- [ ] **Learning Profile Widget** (`components/scaffolding/LearningProfile.tsx`)
  - [ ] Display identified gaps (with severity badges)
  - [ ] Display strengths
  - [ ] Display mastery map (visual: concept → progress bar)
  - [ ] Display performance metrics (success rate, independence score)

### API Client

- [ ] **Create API client** (`lib/api/scaffolding.ts`)
  - [ ] `requestHint(payload: RequestHintDto): Promise<HintResponseDto>`
  - [ ] `getProfile(): Promise<LearningProfileDto>`
  - [ ] `getCredits(): Promise<CreditAccountDto>`
- [ ] **Error handling** (toast notifications for 402, 429)
- [ ] **Loading states** (skeleton screens, spinners)

### State Management

- [ ] **Create Zustand/Redux store** for scaffolding state
  - [ ] `scaffoldingStore`: `{ hints, profile, credits, loading, error }`
  - [ ] Actions: `fetchHint`, `fetchProfile`, `fetchCredits`
- [ ] **Real-time updates** (optional: WebSocket for credit balance changes)

---

## Phase 6: Testing & QA (Week 8)

### Unit Tests

- [ ] **Achieve >80% code coverage** for all scaffolding services
- [ ] **Run tests in CI/CD pipeline** (GitHub Actions/Jenkins)

### Integration Tests

- [ ] **Test full hint request pipeline** (end-to-end with test DB)
- [ ] **Test credit earning scenarios** (solve without hints, daily challenges)
- [ ] **Test weekly refresh** (simulate time advancement)

### E2E Tests

**Tool**: Playwright/Cypress

- [ ] **User requests hint** (click button → see hint → see credit deduction)
- [ ] **User exhausts hints** (3 hints per problem → see blocked message)
- [ ] **User hits cooldown** (request hint → wait 30s → request again)
- [ ] **User views profile** (see identified gaps, strengths, mastery)
- [ ] **User views credits** (see balance, transactions, next refresh)

### Load Testing

**Tool**: k6/Gatling/Artillery

- [ ] **Simulate 1000 concurrent users** requesting hints
- [ ] **Verify p95 latency < 3s** (Section 10 of RFC)
- [ ] **Verify no database deadlocks** (credit deduction transactions)
- [ ] **Verify LLM timeout handling** (mock LLM delays)

### Security Testing

- [ ] **Test prompt injection** (malicious context input)
- [ ] **Test credit manipulation** (tampered requests)
- [ ] **Test IDOR vulnerabilities** (access other users' profiles/credits)
- [ ] **Test rate limiting** (exceed 100 req/min → 429)

---

## Phase 7: Rollout (Week 9-12)

### Phase 1: Internal Dogfood (Week 9)

- [ ] **Deploy to staging** with `adaptive_scaffolding_enabled` = OFF
- [ ] **Enable for dev team only** (whitelist by user ID)
- [ ] **Monitor dashboards** (hint latency, credit transactions, struggle detection)
- [ ] **Collect feedback** (internal survey)
- [ ] **Fix P0 bugs** (if any)
- [ ] **Exit criteria**: No P0 bugs for 1 week

### Phase 2: 10% Canary (Week 10)

- [ ] **Enable for 10% of users** (random sample)
- [ ] **Deploy to production** with feature flag ON for 10%
- [ ] **Monitor metrics**:
  - [ ] p95 latency < 3s
  - [ ] No credit balance anomalies
  - [ ] LLM timeout rate < 5%
  - [ ] User engagement (hint request rate)
- [ ] **A/B test analysis** (10% canary vs 90% control)
  - [ ] Compare success rates
  - [ ] Compare time-to-solution
  - [ ] Compare user satisfaction (in-app survey)
- [ ] **Exit criteria**: Metrics within thresholds for 3 days

### Phase 3: 50% Rollout (Week 11)

- [ ] **Enable for 50% of users**
- [ ] **Continue monitoring** (same metrics as Phase 2)
- [ ] **Collect user feedback** (in-app + email survey)
- [ ] **Exit criteria**: >80% user satisfaction

### Phase 4: 100% General Availability (Week 12)

- [ ] **Enable for 100% of users**
- [ ] **Deploy to production** with feature flag ON globally
- [ ] **Announce launch** (blog post, changelog, email newsletter)
- [ ] **Monitor for 1 week** (daily review of dashboards + alerts)
- [ ] **Post-launch retrospective** (what went well, what didn't)

### Rollback Plan

- [ ] **Document rollback steps** (Section 12 of RFC)
- [ ] **Test rollback procedure** on staging
- [ ] **Assign on-call engineer** (24/7 coverage during rollout)
- [ ] **Define rollback triggers**:
  - [ ] p95 latency > 10s for 10m
  - [ ] Error rate > 5% for 5m
  - [ ] Critical alert fired (LLMTimeouts, CreditBalanceAnomalies)

---

## Phase 8: Post-Launch (Week 13+)

### Documentation

- [ ] **Write user-facing docs** (how to use hints, credit system, learning profiles)
- [ ] **Write developer docs** (API reference, architecture diagrams)
- [ ] **Record demo video** (hint usage walkthrough)
- [ ] **Update README** (add link to adaptive scaffolding docs)

### User Education

- [ ] **Create onboarding flow** (first-time hint request → tooltip tour)
- [ ] **Add in-app help** (tooltips, FAQs, contextual hints)
- [ ] **Email campaign** (announce new feature, explain philosophy)

### Analytics & Iteration

- [ ] **Set up analytics** (Mixpanel/Amplitude/PostHog)
  - [ ] Track hint usage patterns (which levels are most used?)
  - [ ] Track credit earning vs. spending (are users running out?)
  - [ ] Track profile updates (how often are gaps identified?)
- [ ] **Weekly review** of metrics (first 4 weeks post-launch)
- [ ] **Iterate based on data**:
  - [ ] Adjust thresholds (attempt counts, time limits, costs)
  - [ ] Refine Socratic prompts (if hints too vague or too revealing)
  - [ ] Add new hint levels (if needed)

### Research & Optimization

- [ ] **Conduct user interviews** (5-10 users) to gather qualitative feedback
- [ ] **Run A/B tests** on:
  - [ ] Attempt thresholds (1,3,5 vs 2,4,6)
  - [ ] Credit costs (current vs. adjusted)
  - [ ] Hint level progression (5 levels vs. 3 levels)
- [ ] **Publish case study** (blog post on results, backed by data)

---

## Success Metrics (Track Monthly)

- [ ] **Hint usage rate**: % of problems where hints were used
- [ ] **Average hints per problem**: Target <2 (minimal assistance)
- [ ] **Independence score**: % of problems solved without hints — Target >60%
- [ ] **Success rate improvement**: Compare pre/post scaffolding — Target +4-9% (per Tutor CoPilot)
- [ ] **User satisfaction**: In-app survey rating — Target >4.0/5.0
- [ ] **Credit balance health**: % of users with balance >0 on Friday — Target >90%
- [ ] **Learning retention**: Test users 1 week after completion — Target +64% (per Wharton study)

---

## Risks & Mitigations

| Risk                                          | Likelihood | Impact | Mitigation                                                             |
| --------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------- |
| LLM latency spikes → slow hints               | High       | Medium | Timeout (5s), fallback to cached hints, pre-generate common hints      |
| Users find credit system "restrictive"        | Medium     | High   | User education, generous weekly allowance (200), earning opportunities |
| Hint prompts give away answers (prompt drift) | Medium     | High   | Regular audit of generated hints, add Socratic validation layer        |
| Database load from profile lookups            | Low        | Medium | Redis caching (5min TTL), lazy-load struggle history                   |
| Gaming the system (rapid account creation)    | Low        | Medium | Rate-limit account creation, require email verification                |

---

## Estimated Effort

| Phase                  | Duration | Team Size                 | Notes                                                           |
| ---------------------- | -------- | ------------------------- | --------------------------------------------------------------- |
| Phase 1: Data Layer    | 2 weeks  | 1 backend engineer        | Schema + models + tests                                         |
| Phase 2: Core Logic    | 2 weeks  | 2 backend engineers       | Struggle detector, hint engine, profile manager, credit tracker |
| Phase 3: API Layer     | 1 week   | 1 backend engineer        | Controllers + auth + e2e tests                                  |
| Phase 4: Observability | 1 week   | 1 DevOps + 1 backend      | Logging, metrics, tracing, alerts, dashboards                   |
| Phase 5: Frontend      | 1 week   | 1 frontend engineer       | UI components + API client + state management                   |
| Phase 6: Testing & QA  | 1 week   | 1 QA engineer + 1 backend | Unit, integration, e2e, load, security testing                  |
| Phase 7: Rollout       | 4 weeks  | Full team                 | Phased rollout with monitoring + iteration                      |
| Phase 8: Post-Launch   | Ongoing  | Full team                 | Docs, education, analytics, optimization                        |

**Total Effort**: ~12 weeks (3 months) with 2 backend, 1 frontend, 1 DevOps, 1 QA

---

## Dependencies

- [ ] **LLM Provider**: Claude/GPT-4 API access with sufficient rate limits
- [ ] **Feature Flag Service**: LaunchDarkly/ConfigCat/custom solution
- [ ] **Monitoring Stack**: Prometheus + Grafana (or DataDog/New Relic)
- [ ] **Tracing Stack**: Jaeger/Honeycomb (or DataDog APM)
- [ ] **CI/CD Pipeline**: GitHub Actions/Jenkins configured for tests + deployments
- [ ] **Staging Environment**: Mirrors production (DB, Redis, LLM access)

---

## Sign-Off

- [ ] **Engineering Lead** — Architecture approved
- [ ] **Product Manager** — User experience validated
- [ ] **Design Lead** — UI mockups approved
- [ ] **Security Lead** — Security mitigations approved
- [ ] **DBA** — Database schema approved
- [ ] **DevOps Lead** — Observability + rollout plan approved

---

**Status**: Ready for implementation after sign-off ✅  
**Next Step**: Begin Phase 1 (Data Layer) after approvals  
**Questions**: Post in #adaptive-scaffolding Slack channel
