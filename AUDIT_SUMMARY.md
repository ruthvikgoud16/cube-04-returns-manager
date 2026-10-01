# Phase 1 Audit Summary: RTN Repository & Planning (RECONCILED)

**Audit Completed:** 25 Sep 2026, 12:30 PM IST  
**Reconciliation Gate Completed:** 25 Sep 2026, 1:15 PM IST  
**Auditor:** Lead Architect (ruthvikgoud16)  
**Status:** ✓ RECONCILIATION COMPLETE — Ready for Face 1 (Non-code artifacts)

---

## 1. Verified Facts from Official Sources

**From README.md (Problem Statement):**
- RTN is Step 4 of 5 in the product return chain
- Agent receives 2–3 photos of a returned item
- Agent must decide: identity, completeness, condition, disposition
- Four disposition options: restock, refurbish, liquidate, dispose
- Evidence-backed decisions required
- Output consumed by Recovery Manager (Pod 5)

**From RULES.md (Engineering Rules):**
- E1: Tenancy isolation before any feature
- E2: Batch model calls (implied: not sequential per-check)
- E3: Fail-open behavior (model errors don't block operator)
- E4: UNCERTAIN is a valid verdict (not low-confidence PASS)
- E5: Look authoritative rules up (don't infer from examples)

**From data/README.md (Reference Data):**
- Sample CSV has two orgs (org_demo_alpha, org_demo_bravo) for isolation testing
- `observed_state` is filled (6 values); `amazon_condition` is deliberately empty (we populate it)
- `uncertain` appears as value on purpose (first-class state)
- Data is synthetic; requirement flags and fees are dummy values

**From GITHUB-GUIDE.md:**
- Branch name = GitHub username (ruthvikgoud16)
- Changes only in `submissions/<username>/`
- Pull requests required; no direct pushes to main
- CODEOWNERS enforces organizer review

---

## 2. Organizer-Confirmed Clarifications (Do Not Ask Again)

**5 Confirmed Clarifications from Brief:**

1. **Participants may define their own scope boundaries**
   - Source: Organizer clarification (Nandan/Sydon)
   - We will define explicit visual-evidence-only boundary
   - Verified in brief: "Participants may define their own boundaries"

2. **Completeness approaches may vary by desired complexity/accuracy**
   - Source: Organizer clarification
   - Different strategies acceptable
   - Not all rules forced

3. **Current focus is physically visible parts, not electronic functionality**
   - Source: Organizer clarification
   - Out-of-scope: battery health, internal components, performance testing
   - Verified: "Current scope is focused on physically visible parts"

4. **Participants encouraged to define boundaries and develop novel ideas**
   - Source: Organizer clarification
   - Creative architecture permitted within engineering rules

5. **Participants can create their own evaluation dataset**
   - Source: Organizer clarification
   - We will build 50-unit held-out set with 2 independent human labels
   - Verified: "Participants can create their own evaluation dataset"

**These are CLOSED questions. Do not re-ask them.**

---

## 3. Engineering Decisions Made (Separate from Requirements)

**9 Engineering Decisions Documented in DECISIONS.md:**

| # | Decision | Status | Rationale |
|---|---|---|---|
| D1 | Single-batch multimodal call per unit | ✓ Approved | Engineering rule 2; cost/latency optimization |
| D2 | observed_state → amazon_condition via model | ✓ Approved | Model has visual context; use authoritative grades |
| D3 | Visual evidence only scope | ✓ Approved | Aligns with organizer clarification; warehouse workflow reality |
| D4 | Four-state verdicts (PASS/FAIL/UNCERTAIN/PENDING_REVIEW) | ✓ Approved | Engineering rule 4; honest uncertainty handling |
| D5 | Evidence record JSON schema v1.0 | ✓ Approved | Baseline for downstream consumption; provisional until official spec |
| D6 | Row-level org_id isolation on every query | ✓ Approved | Engineering rule 1; automatic enforcement |
| D7 | Fail-open behavior (error → pending_review, never blocks) | ✓ Approved | Engineering rule 3; warehouse line never stops |
| D8 | 50-unit eval, 2 independent human labelers | ✓ Approved | Handbook requirement; rigorous measurement |
| D9 | Model selection strategy (OPEN) | ⊘ Open | Not CUBE-mandated; to be decided during fixture testing |

**Key Point:** D1–D8 are approved engineering decisions based on organizer requirements or clarifications. D9 is explicitly OPEN and will be determined after testing candidate models on fixtures.

---

## 4. Open Questions Requiring Clarification

**5 Unresolved Questions (Not Blocking):**

| Q | Question | Status | Impact |
|---|---|---|---|
| Q1 | What exactly is "unseen" for evaluation? (images vs. units vs. SKUs) | OPEN | May affect fixture capture scope |
| Q2 | What are Amazon's authoritative condition grades? | TENTATIVE | Assumed: Like New, Very Good, Good, Acceptable, Factory Sealed |
| Q3 | Product identity scope? (variants, counterfeits, serial numbers) | TENTATIVE | Assumed: visual ASIN match primary; variants/counterfeits out-of-scope |
| Q4 | Completeness for empty box? | TENTATIVE | Assumed: UNCERTAIN, needs review |
| Q5 | Recovery Manager contract format and fields? | OPEN | Assumed: JSON; must finalize by Day 5 |

**These are documented but not blocking implementation. Tentative assumptions are in place.**

---

## 5. Contradictions and Findings in Source Materials

**3 Contradictions Identified and Resolved:**

| Contradiction | Resolution | Status |
|---|---|---|
| observed_state vs. amazon_condition | Two separate columns: observation vs. authoritative grade | ✓ Resolved |
| Fail-open + empty amazon_condition | Set to NULL, mark pending_review, preserve observed_state | ✓ Resolved |
| UNCERTAIN as observation vs. verdict | Primarily an output verdict; can appear as input observation | ✓ Resolved |

**None of these block implementation. All have working resolutions documented.**

---

## 6. Approved Architecture Baseline

**NOT locked. Subject to change if justified.**

**Component Architecture:**
```
Photo input → API gateway (auth + org check)
    ↓
Image preparation (load, validate, hash)
    ↓
Model call (ONE batched call per unit analyzing all 4 checks)
    ↓
Output parsing + schema validation
    ↓
Deterministic policy logic (disposition rules applied post-model)
    ↓
Evidence record created (all data captured)
    ↓
Persistence (database with org_id isolation)
    ↓
Response + UI display
    ↓
Operator review (can override)
    ↓
Final record with any overrides
```

**Critical Principles:**
- ✓ One model call per unit (not sequential)
- ✓ Model reasons about 4 checks together
- ✓ Disposition is policy logic, not model output
- ✓ UNCERTAIN is first-class verdict
- ✓ Fail-open: model failure → pending_review, operator never blocked
- ✓ Org isolation enforced at query layer on every request
- ✓ Evidence record captures everything (model version, timestamps, overrides)

**Model Selection:**
- OPEN. Not pre-determined.
- Candidates: Claude, GPT-4, LLaVA, Gemini
- Will evaluate on 5 fixture images during Face 3
- Choose based on actual performance

---

## 7. Evaluation Methodology

**Measurement-First Approach (No Pre-Determined Thresholds):**

**Phase 1: Fixture Capture**
- Acquire 60–70 real product photos (or stage return scenarios)
- Freeze 50 units as held-out eval (never seen during dev)
- Reserve 10–20 for debugging

**Phase 2: Human Baseline**
- 2 independent labelers assess all 50 units independently
- Measure inter-rater agreement (Cohen's kappa per check)
- Resolve disagreements to establish ground truth

**Phase 3: Agent Evaluation**
- Run agent on all 50 eval units
- Compare agent output vs. ground truth

**Phase 4: Metrics (Reported Separately)**
- Per-check accuracy (identity, completeness, condition, disposition)
- False positive rate (agent says pass when should fail)
- False negative rate (agent says fail when should pass)
- UNCERTAIN rate (how often agent declines to decide)
- Failure modes: categorized by root cause

**Kill Condition Gate:**
- Refined after baseline evaluation
- If accuracy insufficient: document as research finding (valid outcome)
- If org isolation fails: halt immediately
- If agent produces correct structured output: proceed

**No Pre-Set Thresholds.** Thresholds will be determined based on what the baseline evaluation reveals about accuracy distribution and warehouse requirements.

---

## 8. Security and Tenancy Strategy

**Row-Level Organization Isolation (Enforced Before Any Features):**

**Implementation:**
- Every table has `org_id` column
- Every query includes `WHERE org_id = @org_id` filter
- Auth middleware extracts org_id before any business logic
- No cross-org queries possible

**Test Verification:**
```python
def test_org_isolation():
    org_a_record = create_record(org_id="org_demo_alpha", ...)
    org_b_record = create_record(org_id="org_demo_bravo", ...)
    
    # org_A cannot read org_B
    with set_auth_context("org_demo_alpha"):
        results = list_records()
        assert all(r.org_id == "org_demo_alpha")
    
    # org_B cannot read org_A
    with set_auth_context("org_demo_bravo"):
        results = list_records()
        assert all(r.org_id == "org_demo_bravo")
```

**Mandatory Before Feature Work:**
- Isolation test must pass before Face 2 PR opens
- Test runs on every deploy
- No exception for time pressure

---

## 9. Fail-Open Behavior Strategy

**Principle: Operator never blocked; record always created.**

**Failure Scenarios and Responses:**

| Failure | Detection | Action | Result |
|---|---|---|---|
| Model timeout (>30s) | TimeoutError | Log, mark pending_review | Record saved for human review |
| API rate limit | 429 HTTP | Retry 3x with backoff; if still fails → pending_review | Handled gracefully |
| Malformed JSON | JSONDecodeError | Log error detail | Record saved, pending_review |
| Missing images | FileNotFoundError | Proceed with available images; reduce confidence | Partial evidence captured |
| No images | 0 images submitted | Return UNCERTAIN on all checks | Pending_review, reason="no_images" |
| Network error | ConnectionError | Retry 3x; if still fails → pending_review | Not silent failure |

**Flow Guarantee:**
```
Try: model call → validation → policy → record creation
  Result: status="completed"
  
Except AnyError:
  Log error
  Mark status="pending_review"
  Save all available data
  
Finally:
  Always return record (never block)
  Always persist (never lose evidence)
```

---

## 10. Current Project Risks

| Risk | Severity | Mitigation | Check-In |
|---|---|---|---|
| Model accuracy on unseen SKUs | HIGH | Research hypothesis; measurement will tell us | Day 6 |
| Fixture capture effort | MEDIUM | Acquire stock photos early; backup with staged | Day 4 |
| Labeler agreement (kappa < 0.6) | MEDIUM | Recruit experienced; define rubric clearly | Day 5 |
| 7-day timeline (tight) | HIGH | Daily milestones; no scope creep | Every day |
| Org isolation regression | HIGH | Automated test on every commit | Every commit |
| Model API availability | MEDIUM | Have 2 candidate models ready | Day 3 |
| Cross-pod contract disagreement | MEDIUM | Confirm with Recovery Manager by Day 5 | Day 5 |

---

## 11. Next Implementation Gate: Face 1

**What Happens Next:**

1. **Write non-code artifacts (Days 1–2):**
   - 01-customer-letter.md (operator's voice describing problem)
   - 02-prfaq.md (hard questions about accuracy, limitations, edge cases)
   - 03-one-pager.md (metrics table, measurable kill condition statement)

2. **Verification Gate for Face 1:**
   - All 3 artifacts exist and are non-empty
   - Kill condition is stated clearly (may reference evaluation methodology)
   - Another pod reads one-pager and can restate the kill condition back to you
   - No contradiction with ARCHITECTURE.md
   - PR opened and merged to main

3. **Face 2 (Cannot start until Face 1 merged):**
   - Org isolation test implementation
   - Database schema + validation
   - Auth middleware

**Face 1 Purpose:** Write the customer story and success criteria before any code.

**Do NOT begin application implementation until Face 1 is complete and merged.**

---

## Reconciliation Summary

**What Changed After Reconciliation Gate:**

1. **D9 (Model Selection)** — Changed from ✓ CONFIRMED to ⊘ OPEN
   - Removed: "Claude 3.5 Sonnet locked"
   - Added: Model selection is engineering decision, not organizer requirement
   - Plan: Evaluate candidates on fixtures during Face 3

2. **BUILD_BRIEF.md Kill Conditions** — Removed invented numeric thresholds
   - Removed: "≥75% accuracy"
   - Removed: "<60% accuracy"
   - Removed: ">10% FN rate"
   - Added: Measurement-first approach; thresholds determined after baseline

3. **Architecture Status** — No "locked" claims
   - Retained: "Approved baseline"
   - Added: "Subject to change if justified"
   - Added: Change process (record in DECISIONS.md)

4. **Test Coverage** — Removed invented 70% threshold
   - Kept: Critical verification areas (isolation, fail-open, schema)
   - Removed: Numeric coverage requirement

5. **AUDIT_SUMMARY.md** — Reorganized into 11 required sections
   - Added: Verified facts section
   - Added: Open questions section (not blocking)
   - Added: Contradictions resolved
   - Separated: Decisions from requirements

**Status:** All reconciliation items addressed. No invented requirements remain in control documents.

---

## Final Verification

**All control documents are now compliant with:**
- ✓ Official CUBE source hierarchy (README > RULES > data > handbook)
- ✓ Organizer clarifications (5 confirmed, marked as such)
- ✓ No invented numeric thresholds
- ✓ Architecture is "baseline" not "locked"
- ✓ Model selection is "open" not "confirmed"
- ✓ Disposition is policy logic, not part of model call
- ✓ Evaluation is measurement-first, not threshold-first
- ✓ All contradictions in sources are resolved
- ✓ Failure modes documented honestly

**Next action:** Proceed to Face 1 (non-code artifacts).

