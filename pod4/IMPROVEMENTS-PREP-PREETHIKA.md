# Prep Manager — Architecture Improvements for Round 3

**For:** Preethika (`MPreethika16`)  
**Repo:** https://github.com/MPreethika16/cube26-prp-0070-mpreethika16  
**Track:** 02 · Prep Manager  
**Author of this note:** Ruthvik (Pod 4 · Returns) — for Pod integration, not a rewrite of your Round 2 core.

Your Round 2 Prep Manager is already a **real agent**: Gemini observes → Zod → deterministic evaluators → READY / STOP_AND_FIX / REVIEW_REQUIRED. Do **not** throw that away. Round 3 wins on **contracts, fail-open, traces, and Recovery-ready evidence**.

---

## 1. What to keep (do not regress)

- Observe ≠ decide. Model never outputs PASS/FAIL for Amazon policy.
- UNCERTAIN and NOT_DETECTED ≠ physical absence.
- Fail-open to REVIEW_REQUIRED on vision timeout / 429.
- Tenancy: `org_demo_alpha` / `org_demo_bravo`.
- Authoritative rule IDs + Seller Central URLs on each check.
- Held-out honesty (95.1% field agreement on scorable fields; document not-scorable).

---

## 2. Target architecture (Round 3–ready)

```text
                    ┌─────────────────────┐
                    │  Pod Orchestrator   │
                    │  (single entry)     │
                    └──────────┬──────────┘
                               │ POST /v1/prep/inspect
                               │ (A2A contract)
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                     PREP AGENT BOUNDARY                      │
│                                                              │
│  1. Auth / org from token (never from body alone)            │
│  2. Validate request (Zod/OpenAPI)                           │
│  3. Resolve work order (or return WORK_ORDER_NOT_FOUND)      │
│  4. Evidence quality gate (blur / exposure / resolution)     │
│  5. ONE batched vision observation (Gemini)                  │
│  6. Zod observation schema                                   │
│  7. Deterministic evaluators (10 checks)                     │
│  8. Aggregate READY | STOP_AND_FIX | REVIEW_REQUIRED         │
│  9. Recovery planner (slot-targeted recapture)               │
│ 10. Persist evidence record + content_hash                   │
│ 11. Return A2A response (never crash the orchestrator)       │
└──────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    Recovery Manager (downstream)
```

**Invariant:** The orchestrator must never need your Next.js UI. HTTP + JSON only.

---

## 3. Freeze this A2A contract first (`/contracts/prep.v1.json`)

### Request

```json
{
  "contract_version": "prep.v1",
  "organization_id": "org_demo_alpha",
  "unit_id": "UNIT-0007",
  "work_order_id": "WO-0007",
  "client_request_id": "uuid",
  "images": [
    { "slot": "front", "url": "https://...", "sha256": "..." },
    { "slot": "back", "url": "https://...", "sha256": "..." },
    { "slot": "label", "url": "https://...", "sha256": "..." }
  ],
  "timeout_ms": 45000
}
```

Accept either `url` or `data_base64` for local/demo, but pick **one primary** for the Pod.

### Response (success)

```json
{
  "contract_version": "prep.v1",
  "agent": "prep",
  "organization_id": "org_demo_alpha",
  "unit_id": "UNIT-0007",
  "work_order_id": "WO-0007",
  "inspection_id": "insp_...",
  "status": "complete",
  "operational_status": "READY",
  "checks": [
    {
      "check_key": "POLYBAG_PRESENCE",
      "verdict": "pass",
      "confidence": 0.91,
      "reason_code": "REQUIREMENT_SATISFIED",
      "rule_id": "...",
      "source_url": "https://sellercentral.amazon.com/...",
      "detail": {},
      "model_version": "gemini-2.5-flash",
      "latency_ms": 1200
    }
  ],
  "observation_summary": {},
  "recovery_actions": [],
  "images": [{ "slot": "front", "sha256": "...", "key": "..." }],
  "content_hash": "sha256:...",
  "decided_by": "agent",
  "timing": { "total_ms": 1800, "vision_ms": 1200, "policy_ms": 5 },
  "trace": {
    "called_steps": ["validate", "quality_gate", "vision", "evaluate", "persist"],
    "vision_called": true,
    "fail_open": false
  }
}
```

### Response (fail-open — never HTTP 500 to the orchestrator)

```json
{
  "contract_version": "prep.v1",
  "agent": "prep",
  "status": "degraded",
  "operational_status": "REVIEW_REQUIRED",
  "error": {
    "code": "VISION_TIMEOUT",
    "message": "Gemini timed out after 45s",
    "retryable": true
  },
  "checks": [],
  "recovery_actions": [
    { "action": "RECAPTURE", "slots": ["front", "back", "label"], "reason": "vision_unavailable" }
  ],
  "trace": { "vision_called": true, "fail_open": true }
}
```

Map HTTP:
- `200` for complete **and** degraded (body carries status).
- `400` only for invalid contract.
- `401` for auth.
- Avoid `500` for model failures.

---

## 4. Best next architecture upgrades (priority order)

### P0 — Pod-critical (do before orchestration)

1. **Stable `/v1/prep/inspect` (or `/api/a2a/inspect`)**  
   Same pipeline as UI, no browser session required. Token → org.

2. **Fail-open envelope**  
   Timeout, 429, bad schema, missing images → `REVIEW_REQUIRED` + `error.code` + `trace.fail_open: true`.

3. **Demo path that cannot 404**  
   Ship `GET /v1/prep/demo/cases` with 3 frozen work orders (compliant / defect / uncertain).  
   Orchestrator and stage demo must never type PRODUCT-1 into a work-order field.

4. **Evidence export for Recovery**  
   One JSON blob Recovery can ingest: unit_id, checks, rule_ids, image hashes, operational_status, content_hash. Align field names with Moghnishah early.

### P1 — Board quality

5. **Close not-scorable gaps**  
   Held-out left seal / suffocation often not scorable. Add 10–15 units where those surfaces are visible, **or** document “not observable in dataset” in the eval note. Judges hate silent 0/0.

6. **Cost + latency line**  
   Log and expose `vision_ms`, `total_ms`, estimated $ / inspection (Flash). Prep is every unit; Round 3 and hiring care.

7. **Idempotency**  
   Honor `client_request_id`: same id + same image hashes → same inspection_id (no double charge / double vision).

8. **Trace for judges**  
   Return `trace.called_steps` so the orchestrator can show “Prep called vision → evaluated 10 checks → READY”.

### P2 — Strength (if time on 7–8 Oct)

9. **Second-labeler honesty**  
   If annotations are one person, say so. If two, report agreement. Do not invent Cohen’s kappa.

10. **Adversarial suite in CI**  
    Keep wrong-FNSKU / covered-barcode / crop cases as regression; one command `npm test && npm run vision:evaluate`.

11. **Contract versioning**  
    `prep.v1` frozen; breaking changes become `prep.v2`. Orchestrator pins version.

12. **Optional: image-by-URL fetch with size cap**  
    Orchestrator stores blobs; Prep pulls by URL with max bytes + content-type check.

---

## 5. What not to do

- Do not let Gemini invent Amazon rules again.
- Do not merge observation and compliance into one prompt “for speed.”
- Do not block the Pod on a perfect 50-unit re-eval before contracts exist.
- Do not require the Next UI for Round 3 submission path.
- Do not rewrite Receiving/Pack for Vinay/Vivek — stay Prep-excellent.

---

## 6. Suggested folder layout (additive)

```text
contracts/
  prep.v1.json          # OpenAPI or JSON Schema — source of truth
src/lib/a2a/
  prep-request.ts
  prep-response.ts
  fail-open.ts
src/app/api/v1/prep/inspect/route.ts
docs/
  A2A.md                # how orchestrator calls you
  DEMO_PATH.md          # 60-second stage path
```

---

## 7. Definition of done for Pod 4 (Prep)

- [ ] `prep.v1` schema committed  
- [ ] Orchestrator can call Prep with token + 3 images and get READY/STOP/REVIEW  
- [ ] Kill Gemini key → still get JSON REVIEW_REQUIRED (fail-open)  
- [ ] Demo cases endpoint works cold  
- [ ] Recovery can consume your evidence JSON without scraping the UI  
- [ ] One paragraph in README: Round 3 A2A + limits  

---

## 8. Message to Pod lead when ready

> Prep A2A `prep.v1` frozen. Endpoint live. Fail-open verified. Demo cases: A/B/C. Evidence export ready for Recovery.

That is enough for you to be a top-tier Prep node in the finale system.
