# Build Brief: Returns Manager

**Prepared by:** ruthvikgoud16 (Lead Architect)  
**Version:** 1.0 (Phase 1)  
**Deadline:** 1 October 2026, 6:00 PM IST  
**Evaluation Period:** 2–3 October 2026

---

## The Customer

**Who:** Prep centers and return fulfillment operators at e-commerce sellers

**Their Day:**
- Parcel arrives with a return
- 20–30 seconds to: identify product, check completeness, assess damage, decide: restock / refurbish / liquidate / dispose
- Today: untrained operator makes a guess, nothing is recorded
- Tomorrow: our agent makes the call in 2–4 seconds, records everything

**What They Need:**
1. **Speed:** Decision in <5 seconds (model + validation + UI)
2. **Reliability:** Never blocks the line (fail-open)
3. **Clarity:** Sees the reasoning, can override if needed
4. **Traceability:** Record is audit-ready; what was recorded is what was decided
5. **Honesty:** Agent admits uncertainty; doesn't confidently guess

---

## The Business Case

**The Problem:**
- Returns go to liquidation (bulk discount) by default, even when they could be restocked
- Moving 5–10% of returns from liquidation to restock is direct margin recovery
- Today's decisions are inconsistent (operator-dependent, shift-dependent)

**The Bet:**
- Vision model can identify product, check components, and grade condition from photos
- This classification is ~80% accurate on new SKUs it hasn't seen before
- More accurate and consistent than operator guesswork

**Success Metric (Measurable Kill Condition):**
- Agent produces measurable per-check verdicts on held-out eval set
- True evaluation will determine performance baseline
- Kill condition will be refined after initial evaluation demonstrates accuracy range
- We commit to honest reporting: if accuracy is low or edge cases dominate, we document that finding

**Research Hypothesis:**
- Vision models can identify product and grade condition from photos
- We don't know yet if this reaches warehouse-acceptable accuracy
- Finding this out is part of the research

---

## What We're Building

**One focused, specialized agent:**
- Takes 2–3 photos of a returned product
- Calls Claude 3.5 Sonnet multimodal model ONCE (not 4 times)
- Outputs structured decision record with evidence
- Decision states: PASS / FAIL / UNCERTAIN / PENDING_REVIEW
- UI: operator sees verdict + reasoning, can override

**NOT building:**
- Multi-agent orchestration
- Electronic testing (battery, circuit boards, etc.)
- Warehousing system integration (that's Pod 1–3, 5)
- Mobile app (can prototype on web for demo)

---

## Scope Boundary (Hard Constraints)

**We Assess (Visual Evidence Only):**
- ✓ Product identity (ASIN/SKU from appearance)
- ✓ Visible accessories (cables, manuals, boxes)
- ✓ Missing components (can we see it was supposed to be there?)
- ✓ Physical condition (scratches, dents, damage)
- ✓ Packaging integrity (sealed, tampered, crushed)

**We Don't Assess:**
- ✗ Electronic functionality
- ✗ Battery health
- ✗ Internal components
- ✗ Performance metrics
- ✗ Counterfeits (beyond visual holograms)

**Why This Boundary:**
- Vision models excel at visual classification
- Warehouse workflow is visual-first
- Testing electronics requires hardware on-site
- Organizer confirmed: "physically visible parts"

---

## Engineering Principles (Non-Negotiable)

**1. Single-Batch Model Call**
- ONE call per unit analyzes all 4 checks (identity, completeness, condition, disposition)
- Not: identity call → completeness call → condition call → disposition call
- Why: Cost, latency, margin

**2. Fail-Open**
- Model timeout? Record saved, marked `pending_review`, operator not blocked
- API error? Retry, then fail-open
- Missing images? Process what we have, reduce confidence
- Never: operator blocked by agent failure

**3. Uncertain ≠ Low-Confidence Pass**
- If model genuinely uncertain: return UNCERTAIN verdict
- Not: return PASS with 40% confidence
- Operator needs honest signal: "I don't know" vs. "I think yes"

**4. Evidence-Backed Every Verdict**
- Every check must cite which photo(s) support it
- Enables operator review and audit trail
- "I can't see the manual in any photo" > "probably missing manual"

**5. Tenancy Isolation First**
- Every table has org_id
- Every query filters by org_id
- Automated test: org_A cannot read org_B data
- No lazy assumptions

**6. Honest Reporting**
- We report what we built, not what it sounds like
- Content hash ≠ tamper-proof
- Uncertain cases documented, not hidden
- FP and FN reported separately

---

## Success Criteria

## Success Criteria and Evaluation Gates

### Critical Path (Must Complete)
- [ ] Agent processes fixtures and produces structured output
- [ ] Org isolation test passes (no cross-org data leakage)
- [ ] Evaluation: 50-unit held-out set captured
- [ ] Evaluation: 2 independent human labelers assess units
- [ ] Evaluation: per-check accuracy computed (identity, completeness, condition, disposition)
- [ ] Evaluation: false positives and false negatives tracked separately
- [ ] Evaluation: UNCERTAIN rate documented
- [ ] Evaluation: failure modes categorized
- [ ] Demo video recorded (5 minutes)
- [ ] All work merged by 1 Oct 6:00 PM IST

### Evaluation Methodology (Measurement First, Thresholds Second)
- Measure per-check accuracy on 50 held-out units with 2 independent human labels
- Compute inter-rater agreement (Cohen's kappa)
- Report accuracy breakdown for each of 4 checks
- Report false positive rate separately
- Report false negative rate separately
- Document UNCERTAIN rate
- Categorize failure modes by root cause
- **Kill condition will be refined after initial baseline is established**
- If accuracy is low, document as research finding (valid outcome)

### Nice-to-Have (Time Permitting)
- [ ] UI polish on mobile
- [ ] Batch processing API
- [ ] Historical trending

---

## Timeline: 25 Sep → 1 Oct (7 Days)

```
Day 1 (25 Sep, Wed)
  ├─ 9:00 AM: Build starts
  ├─ Morning: Audit + planning (this phase)
  ├─ Afternoon: Submit Face 1 artifacts (customer letter, PR/FAQ, one-pager, CLAUDE.md)
  └─ Evening: Code review feedback, plan Face 2

Day 2–3 (26–27 Sep, Thu–Fri)
  ├─ Morning: Org isolation test + database schema
  ├─ Afternoon: Model layer + API client (Claude)
  ├─ Evening: Fixture image setup (10–15 products)
  └─ Verify: Single-batch call works on fixtures

Day 4–5 (28–29 Sep, Sat–Sun)
  ├─ Morning: Persistence layer + evidence record schema
  ├─ Afternoon: Policy logic + disposition rules
  ├─ Evening: Fail-open behavior + retry logic
  └─ Verify: Full pipeline: photo → model → record → database

Day 6 (30 Sep, Mon)
  ├─ Morning: Evidence record display (UI draft)
  ├─ Afternoon: Override capture
  ├─ Evening: Eval set capture (50 units) or acquire stock photos
  └─ Verify: Operator can see record + override

Day 7 (1 Oct, Tue, **Deadline 6:00 PM IST**)
  ├─ Morning: Eval runs (50 units vs. 2 human labels)
  ├─ Afternoon: Write eval report (per-check metrics, FP, FN, failure modes)
  ├─ Evening: Demo video (5 min), README, final push
  └─ **Merge by 6:00 PM IST**
```

---

## Faces & Milestones

| Phase | Deliverable | Definition of Done | Risk |
|---|---|---|---|
| **Face 1** | Customer letter, PR/FAQ, one-pager, CLAUDE.md | Non-code artifacts; kill condition stated | Underestimating accuracy bar |
| **Face 2** | Isolation test + schema | Org isolation test passes green | DB schema mismatch with recovery pod |
| **Face 3** | Headless agent on fixtures | CLI runs; 5 fixture images processed end-to-end | Model API latency, token limits |
| **Face 4** | Eval report | 50-unit eval, 2 human labels, per-check metrics | Fixture capture effort, labeler availability |
| **Face 5** | Evidence UI + overrides | Operator sees record, can override | UI polish time vs. core functionality |
| **Face 6** | Cross-pod contract | JSON spec ready for Recovery Manager | Contract disagreement with other pod lead |

---

## Key Decisions Already Locked

1. **Model:** Claude 3.5 Sonnet (Anthropic API)
2. **Calls:** 1 batched call per unit (not 4 sequential)
3. **Scope:** Visual evidence only (no electronics)
4. **Verdict States:** PASS, FAIL, UNCERTAIN, PENDING_REVIEW
5. **Eval:** 50-unit held-out set, 2 human labelers
6. **Accuracy Bar:** ≥75% (kill condition: <60%)
7. **Architecture:** Model → Validation → Policy → Record

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Model latency > 5s per call | Warehouse line slowdown | Pre-cache model calls, use batch API if available |
| Accuracy < 60% on unseen SKUs | Kill condition; project halted | Early eval (Day 4) with small set; pivot if needed |
| Cannot find 50 eval fixtures | Cannot measure rigorous | Use existing e-commerce product photos, stage scenarios |
| Org isolation test regression | Security breach | Automated test on every deploy + code review gate |
| Recovery Manager contract disagreement | Integration failure | Confirm contract by Day 5; no last-minute changes |
| API key leak | Revocation, security incident | Use .env, .gitignore, no secrets in code |
| Labeler disagreement (kappa < 0.6) | Ground truth unclear | Recruit 2 independent labelers; if disagreement, use arbiter |

---

## Evaluation Methodology (High Level)

**Phase 1: Fixture Capture**
- Acquire 60–70 real product photos (or stage returns)
- Select 50 for held-out eval; reserve 10–20 for dev

**Phase 2: Human Labeling**
- Labeler 1: assess all 50 units independently
- Labeler 2: assess all 50 units independently
- Compare labels, resolve disagreements

**Phase 3: Agent Evaluation**
- Agent processes all 50 eval units
- Compare agent output vs. ground truth
- Compute: per-check accuracy, FP rate, FN rate, UNCERTAIN distribution

**Phase 4: Report**
- metric: Identity accuracy (%)
- metric: Completeness accuracy (%)
- metric: Condition accuracy (%)
- metric: Disposition accuracy (%)
- metric: False-positive rate (%) — agent says OK when should be NO
- metric: False-negative rate (%) — agent says NO when should be OK
- failure_modes: categorized by root cause (lighting, partial visibility, edge case, data quality)

---

## Definitions

**PASS:** Agent and all judges agree verdict is acceptable  
**FAIL:** Agent and judges disagree, or judges don't agree  
**UNCERTAIN:** Agent correctly identifies ambiguity  
**FP (False Positive):** Agent says PASS, judges say FAIL  
**FN (False Negative):** Agent says FAIL, judges say PASS

---

## Cross-Pod Contract (Minimal)

**Output:** JSON record consumable by Recovery Manager (Pod 5)

**Fields Recovery Manager needs:**
- `unit_id`, `org_id`, `order_id`
- `identity.verdict` + confidence
- `completeness.verdict` + confidence
- `condition.verdict` + confidence
- `disposition.verdict` + confidence
- `status` (completed / pending_review)
- `overrides[]` (if operator changed decision)

Recovery Manager does NOT read our UI; it reads JSON.

---

## Success Beyond Accuracy

- **Honesty:** Report what we built, uncertainties included
- **Reproducibility:** Someone else can run the same eval and get similar results
- **Maintainability:** CLAUDE.md, ARCHITECTURE.md, code is clear
- **Documentation:** README, demo video explain the system to a non-engineer

---

## What We're NOT Doing

- ❌ Multi-agent orchestration (overkill)
- ❌ Per-SKU fine-tuning (organizer said unseen SKUs)
- ❌ Hardware integration (no access to warehouse)
- ❌ Scaling to 1000s of orgs (MVP for 2 test orgs)
- ❌ Real-time BI dashboards
- ❌ Mobile app (web for demo is enough)

---

## Definition of Done

**The project is done when:**
1. ✓ Agent runs on fixtures, produces records
2. ✓ Org isolation test passes
3. ✓ Eval report filed: per-check accuracy, FP, FN, failure modes
4. ✓ Demo video (5 min): customer → checks → record → live demo → kill condition
5. ✓ README explains what was built and what was not
6. ✓ ARCHITECTURE.md documents decisions
7. ✓ CLAUDE.md locked; no further architecture changes
8. ✓ All code merged to main by 1 Oct 6:00 PM IST
9. ✓ LinkedIn post published (project announcement)

**Definition of NOT done:**
- ❌ "It works" without measured accuracy
- ❌ Code without tests
- ❌ Accuracy claim without failure mode breakdown
- ❌ Demo without agent actually running

