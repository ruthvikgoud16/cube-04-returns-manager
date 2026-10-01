# RTN audit — 1 October 2026

This is the current audit of the Returns Manager fork. Older planning notes in the repo are not this result. The evaluation numbers are frozen. The model was not rerun to change them.

## What this system is

An operator desk for one returned unit. The operator names the organisation, the unit, and the product, and adds photographs. One Claude vision call grades identity, completeness, and condition together. It does not choose a disposition. `policy_v1` does. Any UNCERTAIN check, or an identity mismatch, becomes `pending_review`. A model error, a timeout, a bad schema, or an unusable photo still saves the capture. `dispose` is never produced by the policy.

Identity is visual likeness to the named product. A missing SKU or ASIN stays `UNKNOWN`. A required part that is out of frame is UNCERTAIN, not FAIL. Amazon condition names follow the published used scale. A photograph does not prove that a device functions.

Organisation comes from the signed session, not from the request body. Demo organisations are `org_demo_alpha` and `org_demo_bravo`. Stored records are schema `rtn-0.1-provisional`. `GET /v1/records` is a projection to evidence contract 1.1. There is no presigned upload endpoint and no public host.

## Frozen measurement

Source: `collection/export/fifty/results.json`, copied with checksums in `eval/frozen/2026-10-01T1015Z/`.

| | |
|---|---|
| Cases | 50 |
| Model-graded, one call each | 47 |
| Genuinely no photo | RTN-017, RTN-026, RTN-032 |
| Ingestion errors in the final file | 0 |
| Model errors in the final file | 0 |
| Meter | 147,613 input tokens, 18,285 output tokens, about $0.72 |

Dispositions on the 47 grades, not an accuracy: restock 38, pending review 8 (RTN-001, RTN-004, RTN-006, RTN-008, RTN-009, RTN-025, RTN-028, RTN-045), refurbish 1 (RTN-007), liquidate 0, dispose 0.

Two labelers, Rishik Goud and Lasya, each labeled 50 cases. Disposition was left blank. 43 cases agree on identity, completeness, and Amazon condition. These 7 disagreements are excluded: RTN-002, RTN-005, RTN-006, RTN-009, RTN-013, RTN-037, RTN-044. Three agreed cases had no image files, so the match rates use 40 cases. Cohen’s kappa was not computed.

| Metric | Result | Denominator |
|---|---|---|
| Identity | 92.5% | 37/40 |
| Identity uncertainty | 2.5% | 1/40 |
| Identity false positives | 0 | 0/40 |
| Identity false negatives | 0 | 0/40 |
| Completeness | 75.0% | 30/40 |
| Completeness uncertainty | 12.5% | 5/40 |
| Completeness false positives | 2 | 2/40 |
| Completeness false negatives | 0 | 0/40 |
| Condition | 42.5% | 17/40 |

Condition at 42.5% is the grade-match rate. It is not an overall accuracy. Of 23 condition mismatches, 14 are human Very Good and agent Like New. The two completeness false positives are RTN-046 and RTN-049. `npm run eval:score` also prints 37/43, 30/43, and 17/43 because it keeps the three no-photo rows in the denominator. Those are not the model figures. The case list is `eval-cases.md`.

## Why the standing is not higher

Against the handbook’s 100 points, this is a judgment, not an official score.

| Criterion | Out of | Now | Evidence |
|---|---:|---:|---|
| Problem understanding | 15 | 12 | Scope, assumptions, and the three checks are written in the README and this audit. |
| Agent functionality | 25 | 18 | The path works: one call, schema check, policy, fail-open. Condition misses push some units toward restock. |
| Evaluation and uncertainty | 25 | 17 | Method, false positives, false negatives, and UNCERTAIN are reported. Condition 42.5% is the measured drag. |
| Evidence and engineering | 20 | 15 | Checks carry verdict, confidence, model, and timing. Overrides keep the old disposition. The stored schema is still provisional. The code is not on the public fork yet. |
| UX, demo, and links | 15 | 8 | The desk shows the flow, the three rates, and two saved examples. There is no demo video, no public URL, and no live LinkedIn post. |
| Total | 100 | 70 | Local tree only. A reviewer who opens the GitHub fork today cannot see this build. |

## Desk

`http://localhost:8787`. Warm paper, a serif wordmark, and a green action. It is not a marketplace skin. Signing in names the organisation. The form takes the unit and photographs. The result shows disposition, the three checks, parts, the content hash, and a contract view. RTN-019 and RTN-001 on the desk are the frozen examples. Opening them does not call the model.

## Still required before the form

- Commit and push this tree to `https://github.com/ruthvikgoud16/cube-04-returns-manager`. Until then the fork is not the submission.
- Record the demo from `demo-script.md`.
- Publish `linkedin-post.md`, tag CodeQuesters and Sydon.AI, and add the organiser hashtags. Those hashtags are not printed in the handbook.
- Put the live LinkedIn URL on the form.
- Add a deployment URL only if a host is actually serving this build.

The handbook file still says the form closes at 6:00 PM IST on 1 October 2026 and does not reopen. A later note said 11:59. Confirm the time on the form.

## What this audit does not do

It does not retune the prompt. It does not rescore disposition. It does not invent a kappa. It does not claim the rates hold beyond these 50 cases.
