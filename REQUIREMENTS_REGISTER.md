# RTN Requirements Register

**Document Purpose:** Comprehensive inventory of all CUBE RTN requirements from official sources. Tracks implementation status, priority, and verification method.

**Document Authority:** Source hierarchy: Official Repository > Organizer Clarifications > Handbook (when available).

---

## Repository Rules (Enforced by GitHub)

| ID | Requirement | Source | Priority | Status | Implementation | Verification |
|---|---|---|---|---|---|---|
| R1 | Nobody pushes directly to `main` | RULES.md | Critical | Pre-built | GitHub branch protection | Attempted direct push fails |
| R2 | Every change reaches `main` through a PR | RULES.md | Critical | Pre-built | GitHub branch protection | Direct push rejected |
| R3 | Only @Cube-Buildathon can approve/merge to `main` | RULES.md | Critical | Pre-built | CODEOWNERS, branch protection | Attempted merge by non-organizer fails |
| R4 | Branch name must be GitHub username | RULES.md | Critical | Pre-built | submission-guard check | Non-matching branch name fails automated check |
| R5 | Changes only in `submissions/<username>/` | RULES.md | Critical | Pre-built | submission-guard check | Files outside folder rejected by check |
| R6 | `main` cannot be force-pushed or deleted | RULES.md | Critical | Pre-built | GitHub branch protection | Force push attempt fails |
| R7 | No secrets in repo (API keys, tokens, passwords, .env) | RULES.md | Critical | TBD | Manual developer discipline | Code review; revoke exposed keys immediately |
| R8 | Don't edit/delete/rename another person's branch or folder | RULES.md | Critical | TBD | Manual developer discipline | Code review; grounds for removal |

---

## Engineering Rules (Assessed in Scoring)

| ID | Requirement | Source | Priority | Status | Implementation | Verification |
|---|---|---|---|---|---|---|
| E1 | Tenancy isolation before any feature | RULES.md E1 | Critical | TBD | Row-level security scoped to org_id; dual-org test | Test: org_A reads 0 rows from org_B; cannot fetch org_B image by key |
| E2 | Batch model calls | RULES.md E2 | Critical | TBD | One multimodal call per unit; all checks in one payload | Test: no multiple sequential calls per unit |
| E3 | Fail-open behavior | RULES.md E3 | Critical | TBD | Model timeout/failure saves capture, marks `pending`, continues | Test: operator not blocked; record created with status |
| E4 | Uncertain is a valid verdict | RULES.md E4 | Critical | TBD | First-class outcome; surface in UI; never treat as low-confidence PASS | Test: uncertain verdict distinct from pass/fail in output |
| E5 | Look authoritative rules up | RULES.md E5 | Critical | TBD | Retrieve condition grades from Amazon published scale; do not infer | Implementation: Reference Amazon condition documentation in code |

---

## Product Requirements (RTN Problem Statement)

| ID | Requirement | Source | Priority | Status | Implementation | Verification |
|---|---|---|---|---|---|---|
| P1 | Identity check: Is this the item we sold? | README problem statement | Critical | TBD | Compare returned item vs ordered ASIN/SKU in catalogue | Check: `identity_match` in evidence record |
| P2 | Completeness check: Against parts list/accessories | README problem statement | Critical | TBD | Detect presence/absence of required components | Check: `parts_missing` list in evidence record |
| P3 | Condition classification | README problem statement | Critical | TBD | Grade on Amazon's published condition scale (not custom) | Check: `amazon_condition` filled with authoritative grade |
| P4 | Disposition decision | README problem statement | Critical | TBD | Determine: restock / refurbish / liquidate / dispose | Check: `operator_disposition` set to one of four values |
| P5 | Evidence-backed decisions | README problem statement | Critical | TBD | Every verdict must cite image evidence/reasoning | Check: evidence_detail populated for each check |
| P6 | Input: 2-3 phone photographs | README problem statement | High | TBD | Accept up to 3 photos from mobile device | Check: photo_refs parsed and processed |
| P7 | Confidence/uncertainty | README problem statement | Critical | TBD | Report confidence and handle UNCERTAIN cases explicitly | Check: confidence field in evidence record |

---

## Submission Requirements (Face Structure)

| ID | Requirement | Source | Priority | Status | Implementation | Verification |
|---|---|---|---|---|---|---|
| S1 | Face 1: Customer letter (no code) | README Face 1 | High | TBD | Write 01-customer-letter.md | File exists and is non-empty |
| S2 | Face 1: PR/FAQ including hard questions | README Face 1 | High | TBD | Write 02-prfaq.md with awkward answers | File exists with questions user "would rather not answer" |
| S3 | Face 1: One-pager with metrics table and kill condition | README Face 1 | High | TBD | Write 03-one-pager.md | File includes at least one kill condition |
| S4 | Face 2: CLAUDE.md | README Face 2 | High | TBD | Write CLAUDE.md durable constraints | File documents architecture, evidence, uncertainty rules |
| S5 | Face 3: Headless agent, CLI first | README Face 3 | Critical | TBD | Working agent callable from CLI on fixture images | Test: CLI runs, produces structured output |
| S6 | Face 4: Eval report with numbers | README Face 4 | Critical | TBD | eval-report.md with per-check performance, FP, FN, failure modes | File contains: method, human agreement, per-check %, failures |
| S7 | Face 5: Evidence record page UI | README Face 5 | High | TBD | Works on real phone, cellular network | Test: captures photo, processes, renders record |
| S8 | Face 6: Cross-pod contract | README Face 6 | High | TBD | contract/ folder documents output shape for other pods | File specifies schema and consumption contract |
| S9 | README.md in submission folder | submissions/_TEMPLATE/README.md | High | TBD | Index file with links to all artifacts | File exists and is current |
| S10 | build-log.md kept current | GITHUB-GUIDE.md | High | TBD | Continuous update of build log | Organisers read from branch daily |

---

## Data Structure Requirements

| ID | Requirement | Source | Priority | Status | Implementation | Verification |
|---|---|---|---|---|---|---|
| D1 | Handle multi-tenant (org_id) in all tables | data/README.md | Critical | TBD | Every table has org_id; row-level scoping | Isolation test passes |
| D2 | Support two reference organisations (org_demo_alpha, org_demo_bravo) | data/returns_sample.csv | High | TBD | Load both orgs in test/fixture data | Both org IDs present in test data |
| D3 | Evidence record must include photo_refs paths | data/README.md | High | TBD | Store `;`-separated image paths in record | photo_refs column populated |
| D4 | Track operator_id and captured_at | data/README.md | High | TBD | Record who made the call and when | Both fields in evidence record |
| D5 | Support unit_id for chain traceability | data/README.md | High | TBD | Same unit_id joins across all 5 pods | unit_id persistent in record |
| D6 | Support observed_state enum | data/returns_sample.csv | High | TBD | Track observation: factory_sealed, opened_unused, signs_of_use, damaged, empty_box, uncertain | Enum handled in schema |
| D7 | amazon_condition field is deliberately empty in reference data | data/README.md | High | TBD | Populate this field ourselves with authoritative grades | Our agent fills amazon_condition |

---

## Architecture & Engineering Decisions

| ID | Requirement | Source | Priority | Status | Implementation | Verification |
|---|---|---|---|---|---|---|
| A1 | One batched multimodal call per unit | Organizer clarification + README | Critical | TBD | Single LLM/vision call analyzes all 4 checks | Code review: no multiple sequential calls |
| A2 | Deterministic logic post-model | Organizer clarification + README | Critical | TBD | Schema validation, objective comparisons, policy rules after model | Code: separate model layer from policy layer |
| A3 | Explicit scope boundary: visual evidence only | Organizer clarification | High | TBD | Document in-scope (identity, condition, damage, packaging) vs out-of-scope (electronics, battery, internal) | ARCHITECTURE.md specifies boundary |
| A4 | Evidence record designed for downstream consumption | README cross-pod | High | TBD | Machine-readable output contract for Recovery Manager | contract/ folder documents schema |
| A5 | Decision states: PASS / FAIL / UNCERTAIN / PENDING_REVIEW | Engineering rule 4 + sample data | Critical | TBD | Support all four states; treat UNCERTAIN as first-class | Evidence record includes all four states |

---

## Evaluation Requirements

| ID | Requirement | Source | Priority | Status | Implementation | Verification |
|---|---|---|---|---|---|---|
| EV1 | Held-out evaluation set: 50 unseen units | Handbook (confirmed) | Critical | TBD | Create separate test set not used during development | Eval set locked before agent training |
| EV2 | Two independent human labelers per unit | Handbook (confirmed) | Critical | TBD | Two humans independently label each eval unit | Labeler agreement score computed |
| EV3 | Measure human agreement | Handbook (confirmed) | Critical | TBD | Calculate inter-rater reliability (e.g., Cohen's kappa) | Agreement % documented in eval report |
| EV4 | Per-check performance breakdown | Handbook (confirmed) | Critical | TBD | Report accuracy separately for: identity, completeness, condition, disposition | eval-report.md includes per-check table |
| EV5 | Track false positives separately | Handbook (confirmed) | Critical | TBD | Count FP cases where agent said PASS but should be FAIL | eval-report.md includes FP count/% |
| EV6 | Track false negatives separately | Handbook (confirmed) | Critical | TBD | Count FN cases where agent said FAIL but should be PASS | eval-report.md includes FN count/% |
| EV7 | Document failure modes explicitly | Handbook (confirmed) | High | TBD | List categories of failures (e.g., poor lighting, obscured parts) | eval-report.md failure modes section |
| EV8 | Uncertainty handling in eval | Handbook (confirmed) | High | TBD | Track UNCERTAIN verdicts; report separately | eval-report.md includes uncertainty breakdown |

---

## Cross-Pod / Downstream Integration

| ID | Requirement | Source | Priority | Status | Implementation | Verification |
|---|---|---|---|---|---|---|
| X1 | Output consumable by Recovery Manager (Pod 5) | README "Who consumes your output" | High | TBD | Machine-readable schema for Recovery Manager | Contract document specifies structure |
| X2 | Unit traceability across all 5 pods | README chain diagram | High | TBD | Same unit_id used in all 5 records | unit_id joins across repos |
| X3 | Evidence record includes model version | README evidence requirements | High | TBD | Record which model version made the call | model_version field in record |
| X4 | Evidence record includes timestamp | README evidence requirements | High | TBD | UTC timestamp of agent call | captured_at in record |

---

## Honesty Rules (Assessment Criteria)

| ID | Requirement | Source | Priority | Status | Implementation | Verification |
|---|---|---|---|---|---|---|
| H1 | Say what you built, not what it sounds like | RULES.md "Honesty rules" | Critical | TBD | Distinguish: content hash ≠ tamper-proof; uncertain ≠ low-confidence pass | Code/docs accurately describe capabilities |
| H2 | Overrides are data | RULES.md "Honesty rules" | High | TBD | When operator disagrees, capture: original verdict, new verdict, reason | Override records preserved; never silent discard |
| H3 | Report a number per check, with FP/FN separately | RULES.md "Honesty rules" | Critical | TBD | Per-check accuracy; FP count; FN count; method written down | eval-report.md includes all three |
| H4 | Contradictions are findings | RULES.md "Honesty rules" | High | TBD | When background materials disagree, raise as Issue with `finding` label | Issues created and documented |

---

## Timeline & Submission Requirements

| ID | Requirement | Source | Priority | Status | Implementation | Verification |
|---|---|---|---|---|---|---|
| T1 | Build starts: 25 Sep 2026, 9:00 AM IST | Handbook (confirmed) | Critical | Started | — | — |
| T2 | Submissions open: 27 Sep 2026 | Handbook (confirmed) | High | TBD | Pull request can be opened | — |
| T3 | Final deadline: 1 Oct 2026, 6:00 PM IST | Handbook (confirmed) | Critical | TBD | All work merged by deadline | — |
| T4 | Technical evaluation: 2–3 Oct | Handbook (confirmed) | High | TBD | — | — |
| T5 | Demo video required | Handbook (confirmed) | High | TBD | Record 5-minute demo (customer → checks → record → live unit → kill condition) | Video file in submission folder |
| T6 | Evaluation results report required | Handbook (confirmed) | Critical | TBD | eval-report.md with per-check numbers | File exists with full breakdown |
| T7 | LinkedIn post mandatory | Handbook (confirmed) | High | TBD | Post about project to LinkedIn | Social proof of completion |

---

## Summary

**Total Requirements Tracked:** 56  
**Critical:** 24  
**High:** 21  
**Medium:** 0  
**Low:** 0  

**Status Breakdown:**
- Pre-built (GitHub): 6
- TBD (to implement): 50

**Key Dependencies for Implementation:**
1. Architecture and scope boundary must be locked before coding
2. Evaluation methodology must be designed before building agent
3. Evidence schema must be agreed before persistence layer
4. Cross-pod contract must be confirmed before output layer
5. Security/tenancy isolation must be verified automatically before feature work

