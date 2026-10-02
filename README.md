# Cube Buildathon · 04 · Returns Manager

**Round 2 · Individual Build**

> Five agents, one unit, one record that follows it.
> A physical product arrives, gets prepped, gets shipped, comes back. At every step a fast operational judgment has to be made and recorded.

**New here? Read these first:**

1. [`GITHUB-GUIDE.md`](GITHUB-GUIDE.md) explains how to fork the repository, set it up, build and push your work.
2. [`RULES.md`](RULES.md) covers the repository and engineering rules.

## This fork

ruthvikgoud16. One Claude vision call grades identity, completeness, and condition. `policy_v1` chooses the disposition afterwards. A bad frame or a failed call is saved as `pending_review`. It is not dropped, and it is not restocked.

### Read this in two minutes

A returned unit is photographed. The operator names the product and the required parts. The agent answers three checks from the photos: is it the named item, are the required parts shown, and which Amazon used grade fits what is visible. It does not choose restock or review. A fixed rule, `policy_v1`, does that after the checks validate. If any check is UNCERTAIN, or the model call fails, the capture is saved for a person. UNCERTAIN is not a pass.

The evidence record keeps the photos, each check’s verdict, confidence, model, and timing, the disposition, and a SHA-256 content hash. The hash shows whether a copy changed. It is not a tamper-proof seal. Demo organisations are `org_demo_alpha` and `org_demo_bravo`. The organisation comes from the signed session.

On this evaluation set, and only this set: identity 37/40 (92.5%), completeness 30/40 (75.0%), condition 17/40 (42.5%). Condition is the weak check, usually one step too generous on Amazon’s used scale. Disposition was not human-labeled. 40/40 saved dispositions match `policy_v1` on the agent’s own checks. 27/40 (67.5%) match `policy_v1` on the agreed human checks. That 67.5% is not a disposition accuracy. The full reading is [`EVALUATION.md`](EVALUATION.md).

This is an operator desk for the buildathon, not a claim that the same rates would hold in a warehouse. A reviewer walkthrough of the two saved cards is at https://rtn-returns-manager.vercel.app/demo . Next and Back move the desk. Opening RTN-019 and RTN-001 does not call the model.

The 50 products and their photographs are in the RTN collection on Google Drive: https://drive.google.com/drive/folders/1R8sk5n_OCvtidlbkyiL0IT6NBZpjT86Q . Each product folder holds the images used for that case, including files placed in `02 — PHOTOS`. RTN-017, RTN-026, and RTN-032 have no image files in that photos folder. The grades in this repository were read from those photographs. Opening the Drive folder does not run the model again.

```sh
npm install
npm test
npm run dev
```

Open `http://localhost:8787`, enter as `org_demo_alpha`, then again in a private window as `org_demo_bravo`. Set `ANTHROPIC_API_KEY` before expecting a real grade. Without it, the capture is still saved and held for a person.

`npm run db:up` starts Postgres. Point `DATABASE_URL` at `postgres://rtn_app:rtn_app@localhost:5432/rtn` and run `npm run test:tenancy`. The app role is not a superuser, and row-level security is forced.

`npm run eval:predict` runs the 12 photographed development cases. Those 12 are not the scored set. `npm run eval:score` reads `eval/labels.csv` and `collection/export/fifty/results.json`. It prints numbers only when two labelers are present and that file has 50 rows. That print uses every row, including three cases with no model output, so the submission figures are the ones in [`submissions/ruthvikgoud16/eval-report.md`](submissions/ruthvikgoud16/eval-report.md). The `expected_disposition` values in the fixture file are developer notes, not the scored labels.

Architecture: [`ARCHITECTURE.md`](ARCHITECTURE.md). How the build changed from the first plan: [`docs/project-evolution.md`](docs/project-evolution.md) ([PDF](docs/project-evolution.pdf)). How to read the rates: [`docs/evaluation.md`](docs/evaluation.md) ([PDF](docs/evaluation.pdf)). The `content_hash` is a SHA-256 of the canonical JSON. It shows whether a copy changed. It does not make the record immutable.

## This fork — what was measured

On the 40 agreed cases with valid model output, identity matched 92.5% (37/40), completeness 75.0% (30/40), and condition 42.5% (17/40). Condition at 42.5% is the condition-match rate. It is not an overall accuracy. Identity false positives and false negatives were 0. Identity was uncertain on 1/40. Completeness had 2 false positives, 0 false negatives, and was uncertain on 5/40. Seven cases were excluded because the two labelers disagreed: RTN-002, RTN-005, RTN-006, RTN-009, RTN-013, RTN-037, and RTN-044. RTN-017, RTN-026, and RTN-032 had no image files in the listed photo folders, so the model was not called. The 47 grades used 47 model calls, about 147,613 input tokens, 18,285 output tokens, and about $0.72 at the script rates. Disposition was not human-labeled, so the 38 restock, 8 pending-review, 1 refurbish, 0 liquidate, and 0 dispose outcomes are not a score. 40/40 saved dispositions match `policy_v1` from the saved agent checks. 27/40 (67.5%) match `policy_v1` applied to the agreed human checks. That 67.5% is not disposition accuracy. The full table is [`EVALUATION.md`](EVALUATION.md). The copy is frozen under `eval/frozen/2026-10-01T1015Z/`.

## How a return is processed

1. The operator opens the phone page, signs in as `org_demo_alpha` or `org_demo_bravo`, and submits photos plus the product name and parts list.
2. The quality gate drops unusable frames. Usable frames go to one Claude vision call (`claude-sonnet-4-5` unless `ANTHROPIC_MODEL` overrides it). That call grades identity, completeness, and condition together. It does not choose a disposition.
3. Zod checks the tool output. `policy_v1` then sets the disposition. Any UNCERTAIN check, or an identity mismatch, becomes `pending_review`. Confidence is stored and never turns UNCERTAIN into PASS. `dispose` is not produced.
4. The capture is stored as an evidence record scoped to the organisation on the session cookie. A model error, a timeout, a bad schema, or no usable photo still saves the record as `pending_review`. The stored schema is `rtn-0.1-provisional`. `GET /v1/records` projects that record into evidence-contract 1.1 for the caller’s organisation. There is no presigned upload endpoint. The public desk is https://rtn-returns-manager.vercel.app . The walkthrough is https://rtn-returns-manager.vercel.app/demo .

Setup is `.env.example`: `ANTHROPIC_API_KEY`, `SESSION_SECRET`, optional `DATABASE_URL`, `PORT` (8787), and `BLOB_DIR`. Without `DATABASE_URL`, records stay in memory and images stay under `BLOB_DIR`. Postgres row-level security is the path in `npm run db:up` and `npm run test:tenancy`.

Assumptions: identity is visual likeness to the named product, not a barcode. A missing SKU or ASIN stays `UNKNOWN`. A required part that is out of frame is UNCERTAIN, not FAIL. Amazon condition names follow the published used scale, and a photo does not prove that a device functions.

Limits: condition matching on the 40 cases is 42.5%. The result does not show that the same rates would hold on another set. Three evaluation folders contained no images. The public desk keeps records in memory on the host that answered the request, so a later visit can start empty. Local use is `http://localhost:8787`.

---

## Your problem statement: Returns Manager

|                              |                                       |
| ---------------------------- | ------------------------------------- |
| **Position in the chain**    | Step 4 of 5 · Customer return         |
| **Customer**                 | Seller, or prep center acting for one |
| **What gets recorded**       | Condition and disposition             |
| **Who consumes your output** | Recovery Manager                      |

Someone opens a returned parcel. In a few seconds they need to decide:

* Is this the item we sold?
* Is it complete?
* What condition is it in?
* What should happen to it next?

Your agent should make that process structured, consistent and evidence-backed.

### What the agent returns

From appropriate visual/input evidence, the Returns Manager should determine:

* **Identity** against the seller's own catalogue. Is this the ASIN/SKU that was ordered?
* **Completeness** against the expected parts list: accessories, manuals, cables and other required components.
* **Condition** using the published condition scale. Do not invent your own condition scale.
* **Disposition**, such as `restock`, `refurbish`, `liquidate`, `dispose` or `pending_review`.

> Moving even a few percent of returns from liquidation to restock is direct margin. That is the commercial case in one sentence.

---

## The chain you are part of

```text
 Supplier delivery      Inbound to Amazon     Outbound to buyer     Customer return        Money back
 ┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
 │ 01 Receiving │ ───▶ │ 02 Prep      │ ───▶ │ 03 Pack      │ ───▶ │ 04 Returns   │ ───▶ │ 05 Recovery  │
 │ condition on │      │ compliance   │      │ contents at  │      │ condition &  │      │ reads all    │
 │ arrival      │      │ proof        │      │ seal         │      │ disposition  │      │ four → claim │
 └──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
```

The first four Managers generate operational evidence. Recovery Manager consumes those records downstream.

Your output should therefore be structured, traceable and usable by the next stage.

---

## Reference data

`data/` contains **synthetic** reference data for development and testing. See [`data/README.md`](data/README.md) for the field definitions.

The SKUs, ASINs, FNSKUs, orders, suppliers, operators and amounts are invented. Requirement flags and fee amounts are **not** authoritative Amazon rules or fees.

The `photo_refs` values are placeholders, and images are not included with this repository. Create or use appropriate fixtures for development and evaluation.

All five Buildathon repositories share the same conceptual `unit_id` values, allowing a unit to be followed through the operational chain.

---

## How to build

This is an **individual Round 2 build**.

### Your workflow

```text
Fork
  ↓
Clone
  ↓
Understand the problem
  ↓
Build
  ↓
Test
  ↓
Evaluate
  ↓
Document
  ↓
Deploy / Demo
  ↓
Submit
```

Build your solution in **your own fork** of this repository.

You do not need to create a participant folder in the organiser repository or open a pull request into the organiser repository.

---

## What you should focus on

Your Returns Manager should be able to:

```text
Input / Return Evidence
        ↓
     Identity
        ↓
   Completeness
        ↓
     Condition
        ↓
    Disposition
        ↓
Structured Evidence Record
```

The exact internal architecture is up to you.

Focus on making the core workflow work reliably before adding unnecessary features.

A worked Returns example may be available in the repository resources. **Read it to understand the expected standard. Do not simply copy it.**

---

## Evidence & Decision Traceability

Your agent should produce structured evidence for its decisions.

The official evidence contract includes concepts such as:

* `record_id`
* `schema_version`
* `organization_id`
* `client_id`
* `agent`
* `subject`
* `captured_at`
* `operator_label`
* `images`
* `checks`
* `outcome`
* `overrides`
* `status`

Each check should make the result understandable through its verdict, confidence and supporting detail where applicable.

Use:

* **PASS** when the evidence supports the condition.
* **FAIL** when the evidence supports that the condition is not met.
* **UNCERTAIN** when the evidence is insufficient for a reliable judgment.

`UNCERTAIN` is a valid outcome. Do not force ambiguous cases into PASS or FAIL.

---

## Cross-Manager Compatibility

Round 2 is individual, but your output will eventually be consumed by Recovery Manager.

Use the **official evidence contract provided by the organisers** as the baseline for interoperability.

Do not create a separate negotiated cross-pod contract for Round 2.

Your decision should allow another system to understand:

```text
What was returned?
      ↓
What was checked?
      ↓
What did the agent decide?
      ↓
Why?
      ↓
What evidence supports it?
```

---

## Engineering expectations

Keep the system practical and reliable.

### Tenancy isolation

If you store persistent data, organisation/client data should remain properly isolated.

### Efficient model usage

Avoid unnecessary repeated model calls. Batch related reasoning where appropriate.

### Fail open

If a model or dependency fails, do not silently discard the input. Preserve the available information and move the case into an appropriate pending/review state.

### Authoritative rules

Where an external rule or requirement is needed, use the authoritative source rather than relying on model memory or synthetic sample values.

---

## Evaluation

Evaluation is part of your Round 2 score.

For the visual checks, build an appropriate unseen/held-out evaluation set. Where applicable, use at least **50 unseen units** and have two humans independently label the cases before comparing agent performance.

Report:

* results per important check,
* false positives,
* false negatives,
* `UNCERTAIN` / review rate,
* important failure modes,
* latency/cost where relevant.

Do not evaluate only on examples that make the system look successful.

For condition and other visual checks, use genuinely varied cases, including difficult or ambiguous examples.

---

## Round 2 evaluation — 100 points

| Criterion                                    |  Points |
| -------------------------------------------- | ------: |
| Problem Understanding & Solution Relevance   |  **15** |
| Agent Functionality & Decision Quality       |  **25** |
| Evaluation, Accuracy & Uncertainty Handling  |  **25** |
| Evidence, Traceability & Engineering Quality |  **20** |
| UX, Demo & Documentation                     |  **15** |
| **TOTAL**                                    | **100** |

Your Round 2 score is important because participants selected for Round 3 will carry their Round 2 score into the final combined result.

---

## Submission

### Submissions open

**27 September 2026**

### Final deadline

**1 October 2026 · 6:00 PM IST**

The submission form closes permanently at the deadline.

**There is no reopening and no resubmission.**

Your final submission should include:

* your GitHub fork,
* working implementation,
* `README.md`,
* `ARCHITECTURE.md`,
* evaluation results,
* demo video,
* deployment URL where applicable,
* required submission links.

### LinkedIn — Mandatory

You must publish a LinkedIn post about your Round 2 build.

The post must:

* mention your Returns Manager build,
* explain what you built,
* tag **CodeQuesters**,
* tag **Sydon.AI**.

Include the LinkedIn post URL in the submission form.

The organisers will share the official LinkedIn post template separately.

---

## Commit rule

All code commits forming your Round 2 submission must be made during the authorised build phase.

Once the build phase ends, do not continue making Round 2 code changes.

---

## Final checklist

```text
[ ] Returns Manager implementation works
[ ] Working in my own fork
[ ] README.md complete
[ ] ARCHITECTURE.md complete
[ ] Identity tested
[ ] Completeness tested
[ ] Condition tested
[ ] Disposition tested
[ ] UNCERTAIN / review handling tested
[ ] Evidence trace implemented
[ ] Evaluation completed
[ ] Failure modes documented
[ ] Demo ready
[ ] LinkedIn post published
[ ] CodeQuesters tagged
[ ] Sydon.AI tagged
[ ] Submission links verified
[ ] Final submission ready before 1 October · 6:00 PM IST
```

> **Build → Test → Measure → Document → Publish → Submit**

---

**Cube Buildathon · 04 · Returns Manager**

**Round 2 · Individual Build**
