# How this Returns Manager was built

Track: Returns Manager. Fork: https://github.com/ruthvikgoud16/cube-04-returns-manager

This note is the history of the build. The measured numbers live in `docs/evaluation.md` and `submissions/ruthvikgoud16/eval-report.md`. They were not changed to fit a later story.

## What the track required

The official repository states the job. A returned unit is photographed. The agent checks whether it is the named product, whether the required parts are present, and which Amazon used-condition name fits what is visible. A separate rule then recommends restock, refurbish, liquidate, or holding the unit for a person. `dispose` is not a recommendation this policy produces.

The engineering rules that shaped the code:

- One model call per return. The call grades identity, completeness, and condition together. It does not choose the disposition.
- Schema validation runs before the policy. Confidence never turns UNCERTAIN into PASS.
- A model error, a timeout, a bad schema, or an unusable photo still saves the capture as `pending_review`.
- Identity is visual likeness to the named product. A missing SKU or ASIN stays UNKNOWN.
- A required part that is simply not in the frame is UNCERTAIN, not FAIL.
- Every stored row and image key is scoped to `organization_id`. The demo organisations are `org_demo_alpha` and `org_demo_bravo`.
- Condition names follow Amazon’s published used scale. A photo is not treated as proof that a device works.
- The evaluation uses 50 held-out units and two independent labelers. False positives, false negatives, and UNCERTAIN are reported per check.

## What the official repo contained at the start

On 25 September 2026 the forked repository had the problem statement, the rules, a GitHub guide, a 24-row sample CSV, and a submission-folder template. It did not contain an agent, photographs, an evidence-contract file, or filled Amazon condition labels. The sample sheet leaves `amazon_condition` empty on purpose and includes `uncertain` as a real value. Two organisation ids are in that sheet so isolation can be tested.

The first planning notes proposed a Python service, a model that also chose disposition, an `observed_state` lookup into Amazon grades, and a numeric “kill” accuracy line. Those notes were working papers. They are not the system that was built, and they are not kept in this repository. The decisions below are the ones the code actually follows.

## Decisions that stayed

| Decision | What shipped |
|---|---|
| One call | `ClaudeModel` sends one tool call, `submit_return_grade`, at temperature 0. The default model is `claude-sonnet-4-5`. |
| Policy after the model | Zod validates the tool output. `policy_v1` then sets the disposition. Any UNCERTAIN check, or an identity FAIL, becomes `pending_review`. A complete Very Good or Like New unit can be restocked. A complete Good unit is refurbish. A complete Acceptable unit is liquidate. A visibly missing part moves a strong grade to refurbish and a weaker grade to liquidate. |
| Fail open | No usable photo, a thrown model, or a schema rejection still writes a record. The model is not called when the photo gate already failed. |
| Visual identity | Likeness can pass without a barcode. Blank name, brand, and model stay UNCERTAIN. Nothing is invented that is not in the photographs. |
| Evidence | The stored record is `rtn-0.1-provisional`. `GET /v1/records` projects it to evidence contract 1.1 for the organisation on the session cookie. `content_hash` is SHA-256 of the canonical JSON. It shows that a copy changed. It is not a tamper-proof seal. |
| Tenancy | Organisation comes from the signed session, not from the request body. Postgres row-level security is available. Without `DATABASE_URL`, records stay in memory. |
| Evaluation | Twelve photographed fixtures are for development only. The scored set is the 50-case Drive collection, labeled by Rishik Goud and Lasya before the rates were read. |

## What changed while the system was built

The stack is TypeScript, Fastify, Zod, and sharp, with optional Postgres. The phone page posts photos to `POST /agent`. There is no separate presigned upload.

The model does not see a pre-written `observed_state` and map it to a condition. It names the Amazon used grade from the photographs. Function is not claimed from a picture.

Photo intake on the 50-case run changed after a failed listing was saved as “no photo” with zero model calls, and later runs skipped those rows forever. Many product photos also sat directly in each product’s `02 — PHOTOS` folder, not only in FRONT or BACK subfolders. The grader was stopped and those false rows were removed. A case is genuinely no photo only when the product folder, the photos folder, and the listing all succeed and the listing has zero images. A Drive or download failure stays `ingestion_retry` and does not call the model. A saved grade is not sent to the model a second time.

An unreadable image used to crash the request inside the quality gate. The gate now returns the frame as unusable, and the capture is saved as `pending_review` with no model call.

The operator desk shows the disposition, the three checks, the parts the model did and did not see, the images, the content hash, and the contract projection. Two frozen examples, RTN-019 and RTN-001, are drawn from the saved evaluation. Opening them does not call the model. The public desk is https://rtn-returns-manager.vercel.app . A reviewer walkthrough of those two cards is at https://rtn-returns-manager.vercel.app/demo . Records on that host stay in the memory of the process that answered the request.

After the 50-case file was frozen, the agreed human checks on the 40 comparable cases were passed through the existing `policy_v1` and compared with the dispositions already saved. The model was not rerun. Prompts, `policy_v1`, labels, and frozen checksums were not changed. 40/40 saved agent dispositions were reproduced exactly by `policy_v1` from the agent’s saved checks; there were zero true policy-mapping inconsistencies. 27/40 (67.5%) is not disposition accuracy. It is only agreement between `policy_v1` on the agreed human checks and the saved dispositions.

## Where the measured work is kept

| Record | Path |
|---|---|
| Labeler Rishik Goud | `eval/labels-rishik-goud.csv` |
| Labeler Lasya | `eval/labels-lasya.csv` |
| Both sheets stacked | `eval/labels.csv` |
| How to read the rates | `docs/evaluation.md` |
| Full report | `submissions/ruthvikgoud16/eval-report.md` |
| One row per case | `submissions/ruthvikgoud16/eval-cases.md` |
| Frozen copies and checksums | `eval/frozen/2026-10-01T1015Z/` |
| Same explanation as a PDF | `EVALUATION.pdf`, `docs/evaluation.pdf`, and `docs/project-evolution.pdf` |

The live grade file `collection/export/fifty/results.json` is not committed. The frozen copy of that file is committed.
