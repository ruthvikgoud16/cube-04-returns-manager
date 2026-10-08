# Recovery Manager — Architecture Improvements for Round 3

**For:** Mohammed Moghnishah (`mdmoghnishah`)  
**Repo:** https://github.com/mdmoghnishah/cube26-rcy-0266-mdmoghnishah  
**Track:** 05 · Recovery Manager  
**Author of this note:** Ruthvik (Pod 4 · Returns) — for Pod integration, not a rewrite of your Round 2 core.

Your Round 2 Recovery Manager is already a **real agent**: structured evidence in → Python rules → CONTRADICTS / SUPPORTS / SILENT / UNCERTAIN → review packet; OpenAI only summarizes. Keep that. Round 3 needs you as the **downstream consumer** of Prep / Pack / Returns / Receiving records through a frozen A2A contract.

---

## 1. What to keep (do not regress)

- No camera / no image classification. Recovery reasons over records.
- Rules decide assessment; model does not choose CONTRADICTS vs SUPPORTS.
- Outcomes: CONTRADICTS | SUPPORTS | SILENT | UNCERTAIN.
- Does not auto-file claims or invent eligibility.
- Org isolation: bearer → `org_demo_alpha` / `org_demo_bravo` + Postgres RLS.
- Honest eval stance: regression + isolation done; **50-unit two-labeler claim accuracy not claimed**.
- Fail toward UNCERTAIN / REVIEW when data is bad, not toward false CONTRADICTS.

---

## 2. Target architecture (Round 3–ready)

```text
Receiving ──┐
Prep ───────┼──► evidence records (A2A / import)
Pack ───────┤
Returns ────┘
                 │
                 ▼
        ┌────────────────────┐
        │ Pod Orchestrator   │
        │ POST /v1/recovery/ │
        │ assess             │
        └─────────┬──────────┘
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                  RECOVERY AGENT BOUNDARY                    │
│                                                             │
│  1. Auth → org_id                                           │
│  2. Validate charge line + evidence bundle (Pydantic)       │
│  3. Normalize upstream agents into one evidence schema      │
│  4. Match charge ↔ evidence (ids, timing, conflicts)        │
│  5. Deterministic rules (prep / shipment / return / …)      │
│  6. Reconciliation (duplicates, reimbursements)             │
│  7. Assessment + flags + rule_version                       │
│  8. Potential claim + review packet (conditional)           │
│  9. Optional: ONE OpenAI summary (never mutates assessment) │
│ 10. Persist decision version (append-only)                  │
│ 11. Return A2A JSON + trace                                 │
└─────────────────────────────────────────────────────────────┘
```

**Invariant:** Orchestrator can run Recovery headlessly. Dashboard stays for humans; A2A is for the system.

---

## 3. Freeze this A2A contract first (`/contracts/recovery.v1.json`)

### Request

```json
{
  "contract_version": "recovery.v1",
  "organization_id": "org_demo_alpha",
  "client_request_id": "uuid",
  "charge": {
    "line_id": "FEE-1001",
    "unit_id": "UNIT-0007",
    "report_type": "fee_report",
    "charge_type": "inbound_defect_fee",
    "amount_usd": "2.50",
    "quantity": "1",
    "posted_date": "2026-09-15",
    "allegation": "missing_suffocation_warning"
  },
  "upstream_evidence": [
    {
      "agent": "prep",
      "record_id": "insp_...",
      "unit_id": "UNIT-0007",
      "captured_at": "2026-09-01T10:00:00Z",
      "operational_status": "READY",
      "checks": [
        {
          "check_key": "SUFFOCATION_WARNING_PRESENCE",
          "verdict": "pass",
          "confidence": 0.9,
          "rule_id": "...",
          "detail": {}
        }
      ],
      "images": [{ "sha256": "...", "slot": "label" }],
      "content_hash": "sha256:...",
      "raw": {}
    },
    {
      "agent": "returns",
      "record_id": "rtn_...",
      "unit_id": "UNIT-0007",
      "checks": [
        {
          "check_key": "identity",
          "verdict": "pass",
          "confidence": 0.88,
          "detail": {}
        }
      ],
      "content_hash": "sha256:...",
      "raw": {}
    }
  ],
  "options": {
    "include_ai_summary": false,
    "timeout_ms": 30000
  }
}
```

### Response (success)

```json
{
  "contract_version": "recovery.v1",
  "agent": "recovery",
  "organization_id": "org_demo_alpha",
  "decision_id": "dec_...",
  "status": "complete",
  "assessment": "CONTRADICTS",
  "claim_status": "REVIEW_FOR_POTENTIAL_DISPUTE",
  "claim_amount_usd": null,
  "reason": "Prep evidence shows suffocation warning present under rule …",
  "supporting_evidence_ids": ["insp_..."],
  "flags": [],
  "reconciliation": { "status": "NONE", "blocks_claim": false },
  "review_packet": {},
  "rule_version": "recovery-rules-1.0",
  "ai_summary": null,
  "timing": { "total_ms": 40, "rules_ms": 35, "ai_ms": 0 },
  "trace": {
    "called_steps": ["validate", "match", "prep_rules", "reconcile", "packet"],
    "upstream_agents_seen": ["prep", "returns"],
    "ai_called": false,
    "fail_open": false
  }
}
```

### Response (fail-open / uncertain)

```json
{
  "contract_version": "recovery.v1",
  "agent": "recovery",
  "status": "degraded",
  "assessment": "UNCERTAIN",
  "claim_status": "REVIEW",
  "error": {
    "code": "UPSTREAM_EVIDENCE_INCOMPLETE",
    "message": "No prep or returns record for unit_id",
    "retryable": false
  },
  "trace": { "fail_open": true, "ai_called": false }
}
```

Map HTTP:
- `200` for complete and degraded.
- `400` invalid contract.
- `401` auth.
- If OpenAI fails, **keep the rule assessment** and set `ai_summary` error — never wipe CONTRADICTS because the summary timed out.

---

## 4. Best next architecture upgrades (priority order)

### P0 — Pod-critical

1. **`POST /v1/recovery/assess`**  
   Accept charge + `upstream_evidence[]` in one shot (orchestrator path). Keep CSV import for humans.

2. **Normalize adapter layer**  
   `normalize_prep(record)`, `normalize_returns(record)`, `normalize_pack(record)`, `normalize_receiving(record)` → one internal evidence shape.  
   When Pack/Receiving are stubs, accept:
   ```json
   { "agent": "pack", "status": "unavailable", "reason": "STUB_HOLD" }
   ```
   and assess as SILENT/UNCERTAIN on that slice — **do not 500**.

3. **Fail-open rules**  
   - Missing upstream → SILENT or UNCERTAIN (document which).  
   - Identifier conflict → UNCERTAIN.  
   - AI failure → assessment unchanged.  
   - Invalid money fields → UNCERTAIN / REVIEW.

4. **Contract with Returns + Prep**  
   Sit with Ruthvik + Preethika once: exact `checks[].check_key` / verdict casing (`pass` vs `PASS`). Pick one; version it.

### P1 — Board quality

5. **Trace for judges**  
   `trace.upstream_agents_seen`, which rule module fired, whether claim was blocked by reconciliation.

6. **Demo packet endpoint**  
   `GET /v1/recovery/demo/cases` — 3 frozen stories:
   - Prep contradicts packaging fee  
   - Return receipt contradicts  
   - Missing evidence → UNCERTAIN  
   Stage must not depend on live CSV upload.

7. **Idempotency**  
   `client_request_id` + charge `line_id` → same `decision_id` if inputs unchanged (content hash of request).

8. **Keep claim humility in the UI and API**  
   Label amounts as **potential / conditional**. Never “approved recoverable.”

### P2 — Strength (if time)

9. **Narrow, honest eval expansion**  
   You already refused fake 50-unit accuracy. If time: 20–30 synthetic fee+evidence cases with two reviewers **or** keep smoke + say “independent eval pending.” Either is fine; lying is not.

10. **Policy context**  
    Keep Seller Central retrieval attempts; store `applicability_status: UNVERIFIED` when login-walled. Surface that flag in the packet.

11. **Decision versioning**  
    Already append-only — expose `decision_version` and “latest for line_id” clearly to the orchestrator.

12. **Contract tests**  
    Golden JSON fixtures: given charge+evidence → expected assessment. Run in CI. This is your Round 3 reliability story.

---

## 5. What not to do

- Do not add a vision model to “see” photos — out of track and will dilute Recovery.
- Do not let OpenAI override rule assessments.
- Do not claim 50-unit accuracy you have not run.
- Do not require the Next dashboard for the Pod happy path.
- Do not block on Vinay/Vivek finishing — consume stubs as unavailable evidence.

---

## 6. Suggested folder layout (additive)

```text
contracts/
  recovery.v1.json
backend/recovery/a2a/
  request.py
  response.py
  normalize_upstream.py
  assess_endpoint.py
docs/
  A2A.md
  UPSTREAM_EVIDENCE.md    # what Prep/Returns must send
  DEMO_CASES.md
```

---

## 7. How you plug into the Pod happy path

```text
Orchestrator
  → (optional) Receiving stub HOLD
  → Prep inspect (real)
  → (optional) Pack stub HOLD
  → Returns grade (real)
  → Recovery assess (real) with Prep + Returns evidence + fee line
  → Combined answer + full agent trace
```

Your minute on stage: “I turn upstream evidence into CONTRADICTS/SUPPORTS/SILENT/UNCERTAIN and a review packet. The model only explains; rules decide.”

---

## 8. Definition of done for Pod 4 (Recovery)

- [ ] `recovery.v1` schema committed  
- [ ] Orchestrator can POST charge + Prep/Returns evidence and get an assessment  
- [ ] OpenAI down → assessment still returned  
- [ ] Missing Pack/Receiving → UNCERTAIN/SILENT, not crash  
- [ ] Three demo cases for stage  
- [ ] README: A2A + “no claim filing” + eval honesty  

---

## 9. Message to Pod lead when ready

> Recovery A2A `recovery.v1` frozen. Assess endpoint live. AI failure isolated. Demo cases: contradict / support / uncertain. Ready to consume Prep + Returns evidence.

That makes you the financial brain of the Pod — exactly where Recovery should sit.
