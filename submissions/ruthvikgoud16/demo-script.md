# Demo script

Do not re-grade RTN-001 through RTN-050 while showing this. The numbers below are the frozen grades. A new capture in the phone page is a different unit and a new model call. It is not a second pass on the evaluation set.

Open the app with `npm run dev` and `http://localhost:8787`. Enter as `org_demo_alpha`. Say what the page does: the session names the organisation, the photos and the product name go in, one model call grades identity, completeness, and condition, then `policy_v1` sets the disposition and the evidence record stays on screen.

## 1. Successful return — RTN-019, NOVA hair straightener

Four photos were downloaded from the product’s `02 — PHOTOS` folder. One model call.

- Identity PASS. Both labelers also said PASS. The named product is the NOVA hair straightener.
- Completeness PASS. Both labelers said PASS. Their notes say the straightener, cord, and NOVA box are visible.
- Condition PASS, Amazon grade `used_very_good`. Both labelers said `used_very_good`.
- Evidence is those three checks, with confidence stored on the check and the photo notes on the grade row.
- Disposition restock. `policy_v1` restocks a complete unit graded Like New or Very Good. The model did not choose restock.

This is one agreement, not the set’s accuracy.

## 2. Pending review — RTN-001, Samsung Book laptop

One model call. Photos included a duplicate, so the duplicate was not sent twice.

- Identity PASS. Both labelers said PASS.
- Completeness UNCERTAIN. Both labelers said UNCERTAIN. Their notes say a cable is visible and the adapter and box are not clearly shown.
- Condition PASS, Amazon grade `used_very_good`. Both labelers said `used_very_good`.
- Disposition `pending_review`. Any UNCERTAIN check stops automatic restock. UNCERTAIN is not a low-confidence pass. A person can override later. The override keeps the previous disposition.

## 3. What the 50-case run measured

Say this, and do not round it into a single accuracy:

On the 40 agreed cases with a model grade, identity matched 37/40 (92.5%), completeness 30/40 (75.0%), and condition 17/40 (42.5%). Condition is the weak check. Seven cases were left out because the two labelers disagreed. Three cases, RTN-017, RTN-026, and RTN-032, had no image files in the photo folders, so the model was not called. Disposition was not labeled, so the 38 restock, 8 pending-review, and 1 refurbish outcomes are not a disposition score.
