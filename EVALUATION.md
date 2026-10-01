# Evaluation

These figures are frozen. They describe this held-out set only. They are not an overall accuracy, and they are not a claim about other returns, other sellers, or a later week. Cohen’s kappa was not computed.

Identity 37/40 (92.5%). Completeness 30/40 (75.0%). Condition 17/40 (42.5%).

## A. Scope

50 evaluation cases. Two people labeled them before the rates were read: Rishik Goud and Lasya. A case is agreed only when both labels match on identity, completeness, and Amazon condition together. SKU and ASIN are UNKNOWN. The disposition column is blank.

## B. What the model graded

47 cases were model-graded, exactly one model call each. 3 cases had no image files in the listed photo folder, so the model was not called: RTN-017, RTN-026, and RTN-032. Ingestion errors in the final file: 0. Model errors: 0. Total model calls: 47.

## C. The 40 cases behind the rates

43 cases were agreed by both labelers. Three of those had no model output. 43 minus RTN-017, RTN-026, and RTN-032 leaves 40 agreed cases with a valid model grade. The per-check rates use those 40 only. `npm run eval:score` also prints 37/43, 30/43, and 17/43 because it keeps the three no-photo rows in the denominator. Those 43-denominator prints are not the model-performance figures.

## D. Identity

37/40 = 92.5%. Uncertain 1/40 = 2.5%. False positives 0. False negatives 0.

The other two non-matches are not false positives or false negatives. RTN-028: agent UNCERTAIN, both labelers PASS. RTN-010 and RTN-049: agent PASS, both labelers UNCERTAIN.

## E. Completeness

30/40 = 75.0%. Uncertain 5/40 = 12.5%. False positives 2. False negatives 0. The false positives are RTN-046 and RTN-049. Both labelers said FAIL.

## F. Condition

17/40 = 42.5%. This is equality of the Amazon used grade. It is not a pass/fail false-positive count, and it is not an overall accuracy.

## G. False positives, false negatives, and UNCERTAIN

| Check | Matches | UNCERTAIN | False positives | False negatives |
|---|---:|---:|---:|---:|
| Identity | 37/40 (92.5%) | 1/40 (2.5%) | 0 | 0 |
| Completeness | 30/40 (75.0%) | 5/40 (12.5%) | 2 | 0 |
| Condition | 17/40 (42.5%) | not a pass/fail count | not a pass/fail count | not a pass/fail count |

## H. Excluded disagreements

Seven cases are excluded from every rate because the two labelers disagreed: RTN-002, RTN-005, RTN-006, RTN-009, RTN-013, RTN-037, and RTN-044.

## I. Condition failure pattern

Of the 23 condition mismatches on the 40, 14 are human Very Good and agent Like New. Four are human Good and agent Very Good. Four are human Like New and agent Very Good. One is human unknown and agent Very Good (RTN-049). The usual miss is one step on Amazon’s used scale.

## J. No-photo cases

RTN-017, RTN-026, and RTN-032. The product folder, the photos folder, and the listing all succeeded, and the listing contained zero images. No model call was made. Label notes for those three still describe products, so this is a coverage gap in the folders used for the run.

## K. Errors

Ingestion errors in the final file: 0. Model errors: 0.

## L. Cost and calls

47 model calls. About 147,613 input tokens and 18,285 output tokens. About $0.72 at the script rates of $3 per million input tokens and $15 per million output tokens. That meter is not an invoice.

## M. Dispositions observed on the 47 grades

| Disposition | Count |
|---|---:|
| restock | 38 |
| pending_review | 8 |
| refurbish | 1 |
| liquidate | 0 |
| dispose | 0 |

## N. Those counts are not accuracy

Disposition was not independently human-labeled. The counts in M are what `policy_v1` emitted. They are not a disposition accuracy.

## O. Disposition Policy-Consistency Analysis

This is a policy-consistency analysis, not an independently human-labeled disposition accuracy measurement.

Disposition was not independently human-labeled in the frozen evaluation. End-to-end disposition accuracy cannot be claimed. This analysis isolates whether the deterministic policy behaves consistently when supplied the agreed human check outcomes. Upstream visual classification errors remain separate from policy behavior.

The agreed human identity, completeness, and Amazon condition for each of the 40 cases were passed through the existing `policy_v1`. The saved agent disposition was left as frozen.

## P. The saved dispositions match the rule

40/40 saved agent dispositions were reproduced exactly by policy_v1 from the agent’s saved checks; there were zero true policy-mapping inconsistencies.

## Q. 27/40 is not disposition accuracy

27/40 (67.5%) is not disposition accuracy. It is only agreement between `policy_v1` applied to the agreed human checks and the saved agent dispositions. The 13 mismatches are RTN-004, RTN-008, RTN-010, RTN-016, RTN-020, RTN-021, RTN-023, RTN-025, RTN-028, RTN-038, RTN-045, RTN-046, and RTN-049. All 13 are upstream check disagreements.

## R. Limit

These figures describe this evaluation set. They do not show that the same rates would hold on another set.

## S. Agreement coefficient

Cohen’s kappa was not computed. No agreement coefficient beyond the 43-of-50 agreed count is stated.

The machine-readable rows are `eval/disposition-policy-consistency.json`. The frozen copies and checksums are `eval/frozen/2026-10-01T1015Z/`.
