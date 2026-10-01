# Prompt: write a LinkedIn post from these facts only

Paste the block below into a model. Do not add facts, hashtags, or claims that are not in the block. Official CUBE hashtags are unknown, so leave the placeholder exactly as written.

---

Write one LinkedIn post about this project. Use only the facts in this prompt. Do not add statistics, product behavior, customer quotes, or outcomes that are not listed here. Do not say the project is production-ready, fully accurate, or ready to ship. Do not claim the rates would hold on another set. Do not mention Cohen's kappa. Do not call 67.5% a disposition accuracy. Do not invent hashtags. Leave the placeholder `[OFFICIAL CUBE HASHTAGS]` unchanged.

Project name: RTN Returns Manager.

What it does: one Claude vision call grades identity, completeness, and condition together. A fixed rule, policy_v1, then sets the disposition. The model does not choose the disposition. If a check is uncertain, the saved result stays pending review. Uncertain is not a pass.

Evaluation set, this set only:
- 50 cases
- 47 grades, one model call each
- 3 cases had no photo and were not graded: RTN-017, RTN-026, RTN-032
- On 40 agreed cases with a model grade:
  - identity 37/40 = 92.5%
  - completeness 30/40 = 75.0%
  - condition 17/40 = 42.5%
- Condition is the weak check. Of 23 condition mismatches, 14 are human Very Good versus agent Like New.
- 40/40 saved dispositions were reproduced by policy_v1 from the agent's saved checks.
- Zero true policy-mapping inconsistencies, and only on this set.
- 27/40 = 67.5% is agreement between policy_v1 on the agreed human checks and the saved dispositions. It is not disposition accuracy.

Examples, both saved evaluations. Opening them does not call the model:
- RTN-019, the Nova hair straightener: the checks agree, so policy_v1 restocks it.
- RTN-001, the Samsung Book: completeness is uncertain, so the saved result stays pending review.

Attach these real screenshots if the LinkedIn composer allows images. Do not describe a UI that is not in them:
- submissions/ruthvikgoud16/linkedin/01-org-signin.png
- submissions/ruthvikgoud16/linkedin/02-rtn019-restock.png
- submissions/ruthvikgoud16/linkedin/03-rtn001-pending-review.png
- submissions/ruthvikgoud16/linkedin/04-frozen-rates.png

Links, printed as plain URLs:
- Fork: https://github.com/ruthvikgoud16/cube-04-returns-manager
- Desk: https://rtn-returns-manager.vercel.app
- Walkthrough: https://rtn-returns-manager.vercel.app/demo

End the post with these words on their own lines, in this order. Tag names are words, not invented hashtags:
CodeQuesters
Sydon.AI
[OFFICIAL CUBE HASHTAGS]
