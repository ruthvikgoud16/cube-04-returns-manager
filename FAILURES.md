# Failures

These are measured limits of the frozen 50-case run. The grades were not rerun to improve them.

Condition is the weak check: 17/40 (42.5%) on the agreed cases that have a model grade. Of 23 mismatches, 14 are human Very Good and agent Like New.

Completeness false positives are RTN-046 and RTN-049. Both labelers said FAIL. There are no completeness false negatives, and no identity false positives or false negatives.

RTN-017, RTN-026, and RTN-032 had no images in the listed photo folders. They were not graded. The final file has zero ingestion errors and zero model errors.

Disposition was not human-labeled. The observed counts on 47 grades — restock 38, pending_review 8, refurbish 1, liquidate 0, dispose 0 — are not an accuracy. Passing the agreed human checks through `policy_v1` matches the saved agent disposition on 27/40 (67.5%). That rate is not disposition accuracy. All 13 mismatches are upstream check disagreements. 40/40 saved agent dispositions were reproduced exactly by `policy_v1` from the agent’s saved checks. There were zero true policy-mapping inconsistencies.

Cohen’s kappa was not computed. These figures do not generalize beyond this set.
