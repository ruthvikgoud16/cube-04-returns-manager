# BUILD_LOG.md: Development Progress & Decisions

**Document Purpose:** Daily log of what was attempted, what changed, tests run, failures, findings, and decisions. Updated continuously throughout the build. Organisers read this from the branch daily.

**Start Date:** 25 Sep 2026, 9:00 AM IST  
**Deadline:** 1 Oct 2026, 6:00 PM IST  
**Current Phase:** Phase 1 — Audit & Planning

---

## Day 1: 25 Sep 2026 (Wednesday)

### Morning (9:00 AM – 12:30 PM)

**Objective:** Complete Phase 1 audit; lock all planning documents

**Work Done:**
- ✓ Cloned correct RTN repository (ruthvikgoud16 fork)
- ✓ Verified: origin → github.com/ruthvikgoud16/cube-04-returns-manager
- ✓ Read all authoritative documents:
  - ✓ README.md (problem statement, chain context, reference data)
  - ✓ RULES.md (repository rules, engineering rules, honesty rules)
  - ✓ GITHUB-GUIDE.md (submission workflow, branch management)
  - ✓ data/README.md + returns_sample.csv (schema, reference fields)
  - ✓ submissions/_TEMPLATE/README.md (expected layout)
- ✓ Located CUBE Participant Handbook (PDF in Downloads/)
- ✓ Identified organizer clarifications already confirmed:
  - Participants may define scope boundaries
  - Different approaches acceptable (complexity/accuracy tradeoff)
  - Focus: physically visible parts (not electronics)
  - Participants can create own evaluation dataset

**Artifacts Created:**
- ✓ REQUIREMENTS_REGISTER.md (56 requirements tracked; 24 critical, 21 high)
- ✓ CLARIFICATIONS.md (5 resolved, 3 contradictions found + resolved, 5 unresolved)
- ✓ DECISIONS.md (9 engineering decisions locked)
- ✓ ARCHITECTURE.md (system design, component flow, model prompt, evidence schema)
- ✓ CLAUDE.md (durable coding constraints, forbidden patterns, testing rules)
- ✓ BUILD_BRIEF.md (customer problem, success criteria, kill condition, 7-day timeline)
- ✓ TASKS.md (work breakdown by Face, daily sprints)
- ✓ BUILD_LOG.md (this file; template for continuous updates)

**Blockers:** None

**Decisions Locked:**
1. Single-batch multimodal model call (not sequential per-check calls)
2. Observed state → Amazon condition mapping via model inference
3. Visual evidence only scope boundary (no electronics/battery)
4. Four-state decision model: PASS / FAIL / UNCERTAIN / PENDING_REVIEW
5. Evidence record schema v1.0 with full traceability
6. Row-level org_id isolation security model
7. Fail-open behavior for model failures
8. 50-unit held-out eval with 2 independent human labelers
9. Claude 3.5 Sonnet model via Anthropic API

**Key Findings:**
- ✓ Reference data deliberately leaves `amazon_condition` empty (we fill it)
- ✓ Reference data uses `uncertain` on purpose (first-class verdict)
- ✓ Two sample orgs (org_demo_alpha, org_demo_bravo) provided for isolation testing
- ✓ No worked example in repository; README says to critique it if present

**Risks Identified:**
1. Model latency impact on warehouse line (mitigation: early testing Day 2)
2. Eval dataset acquisition (mitigation: plan fixture capture for Day 4)
3. Labeler availability and agreement (mitigation: recruit early, clear rubric)
4. Cross-pod contract disagreement (mitigation: confirm with Recovery Manager by Day 5)

**Next Phase:** Face 1 (Outcome First) — Customer letter, PR/FAQ, one-pager, CLAUDE.md locked

---

### Afternoon (1:00 PM – 6:00 PM)

**Objective:** Begin Face 1 non-code artifacts

**Work Planned (NOT YET DONE):**
- [ ] Write 01-customer-letter.md (voice: prep center operator)
- [ ] Write 02-prfaq.md (hard questions about accuracy, limitations)
- [ ] Write 03-one-pager.md (metrics table, kill condition)
- [ ] Verify CLAUDE.md locked (architecture frozen)
- [ ] Submit PR for Face 1 review

**Build Log Status:** Planning documents complete and locked. Ready for implementation.

---

## Day 2: 26 Sep 2026 (Thursday)

### Morning (TBD – not yet executed)

**Objective:** Complete Face 1 artifacts and merge PR

**Planned Work:**
- [ ] Finalize 01-customer-letter.md
- [ ] Finalize 02-prfaq.md with at least 3 hard questions
- [ ] Finalize 03-one-pager.md with kill condition table
- [ ] Open PR [ruthvikgoud16] Face 1 – customer letter, PR/FAQ, one-pager
- [ ] Address code review feedback (if any)

**Success Criteria:**
- [ ] All 3 artifacts exist and are non-empty
- [ ] Kill condition is clear and measurable (e.g., "≥75% accuracy on 50-unit eval")
- [ ] Another pod confirms they understand kill condition
- [ ] No contradiction with ARCHITECTURE.md

**Blockers:** None anticipated

**Risks:** None anticipated

---

### Afternoon (TBD – not yet executed)

**Objective:** Begin Face 2 (database schema + org isolation)

**Planned Work:**
- [ ] Set up Python virtual environment
- [ ] Install dependencies (anthropic, pytest, pydantic, sqlalchemy)
- [ ] Create schema.sql with returns_manager tables
- [ ] Begin org isolation test implementation

---

## Day 3: 27 Sep 2026 (Friday)

### Morning (TBD – not yet executed)

**Objective:** Complete Face 2 verification gate

**Planned Work:**
- [ ] Finish org isolation test
- [ ] Run `pytest tests/test_isolation.py -v` → 100% pass
- [ ] Review schema for correctness
- [ ] Verify no cross-org data leakage possible

**Success Criteria:**
- [ ] Isolation test passes
- [ ] Code review: org_id on all queries
- [ ] Schema validation test passes

---

### Afternoon (TBD – not yet executed)

**Objective:** Begin Face 3 (agent implementation)

**Planned Work:**
- [ ] Capture 5–10 fixture product images
- [ ] Implement model_layer.py (Claude API call)
- [ ] Implement output validation
- [ ] Test with 1 fixture image

---

## Day 4: 28 Sep 2026 (Saturday)

### Morning – Evening (TBD – not yet executed)

**Objective:** Complete Face 3 end-to-end

**Planned Work:**
- [ ] Finish policy logic layer
- [ ] Implement full pipeline (photo → model → record)
- [ ] Test fail-open behavior (simulate timeouts, API errors)
- [ ] Run 5 fixture units through pipeline
- [ ] Verify all tests pass

**Success Criteria:**
- [ ] 5 fixture images process without errors
- [ ] Output JSON validates against schema
- [ ] Fail-open test passes (model error → pending_review, not crash)
- [ ] Latency logged and < 10s per call

---

## Day 5: 29 Sep 2026 (Sunday)

### Morning – Evening (TBD – not yet executed)

**Objective:** Begin eval set capture and Face 4 planning

**Planned Work:**
- [ ] Acquire 60–70 product photos (real or staged)
- [ ] Select 50 for held-out eval
- [ ] Create labeling rubric
- [ ] Recruit 2 independent labelers

**Success Criteria:**
- [ ] 50 held-out eval units identified
- [ ] Labeling rubric finalized and unambiguous
- [ ] 2 labelers confirmed and ready

---

## Day 6: 30 Sep 2026 (Monday)

### Morning – Afternoon (TBD – not yet executed)

**Objective:** Run agent eval and check kill condition

**Planned Work:**
- [ ] Labeler 1 completes assessment of 50 units
- [ ] Labeler 2 completes independent assessment
- [ ] Measure inter-rater agreement (kappa per check)
- [ ] Establish ground truth (resolve disagreements)
- [ ] Run agent on all 50 eval units
- [ ] Compute per-check accuracy, FP%, FN%, failure modes
- [ ] Write eval report (eval-report.md)
- [ ] Check kill condition gate

**Success Criteria:**
- [ ] Eval report complete with all metrics
- [ ] Inter-rater kappa documented
- [ ] Per-check accuracy calculated
- [ ] Decision: proceed to Face 5 or halt?

**Kill Condition Decision:**
- [ ] If accuracy ≥ 75% AND FN < 5%: proceed to Face 5
- [ ] If accuracy 60–74% or FN = 5–10%: document finding, consider pivot
- [ ] If accuracy < 60% or FN > 10%: halt and document as project finding

---

### Evening (TBD – not yet executed)

**Objective:** Begin Face 5 UI (conditional on eval passing)

**Planned Work:**
- [ ] Design evidence record display mockup
- [ ] Implement simple web UI (Flask/FastAPI)
- [ ] Implement override capture

**Success Criteria:**
- [ ] UI renders sample record without errors
- [ ] Override captured and persisted

---

## Day 7: 1 Oct 2026 (Tuesday, DEADLINE 6:00 PM IST)

### Morning (TBD – not yet executed)

**Objective:** Complete Face 6 and final submission

**Planned Work:**
- [ ] Finalize cross-pod contract (contract/returns_manager_output.md)
- [ ] Implement API endpoint GET /api/v1/returns/{record_id}
- [ ] Create final README.md
- [ ] Record demo video (5 minutes)
- [ ] Update build-log.md with final status

**Success Criteria:**
- [ ] API endpoint working and tested
- [ ] Demo video complete (customer → checks → record → live demo → kill condition)
- [ ] README runnable by unfamiliar engineer
- [ ] All tests passing: `pytest tests/ -v`

---

### Afternoon – Evening (TBD – not yet executed)

**Objective:** Final push and merge before deadline

**Planned Work:**
- [ ] Verify isolation test passes one final time
- [ ] Scan for secrets (API keys, .env in repo)
- [ ] Merge PR to main branch
- [ ] Confirm all deliverables in main branch
- [ ] Post to LinkedIn

**Deadline Verification:**
- [ ] All work merged to main branch by 1 Oct 6:00 PM IST
- [ ] build-log.md updated with final status
- [ ] Demo video in submissions/ruthvikgoud16/

---

## Key Metrics (To Be Updated Daily)

| Metric | Target | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 | Day 6 | Day 7 |
|---|---|---|---|---|---|---|---|---|
| Tests passing | 100% | TBD | TBD | TBD | TBD | TBD | TBD | ✓ |
| Org isolation test | PASS | TBD | TBD | TBD | TBD | TBD | TBD | ✓ |
| Model latency (p95) | < 5s | — | TBD | — | TBD | — | TBD | TBD |
| Eval accuracy | ≥ 75% | — | — | — | — | — | TBD | TBD |
| Eval FN rate | < 5% | — | — | — | — | — | TBD | TBD |
| Code coverage | ≥ 70% | — | TBD | — | TBD | — | TBD | ✓ |
| Failures logged | 100% | — | — | — | TBD | — | TBD | ✓ |
| Fixtures processed | 5–50 | — | — | 5 | 5 | — | 50 | 50 |

---

## Decisions Made

### D1: Single-Batch Model Call (Day 1, Morning)
**Decision:** One multimodal call per unit analyzes all 4 checks.  
**Alternatives:** Sequential per-check calls (cost too high), parallel independent calls (complex orchestration)  
**Reason:** Engineering rule 2 (batch); margin optimization  
**Impact:** Simpler implementation, better consistency, lower cost  
**Status:** ✓ LOCKED

### D2: Observed State → Condition Mapping (Day 1, Morning)
**Decision:** Model takes observed_state + photos → outputs Amazon condition grade.  
**Mapping:** factory_sealed→Like New, opened_unused→Very Good, signs_of_use→Good, damaged→Acceptable, empty_box→Cannot Grade  
**Reason:** Model has visual context; Amazon publishes official grades  
**Impact:** Output deterministic given model output  
**Status:** ✓ LOCKED

### D3: Visual Evidence Only (Day 1, Morning)
**Decision:** In-scope: product identity, visible components, condition, damage. Out-of-scope: electronics, battery, internals.  
**Reason:** Vision models strong at visual classification; warehouse workflow is visual-first  
**Impact:** Scopes down possibility space; aligns with organizer guidance  
**Status:** ✓ LOCKED

[Continue daily updates below as work progresses]

---

## Blockers & Resolutions

| Date | Blocker | Resolution | Status |
|---|---|---|---|
| — | None so far | — | — |

---

## Test Results

| Test | Target | Result | Notes |
|---|---|---|---|
| Isolation test | PASS | TBD | Must pass before deploy |
| Schema validation | PASS | TBD | 100% coverage on invalid inputs |
| Fail-open | PASS | TBD | Timeout + API error scenarios |
| Model call | < 5s | TBD | p95 latency |
| Code coverage | ≥ 70% | TBD | pytest --cov |

---

## Notes for Reviewers

**Architecture is locked.** No further changes to CLAUDE.md, ARCHITECTURE.md, or DECISIONS.md without explicit approval.

**Build log is live.** Check back daily for progress updates.

**Kill condition is clear.** We halt and document honestly if accuracy < 60% or FN > 10%.

---

## 1 Oct 2026 — grading and freeze

The notes above from 25 Sep are the planning log. They are not a claim that those planned steps all finished that day. What follows is what happened on the evaluation run.

An earlier `collection/runFifty.ts` pass treated a bad or empty-looking Drive listing as “no photo”, saved `missing_image` with `calls: 0`, and later runs skipped those rows. Photos for many products were also in the `02 — PHOTOS` folder itself, not only in the FRONT/BACK subfolders. That pass was stopped. Those false rows were removed. The grader was changed so a missing photo is recorded only after the product folder, the photos folder, and the listing all succeed and the listing contains zero images. Drive and download failures retry, then stay `ingestion_retry`, with no model call. Cases that already had a real grade were not sent to the model again.

The final file, `collection/export/fifty/results.json`, has 50 rows, no duplicate case ids, 47 grades at one model call each, and three genuinely no-photo cases: RTN-017, RTN-026, RTN-032. Ingestion errors in that final file: 0. Model errors: 0. Persisted meter: 147,613 input tokens, 18,285 output tokens, about $0.72 at the script’s rates. Dispositions on the 47 grades: restock 38, pending_review 8, refurbish 1 (RTN-007), liquidate 0, dispose 0.

On the 40 agreed cases that have a model grade, identity matched 37/40 (92.5%), completeness 30/40 (75.0%) with 2 false positives and 0 false negatives, and condition 17/40 (42.5%). Condition is the weak check. The usual miss is one Amazon used step, most often agent `used_like_new` where both labelers said `used_very_good`. Seven disagreements were excluded: RTN-002, RTN-005, RTN-006, RTN-009, RTN-013, RTN-037, RTN-044. Disposition was not labeled. Cohen’s kappa was not computed. `npm run eval:score` also prints 37/43, 30/43, and 17/43 because it keeps the three no-photo rows in the denominator. Those are not the model-performance figures. The report is `submissions/ruthvikgoud16/eval-report.md`. A checksummed copy is `eval/frozen/2026-10-01T1015Z/`.

Lesson: a failed Drive list must not look like an empty folder, or resume will skip the unit forever and the score will treat a missing call as a result. The model’s condition grade is optimistic relative to these two labelers, and that is a measured limit, not a number to shop for with another pass.

