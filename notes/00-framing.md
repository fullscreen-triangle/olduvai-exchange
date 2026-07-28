# Olduvai Exchange — Framing

Status: conversation in progress. Nothing built. Notes only.

## What this is

A full-fledged exchange for agricultural produce.

## Posture (the important part)

This is run as a **serious scientific research project**, not a product.

Consequences of that stance, stated up front so they can be enforced later:

- Success is measured by whether claims hold up, not by users, growth, or revenue.
- Design choices need justification that survives scrutiny — mechanism design,
  market microstructure, and the agricultural-economics literature are the
  reference points, not competitor feature sets.
- The system must be **legible and reproducible**: someone else should be able to
  re-run it, inspect why it produced a given outcome, and disagree with it on the
  evidence.
- No optimizing for virality, engagement, or monetization. If a feature only
  exists to acquire users, it does not belong.
- Negative results are results. If a market design fails, that is output, not
  failure of the project.

## Why the existing code doesn't transfer

The user has working code elsewhere, but those projects are *arranged* around
different problems. The code is not the blocker — the decomposition is. So the
work right now is figuring out the right structure for *this* problem before
importing anything.

## Open questions (unanswered so far)

- What is actually being exchanged? Physical delivery, warehouse receipts,
  forwards/futures, spot only?
- Who are the participants — smallholders, cooperatives, traders, processors?
- What geography / which produce? (Perishability and grading change everything.)
- What is the research question? An exchange is the apparatus — what is it
  measuring or testing?
- What counts as evidence that it works?
