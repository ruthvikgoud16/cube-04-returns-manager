# RTN Clarifications & Findings

**Document Purpose:** Track unresolved questions, organizer clarifications received, and contradictions found in source materials. Separate from DECISIONS.md which tracks our engineering choices.

**Status Hierarchy:**
- **RESOLVED** ✓ — organizer has clarified
- **TENTATIVE** ⊘ — we have a working assumption pending confirmation
- **BLOCKING** ⊗ — prevents implementation until resolved
- **FINDING** ▲ — contradiction in source materials

---

## Organizer Clarifications Already Received

These are confirmed facts from Nandan/Sydon that the brief explicitly provided:

| # | Clarification | Status | Impact |
|---|---|---|---|
| O1 | Participants may define their own boundaries | ✓ RESOLVED | We will create an explicit RTN scope document |
| O2 | Different approaches acceptable (complexity/accuracy tradeoff) | ✓ RESOLVED | Justifies single-batch architecture over multi-call approach |
| O3 | Current focus: physically visible parts, not electronic functionality | ✓ RESOLVED | Out-of-scope: battery health, electronic checks, internal components |
| O4 | Participants encouraged to define boundaries and novel ideas | ✓ RESOLVED | Architecture creativity permitted within engineering rules |
| O5 | Participants can create their own evaluation dataset | ✓ RESOLVED | We will design and execute our own 50-unit eval set |

---

## Questions From Repository Materials

### Q1: What does "unseen" mean for evaluation?

**Question:** The handbook requires 50 "unseen/held-out units" for vision tracks. What exactly is unseen?

**Options:**
- A) Unseen images of known SKUs/products
- B) Unseen units (different instances of known products)
- C) Unseen products/SKUs (new catalog items)
- D) Some combination

**Status:** ⊘ TENTATIVE

**Current Working Assumption:** Combination of (A) and (B) — new images of the same SKU, and possibly new SKUs not seen during development. This is most realistic for a real returns workflow.

**Why It Matters:** Affects evaluation setup. If "unseen" means only new images of known products, we can use existing product images from different angles. If it includes new SKUs, we must capture more diverse products.

**Organizer Response:** Not yet requested

**Impact:** Medium — affects fixture capture scope and labeling effort

**Next Step:** Confirm with organizer before finalizing eval dataset

---

### Q2: What are the authoritative Amazon condition grades?

**Question:** Engineering rule 5 says "look authoritative rules up." For Amazon condition grades, what are the official options?

**Context:** The README says "Use theirs. Do not invent one." The reference data's `amazon_condition` column is deliberately empty, requiring us to populate it.

**Options to investigate:**
- Official Amazon Renewed / FBA condition scale (Acceptable, Good, Very Good, Like New)
- Operational condition grades used internally
- General commerce condition standards

**Status:** ⊘ TENTATIVE

**Current Working Assumption:** Amazon's published Renewed/FBA scale: Acceptable, Good, Very Good, Like New, and Factory Sealed (5 grades).

**Why It Matters:** Directly affects agent output schema and eval grading.

**Organizer Response:** Not yet requested

**Impact:** Critical — determines valid values in evidence record

**Next Step:** Confirm Amazon condition grades; reference in ARCHITECTURE.md and code

**Reference:** Amazon Renewed documentation typically available on Amazon's official website; not in repo

---

### Q3: Is "product identity" just ASIN match, or broader?

**Question:** The README says "Is this the ASIN that was ordered?" But what if:
- Right product, wrong color/variant?
- Right product, counterfeit?
- Right product, missing serial number?

**Status:** ⊘ TENTATIVE

**Current Working Assumption:** Primary check is ASIN/SKU match from visual inspection. Variant/color match is secondary. Counterfeits are out-of-scope (require serial verification, materials testing). This is "visible identity" only.

**Why It Matters:** Affects model prompt and disposition logic. If we incorrectly identify variants, we may recommend disposal instead of restock.

**Organizer Response:** Not yet requested

**Impact:** High — affects first check in chain

**Next Step:** Document assumption in ARCHITECTURE.md

---

### Q4: What is "completeness" for an empty box?

**Question:** The sample data includes `empty_box` as an observed_state. What does completeness mean if the box is empty?

**Scenario:** 
- Ordered: "SKU-BOTTLE-750" with expected parts: bottle, lid
- Arrived: empty box
- Parts list check: should we report "all parts missing" or "unable to assess"?

**Status:** ⊘ TENTATIVE

**Current Working Assumption:** Empty box → FAIL on identity (cannot confirm it is the right product). Completeness check becomes "unable to assess" / UNCERTAIN because we have no evidence of parts.

**Why It Matters:** Affects disposition logic. Empty box should typically go to Liquidate or Dispose, but that's a policy decision, not a model call.

**Organizer Response:** Not yet requested

**Impact:** Medium — edge case but real in warehouse operations

**Next Step:** Document in ARCHITECTURE.md edge cases section

---

## Contradictions Found in Source Materials

### Finding F1: Reference data condition vs. our grading

**Contradiction Detected:** 

In `returns_sample.csv`:
- Column `observed_state` is filled with: factory_sealed, opened_unused, signs_of_use, damaged, empty_box, uncertain
- Column `amazon_condition` is **deliberately empty** (per data/README.md)

But the data/README.md says: "Grade it on Amazon's published condition scale. The statement says use theirs and don't invent one."

**The Contradiction:** The reference data fills `observed_state` (a 6-value observation) but leaves `amazon_condition` (the official grade) empty. This suggests:
- `observed_state` is the visual *observation* made by the operator
- `amazon_condition` is the *policy grading* we need to assign

**Our Interpretation:** These are two separate columns:
1. `observed_state`: raw observation (6 values) — operator sees/records
2. `amazon_condition`: official grade (5 values) — our agent maps observation → official grade

**Resolution Status:** ✓ RESOLVED (interpretation made; see DECISIONS.md for mapping)

**Impact:** Affects schema and output contract

---

### Finding F2: "Fail-open" vs. empty amazon_condition

**Contradiction Detected:**

Engineering rule 3 (Fail-open) says: "A model error or timeout still saves the capture and still produces a record, marked `pending`."

But if the model fails, how do we fill `amazon_condition`?

**The Contradiction:** If we set it to NULL or "pending", the record is incomplete for downstream. If we do not include it, the schema is inconsistent.

**Our Interpretation:** When model fails:
- Mark status as `pending_review`
- Leave `amazon_condition` as NULL (not an empty string)
- Preserve the original `observed_state` if it was operator-captured
- Flag for human review

**Resolution Status:** ✓ RESOLVED (documented in DECISIONS.md)

**Impact:** Affects fail-open record schema

---

### Finding F3: "Uncertain" as observation vs. verdict

**Contradiction Detected:**

The sample data uses:
- `observed_state` = "uncertain" (row RTN-0092: dropper presence uncertain)
- `operator_disposition` = "pending_review" (row RTN-0092)

But engineering rule 4 says UNCERTAIN should be a first-class **verdict** on our checks, not an observation.

**The Contradiction:** Is UNCERTAIN:
- An input (what the operator observed)?
- An output (what our agent decided)?
- Both?

**Our Interpretation:** 
- UNCERTAIN is primarily an *output* of our model when confidence is low or evidence is ambiguous
- It *can* appear in `observed_state` if the operator explicitly marks something uncertain
- When we see operator-captured "uncertain", we should flag for review
- Our agent may also return UNCERTAIN if the model is unable to decide

**Resolution Status:** ✓ RESOLVED (documented in DECISIONS.md)

**Impact:** Affects model prompt and evidence record design

---

## Unanswered Questions Requiring Organizer Clarification

### U1: Cross-pod contract: what format?

**Question:** README says output must be "usable by another pod" (Recovery Manager). No specification of format given (JSON, CSV, database table, etc.).

**Status:** ⊘ TENTATIVE

**Current Assumption:** Machine-readable JSON (REST API or file export) that Recovery Manager can parse without reading our UI.

**Why It Matters:** Affects API design and contract document

**Next Step:** Propose format in DECISIONS.md; validate with organizers before implementation

---

### U2: Image storage: local file, cloud, or key-value?

**Question:** The sample data has `photo_refs` as file paths. Where are actual images stored in production?

**Options:**
- Local filesystem (like `fixtures/returns/UNIT-0003_1.jpg`)
- Cloud storage (S3, GCS, etc.)
- Inline base64

**Status:** ⊘ TENTATIVE

**Current Assumption:** Local filesystem for MVP; cloud storage architecture documented but not implemented.

**Why It Matters:** Affects security/tenancy isolation (path-based or key-based access control) and fail-open behavior.

**Next Step:** Document assumption; propose multi-option architecture

---

### U3: Model choice and API availability

**Question:** No specification given for which vision model to use. Options include:
- Claude vision (via Anthropic API)
- GPT-4 vision (via OpenAI API)
- Local open-source (LLaVA, etc.)
- Other

**Status:** ⊘ TENTATIVE

**Current Assumption:** Claude multimodal (claude-3-5-sonnet or similar) via Anthropic API, with graceful fallback.

**Why It Matters:** Affects:
- API costs
- Model availability (rate limits, downtime)
- Evidence record (model version tracking)
- Reproducibility

**Next Step:** Propose model choice in CLAUDE.md; document API version pinning

---

### U4: Evaluation dataset: real product photos or synthetic?

**Question:** The handbook requires 50 held-out unseen units, independently labeled by 2 humans. Should these be:
- Real product photos from actual returns (preferred, realistic)
- Synthetic/staged photos (faster to generate)
- Mix

**Status:** ⊘ TENTATIVE

**Current Assumption:** Real product photos. We will need to acquire or use existing e-commerce product photos and stage return scenarios.

**Why It Matters:** Affects:
- Fixture capture effort
- Realism/credibility of evaluation
- Labeling complexity

**Next Step:** Confirm with organizers; plan fixture capture process

---

### U5: Recovery Manager contract: what checks do they expect?

**Question:** Recovery Manager (Pod 5) reads our output. What specific fields must we provide for them to make their decision?

**Status:** ⊘ TENTATIVE

**Current Assumption:** We provide: unit_id, identity_result, completeness_result, condition, disposition, evidence_links, confidence. Recovery Manager uses these to make the final claim decision.

**Why It Matters:** Affects output schema and API design

**Next Step:** Propose contract in CONTRACT.md; confirm with Recovery Manager lead

---

## Summary

| Type | Count | Status |
|---|---|---|
| Organizer clarifications received | 5 | ✓ RESOLVED |
| Resolved contradictions | 3 | ✓ RESOLVED |
| Tentative assumptions | 9 | ⊘ TENTATIVE |
| Unresolved clarification questions | 5 | ⊗ BLOCKING (can work around) |

**Blocking implementation:** None — all can be worked around with documented assumptions.

**Recommended next steps:** 
1. Confirm Amazon condition grades (Q2)
2. Propose Recovery Manager contract (U5)
3. Finalize evaluation dataset scope (Q1, U4)

