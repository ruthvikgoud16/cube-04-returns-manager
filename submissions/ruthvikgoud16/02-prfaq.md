# PR/FAQ

## What is it?

A phone page that grades one return from two or three photos and writes an evidence record for Recovery. The model reports what is visible. A documented ruleset, `policy_v1`, recommends restock, refurbish, liquidate, or pending review.

## What if the model is down?

The photos and the order are saved. The disposition is `pending_review`. The operator is where they would be with no agent. A later rerun does not undo a unit that has already been moved.

## Why can the agent refuse to grade?

A blurry frame, a missing view of a required part, or two similar chargers with no readable mark should not become a confident restock. UNCERTAIN is a result. It is not a low-confidence pass.

## What is the kill line, decided before the 50-unit scores exist?

On cases where two people agreed: identity under 90%, condition agreement under Cohen’s kappa 0.7, or uncertain / pending review over 20%, and we stop claiming the agent is fit to run unattended. Model-failure pending above a few percent is a separate failure. Those lines were written before the scores. They were not moved.

The scores are in [eval-report.md](eval-report.md). On the 40 agreed cases with a model grade, identity matched 37/40 (92.5%). Cohen’s kappa was not computed, so the kappa line is not a result. Condition grade match on those 40 is 17/40 (42.5%), which is the weak check. Identity uncertainty is 1/40. Eight of 47 graded cases are `pending_review`. Model errors on the final run were 0. None of this is a claim that the agent should run unattended.

## What are we not claiming?

We do not report one blended accuracy. We do not score disposition, because it was not labeled. We do not detect underweight parcels from a photograph. The content hash is not an immutable seal. `policy_v1` does not emit dispose. The fixture file’s expected dispositions are developer notes, and some of them ask the agent to treat a clean photo as destroyed because of a made-up smell. We do not do that.
