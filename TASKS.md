# TASKS.md: Implementation Work Breakdown

**Document Purpose:** Track implementation work from Phase 1 (audit) through final submission. Organized by Face and daily sprints.

**Current Phase:** Phase 1 — Audit (25 Sep, Morning)  
**Next Phase:** Face 1 — Outcome First (25 Sep, Afternoon)  
**Deadline:** 1 Oct 2026, 6:00 PM IST

---

## Phase 1: Audit & Planning (CURRENT)

**Status:** IN PROGRESS  
**Owner:** Lead Architect  
**Verification Gate:** Audit artifacts complete and locked

### Phase 1 Tasks

- [x] P1.1: Read README.md, RULES.md, GITHUB-GUIDE.md
- [x] P1.2: Extract data requirements from data/README.md and returns_sample.csv
- [x] P1.3: Audit submission structure (submissions/_TEMPLATE/)
- [x] P1.4: Identify organizer clarifications already confirmed
- [x] P1.5: Create REQUIREMENTS_REGISTER.md (sourced requirements)
- [x] P1.6: Create CLARIFICATIONS.md (unresolved questions + findings)
- [x] P1.7: Create DECISIONS.md (engineering decisions locked)
- [x] P1.8: Create ARCHITECTURE.md (system design + evidence schema)
- [x] P1.9: Create CLAUDE.md (durable coding constraints)
- [x] P1.10: Create BUILD_BRIEF.md (customer problem + success criteria)
- [x] P1.11: Create TASKS.md (this file; work breakdown)
- [ ] P1.12: Create BUILD_LOG.md (template for build tracking)
- [ ] P1.13: Lock planning documents (no more changes without approval)

**Verification Gate:**
- [ ] All 7 control documents complete
- [ ] No contradictions between documents
- [ ] Requirements matrix comprehensive
- [ ] Organizer clarifications cited correctly
- [ ] Architecture proposal coherent

---

## Face 1: Outcome First (25 Sep Afternoon – 26 Sep Evening)

**Deliverable:** Customer letter, PR/FAQ, one-pager, CLAUDE.md  
**Definition of Done:** Non-code artifacts complete; kill condition stated; another pod reads one-pager and restates kill condition  
**Status:** NOT STARTED

### Face 1 Tasks

- [ ] F1.1: Write customer letter (01-customer-letter.md)
  - [ ] F1.1a: Write in voice of prep center operator
  - [ ] F1.1b: Describe their day / problem
  - [ ] F1.1c: Show what our agent delivers
  - [ ] F1.1d: Explain impact (faster, consistent, auditable)
  - Verification: Read aloud; sounds honest, not marketing fluff

- [ ] F1.2: Write PR/FAQ (02-prfaq.md)
  - [ ] F1.2a: What is this?
  - [ ] F1.2b: How is it different from operator guessing?
  - [ ] F1.2c: What's the accuracy?
  - [ ] F1.2d: What are the limitations?
  - [ ] F1.2e: Hard questions: "What if it fails?", "How do you know it's better?"
  - Verification: FAQ addresses honest concerns, not just sales points

- [ ] F1.3: Write one-pager (03-one-pager.md)
  - [ ] F1.3a: Metrics table (accuracy, FP, FN, UNCERTAIN rate)
  - [ ] F1.3b: Kill condition (red line for stopping)
  - [ ] F1.3c: Business impact (if we hit targets)
  - Verification: Someone outside team reads it and can restate kill condition

- [ ] F1.4: Verify CLAUDE.md locked
  - [ ] F1.4a: No architectural changes after this
  - [ ] F1.4b: Coding constraints clear
  - [ ] F1.4c: No ambiguity on forbidden patterns

**PR for Face 1:**
- Title: `[ruthvikgoud16] Face 1 – customer letter, PR/FAQ, one-pager`
- Checklist: branch=ruthvikgoud16, files in submissions/ruthvikgoud16/, no secrets, build log updated
- Link: Add to pull request

**Verification Gate:**
- [ ] All 3 artifacts exist and are non-empty
- [ ] Kill condition is clear and measurable
- [ ] No contradiction with ARCHITECTURE.md / BUILD_BRIEF.md
- [ ] Another pod confirms they understand kill condition
- [ ] PR merged to main

---

## Face 2: Context (27 Sep Morning – 27 Sep Afternoon)

**Deliverable:** Org isolation test + database schema  
**Definition of Done:** Isolation test passes green; schema validated; no data leakage possible  
**Status:** NOT STARTED

### Face 2 Tasks

- [ ] F2.1: Set up development environment
  - [ ] F2.1a: Python 3.9+ virtual environment
  - [ ] F2.1b: Install dependencies (anthropic, pytest, pydantic, etc.)
  - [ ] F2.1c: .env.example with required keys (ANTHROPIC_API_KEY)
  - [ ] F2.1d: Confirm API credentials work
  - Verification: `pytest -v` runs without import errors

- [ ] F2.2: Design and implement database schema
  - [ ] F2.2a: Create schema.sql (returns_manager.records, returns_manager.overrides)
  - [ ] F2.2b: Add org_id to every table
  - [ ] F2.2c: Create primary keys (record_id unique)
  - [ ] F2.2d: Add indexes on (org_id, unit_id) for query speed
  - Verification: Schema review; no secrets in DDL

- [ ] F2.3: Implement org isolation test
  - [ ] F2.3a: Create test fixtures (org_demo_alpha, org_demo_bravo)
  - [ ] F2.3b: Write auth context manager (set_auth_org)
  - [ ] F2.3c: Test: org_A creates record, org_B cannot read it
  - [ ] F2.3d: Test: list_records() only returns org's own records
  - [ ] F2.3e: Test: attempted CRUD on other org's record raises NotFound
  - Verification: `pytest tests/test_isolation.py -v` passes 100%

- [ ] F2.4: Implement Pydantic schema + validation
  - [ ] F2.4a: Define CheckVerdict, ConditionResult, DispositionResult classes
  - [ ] F2.4b: Add validators (confidence in [0.0, 1.0], verdict enum, etc.)
  - [ ] F2.4c: Write schema validation test
  - Verification: `pytest tests/test_schema.py -v` passes

- [ ] F2.5: Implement base persistence layer (queries)
  - [ ] F2.5a: get_record(unit_id) with org_id filter
  - [ ] F2.5b: list_records() with org_id filter
  - [ ] F2.5c: create_record() with org_id enforcement
  - [ ] F2.5d: update_record() with org_id check
  - Verification: Isolation test still passes

**PR for Face 2:**
- Title: `[ruthvikgoud16] Face 2 – database schema & org isolation`
- Checklist: isolation test passes, schema DDL included, .env.example provided
- Link: Add to pull request

**Verification Gate:**
- [ ] `pytest tests/test_isolation.py -v` passes 100%
- [ ] Schema review: org_id on all tables
- [ ] No cross-org data possible
- [ ] Code meets CLAUDE.md constraints

---

## Face 3: Tools (28 Sep Morning – 29 Sep Afternoon)

**Deliverable:** Headless agent running on fixture images  
**Definition of Done:** Agent processes 5 fixture images end-to-end; produces structured output; no UI required  
**Status:** NOT STARTED

### Face 3 Tasks

- [ ] F3.1: Capture fixture images
  - [ ] F3.1a: Select 5–10 diverse products (lamp, puzzle, towel, bottle, etc.)
  - [ ] F3.1b: Capture 2–3 photos per product (from different angles)
  - [ ] F3.1c: Store in fixtures/returns/UNIT-XXXX_N.jpg
  - [ ] F3.1d: Create fixture manifest (unit, product, parts list)
  - Verification: 15–30 fixture images ready

- [ ] F3.2: Implement model layer (Claude API call)
  - [ ] F3.2a: Create model_layer.py with call_model(images, parts_list, sku) function
  - [ ] F3.2b: Implement system prompt (identity, completeness, condition, disposition)
  - [ ] F3.2c: Parse JSON response from Claude
  - [ ] F3.2d: Add retry logic (exponential backoff, max_retries=3)
  - [ ] F3.2e: Add timeout handling (30s limit)
  - Verification: `pytest tests/test_model_layer.py::test_call_model -v` passes

- [ ] F3.3: Implement output validation
  - [ ] F3.3a: Validate model output JSON schema
  - [ ] F3.3b: Check verdict enums (pass, fail, uncertain)
  - [ ] F3.3c: Check confidence in [0.0, 1.0]
  - [ ] F3.3d: Check amazon_condition enum (or null)
  - [ ] F3.3e: Raise ValidationError on schema mismatch
  - Verification: `pytest tests/test_output_validation.py -v` passes

- [ ] F3.4: Implement policy logic layer
  - [ ] F3.4a: Create policy_logic.py with disposition rules
  - [ ] F3.4b: Rule: if identity=fail → disposition=dispose
  - [ ] F3.4c: Rule: if completeness=fail AND parts_critical → disposition=refurbish or liquidate
  - [ ] F3.4d: Rule: if condition=acceptable AND identity=pass → suggest restock (not liquidate)
  - [ ] F3.4e: Confidence weighting (lower if uncertainty present)
  - Verification: `pytest tests/test_policy.py -v` passes

- [ ] F3.5: Implement full pipeline (CLI)
  - [ ] F3.5a: Create cli.py with process_return(unit_id, photo_paths) command
  - [ ] F3.5b: Load photos → call model → validate → apply policy → create record
  - [ ] F3.5c: Return structured JSON output
  - [ ] F3.5d: Implement fail-open behavior (catch timeout, return pending_review)
  - [ ] F3.5e: Log latency, token usage
  - Verification: `python cli.py process_return UNIT-0001 fixtures/returns/UNIT-0001_*.jpg` produces JSON

- [ ] F3.6: Test end-to-end on 5 fixture units
  - [ ] F3.6a: Run agent on fixtures/returns/UNIT-0001_*.jpg
  - [ ] F3.6b: Verify output JSON valid
  - [ ] F3.6c: Spot-check verdict makes sense for product
  - [ ] F3.6d: Verify evidence_photos references correct images
  - [ ] F3.6e: Repeat for 4 more units
  - Verification: 5 fixture units process successfully, no exceptions

- [ ] F3.7: Add fail-open test
  - [ ] F3.7a: Mock model call to timeout (raise TimeoutError)
  - [ ] F3.7b: Verify record created with status=pending_review
  - [ ] F3.7c: Verify operator not blocked (result returned)
  - [ ] F3.7d: Repeat for APIError, SchemaValidationError
  - Verification: `pytest tests/test_fail_open.py -v` passes 100%

**PR for Face 3:**
- Title: `[ruthvikgoud16] Face 3 – headless agent, batch multimodal call`
- Checklist: 5 fixtures process end-to-end, fail-open test passes, no UI required
- Link: Add to pull request

**Verification Gate:**
- [ ] `python cli.py process_return UNIT-0001 fixtures/returns/UNIT-0001_*.jpg` succeeds
- [ ] Output JSON validates against schema
- [ ] Fail-open test passes (model error → pending_review, not crash)
- [ ] Latency logged and < 10s per call (p99)
- [ ] All tests pass: `pytest tests/ -v`

---

## Face 4: Evals & Guardrails (30 Sep Morning – 30 Sep Evening)

**Deliverable:** Eval report with numbers and failure mode analysis  
**Definition of Done:** 50-unit eval, 2 human labels, per-check accuracy, FP/FN reported, failure modes documented  
**Status:** NOT STARTED

### Face 4 Tasks

- [ ] F4.1: Capture eval dataset (50 units)
  - [ ] F4.1a: Acquire 60–70 product photos (real returns or staged)
  - [ ] F4.1b: Select 50 for held-out eval (never seen during dev)
  - [ ] F4.1c: Reserve 10–20 for debugging
  - [ ] F4.1d: Create eval_manifest.csv (unit_id, sku, parts_list)
  - Verification: 50 held-out units with 2–3 photos each

- [ ] F4.2: Create labeling rubric
  - [ ] F4.2a: Define identity_match (pass/fail/uncertain)
  - [ ] F4.2b: Define completeness_match (pass/fail/uncertain)
  - [ ] F4.2c: Define condition grade (like_new / very_good / good / acceptable)
  - [ ] F4.2d: Define disposition (restock / refurbish / liquidate / dispose)
  - [ ] F4.2e: Write examples for each category
  - Verification: Rubric unambiguous; two people can apply consistently

- [ ] F4.3: Run two independent human labelers
  - [ ] F4.3a: Recruit labeler 1 (subject matter expert or prep center operator)
  - [ ] F4.3b: Recruit labeler 2 (independent, different person)
  - [ ] F4.3c: Provide labeling tool (spreadsheet or simple web form)
  - [ ] F4.3d: Labeler 1 assesses all 50 units
  - [ ] F4.3e: Labeler 2 assesses all 50 units (without seeing labeler 1's answers)
  - Verification: Two independent label files, no communication between labelers

- [ ] F4.4: Measure inter-rater agreement
  - [ ] F4.4a: Compute Cohen's kappa for each check (identity, completeness, condition, disposition)
  - [ ] F4.4b: Flag disagreements (kappa < 0.6 per check)
  - [ ] F4.4c: Investigate root causes of disagreement
  - [ ] F4.4d: If kappa < 0.6: resolve via arbiter or re-label
  - Verification: Kappa scores documented; ground truth established

- [ ] F4.5: Establish ground truth
  - [ ] F4.5a: Where labelers agree: ground truth = agreement
  - [ ] F4.5b: Where labelers disagree: resolve via majority or expert review
  - [ ] F4.5c: Create ground_truth.csv (50 rows × 4 checks)
  - Verification: Ground truth frozen; no modifications after this point

- [ ] F4.6: Run agent on eval set
  - [ ] F4.6a: Process all 50 eval units through agent pipeline
  - [ ] F4.6b: Capture agent output (verdict, confidence, evidence)
  - [ ] F4.6c: Log any failures (timeouts, API errors, schema validation)
  - Verification: 50 agent outputs collected; failures logged

- [ ] F4.7: Compute per-check accuracy
  - [ ] F4.7a: Identity accuracy: (correct / total) × 100
  - [ ] F4.7b: Completeness accuracy
  - [ ] F4.7c: Condition accuracy
  - [ ] F4.7d: Disposition accuracy
  - [ ] F4.7e: Overall accuracy (average of 4 checks)
  - Verification: Per-check % calculated and documented

- [ ] F4.8: Compute FP and FN separately
  - [ ] F4.8a: FP (False Positive): agent=pass, truth=fail, count & %
  - [ ] F4.8b: FN (False Negative): agent=fail, truth=pass, count & %
  - [ ] F4.8c: Analyze FP cases (why did agent miss them?)
  - [ ] F4.8d: Analyze FN cases (why did agent over-reject?)
  - Verification: FP and FN % calculated; patterns identified

- [ ] F4.9: Document failure modes
  - [ ] F4.9a: Categorize failures by root cause
  - [ ] F4.9b: Category: "Poor lighting" (N cases, % of failures)
  - [ ] F4.9c: Category: "Partial visibility" (N cases)
  - [ ] F4.9d: Category: "Ambiguous product" (N cases)
  - [ ] F4.9e: Category: "Data quality" (N cases)
  - Verification: Failure mode report with counts

- [ ] F4.10: Write eval report
  - [ ] F4.10a: eval-report.md with methodology (50 units, 2 labelers, kappa)
  - [ ] F4.10b: Results table (per-check accuracy, FP%, FN%, UNCERTAIN%)
  - [ ] F4.10c: Failure modes section (categories + examples)
  - [ ] F4.10d: Conclusion (if accuracy ≥ 75% or < 60%, what does it mean?)
  - Verification: Report complete, numbers match calculations

- [ ] F4.11: Decision gate: Kill condition?
  - [ ] F4.11a: Is overall accuracy ≥ 75%?
  - [ ] F4.11b: Is FN rate < 5%?
  - [ ] F4.11c: If YES to both: proceed to Face 5
  - [ ] F4.11d: If NO to either: document finding, consider pivot or halt
  - Verification: Team decision recorded in BUILD_LOG

**PR for Face 4:**
- Title: `[ruthvikgoud16] Face 4 – eval report, 50-unit held-out set`
- Checklist: eval report filed, per-check metrics, FP/FN breakdown, failure modes documented
- Link: Add to pull request

**Verification Gate:**
- [ ] Eval report complete: per-check accuracy, FP%, FN%, failure modes
- [ ] Inter-rater kappa calculated (target > 0.6 per check)
- [ ] Ground truth frozen (no further labeling changes)
- [ ] Overall accuracy measured
- [ ] Kill condition assessed (halt if < 60% or FN > 10%)
- [ ] Results honest: report what was found, not what we hoped

---

## Face 5: Decision Tracing (1 Oct Morning, if eval passes)

**Deliverable:** Evidence record page UI  
**Definition of Done:** Operator can view record with evidence links, can override decision  
**Status:** BLOCKED (pending eval gate)

### Face 5 Tasks (Conditional on Face 4 passing)

- [ ] F5.1: Design evidence record UI
  - [ ] F5.1a: Show 4 checks (identity, completeness, condition, disposition)
  - [ ] F5.1b: Show verdict + confidence for each
  - [ ] F5.1c: Link to photo evidence (clickable photos)
  - [ ] F5.1d: Show reasoning ("Minor scratches visible")
  - Verification: Mockup reviewed

- [ ] F5.2: Implement evidence record display
  - [ ] F5.2a: Create simple web UI (Flask or FastAPI + HTML)
  - [ ] F5.2b: Query record from database
  - [ ] F5.2c: Render checks + photos
  - [ ] F5.2d: Mobile-responsive layout
  - Verification: UI renders record without errors

- [ ] F5.3: Implement override capture
  - [ ] F5.3a: Add "Override" button for each check
  - [ ] F5.3b: Collect: new verdict, reason
  - [ ] F5.3c: Capture: operator_id, override_at timestamp
  - [ ] F5.3d: Append to record.overrides list (don't discard original)
  - Verification: Override persisted correctly

- [ ] F5.4: Test on mobile (if possible)
  - [ ] F5.4a: Test on real phone or emulator
  - [ ] F5.4b: Check layout, button responsiveness
  - [ ] F5.4c: Verify cellular network works (not just WiFi)
  - Verification: UI usable on 5" phone screen

**PR for Face 5:**
- Title: `[ruthvikgoud16] Face 5 – evidence record UI, override capture`
- Checklist: operator can view record, can override, mobile-responsive
- Link: Add to pull request

**Verification Gate:**
- [ ] Evidence record displays correctly on web
- [ ] Operator can override decision
- [ ] Override reason captured and persisted
- [ ] Works on mobile device or emulator

---

## Face 6: Agent Comms (1 Oct Afternoon, before deadline)

**Deliverable:** Cross-pod contract, final submissions  
**Definition of Done:** JSON output contract ready for Recovery Manager; all artifacts submitted  
**Status:** BLOCKED (pending Face 5)

### Face 6 Tasks (Conditional on Face 5 passing)

- [ ] F6.1: Finalize cross-pod contract
  - [ ] F6.1a: Define JSON schema for RTN output
  - [ ] F6.1b: Specify fields needed by Recovery Manager
  - [ ] F6.1c: Create sample output JSON
  - [ ] F6.1d: Document versioning and backward compatibility
  - Verification: Contract document (contract/returns_manager_output.md) complete

- [ ] F6.2: Implement API endpoint
  - [ ] F6.2a: Create GET /api/v1/returns/{record_id} endpoint
  - [ ] F6.2b: Auth check (org_id verification)
  - [ ] F6.2c: Return JSON in contract format
  - [ ] F6.2d: Handle missing record (404)
  - Verification: curl http://localhost:8000/api/v1/returns/RTN-XXXX returns JSON

- [ ] F6.3: Create README.md for submission
  - [ ] F6.3a: How to run the agent (CLI command)
  - [ ] F6.3b: How to start the API server
  - [ ] F6.3c: Environment setup (.env.example)
  - [ ] F6.3d: Test fixtures location
  - [ ] F6.3e: Eval results summary
  - Verification: README complete and tested

- [ ] F6.4: Create demo video (5 minutes)
  - [ ] F6.4a: Show the customer / their problem (30s)
  - [ ] F6.4b: Show what we measured: per-check accuracy (60s)
  - [ ] F6.4c: Show the record page / evidence (60s)
  - [ ] F6.4d: Live demo: run agent on one unit end-to-end (90s)
  - [ ] F6.4e: State the kill condition and whether we hit it (30s)
  - Verification: Video uploaded to submission folder

- [ ] F6.5: Final PR + merge
  - [ ] F6.5a: Commit all remaining changes
  - [ ] F6.5b: Update build-log.md with final status
  - [ ] F6.5c: Ensure all tests pass: `pytest tests/ -v`
  - [ ] F6.5d: Verify no secrets in repo (scan .env, keys, etc.)
  - [ ] F6.5e: Open PR with final checklist
  - Verification: CI/CD passes, all checks green

- [ ] F6.6: Final deadline push
  - [ ] F6.6a: Ensure PR merged to main before 1 Oct 6:00 PM IST
  - [ ] F6.6b: Verify build-log.md updated
  - [ ] F6.6c: Confirm demo video in submissions/ruthvikgoud16/
  - Verification: All deliverables in main branch

- [ ] F6.7: Post to LinkedIn
  - [ ] F6.7a: Announce CUBE Buildathon project completion
  - [ ] F6.7b: Describe the Returns Manager problem + solution
  - [ ] F6.7c: Mention accuracy, eval methodology, key learnings
  - [ ] F6.7d: Link to GitHub repo
  - Verification: Post published

**PR for Face 6:**
- Title: `[ruthvikgoud16] Face 6 – cross-pod contract, final submission`
- Checklist: API endpoint works, demo video complete, README updated, all tests pass
- Link: Add to pull request

**Verification Gate:**
- [ ] Cross-pod contract document complete
- [ ] API endpoint returns JSON matching contract
- [ ] Demo video 5 min, covers all 5 points
- [ ] README runnable by someone unfamiliar with code
- [ ] All tests pass; isolation test passes
- [ ] No secrets in repo
- [ ] Merged to main before 1 Oct 6:00 PM IST

---

## Build Log Integration

### Daily Entry Format

```markdown
## Day N (Date)

### Morning
- [ ] Task started
- [ ] Blockers identified
- [ ] Progress

### Afternoon
- [ ] Task completed
- [ ] Verification result
- [ ] Next day prep

### Evening
- [ ] Commit pushed
- [ ] Tomorrow's priorities
- [ ] Risks flagged
```

### Key Decision Checkpoints

- [ ] Day 1 Evening: Architecture locked (CLAUDE.md, ARCHITECTURE.md, DECISIONS.md)
- [ ] Day 3 Evening: Org isolation test passes
- [ ] Day 4 Evening: Full pipeline (photo → model → record) working
- [ ] Day 5 Afternoon: Eval dataset labeled (ground truth frozen)
- [ ] Day 6 Morning: Eval results in (pass/fail decision gate)
- [ ] Day 7 Morning: Final push and merge by 6:00 PM

---

## Success Criteria per Face

| Face | Must-Have | Nice-to-Have | Kill Condition |
|---|---|---|---|
| 1 | Letter, FAQ, one-pager, CLAUDE.md | Poster art | Contradictions with requirements |
| 2 | Isolation test passes | Full schema docs | Isolation test fails |
| 3 | 5 fixtures process end-to-end | Batch API | Latency > 15s or crash on fixtures |
| 4 | Eval report: per-check accuracy, FP/FN, failure modes | Visualization | Accuracy < 60% or FN > 10% |
| 5 | Evidence UI renders, override captured | Mobile polish | UI crashes or override lost |
| 6 | API endpoint, README, demo video | Monitoring dashboard | Video missing or code not merged |

---

## Risk Tracking

| Risk | Mitigation | Check-In |
|---|---|---|
| Model latency > 5s | Cache, batch API, monitor daily | Day 2 evening |
| Eval dataset capture | Acquire stock photos early, backup | Day 4 morning |
| Labeler disagreement | Recruit experienced labeler, define rubric | Day 4 morning |
| Org isolation regression | Automated test + code review | Every commit |
| API key leak | .env + .gitignore + automated scan | Every PR |
| Merge conflict after main pulls | Rebase early, own only /submissions/ | Day 5 |

---

## Rollout Plan

**Green Path (Accuracy ≥ 75%, FN < 5%):**
- Continue to Face 5 + 6
- Proceed to final demo
- Project succeeds

**Yellow Path (Accuracy 60–74% or FN = 5–10%):**
- Document findings explicitly
- Analyze failure modes
- Consider: pivot features, re-eval set, or accept as finding
- Decide by Day 6 morning

**Red Path (Accuracy < 60% or FN > 10%):**
- Document as project finding (not failure)
- Halt further feature work
- Focus on explaining why and what was learned
- Complete demo as "what we found out"

---

## Summary

| Phase | Days | Deliverable | Status |
|---|---|---|---|
| Audit | 1 | Requirements, architecture, planning | IN PROGRESS |
| Face 1 | 1–2 | Customer letter, PR/FAQ, one-pager | NEXT |
| Face 2 | 1 | Schema + org isolation test | QUEUED |
| Face 3 | 2 | Headless agent on fixtures | QUEUED |
| Face 4 | 1 | Eval report (50 units, 2 labelers) | QUEUED |
| Face 5 | 1 | Evidence record UI | QUEUED (conditional) |
| Face 6 | 1 | API contract + final submission | QUEUED (conditional) |
| **Total** | **7** | **Working RTN agent + eval** | **IN PROGRESS** |

