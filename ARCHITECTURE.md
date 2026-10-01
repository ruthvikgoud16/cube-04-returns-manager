# Architecture

Returns Manager for CUBE 2026, fork `ruthvikgoud16`.

```text
phone page
  session cookie names the organisation
        ↓
quality gate (size, brightness, blur)
  unusable frames are not sent to the model
        ↓
one Claude messages call
  return photos + ordered product + other seller SKUs
  tool submit_return_grade, temperature 0
  system prompt cached
        ↓
Zod
        ↓
policy_v1
  UNCERTAIN or identity mismatch → pending_review
  dispose is not produced
        ↓
evidence record rtn-0.1-provisional
  SHA-256 content_hash of the canonical JSON
        ↓
store
  memory + files by default
  Postgres with forced row-level security when DATABASE_URL is set
  image keys are {org}/{random}
```

The model does not select a disposition. Confidence is stored and is not used to turn UNCERTAIN into PASS.

A timeout, a missing key, an unreadable image, or invalid JSON still inserts a record with status `pending_review` and `inference_call_count` of 0 or 1. The operator is left with the capture.

Condition names come from Amazon’s published marketplace guidelines:
https://www.amazon.com/gp/help/customer/display.html?nodeId=201889720
Photographs cannot show that an electronic item functions. When the grade would require that, the check is UNCERTAIN.

Overrides append the original disposition, the new one, a reason code, and a sentence. The previous decision is not deleted.

Tenancy: `org_demo_alpha` and `org_demo_bravo`. The organisation comes from the signed session, not from the JSON body. Postgres policies compare `organization_id` to `app.organization_id` for the transaction. The application role has `NOSUPERUSER` and `NOBYPASSRLS`.

Schema version `rtn-0.1-provisional` implements the handbook fields. It is not a second negotiated contract.

## Organiser rulings

Sydon confirmed that visual likeness is enough for identity. The agent compares the photos with the product name, brand, and model written in the folder. A readable barcode is not required. SKU and ASIN stay `UNKNOWN` unless one is actually printed on the item. A blank name, brand, and model stays UNCERTAIN, because there is nothing to compare. Confidence still cannot turn that into a pass.

## Evidence contract 1.1

Commerce Context contract 1.1 is fixed. Recovery reads that shape. Returns may add fields only inside `checks[].detail`. The stored record in this fork is still `rtn-0.1-provisional`. The enhancements below are the mapping, not a private schema.

- One record per unit. `subject.type` is `unit`. `subject.asin` and `subject.sku` are null when unknown. Do not invent a shipment id.
- `agent` is `returns`. Check keys stay `identity`, `completeness`, and `condition`.
- Contract verdicts are lowercase `pass`, `fail`, and `uncertain`. Internal `PASS`, `FAIL`, and `UNCERTAIN` map onto those words at the boundary.
- Returns-only facts go in `checks[].detail`: visual likeness, parts seen, parts missing, parts not in frame, Amazon used grade, and the policy reason. Disposition stays out of the model call. `outcome.decision` carries the policy result. `decided_by` is `agent` unless an operator overrode it.
- `status` is `pending` when the model errors or times out and the capture was saved. The operator is not blocked.
- Images carry `key`, `sha256`, `bytes`, and `taken_at`. `content_hash` is SHA-256 of the image hashes plus the serialised checks. It is a content hash, not a tamper-proof seal.
- One model call covers every check. Token use and `latency_ms` are logged on that call.
- `GET /v1/records` returns that 1.1 projection for the caller's organisation only. The phone page and `GET /records` still use the stored provisional record. Image SHA-256 is included only when the stored bytes are still available.

## Fifty-case grade

`collection/runFifty.ts` calls the same `processReturn` path once per unit. It does not contain a second model. Product names for that run came from Rishik Goud’s label sheet. SKU and ASIN stayed `UNKNOWN`.

Photos are taken from each product’s `02 — PHOTOS` folder, including images placed directly in that folder and images inside one level of child folders. The old FRONT/BACK slot names are not required. A case is recorded as genuinely no photo only when the product folder, the photos folder, and the file listing all succeed and the listing has zero images. A Drive, network, or download failure is `ingestion_retry`. It does not call the model, and it is not stored as a finished grade. The final file has 47 grades with `calls: 1`, three no-photo rows with `calls: 0`, and no duplicate case ids. 40/40 saved agent dispositions were reproduced exactly by `policy_v1` from the agent’s saved checks. There were zero true policy-mapping inconsistencies. Comparing that rule on the agreed human checks with the saved dispositions agrees on 27/40 (67.5%). That figure is not a disposition accuracy, because disposition was not human-labeled.

## Not implemented

There is no `POST /v1/captures` and no presigned upload URL. Image bytes for the phone page are posted with the existing `/agent` request. The public desk is https://rtn-returns-manager.vercel.app . `GET /demo` walks a reviewer through the two saved cards on that desk. It does not host a video, and opening those cards does not call the model. On that host, records stay in memory for the process that handled the request. A local run uses memory plus files unless `DATABASE_URL` is set.
