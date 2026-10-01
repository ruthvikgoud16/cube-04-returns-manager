# Demo script

Do not re-grade RTN-001 through RTN-050 while showing this. Opening the two saved cards does not call the model. A new photo on the phone page would be a different unit and a new model call.

Open `http://localhost:8787` or the public desk. The saved cards are in the page. They are not a second pass on the evaluation set.

1. Returns Manager checks a photographed return: is it the named product, are the required parts shown, and which Amazon used grade fits what is visible. One model call grades those three checks. `policy_v1` then sets the disposition. UNCERTAIN is not a pass.
2. Sign in as `org_demo_alpha` and open RTN-019, the NOVA hair straightener.
3. Show the three checks, all PASS, Amazon grade Very Good, and the restock result. Say that `policy_v1` restocked a complete Very Good unit. The model did not choose restock. This card is a saved evaluation.
4. Open RTN-001, the Samsung Book laptop.
5. Identity PASS. Completeness UNCERTAIN, because the adapter and box are not clearly shown. Condition PASS, Very Good. The disposition is `pending_review` because an UNCERTAIN check stops automatic restock.
6. State the frozen numbers, and do not blend them into one accuracy. On 40 agreed cases with a model grade: identity 37/40 (92.5%), completeness 30/40 (75.0%), condition 17/40 (42.5%).
7. Condition is the current weakness. Of 23 condition mismatches, 14 are human Very Good and agent Like New.
8. Disposition was not human-labeled. 40/40 saved agent dispositions were reproduced exactly by `policy_v1` from the agent’s saved checks. There were zero true policy-mapping inconsistencies. 27/40 (67.5%) is only agreement between `policy_v1` on the agreed human checks and the saved dispositions. It is not disposition accuracy.
9. Close on the limit. These rates are this evaluation set. They do not show that the same rates would hold on another set. The next improvement is the condition check, which sits one step high on Amazon’s used scale. Cohen’s kappa was not computed.

The reviewer page is https://rtn-returns-manager.vercel.app/demo . Start demo begins the nine steps. Next and Back move the real desk: sign in as `org_demo_alpha`, then open `#show-019` and `#show-001`. Those buttons draw the saved cards. They do not call the model. The page is the walkthrough, not a video.

The recorded clips for the form are `submissions/ruthvikgoud16/returns-desk-demo.mp4` and `submissions/ruthvikgoud16/returns-desk-narrated.mp4`. They are not what the demo page plays.

A separate file voiced with the cloned Gnani voice `ruthvik` was requested at `submissions/ruthvikgoud16/returns-desk-demo-ruthvik.mp4` and `/Users/ruthvikgoud/Downloads/CUBE-RTN-returns-desk-demo-ruthvik.mp4`. It was not written. `POST https://api.vachana.ai/api/v1/tts/inference` with `voice` `ruthvik` and model `timbre-v2.5` returned HTTP 400: Voice 'ruthvik' is not in the Timbre speaker catalog. The clone model `vachana-vc-v1` with the same voice name returned HTTP 400 because that model requires a `speaker_embedding`, which was not supplied. The existing demo and narrated files were left in place.
