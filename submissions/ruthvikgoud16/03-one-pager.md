# Returns Manager

Grade a return from phone photos. Save the photos, the checks, and the recommendation.

| Measure | Kill line, fixed before results | Result |
|---|---|---|
| Identity, where two people agreed and a model grade exists | under 90% and we stop | 37/40 (92.5%) |
| Condition agreement with two people | Cohen’s kappa under 0.7 and we stop | kappa was not computed. Grade match is 17/40 (42.5%) |
| Uncertain or pending review | over 20% and we stop | identity uncertain 1/40. Completeness uncertain 5/40. Pending review 8/47 graded cases |
| Model-failure pending | above a few percent and operators will ignore it | 0 model errors on the final 50-case file |

False accepts and false rejects are reported per check, never as one blended accuracy. A part that is not in the photo is counted separately from a part that is visibly missing.

Both label sheets are in. The full method, the seven excluded disagreements, and the three no-photo cases are in [eval-report.md](eval-report.md).
