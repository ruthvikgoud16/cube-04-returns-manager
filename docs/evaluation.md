# Evaluation

These figures are frozen. They describe one held-out set. They are not an overall accuracy, and they are not a claim about other returns.

Primary rates use the 40 cases where both labelers agreed and the model produced a grade. `npm run eval:score` also prints identity 37/43 (86.0%), completeness 30/43 (69.8%), and condition 17/43 (39.5%). That print keeps three no-photo rows in the denominator. Those three rows are not model results.

## The set

| | Count |
|---|---|
| Cases | 50 |
| Graded, one model call each | 47 |
| No image in the listed photo folder | 3: RTN-017, RTN-026, RTN-032 |
| Ingestion errors in the final file | 0 |
| Model errors | 0 |
| Agreed by both labelers on all three checks | 43 |
| Agreed and graded, which is the scored set | 40 |
| Disagreements, excluded from every rate | 7 |

The disagreements are RTN-002, RTN-005, RTN-006, RTN-009, RTN-013, RTN-037, and RTN-044.

`43 agreed − RTN-017 − RTN-026 − RTN-032 = 40`.

Labelers: Rishik Goud (`eval/labels-rishik-goud.csv`) and Lasya (`eval/labels-lasya.csv`). `eval/labels.csv` stacks both. SKU and ASIN are UNKNOWN. The disposition column is blank, so disposition is not scored. Cohen’s kappa was not computed. The twelve development fixtures are not this set.

RTN-017, RTN-026, and RTN-032 had zero image files when the photos folder was listed. The label notes for those cases still describe visible products. That is a gap in the folders used for the run, not a rescore.

## Results on the 40

A match means the agent’s text equals the agreed human text. For identity and completeness, a false positive is agent PASS and human FAIL. A false negative is agent FAIL and human PASS. A human UNCERTAIN against an agent PASS is a mismatch, and it is neither a false positive nor a false negative. Condition is equality of the Amazon grade.

| Check | Matches | Rate | UNCERTAIN | False positives | False negatives |
|---|---:|---:|---:|---:|---:|
| Identity | 37/40 | 92.5% | 1/40 (2.5%) | 0 | 0 |
| Completeness | 30/40 | 75.0% | 5/40 (12.5%) | 2 | 0 |
| Condition | 17/40 | 42.5% | — | not a pass/fail count | not a pass/fail count |

Identity mismatches that are not false positives or false negatives: RTN-028, agent UNCERTAIN and humans PASS. RTN-010 and RTN-049, agent PASS and humans UNCERTAIN. Both labelers noted a watch and box colour that do not line up on RTN-010, and boxed fan parts against a mounted fan on RTN-049.

Completeness false positives: RTN-046 and RTN-049. Both labelers said FAIL. Notes: RTN-046 does not show the cable, adapter, and box. RTN-049 does not show the remote. Other completeness mismatches are UNCERTAIN on one side: human UNCERTAIN and agent PASS on RTN-016, RTN-021, RTN-023, RTN-038; human PASS and agent UNCERTAIN on RTN-004 and RTN-025; human FAIL and agent UNCERTAIN on RTN-008 and RTN-045.

Condition matches on the 40: `used_very_good` 9, `used_like_new` 7, `used_good` 1. The 23 mismatches: human Very Good and agent Like New, 14; human Good and agent Very Good, 4; human Like New and agent Very Good, 4; human unknown and agent Very Good, 1 (RTN-049). The usual miss is one step on Amazon’s used scale.

## Dispositions, not a score

`policy_v1` on the 47 grades: restock 38, pending_review 8, refurbish 1 (RTN-007), liquidate 0, dispose 0. Pending review is RTN-001, RTN-004, RTN-006, RTN-008, RTN-009, RTN-025, RTN-028, and RTN-045. Nobody labeled disposition, so these counts are what the rule emitted.

## Disposition Policy-Consistency Analysis

This is a policy-consistency analysis, not an independently human-labeled disposition accuracy measurement.

Disposition was not independently human-labeled in the frozen evaluation, so an end-to-end disposition accuracy cannot be claimed. The check above is what the saved grades already show. This section asks a narrower question: if `policy_v1` is given the agreed human identity, completeness, and Amazon condition, does it assign the same disposition the agent saved?

The human checks were passed through the existing `policy_v1`. The model was not rerun. The saved grades and the freeze were not edited. Upstream visual classification errors stay separate from policy behavior. A mismatch is an upstream perception mismatch when the human checks and the saved agent checks differ. A true policy mapping inconsistency would mean the same normalized check results produce different dispositions. None of the 40 do that: `policy_v1` applied to each saved agent check result returns the saved disposition.

40/40 saved agent dispositions were reproduced exactly by policy_v1 from the agent’s saved checks; there were zero true policy-mapping inconsistencies.

On the 40 comparable cases, 27 dispositions match. That is 67.5%. 27/40 (67.5%) is not disposition accuracy. It is only agreement between `policy_v1` applied to the agreed human checks and the saved agent dispositions. The 13 mismatches are RTN-004, RTN-008, RTN-010, RTN-016, RTN-020, RTN-021, RTN-023, RTN-025, RTN-028, RTN-038, RTN-045, RTN-046, and RTN-049. Every one is an upstream perception mismatch. The case-level human-derived disposition, the saved agent disposition, and the explanation are in `eval/disposition-policy-consistency.json` and `submissions/ruthvikgoud16/disposition-policy-consistency.md`.

## Cost

147,613 input tokens, 18,285 output tokens, about $0.72 at the script rates of $3 per million input tokens and $15 per million output tokens. That meter is the 50-case run. It is not an invoice.

## Files

| What | Where |
|---|---|
| This explanation | `docs/evaluation.md` and `docs/evaluation.pdf` |
| Full written report | `submissions/ruthvikgoud16/eval-report.md` |
| Every case | `submissions/ruthvikgoud16/eval-cases.md` |
| Frozen grades, labels, scorer print, checksums | `eval/frozen/2026-10-01T1015Z/` |
| Policy consistency rows | `eval/disposition-policy-consistency.json` |

The scorer print in that freeze is the 43-denominator output. The table above is the one to read.
