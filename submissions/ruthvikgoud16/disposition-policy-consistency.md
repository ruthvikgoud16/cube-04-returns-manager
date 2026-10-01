# Disposition policy consistency

This is a policy-consistency analysis, not an independently human-labeled disposition accuracy measurement.

Disposition was not independently human-labeled in the frozen evaluation, so end-to-end disposition accuracy cannot be claimed. The agreed human identity, completeness, and Amazon condition for each of the 40 cases were passed into the existing `policy_v1`. That output is compared with the disposition already saved on the frozen grade. The model was not rerun. `policy_v1` was not changed. The labels and the frozen results were not changed.

Upstream visual classification errors remain separate from policy behavior. A mismatch is upstream when the human checks and the saved agent checks differ. A true policy mapping inconsistency would mean the same normalized check results produce different dispositions.

| | |
|---|---|
| Comparable cases | 40 |
| Policy-consistent dispositions | 27/40 |
| Policy consistency rate | 67.5% |
| Mismatches | 13 |
| True policy mapping inconsistencies | 0 |

The excluded disagreements are RTN-002, RTN-005, RTN-006, RTN-009, RTN-013, RTN-037, and RTN-044. RTN-017, RTN-026, and RTN-032 are excluded because they have no model grade.

40/40 saved agent dispositions were reproduced exactly by policy_v1 from the agent’s saved checks; there were zero true policy-mapping inconsistencies.

27/40 (67.5%) is not disposition accuracy. It is only agreement between `policy_v1` applied to the agreed human checks and the saved agent dispositions. Every mismatch below is an upstream perception mismatch.

| Case | Human checks | Human-derived disposition | Agent checks | Saved disposition |
|---|---|---|---|---|
| RTN-004 | PASS, PASS, Very Good | restock | PASS, completeness UNCERTAIN, Very Good | pending_review |
| RTN-008 | PASS, FAIL, Very Good | refurbish | PASS, completeness UNCERTAIN, Like New | pending_review |
| RTN-010 | UNCERTAIN, PASS, Good | pending_review | PASS, PASS, Very Good | restock |
| RTN-016 | PASS, UNCERTAIN, Good | pending_review | PASS, PASS, Very Good | restock |
| RTN-020 | PASS, PASS, Good | refurbish | PASS, PASS, Very Good | restock |
| RTN-021 | PASS, UNCERTAIN, Like New | pending_review | PASS, PASS, Like New | restock |
| RTN-023 | PASS, UNCERTAIN, Very Good | pending_review | PASS, PASS, Like New | restock |
| RTN-025 | PASS, PASS, Like New | restock | PASS, completeness UNCERTAIN, Very Good | pending_review |
| RTN-028 | PASS, PASS, Very Good | restock | identity UNCERTAIN, PASS, Very Good | pending_review |
| RTN-038 | PASS, UNCERTAIN, Good | pending_review | PASS, PASS, Very Good | restock |
| RTN-045 | PASS, FAIL, Very Good | refurbish | PASS, completeness UNCERTAIN, Like New | pending_review |
| RTN-046 | PASS, FAIL, Very Good | refurbish | PASS, PASS, Like New | restock |
| RTN-049 | UNCERTAIN, FAIL, unknown | pending_review | PASS, PASS, Very Good | restock |

The rows, including the per-case explanation, are in `eval/disposition-policy-consistency.json`.
