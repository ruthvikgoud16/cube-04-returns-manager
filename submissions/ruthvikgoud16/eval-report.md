# Evaluation report

Track: Returns Manager (RTN). This evaluation is frozen. Do not retune the model, change labels, or rerun these 50 cases to improve the numbers.

The primary figures below are only for the 40 agreed cases that have a model grade. `npm run eval:score` also prints identity 37/43 (86.0%), completeness 30/43 (69.8%), and condition 17/43 (39.5%). That print keeps the three no-photo cases in the denominator. Those are not the model-performance figures.

## A. Scope

| | Count |
|---|---|
| Cases | 50 |
| Model-graded | 47 |
| Genuinely no photo | 3: RTN-017, RTN-026, RTN-032 |
| Ingestion errors | 0 |
| Model errors | 0 |
| Model calls | 47, one per graded case |

A no-photo case means the product folder and its `02 — PHOTOS` folder were resolved, the listing succeeded, and that listing contained zero image files. No model call was made. Label notes for those three cases still describe visible products, so this is a coverage gap in the photo folders used for the run, not a claim that the products were never photographed.

## B. Method

Rishik Goud and Lasya each labeled all 50 cases. The sheets are `eval/labels-rishik-goud.csv` and `eval/labels-lasya.csv`. `eval/labels.csv` stacks them. SKU and ASIN are `UNKNOWN` on every row. The disposition column is blank. The labels were used as the human reference and were not edited after scoring.

A case is agreed only when the two labelers match on identity, completeness, and Amazon condition together. 43 cases agree. The other 7 are excluded from every match rate.

`npm run eval:score` then walks every row in `collection/export/fifty/results.json`. Three of the 43 agreed cases have no model output:

`43 agreed − RTN-017 − RTN-026 − RTN-032 = 40 scored cases`

On those 40, a match means the agent’s verdict equals the agreed human verdict. For identity and completeness, a false positive is agent PASS and human FAIL. A false negative is agent FAIL and human PASS. Condition is a grade match (`used_like_new`, `used_very_good`, `used_good`, `used_acceptable`, or `unknown`), not a pass/fail false-positive count. Disposition is not scored, because nobody labeled it. Cohen’s kappa was not computed. The twelve photographed development fixtures are not this set. Every unit is listed in [eval-cases.md](eval-cases.md): human label, agent result, whether it is one of the 40, and the mismatch note. That table is a view of the frozen files. It is not a second score.

## C. Results

These rates are not an overall accuracy.

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

The three identity rows that do not match are not false positives or false negatives. RTN-028 is the uncertain case: the agent said UNCERTAIN and both labelers said PASS. RTN-010 and RTN-049: the agent said PASS and both labelers said UNCERTAIN. On RTN-010 both notes say the watch and the box colour do not line up. On RTN-049 both notes say the photos mix boxed fan parts with a fan already mounted.

## D. Dispositions observed

These are the agent’s `policy_v1` outcomes on the 47 graded cases. They are not accuracy.

| Disposition | Count | Cases |
|---|---|---|
| restock | 38 | all graded cases except the eight pending-review cases and RTN-007 |
| pending_review | 8 | RTN-001, RTN-004, RTN-006, RTN-008, RTN-009, RTN-025, RTN-028, RTN-045 |
| refurbish | 1 | RTN-007 |
| liquidate | 0 | — |
| dispose | 0 | — |

`policy_v1` sends any UNCERTAIN check, or an identity FAIL, to `pending_review`. It never emits `dispose`. RTN-007 is the only refurbish: identity PASS, completeness PASS, condition PASS, Amazon grade `used_good`, which is the rule for a complete Good unit.

## E. Human agreement and exclusions

43 of 50 cases agree on identity, completeness, and Amazon condition. 7 do not, and they are not scored:

RTN-002, RTN-005, RTN-006, RTN-009, RTN-013, RTN-037, RTN-044.

No agreement coefficient beyond that count was calculated.

## F. Failures

Identity is the strongest measured check, at 92.5% on the 40. Completeness is 75.0%. Condition is the weakest, at 42.5% (17 matches, 23 mismatches).

Of the 23 condition mismatches, 14 are human `used_very_good` and agent `used_like_new`. Four are human `used_good` and agent `used_very_good`. Four are human `used_like_new` and agent `used_very_good`. One is human `unknown` and agent `used_very_good` (RTN-049). The saved grades do not contain a separate damage narrative, so this report does not give a photo-by-photo cause. The measured pattern is one step on the Amazon used scale, most often the agent calling Like New what both labelers called Very Good.

Completeness false positives are RTN-046 and RTN-049. The agent said PASS. Both labelers said FAIL. Their notes say RTN-046 does not show the cable, adapter, or box, and RTN-049 does not show the remote. There are no completeness false negatives. The other completeness misses are UNCERTAIN on one side and PASS or FAIL on the other: four human UNCERTAIN / agent PASS (RTN-016, RTN-021, RTN-023, RTN-038), two human PASS / agent UNCERTAIN (RTN-004, RTN-025), and two human FAIL / agent UNCERTAIN (RTN-008, RTN-045).

RTN-017, RTN-026, and RTN-032 had no image files in the listed photo folders. They add no model result. The final run recorded zero ingestion retries and zero model errors.

## G. Cost

47 model calls. Persisted meter on the final results file: 147,613 input tokens, 18,285 output tokens, approximately $0.72 at the meter used by the run ($3 per million input tokens and $15 per million output tokens). No further estimate is made. This is not an invoice.

## Disposition Policy-Consistency Analysis

This is a policy-consistency analysis, not an independently human-labeled disposition accuracy measurement.

Disposition was not independently human-labeled in the frozen evaluation. End-to-end disposition accuracy cannot be claimed. Feeding the agreed human identity, completeness, and Amazon condition into the existing `policy_v1` checks whether that rule would assign the disposition the agent saved. The model was not rerun, and the frozen grades were not changed. Upstream visual errors stay separate from the rule. On these 40 cases the rule matches the saved disposition for 27/40 (67.5%). The 13 mismatches, all from different check inputs, are listed in `submissions/ruthvikgoud16/disposition-policy-consistency.md`. Applying `policy_v1` to the saved agent checks reproduces the saved disposition on all 40, so there is no true policy mapping inconsistency.

## H. Limitations

Condition is the largest measured weakness. Disposition was not independently labeled, so it has no accuracy. Three of the 50 cases had no image files in the folders this run listed. Only 40 cases sit in the per-check match rates, because a case had to be agreed by both labelers and had to have a model grade. These figures describe this held-out set. They are not a claim about other returns, other sellers, or a later week.

## I. Integrity

Copies and SHA-256 sums are in `eval/frozen/2026-10-01T1015Z/`. The live grade file remains `collection/export/fifty/results.json`. Do not silently change the model, the labels, the scorer, or this report to chase a higher number on the same 50 cases.
