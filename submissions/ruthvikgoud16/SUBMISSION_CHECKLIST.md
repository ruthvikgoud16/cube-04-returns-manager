# Submission checklist

Handbook source: `HANDBOOK.pdf`, section 5, section 6, and section 13. The handbook deadline in that file is 1 October 2026, 6:00 PM IST, and the handbook says the form does not reopen. A later message in this build said the deadline moved to 11:59. That time is not in the handbook. Confirm it on the form before you rely on it.

Official hashtags are not printed in the handbook. Use the organiser’s template. Do not invent them.

- [x] Track is Returns Manager (RTN), not one of the other four
- [x] Fork exists: https://github.com/ruthvikgoud16/cube-04-returns-manager
- [x] Complete implementation is in the submission commit on `main` of https://github.com/ruthvikgoud16/cube-04-returns-manager . Confirm the push reached the fork before you paste the URL
- [x] `README.md` includes the problem, the flow, setup, the frozen numbers, and the limits
- [x] `ARCHITECTURE.md` describes the current pipeline
- [x] Evaluation report: `submissions/ruthvikgoud16/eval-report.md`. Short reading guide: `docs/evaluation.md` and `docs/evaluation.pdf`. History of the build: `docs/project-evolution.md` and `docs/project-evolution.pdf`
- [x] Demo: https://rtn-returns-manager.vercel.app/demo walks the desk with Start, Next, and Back. It opens the saved RTN-019 and RTN-001 cards and does not call the model. The page is not a video. Recorded clips for the form, if the form asks for a file: `submissions/ruthvikgoud16/returns-desk-demo.mp4` and `submissions/ruthvikgoud16/returns-desk-narrated.mp4`. A ruthvik-voiced file was requested at `submissions/ruthvikgoud16/returns-desk-demo-ruthvik.mp4`. It was not created: Gnani Vachana returned HTTP 400 because voice `ruthvik` is not in the Timbre catalog, and the clone model requires a speaker embedding that was not supplied. The form upload itself is still manual
- [x] Deployment URL: https://rtn-returns-manager.vercel.app . The walkthrough is `/demo`. The page serves the desk, `/health` returns the agent, and an unusable photo is saved as `pending_review` without a model call. Live records on that host are in memory and can disappear between requests.
- [ ] LinkedIn post published from `submissions/ruthvikgoud16/linkedin-post.md`
- [ ] CodeQuesters tagged on the live post
- [ ] Sydon.AI tagged on the live post
- [ ] Official hashtags used
- [ ] Live LinkedIn URL pasted into the form
- [ ] Every other field the form itself shows is filled. The handbook says to include anything the form asks for. That form is not stored in this repository, so it was not checked from here
- [ ] Links and files opened once before submit
- [ ] Submitted before the form’s deadline

Not a handbook item, and still true: the evaluation file is frozen. Do not rerun the 50 cases to change the report.
