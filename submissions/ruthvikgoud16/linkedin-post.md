# LinkedIn post — draft, not published

Paste this only after you pick the official company pages for the two tags and the organiser hashtags. The handbook says to use the official CUBE hashtags the organisers communicated. Those hashtags are not printed in the handbook, so they are a placeholder here.

---

I built the Returns Manager agent for CUBE 2026, the Round 2 Returns track.

When a returned unit comes back, someone has to decide whether it is the item that was sold, whether it is complete, and what visual condition it is in, then keep an evidence record the next stage can read. The agent makes that check on the photos. It does not choose the disposition. One Claude vision call grades identity, completeness, and condition together. A fixed rule, policy_v1, then sets restock, refurbish, liquidate, or pending review. If a check is UNCERTAIN, or the model fails, the capture is saved for a person. It is not restocked and it is not dropped.

On 40 agreed evaluation cases with valid model output, identity matched at 92.5% (37/40), completeness at 75.0% (30/40), while condition classification remained the largest challenge at 42.5% (17/40). Condition errors were usually one step on Amazon’s used scale, most often Like New where both labelers said Very Good. Three of the 50 units had no image files in the photo folders, so they were not graded. Seven more were excluded because the two labelers disagreed.

Disposition was not human-labeled, so I am not reporting a disposition accuracy. 40 of 40 saved dispositions are exactly what policy_v1 produces from the agent’s own checks, so the rule did not contradict itself. When those same rules are applied to the agreed human checks, they match the saved disposition on 27 of 40. That 67.5% is not a disposition accuracy. It only shows where the visual checks differed before the rule ran.

Fork: https://github.com/ruthvikgoud16/cube-04-returns-manager
Deployment URL: https://rtn-returns-manager.vercel.app
Walkthrough: https://rtn-returns-manager.vercel.app/demo

CodeQuesters
Sydon.AI

[OFFICIAL CUBE HASHTAGS]
