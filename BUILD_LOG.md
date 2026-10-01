# Build log

Round 2 Returns Manager, fork ruthvikgoud16. The graded file is frozen. It was not rerun.

25 September 2026. The forked repository had the problem statement, the rules, a sample CSV, and no agent. Planning notes from that morning proposed a Python service and a model that chose the disposition. The code that shipped does neither.

What shipped: one Claude vision call grades identity, completeness, and condition. Zod checks the tool output. `policy_v1` sets the disposition. UNCERTAIN is not a pass. A failed call or an unusable photo is saved as `pending_review`. Records are scoped to the organisation on the session cookie.

1 October 2026. The 50-case Drive run was stopped once, because a failed listing had been saved as “no photo” with zero model calls, and later runs skipped those rows. Photos also sit directly in each product’s `02 — PHOTOS` folder. The grader was changed so a no-photo case is recorded only when the listing succeeds and contains zero images. A Drive failure stays a retry and does not call the model. The final file, copied to `eval/frozen/2026-10-01T1015Z/`, has 47 grades at one call each, three no-photo cases (RTN-017, RTN-026, RTN-032), zero ingestion errors, and zero model errors. About 147,613 input tokens, 18,285 output tokens, and about $0.72 at the script rates.

On the 40 agreed cases with a model grade: identity 37/40 (92.5%), completeness 30/40 (75.0%), condition 17/40 (42.5%). Condition is a grade match, not an overall accuracy. Cohen’s kappa was not computed. Disposition was not labeled. Later, the same frozen checks were passed through the unchanged `policy_v1`. 40/40 saved dispositions match the rule applied to the saved agent checks. 27/40 (67.5%) match the rule applied to the agreed human checks. That 67.5% is not a disposition accuracy. The 13 mismatches are upstream. Details are in `EVALUATION.md`.
