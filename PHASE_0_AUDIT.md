# CUBE RTN Phase 0–13 Audit & Implementation Plan

**Verdict:** Round 2 is an **individual fork build** with a strong evidence / evaluation bar. The official repo is thin on implementation assets: **no worked example package**, **no official evidence-contract file**, **no images**, and **internal document contradictions**.

Your fork already exists: [ruthvikgoud16/cube-04-returns-manager](https://github.com/ruthvikgoud16/cube-04-returns-manager).

---

## Executive Summary

| Item | Finding |
|---|---|
| Official source | [Cube-Build-A-Thon/cube-04-returns-manager](https://github.com/Cube-Build-A-Thon/cube-04-returns-manager) |
| Your fork | Already created and active |
| Product | Vision + deterministic Returns Manager: identity → completeness → condition → disposition → evidence record |
| Consumer | Recovery Manager (step 5 of the chain) |
| Hard engineering rules | Tenancy Day-1, batched model calls, fail-open, UNCERTAIN first-class, evidence-backed, no invented evidence |
| Blocking gaps | Worked Returns package **missing**; official evidence contract **referenced but not shipped**; sample `amazon_condition` **deliberately empty**; disposition policy **not specified** |
| **Highest-risk FINDING** | Round 2 handbook says **fork-only submission**; repository `_TEMPLATE` + CI still describe **branch + `submissions/<user>/` + PR workflow** (FINDING-001) |

Architecture direction: **one multimodal batched inference per unit** → schema validation → deterministic policy/disposition/uncertainty gates → org-scoped persistence → Recovery-consumable evidence record.

---

## Repository Audit (Phase 0)

### What Exists

```
cube-04-returns-manager/
├── README.md, RULES.md, GITHUB-GUIDE.md
├── data/README.md, data/returns_sample.csv (24 rows)
├── submissions/_TEMPLATE/README.md
└── .github/ (CODEOWNERS, PR template, submission-guard)
```

### What Does NOT Exist (But Is Referenced)

| Referenced | Source | Status |
|---|---|---|
| Worked Returns package (letter / PRFAQ / one-pager) | README L129; Recovery/Receiving READMEs | **Absent.** Peer issue #15 asks organisers where it is |
| Official evidence contract file | README / RULES / Recovery README | **Absent** from all five repos |
| Domain brief | Recovery README | **Absent**; same issue #15 |
| Product images | `photo_refs` placeholders | **Not included** |

### Sample-Data Findings (Evidence-Backed)

- **24/24** `identity_match = yes` — no negative identity cases in sample.
- **24/24** `amazon_condition` empty — required to use Amazon's published scale (data/README.md).
- **ASIN collision:** `B0DUMMY357` maps to both `SKU-LAMP-LED` and `SKU-PROT-1KG`.
- **Policy noise:** `RTN-0038` missing `tub` but `restock`; same `opened_unused` yields `restock` or `refurbish`; same `damaged` yields `liquidate` or `dispose`.
- Operators appear across both orgs (not tenant-scoped people).
- Recovery join: 4 `refund_issued_item_not_returned` lines share return `unit_id`s; FBA-return ambiguity raised in Recovery #11.
- `unit_id` semantics disputed in Recovery #8.

---

## Complete Requirements Matrix

Legend: **P0** must-ship · **P1** scored / strongly expected · **P2** recommended

### A. CUSTOMER REQUIREMENTS

| ID | Source | Requirement | Implication | Verify | Pri |
|---|---|---|---|---|---|
| C1 | README | Customer = seller or prep center | UX/docs address warehouse operator + seller margin | Demo persona | P0 |
| C2 | README | Commercial case: move returns from liquidation → restock | Kill condition / one-pager must measure restock-eligible recoveries | Metrics in one-pager | P0 |
| C3 | README | Seconds-scale decision at open-parcel | Latency budget in eval | Latency report | P1 |

### B. FUNCTIONAL REQUIREMENTS

| ID | Source | Requirement | Implication | Verify | Pri |
|---|---|---|---|---|---|
| F1 | README/RULES | Identity vs ordered SKU/ASIN / catalogue | Multimodal identity check + catalogue lookup | Per-check eval | P0 |
| F2 | README/RULES | Completeness vs parts list | Missing-component list in evidence | Completeness FP/FN | P0 |
| F3 | README/RULES/data | Condition on **Amazon published scale**; do not invent | Look up Amazon Used/condition guide; map from observation | Condition eval + rule_source URL | P0 |
| F4 | README | Disposition ∈ {restock, refurbish, liquidate, dispose} | Deterministic policy after checks | Disposition agreement | P0 |
| F5 | RULES | Separate `observed_state` from condition grade | Store both; sample treats observation ≠ grade | Schema tests | P0 |
| F6 | README | Structured evidence record | Persist official envelope fields | Contract tests | P0 |

### C. ENGINEERING REQUIREMENTS

| ID | Source | Requirement | Implication | Verify | Pri |
|---|---|---|---|---|---|
| E1 | RULES §2.2 + user constraint | Efficient / **one batched model call per unit** | Single multimodal structured output covering all checks | Code review + call counter | P0 |
| E2 | RULES §2.3 | Fail open | Preserve input; pending/review/uncertain on failure | Failure tests | P0 |
| E3 | RULES §2.5 | Authoritative rules, not CSV/model memory | External rule fetch/cache for condition scale | `rule_source` present | P0 |
| E4 | RULES R7 | No secrets in git | `.env.example` only | Guard + review | P0 |
| E5 | GITHUB-GUIDE | Build-phase commits only (from 25 Sep 2026 09:00 IST) | All Round 2 commits after that | Commit timestamps | P0 |

### D. EVALUATION REQUIREMENTS

| ID | Source | Requirement | Implication | Verify | Pri |
|---|---|---|---|---|---|
| D1 | Handbook §10 | ≥50 unseen units for vision checks | Held-out set ≠ sample CSV | Eval report | P0 |
| D2 | Handbook §10 | Two independent human labels | Dual-label protocol | Agreement stats | P0 |
| D3 | Handbook §10 | Measure human agreement first | Report before agent metrics | Eval section | P0 |
| D4 | Handbook §7–8 | Per-check results, FP, FN, UNCERTAIN rate, failure modes, latency/cost | Structured eval report | Rubric 25 pts | P0 |
| D5 | Honesty | No cherry-picked success-only eval | Include hard/ambiguous cases | Case list | P0 |

### E. SECURITY / TENANCY

| ID | Source | Requirement | Implication | Verify | Pri |
|---|---|---|---|---|---|
| S1 | RULES §2.1 | Org isolation Day-1 | `organization_id` on every row + RLS | Isolation tests | P0 |
| S2 | RULES | Bravo sees zero Alpha rows | Cross-tenant SELECT returns empty | Automated test | P0 |
| S3 | RULES | Images not guessable across orgs | Org-scoped opaque keys / signed URLs | IDOR tests | P0 |
| S4 | data | Test orgs `org_demo_alpha`, `org_demo_bravo` | Fixtures use both | Tests | P0 |

### F. EVIDENCE / AUDIT

| ID | Source | Requirement | Implication | Verify | Pri |
|---|---|---|---|---|---|
| Ev1 | README/RULES | Envelope concepts: record_id, schema_version, organization_id, agent, subject, captured_at, images, checks, outcome, overrides, status, content_hash | Implement baseline schema | Schema fixtures | P0 |
| Ev2 | RULES | Check fields: check_key, verdict, confidence, detail, model_version, latency_ms | Per-check objects | Contract tests | P0 |
| Ev3 | RULES | Verdicts PASS / FAIL / UNCERTAIN | Enum + gates | Unit tests | P0 |
| Ev4 | RULES | Overrides preserve original + revised + reason | Append-only override list | Override tests | P0 |
| Ev5 | Honesty | Do not claim hash ⇒ immutable/tamper-proof | Docs language | Doc review | P0 |

### G. SUBMISSION (from Handbook §5)

| ID | Source | Requirement | Implication | Verify | Pri |
|---|---|---|---|---|---|
| Sub1 | Handbook §4 | Build in **own fork**; push work to fork during build phase | Primary path = fork | Fork URL in form | P0 |
| Sub2 | `_TEMPLATE` / CI | `submissions/<user>/` + username branch | **Contradicts Sub1** — FINDING-001 | Organiser answer | P0 |
| Sub3 | Handbook §5 | Deliverables: fork URL, README.md, ARCHITECTURE.md, demo video, evaluation report, LinkedIn URL | Checklist | Pre-submit | P0 |
| Sub4 | Handbook §6 | LinkedIn tags CodeQuesters + Sydon.AI | Mandatory | URL | P0 |
| Sub5 | Handbook §3 | Submit window 27 Sep–1 Oct 2026 18:00 IST; no resubmit | Single submission | Calendar | P0 |

### H. PRESENTATION / FACES (from _TEMPLATE)

| Face | Deliverable | Pri |
|---|---|---|
| 1 | customer letter, PR/FAQ, one-pager **with kill condition** | P0 |
| 2 | CLAUDE.md | P0 |
| 3 | Headless agent on fixtures | P0 |
| 4 | Eval report | P0 |
| 5 | Evidence record page | P0 |
| 6 | Cross-pod contract alignment | P0 |

---

## Handbook-Sourced Key Findings

<cite index="1-8,1-9">Build one focused AI agent around your selected real-world commerce problem. Engineer it so that another person can understand the workflow, reproduce the result, inspect the evidence and trust the boundaries of the system.</cite>

<cite index="1-34">RTN focus: Assess returned-item condition, classify the outcome and create structured evidence for downstream decisions.</cite>

<cite index="1-40,1-42">Build opens 25 Sep 2026, 9:00 AM IST. Submissions close 1 Oct 2026, 6:00 PM IST. No reopening and no extension.</cite>

<cite index="1-48,1-49">Everything required for Round 2 must be complete and submitted by 1 October 2026, 6:00 PM IST. Once the form closes, it will not be reopened.</cite>

<cite index="1-83,1-84,1-85,1-86,1-87,1-88,1-89">Every Round 2 participant must publish a LinkedIn post about their CUBE build. State your selected CUBE track. Explain what your agent does and the operational problem it addresses. Share a meaningful engineering detail, result, demo or learning. Tag CodeQuesters and Sydon.AI. Use the official CUBE context/hashtags communicated by the organisers. Paste the live LinkedIn URL into the submission form.</cite>

<cite index="1-99,1-100,1-101,1-102">Evaluation criteria: Agent Functionality & Decision Quality (25 pts): Working agent, required checks, input handling, processing, structured outputs, edge cases and decisions. Evaluation, Accuracy & Uncertainty Handling (25 pts): Evaluation methodology, measured performance, false positives/negatives, UNCERTAIN handling and failure modes. Evidence, Traceability & Engineering Quality (20 pts): Evidence, per-check verdicts, confidence, model/version, timestamps, overrides, architecture, reliability and security. UX, Demo & Documentation (15 pts): Usability, workflow clarity, decision/evidence visibility, demo, README, architecture docs, deployment and required links.</cite>

<cite index="1-113,1-114,1-115,1-116">Measure rather than claim. Use held-out data where applicable. Report false positives/negatives and uncertainty. Document failure modes honestly.</cite>

<cite index="1-139,1-140,1-141,1-142">Use an unseen/held-out evaluation set where applicable. For vision tracks, use at least 50 unseen units where applicable. Have two human evaluators independently label units before the agent runs. Report human agreement where possible, such as Cohen's kappa.</cite>

<cite index="1-129,1-130,1-131,1-132,1-133">PASS: the available evidence supports the condition. FAIL: the available evidence supports that the condition is not met. UNCERTAIN: the evidence does not support a reliable judgment. UNCERTAIN is not a low-confidence PASS. Use it when evidence is insufficient or genuinely ambiguous.</cite>

---

## Contradictions / Findings (CUBE Repository vs Handbook)

| ID | Conflict | Sources | Resolution stance |
|---|---|---|---|
| **FINDING-001** | Fork-only vs `submissions/<user>` + PR guard | Handbook §4 (fork) vs `_TEMPLATE` / PR template / `submission-guard` | **Prefer Handbook §4 for submission channel (fork-only).** Still produce Face docs in a clear structure. Open Issue labelled `finding`. |
| **FINDING-002** | Official evidence contract required but not present in repo | README/RULES vs repo contents; Handbook §9 lists fields | Implement envelope from listed concepts; mark `schema_version` provisional; track as alignment-to-official task |
| **FINDING-003** | Worked example required to "read, don't copy" but absent | README L129 | Proceed with Face 1 ourselves; critique available artifacts (sample + template) |
| **FINDING-004** | Sample disposition inconsistent with completeness | `RTN-0038` etc. | Treat sample as non-authoritative policy; define our policy; raise Issue |
| **FINDING-005** | ASIN↔SKU non-unique (`B0DUMMY357`) | CSV | Identity must use org+SKU+ASIN, not ASIN alone |

---

## Architecture Proposal

```
Input (photo + metadata)
       ↓
Persist raw capture (org-scoped)
       ↓
Single batched multimodal call (all 4 checks: identity, completeness, condition, disposition evidence)
       ↓
Schema validation (JSON structured output)
       ↓
Deterministic objective checks (identity catalogue match, parts set-diff, photo presence)
       ↓
Policy + uncertainty gates (disposition logic, UNCERTAIN handling)
       ↓
Build evidence record + content hash
       ↓
Persist record (RLS)
       ↓
API output for Recovery + UI
```

### Key Boundaries

| Layer | Owns | Must not own |
|---|---|---|
| **LLM reasoning** | One call: identity hypothesis, parts present/missing, observed condition cues, evidence pointers, uncertainty flags | Final disposition policy; tenancy; persistence |
| **Validation** | JSON Schema of model output | Business policy |
| **Deterministic logic** | Catalogue match, parts set-diff, required photo presence | Free-form narrative as truth |
| **Policy** | Map checks → disposition / pending_review; UNCERTAIN gates | Silent overrides |
| **Persistence** | Org-scoped rows, opaque image keys, audit fields | Cross-org joins |

---

## Evaluation Methodology (Design Only — No Fabricated Results)

1. Build **≥50 held-out units** with real fixtures (not `returns_sample.csv`).
2. Stratify: identity match/mismatch/similar, complete/incomplete, sealed/opened/used/damaged/ambiguous.
3. **Two independent human labellers** per unit for: identity, completeness (+ missing parts), Amazon condition, disposition, sufficiency of evidence.
4. Compute **human agreement first** (per check, Cohen's kappa); adjudicate only after measuring disagreement.
5. Run agent once on frozen set; score vs adjudicated labels:
   - Accuracy / FP / FN **per check**
   - UNCERTAIN & pending_review rates
   - Disposition agreement
   - Named failure modes (no invented rates)
   - Latency & model cost per unit (one call)
6. Separate **policy disagreement** from **perception error**.

---

## Uncertainty Model

**UNCERTAIN ≠ low-confidence PASS.**

| Situation | Check verdict | Record status |
|---|---|---|
| Ambiguous / similar product identity | identity UNCERTAIN | `pending_review` |
| Incomplete / unusable photos | affected checks UNCERTAIN | `pending_review` |
| Inaccessible component | completeness UNCERTAIN (not FAIL) | usually `pending_review` |
| Unclear damage vs wear | condition UNCERTAIN | `pending_review` |
| Model/schema failure | checks not_checked / UNCERTAIN | fail-open `pending` |
| Insufficient catalogue evidence | identity UNCERTAIN | `pending_review` |
| Clear PASS/FAIL on all material checks | normal verdicts | policy disposition |

---

## Fail-Open Strategy

| Failure | Persist | Status | Operator |
|---|---|---|---|
| Model timeout / API error | Raw capture + photos + error | `pending` / `review` | Case not lost |
| Malformed / schema-invalid output | Raw + parse error | `review` | Re-run allowed |
| Missing / unusable image | What exists | checks UNCERTAIN; `pending_review` | No invented pixels |
| Incomplete input | Partial record | `pending` | Prompt for missing fields |
| DB failure | Retry queue / local durable buffer if possible | Surface error; do not pretend success | — |

Never: drop capture, invent evidence, or coerce UNCERTAIN → PASS.

---

## Verification Gates (Summary)

| Gate | Proof |
|---|---|
| G1 Tenancy | Automated Alpha/Bravo isolation + image IDOR tests |
| G2 Single call | Instrumentation / mock asserts one inference per unit |
| G3 Fail-open | Timeout/malformed/missing-image tests preserve cases |
| G4 Evidence | Fixture golden JSON matches schema; override preserves original |
| G5 Eval | ≥50 unseen, 2 labels, agreement, per-check FP/FN documented |
| G6 Recovery-readable | Script consumes JSON without UI |
| G7 Submission | Checklist + LinkedIn tags + pre-deadline commits |

---

## Risks and Unknowns

1. Missing official contract / example / domain brief.
2. FINDING-001 workflow ambiguity.
3. No images in repo — fixture capture is on critical path.
4. Disposition policy unspecified — wrong restock = real seller harm.
5. ASIN collision and unit_id ambiguity poison identity/joins.
6. Eval labelling capacity for 50×2.
7. Model vision limits on small parts (puzzle pieces, dropper).
8. Build-phase commit cutoff after deadline.

---

## Recommended Next Action

1. **Review this audit** — confirm FINDING-001 and FINDING-002 with organizers as issues.
2. **Approve the architecture** above.
3. **Begin Face 1 docs** (customer letter, PR/FAQ, one-pager with measurable kill condition) — **no application code yet.**
4. In parallel: **start capturing vision fixtures** for the held-out eval set.

**Default location for Face docs:** `submissions/ruthvikgoud16/` inside the fork (template-compatible structure; no PR to organizer unless they reverse Handbook §4).

---

*This audit incorporates the official CUBE Participant Handbook (25 Sep 2026) and comprehensive Phase 0–13 findings from the RTN repository.*
