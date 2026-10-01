# RTN Engineering Decisions

**Document Purpose:** Track all significant engineering decisions made during Phase 1 planning. Separate from CLARIFICATIONS.md (which tracks unresolved questions) and REQUIREMENTS_REGISTER.md (which tracks sourced requirements).

**Format:** Each decision records the problem, alternatives considered, chosen approach, rationale, impact, and verification method.

---

## D1: Single-Batch Multimodal Architecture

**Problem:** Engineering rule 2 requires batching model calls for cost/efficiency. Should we call the model once per unit or separately for each check (identity, completeness, condition, disposition)?

**Alternatives Considered:**
1. **Single call** — one multimodal input analyzing all 4 checks, returns structured output
2. **Sequential calls** — separate call for identity, then completeness, then condition, then disposition
3. **Hybrid** — parallel calls for independent checks, sequential for dependent checks

**Chosen Approach:** Single batched call per unit

**Rationale:**
- Engineering rule 2 explicitly mandates batching for margin/cost
- Single call provides consistent reasoning across all checks (e.g., condition influences identity/completeness assessment)
- Simpler implementation, fewer API roundtrips, lower latency
- More defensible for "one agent makes the call" principle
- Reduces tokens spent on context switching between model calls

**Impacts:**
- ✓ Lower API cost (1 call vs 4)
- ✓ Lower latency (1 call vs 4)
- ✓ Better context consistency
- ✗ More complex prompt engineering (all checks in one prompt)
- ✗ Harder to isolate which check failed if model errors

**Verification:**
- Code review: confirm no multiple sequential calls per unit
- Audit logs: verify one call per record
- Cost monitoring: compare actual calls to units processed

**Status:** ✓ CONFIRMED (organizer clarification already validates this)

**Affected Components:** 
- Model layer (agent.py)
- Prompt engineering (system prompt)
- Output parsing (structured output handler)

---

## D2: Observed State → Amazon Condition Mapping

**Problem:** The sample data has two condition fields:
- `observed_state` (6 values): factory_sealed, opened_unused, signs_of_use, damaged, empty_box, uncertain
- `amazon_condition` (empty): we must populate with authoritative Amazon grades

How do we map from observations to official grades?

**Alternatives Considered:**
1. **Direct mapping** — observation state directly maps to Amazon grade (factory_sealed → Like New, etc.)
2. **Model decision** — model decides which Amazon grade based on observed state + photos
3. **Hybrid** — model sees observation + photos, outputs Amazon grade

**Chosen Approach:** Model-informed mapping

Observation + photos → model inference → Amazon condition grade

Mapping table:
| Observed State | Amazon Condition | Rationale |
|---|---|---|
| factory_sealed | Like New | Sealed, never used |
| opened_unused | Very Good | Opened but no signs of use |
| signs_of_use | Good | Used but functional, no damage |
| damaged | Acceptable | Functional but has visible damage |
| empty_box | Cannot grade | No product to assess; flag for review |
| uncertain | Uncertain | Cannot determine from photos |

**Rationale:**
- Amazon publishes condition grades; we must use theirs (Engineering rule 5)
- Model has context (visual evidence) that deterministic mapping lacks
- Photos can override observation (e.g., "opened_unused" observed but photos show heavy scratching → Good instead of Very Good)
- Keeps deterministic policy rules separate from model reasoning

**Impacts:**
- ✓ Uses authoritative Amazon grades
- ✓ Model-informed decisions
- ✓ Visual evidence drives grading
- ✗ Requires model to output enum-constrained values
- ✗ Edge case: empty_box requires special handling

**Verification:**
- Eval: compare model-assigned grades vs. 2 human labelers for agreement
- Manual spot-check: 10 units where observed_state ≠ model's Amazon condition

**Status:** ✓ CONFIRMED

**Affected Components:**
- Model prompt (condition grading rules)
- Output schema (amazon_condition field)
- Evidence record (condition section)

---

## D3: Explicit Scope Boundary: Visual Evidence Only

**Problem:** The organizer encourages defining our own scope boundaries. What is in-scope for visual RTN assessment?

**In-Scope:**
- Visual product identity (ASIN/SKU matchable from appearance)
- Visible physical components (accessories, cables, manuals)
- Visible component absence (can see item is missing from packaging)
- Visible physical condition (scratches, dents, stains, tears)
- Visible damage (broken, warped, stained beyond use)
- Packaging/seal integrity (factory sealed, tampered, crushed)
- Overall presentability (surface-level condition for resale)

**Out-of-Scope:**
- Electronic functionality (does it turn on, charge, connect)
- Battery health (capacity, charge cycles, degradation)
- Internal components (circuit boards, sensors, mechanical parts not visible)
- Hidden defects (water damage internally, cracks inside)
- Performance testing (speed, accuracy, audio quality)
- Authenticity verification beyond visual (serial numbers, holograms, materials lab testing)
- Software/firmware versions
- Cosmetic-only (not relevant to disposition)

**Rationale:**
- Vision models excel at visual pattern recognition, weak at electronics/software assessment
- Warehouse operators make fast visual calls; we automate that workflow
- Testing electronics requires hardware equipment not available at return inspection point
- Organizer confirmed "physically visible parts, not electronic functionality"

**Impacts:**
- ✓ Clear scope prevents scope creep
- ✓ Aligns with warehouse workflow reality
- ✓ Achievable with vision-only model
- ✗ May miss some valid disposition signals (broken buttons, but no visual indication)
- ✗ Limitation must be documented clearly

**Verification:**
- ARCHITECTURE.md documents boundary explicitly
- Model prompt includes "visual evidence only" instruction
- Eval failures categorized by: visual ambiguity, out-of-scope checks, data quality

**Status:** ✓ CONFIRMED

**Affected Components:**
- Model system prompt
- ARCHITECTURE.md
- Eval failure mode categorization

---

## D4: Decision States: PASS / FAIL / UNCERTAIN / PENDING_REVIEW

**Problem:** Engineering rule 4 requires treating UNCERTAIN as a first-class verdict. How do we represent all possible decision states?

**Chosen State Machine:**

| State | Meaning | When Used |
|---|---|---|
| PASS | Check confirmed; evidence supports positive result | Identity confirmed, completeness OK, condition acceptable, appropriate disposition |
| FAIL | Check confirmed failed; evidence clear | Identity mismatch, missing critical parts, damaged beyond refurbish, disposition = Dispose |
| UNCERTAIN | Check ambiguous; evidence insufficient or conflicting | Unclear if all parts present, condition between grades, photo too blurry |
| PENDING_REVIEW | Check not performed; human review required | Model timeout, API failure, empty box, incomplete image set |

**Rationale:**
- PASS/FAIL: binary outcome when model confident
- UNCERTAIN: model observed ambiguity; not a low-confidence PASS, but a real "I don't know" state
- PENDING_REVIEW: system failure (not model failure); still records the attempt

**Impacts:**
- ✓ Honest uncertainty handling
- ✓ Operator doesn't over-trust ambiguous results
- ✓ No false confidence on edge cases
- ✗ Four states instead of three increases complexity
- ✗ Requires UI to show all four states distinctly

**Verification:**
- Eval report: track distribution of all four states
- UI testing: all four states display correctly
- Human review queue: spot-check UNCERTAIN and PENDING_REVIEW cases

**Status:** ✓ CONFIRMED

**Affected Components:**
- Evidence record schema (verdict field allows 4 values)
- Model prompt (explain when to return UNCERTAIN)
- UI (render all four states)
- Eval methodology (track all four in metrics)

---

## D5: Evidence Record Schema v1.0

**Problem:** Design the data structure that records all facts about one return assessment, suitable for human review and downstream consumption.

**Chosen Schema:**

```json
{
  "record_id": "RTN-XXXX",
  "schema_version": "1.0",
  "unit_id": "UNIT-XXXX",
  "org_id": "org_demo_alpha",
  "captured_at": "2026-09-25T14:30:00Z",
  "operator_id": "op_chen",
  "order_id": "ORD-XXXX",
  "ordered_sku": "SKU-LAMP-LED",
  "ordered_asin": "B0DUMMY357",
  
  "images": {
    "photo_refs": "fixtures/returns/UNIT-XXXX_1.jpg;fixtures/returns/UNIT-XXXX_2.jpg;fixtures/returns/UNIT-XXXX_3.jpg",
    "content_hash": "sha256:abc123..."
  },
  
  "checks": {
    "identity": {
      "verdict": "PASS",
      "confidence": 0.95,
      "detail": "Product visually matches ordered ASIN. Lamp body, cable, and branding confirmed.",
      "evidence": ["photo_refs[0]", "photo_refs[1]"]
    },
    "completeness": {
      "verdict": "FAIL",
      "confidence": 0.92,
      "detail": "Expected: lamp, usb cable, manual. Missing: manual.",
      "parts_list": "lamp;usb cable;manual",
      "parts_missing": "manual",
      "evidence": ["photo_refs[0]", "photo_refs[2]"]
    },
    "condition": {
      "verdict": "PASS",
      "confidence": 0.88,
      "observed_state": "signs_of_use",
      "amazon_condition": "Good",
      "detail": "Minor scratches on base, no cracks or dents. Functional condition.",
      "evidence": ["photo_refs[1]"]
    }
  },
  
  "disposition": {
    "verdict": "refurbish",
    "confidence": 0.85,
    "detail": "Missing manual but product and cable in good condition. Refurbish and supply manual.",
    "rationale": "identity=PASS, completeness=FAIL (manual only), condition=Good → refurbish"
  },
  
  "agent": {
    "model": "claude-3-5-sonnet",
    "model_version": "claude-3-5-sonnet-20240620",
    "call_timestamp": "2026-09-25T14:30:05Z",
    "latency_ms": 2340,
    "tokens_used": 1420
  },
  
  "overrides": [
    {
      "field": "disposition",
      "original_verdict": "refurbish",
      "override_verdict": "liquidate",
      "reason": "Manual is required part; lack of it makes refurbish non-viable",
      "operator_id": "op_supervisor_1",
      "override_at": "2026-09-25T14:35:00Z"
    }
  ],
  
  "status": "completed",
  "output_at": "2026-09-25T14:30:10Z"
}
```

**Rationale:**
- Comprehensive: captures all checks, model details, and operator actions
- Traceable: every verdict linked to evidence
- Downstream-friendly: machine-readable for Recovery Manager
- Audit-ready: timestamps, model version, overrides recorded
- Human-readable: detail field explains reasoning

**Impacts:**
- ✓ Complete audit trail
- ✓ Downstream integration possible
- ✓ Honest recording of overrides
- ✗ Larger record size (~2-5 KB per return)
- ✗ Must validate schema on every write

**Verification:**
- Schema validation on every record write
- Sample records generated and validated
- Recovery Manager can parse output without errors

**Status:** ✓ CONFIRMED

**Affected Components:**
- Evidence record creation (agent output)
- Persistence layer (database schema)
- Cross-pod contract (JSON specification)

---

## D6: Security: Row-Level Organization Isolation

**Problem:** Engineering rule 1 mandates tenant isolation "before any feature." How do we enforce it?

**Chosen Approach:**

1. **Schema-level:** Every table has `org_id` column as part of primary key or unique constraint
2. **Query-level:** Every SELECT/UPDATE/DELETE query filters by org_id of authenticated user
3. **Application-level:** Auth middleware enforces org_id before any model call
4. **Test-level:** Automated test verifies org_A cannot read org_B data

**Implementation:**
```python
# Middleware pattern
@require_auth
def process_return(unit_id, org_id=None):
    # org_id extracted from JWT/session
    org_id = get_authenticated_org()
    
    # Every query includes org_id filter
    record = db.query(ReturnRecord).filter_by(
        unit_id=unit_id,
        org_id=org_id
    ).first()
    
    if not record:
        raise NotFound()  # Treat as not found, not permission error
```

**Test:**
```python
def test_org_isolation():
    # Setup: create records for org_A and org_B
    record_a = create_return(org_id='org_demo_alpha', unit_id='UNIT-0001')
    record_b = create_return(org_id='org_demo_bravo', unit_id='UNIT-0002')
    
    # org_A queries should not see org_B data
    org_a_results = get_returns(org_id='org_demo_alpha')
    assert len(org_a_results) == 1
    assert org_a_results[0].unit_id == 'UNIT-0001'
    
    # org_B queries should not see org_A data
    org_b_results = get_returns(org_id='org_demo_bravo')
    assert len(org_b_results) == 1
    assert org_b_results[0].unit_id == 'UNIT-0002'
```

**Rationale:**
- Filters at query level prevent accidental data leakage
- Auth middleware ensures org_id before any business logic
- Automated test prevents regression
- Pattern scales to all tables

**Impacts:**
- ✓ Strong isolation guarantee
- ✓ Auditable and testable
- ✗ Requires discipline on every query
- ✗ No fallback if org_id missing (will fail loudly, which is correct)

**Verification:**
- Isolation test runs on every deployment
- Code review: verify all queries filter by org_id
- Security audit: confirm no cross-org data access possible

**Status:** ✓ CONFIRMED

**Affected Components:**
- Database schema (org_id in all tables)
- Query layer (org_id filter middleware)
- Auth middleware
- Tests (isolation test suite)

---

## D7: Fail-Open Behavior for Model Failures

**Problem:** Engineering rule 3 requires fail-open: model errors must not block the operator. How do we handle failures gracefully?

**Failure Scenarios and Responses:**

| Failure | Detection | Response | Result |
|---|---|---|---|
| Model timeout (>30s) | Try/catch timeout | Mark `status=pending_review` | Record saved, operator notified, queued for review |
| API rate limit | Anthropic 429 | Retry with exponential backoff (3x) | If still fails: status=pending_review |
| Malformed output | JSON decode error | Log error, mark pending_review | Record saved, output_error captured |
| Missing images | File not found | Skip image, try with available photos | Proceed; confidence reduced; evidence_partial=true |
| All images missing | No photos at all | Return UNCERTAIN on all checks | Status=pending_review, reason="no images" |
| Network error | Socket timeout | Retry (3x), then mark pending | Status=pending_review |

**Chosen Flow:**

```
Operator submits photos
       ↓
Load photos (skip missing, warn)
       ↓
Call model with retry logic
       ├─ Success → parse output, validate, save record
       ├─ Timeout → log, save record with status=pending_review
       ├─ Rate limit → backoff, retry, if fail → pending_review
       ├─ Malformed → log error detail, status=pending_review
       └─ Network error → backoff, retry, if fail → pending_review
       ↓
Always: Return record to operator with status indicator
       ↓
Operator sees: ✓ PASS/FAIL, ⚠ UNCERTAIN, 🔄 PENDING_REVIEW
```

**Rationale:**
- Operator is never blocked; warehouse line never stops
- Record always created, preserving attempt
- pending_review flags work for human review queue
- Retries handle transient failures without operator intervention
- Logging enables debugging

**Impacts:**
- ✓ Warehouse line never blocked
- ✓ No silent data loss
- ✓ Operator aware of status
- ✗ Requires robust logging/monitoring
- ✗ Pending review queue needs human capacity

**Verification:**
- Chaos testing: simulate failures, confirm operator not blocked
- Log audit: verify all failures logged with context
- Record integrity: spot-check pending_review records contain all captured data

**Status:** ✓ CONFIRMED

**Affected Components:**
- Model layer (try/catch, retry logic)
- Record creation (handle partial data)
- API gateway (timeout config)
- Logging (failure tracking)
- UI (status indicator)

---

## D8: Evaluation Methodology: 50-Unit Held-Out Set

**Problem:** Handbook requires 50 unseen units with 2 independent human labelers and inter-rater agreement measurement. How do we design this?

**Chosen Methodology:**

**Phase 1: Data Preparation**
- Capture 60-70 real product returns (or staged scenarios)
- Create 50-unit held-out set (never seen during development)
- Reserve 10-20 for development/debugging

**Phase 2: Human Labeling**
- Recruit 2 independent labelers (no overlap with dev team)
- Labeler 1 independently assesses all 50 units
- Labeler 2 independently assesses all 50 units
- Labelers use same rubric, but do not communicate

**Phase 3: Agreement Analysis**
- Compute inter-rater reliability (Cohen's kappa)
- Identify disagreements; investigate causes
- If kappa < 0.6: clarify rubric, re-label disputed cases

**Phase 4: Ground Truth Establishment**
- Where labelers agree: ground truth = agreement
- Where labelers disagree: resolve via arbiter (subject matter expert) or third labeler

**Phase 5: Agent Evaluation**
- Run agent on all 50 eval units
- Compare agent output vs. ground truth
- Compute per-check accuracy (identity, completeness, condition, disposition)
- Compute FP, FN separately for each check

**Phase 6: Report**
- metric: per-check accuracy (%)
- metric: false positive rate (%)
- metric: false negative rate (%)
- metric: UNCERTAIN rate (%)
- failure modes: categorized by cause (lighting, partial visibility, edge case)

**Rationale:**
- 50 units meets handbook minimum
- 2 independent labelers ensures robustness
- Inter-rater agreement validates ground truth
- Per-check metrics isolate weak spots
- FP/FN separately for actionability

**Impacts:**
- ✓ Rigorous evaluation
- ✓ Defensible numbers
- ✓ Honest failure mode reporting
- ✗ Requires 2 labelers (recruitment effort)
- ✗ High-effort fixture capture

**Verification:**
- Sample eval report: kappa, per-check metrics, failure modes
- Spot-check: 5 UNCERTAIN cases from eval

**Status:** ✓ CONFIRMED

**Affected Components:**
- Fixture capture process
- Labeling rubric (to be created)
- Eval script (comparison logic)
- Reporting (metrics table)

---

## D9: Model Selection Strategy (OPEN)

**Problem:** Engineering rule 5 requires looking up authoritative rules. What vision model should we use?

**Constraints:**
- Must support multimodal (image + text) input
- Must support structured JSON output
- Must be available for the timeline (25 Sep – 1 Oct 2026)
- No official CUBE model requirement given

**Candidate Models (Not Pre-Selected):**
1. **Claude 3.5 Sonnet** (Anthropic) — strong vision, context window 200K, cost-effective
2. **GPT-4 Vision** (OpenAI) — strong vision, context window 128K, higher cost
3. **Local LLaVA** (open-source) — lower cost, weaker vision, no API latency
4. **Gemini Pro Vision** (Google) — strong vision, context window 1M, varies cost

**Evaluation Approach (To Be Completed):**
- Test 2–3 candidate models on 5 fixture images
- Measure: structured output quality, latency, cost, availability
- Choose model based on actual performance vs. requirements
- Document choice rationale in final architecture

**Note:** This is an engineering decision, NOT an organizer requirement. CUBE does not mandate a specific model.

**Status:** ⊘ OPEN (To be finalized during Face 3 implementation)

**Affected Components:**
- Model layer (API client)
- Agent system prompt (model-specific instructions)
- Evidence record (model_version field)
- CLAUDE.md (model pinning)

---

## Summary

| ID | Decision | Status | Blocking | Verified |
|---|---|---|---|---|
| D1 | Single-batch multimodal architecture | ✓ | No | Yes (organizer) |
| D2 | Observed state → Amazon condition mapping | ✓ | No | Yes (schema) |
| D3 | Visual evidence only scope boundary | ✓ | No | Yes (architecture) |
| D4 | Four-state decision model (PASS/FAIL/UNCERTAIN/PENDING_REVIEW) | ✓ | No | Yes (data) |
| D5 | Evidence record schema v1.0 | ✓ | No | Yes (sample) |
| D6 | Row-level org isolation security | ✓ | No | Pending (test) |
| D7 | Fail-open behavior pattern | ✓ | No | Yes (architecture) |
| D8 | 50-unit eval with 2 labelers | ✓ | No | Yes (methodology) |
| D9 | Model selection strategy | ⊘ | No | Pending (fixture testing) |

**No blocking decisions — all have workarounds or confirmed validations.**

