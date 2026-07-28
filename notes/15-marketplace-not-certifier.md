# Marketplace, not certifier — and where the analogy breaks

User correction: **no certification claim.** The exchange gives someone the
opportunity to buy exactly what they want and helps retrieve it. **Certification is
the buyer's job.** A European buyer tells us which ship to place the items on.
Fraudulent farmers get reported and kicked out — **"imagine Amazon, but the consumer
had to worry about the posting."**

Long-term: whole of Africa.

---

## 1. What this fixes

**It dissolves the provenance objection from [[14-what-it-actually-is]].** I flagged
"provenance is structurally invisible to the trading receiver" as the single most
important negative finding. **It stops being a finding once provenance is not a claim
the exchange makes.** The exchange's receiver only ever needs to resolve *what was
shipped, from whom, to which vessel* — and that is inside its evaluation map.

**It also sharpens the delivery boundary usefully.** "Tell us which ship" is a clean,
observable terminal cell. The arrangement completes at the quay. Everything past it —
customs, certification, EU import rules, retail grading — is a different receiver's
problem, and the corpus is explicit that this is the right move: **build provenance as
a separate receiver, or don't build it at all.** You've chosen the second, which is
legitimate and cheaper.

**And it makes `Θ` the right activity metric even more clearly.** No inventory, no
warehouse, no certification: there is very little conventional "volume" to report.
What the market produces is **matches and discovered prices**, which is exactly what
`Θ = ∫|G|` measures and what tonnage does not.

---

## 2. Where the eBay analogy holds

Genuinely, and the corpus supports it:

- **The exchange is the gate, holds no position.** Confirmed again.
- **Free re-matching.** `W_cat = 0` — re-sorting, re-matching, re-bundling cost
  nothing *and create nothing.* Value is created at the aperture: the truck, the
  loading, the settlement. **Free search and listing; charge at the aperture.** This
  is precisely the marketplace fee model, and the corpus derives it rather than
  assuming it.
- **Pure observers are free.** Arbitrarily many farmers who watch and rarely trade,
  at negligible cost. eBay's dormant-seller economics, with a theorem behind it.
- **Substitutability by outcome.** Two matching implementations producing the same
  fills are observationally identical — you can re-implement the matcher freely.

---

## 3. ⚠️ Where it breaks — reputation is the weakest link in the corpus

This is the part I want to press on, because **"buyers report them and they get kicked
out" is the one mechanism the corpus specifically says is insufficient**, and it's
load-bearing for the whole design.

### 3.1 Two-party attestation is provably insufficient
From [[10-buhera-subtree]] / `unconstrained-subtasks-computing`:

> **Linear justification fails.** No chain of authorities ever grounds a valuation.
> **Cycles of length 2 "reduce to mutual definition without external check."**
> **Only cycles of length ≥3 are circularly valid**, requiring strong connectivity and
> threshold θ > ½.

**Buyer + seller is a 2-cycle.** A buyer report against a farmer, with the farmer
contesting, is exactly "mutual definition without external check." The theorem says
this does not ground anything — not as a matter of policy preference, as a structural
result.

**This is not fatal, but it means the third leg has to come from somewhere.**
Candidates that are cheap and don't require certification:
- **The transporter** — independent of both parties, observes what was actually
  loaded, already in the transaction.
- **The weighbridge / loading point** — an instrument, not an opinion.
- **A second buyer's independent report on the same farmer** — genuinely independent
  only if the buyers are decoder-disjoint (different regions, different crops).

The transporter is the obvious one and it costs nothing extra: **they are already in
the route, which is your primary object.**

### 3.2 Reputation and certification are NOT independent evidence routes
From [[09-epistemology-agents]] §F — and this bites the design directly:

> Certification and reputation are **not independent** — reputation is largely *built
> from* certification history. Stacking them **double-counts.**

You've removed certification, which actually *helps* here — but the same argument
applies within reputation itself. **Two buyer reports from buyers who both learned
about the farmer from the same source, or who both buy the same crop through the same
corridor, are correlated.** Their floors do not multiply. The honest model is
`min βᵢ` — **one buyer's floor, not the product.**

⟹ **A reputation score computed by counting reports is overstating its own
confidence.** Weight by *independence*, not by count. The corpus is explicit that
independence must be *procured*, not assumed from volume.

### 3.3 ⚠️⚠️ The theorem the eBay analogy actually runs into
This is the one I'd take most seriously.

**No mechanism design exists in 28 papers.** No incentive compatibility, no strategic
agents. **Agents decode and project; they never misreport.** β is *noise, not lying.*
> A corrupt grader is not a high-β receiver; **he is outside the model.**

And critically: **collusion destroys exactly the independence that every composition
theorem requires.**

eBay-style reputation is a **mechanism-design artefact** — it works because of
incentive structure (repeat play, escrow, feedback asymmetry, seller-side switching
costs), not because of information geometry. **The corpus gives you the geometry and
is silent on the incentives.** So:

- **Fake-buyer collusion** (a farmer's associates posting good reports) is invisible
  to the framework — it presents as more independent evidence, which the composition
  law rewards.
- **Retaliatory reporting** by a buyer who simply didn't like the price is
  indistinguishable from a genuine fraud report at the level of the model.
- **Exit-scam timing** — build reputation, then defect once at scale — is a pure
  incentive problem and the corpus has no purchase on it at all.

**⟹ The reputation layer must be designed with conventional mechanism-design tools.
The corpus will not do it for you, and it says so.**

### 3.4 The one corpus result that DOES help reputation
**Non-return / monotone committed count.** From
[[13-computational-operations-equivalence]] and T6 throughout:

> **A rollback is a forward operation.** A cancelled trade, a disputed delivery, a
> reversed payment — none of them un-happen. They append.

**⟹ Reputation must be append-only.** A farmer's record is the *whole* committed
sequence, not a mutable score. Corrections sit beside errors. And the sharp corollary
from [[12-irreducible-bounded-phase-space]]:

> **Resemblance of configuration never entails identity of state.** Two farmers with
> identical scores are **not** in the same state — their records differ.

⟹ **A scalar reputation score discards provable distinguishing information.** It's a
deliberate quotient, like fungibility, and worth doing for UX — but the record must
survive underneath it, and disputes must be adjudicated on the record, not the score.

**This also kills identity-recycling** in the right way: a fraudulent farmer who
re-registers is a **new individual at count 0**, which is *structurally* distinct from
the original — but only if you can bind the account to something persistent. That's a
KYC problem, not an information-geometry problem.

---

## 4. What I'd actually build differently given this

1. **Three-leg validation, using the transporter as the third leg.** Buyer + farmer +
   transporter is a genuine 3-cycle and costs nothing extra because the transporter is
   already in the route. **This is the single highest-value change**, and it converts
   an insufficient 2-cycle into a valid one.
2. **Weight reports by independence, not count.** Two correlated buyers are one
   buyer. Publish an *effective independent report count*, not a raw tally.
3. **Append-only farmer record; score is a view.** Disputes adjudicate on the record.
4. **Emit STRUCTURE-LIMITED rather than "no results."** *"No transporter serves this
   corridor in this window"* is a different and far more useful answer than an empty
   page — and it is the signal that tells you where to build.
5. **Build the incentive layer conventionally.** Escrow, staged release, feedback
   asymmetry, exit-scam bonding. The corpus is silent here **by its own admission**,
   and the marketplace stands or falls on it.

---

## 5. The honest summary

The marketplace framing **removes a hard constraint** (provenance) and **strengthens
the fee model** (charge at the aperture, free search — derived, not assumed).

But it **moves the load onto reputation**, and reputation is precisely where the
corpus offers least: two-party attestation is provably insufficient, correlated
reports don't compose, and the entire incentive layer that makes eBay work is outside
28 papers' scope. **Amazon-minus-the-posting still needs Amazon's trust machinery**,
and that machinery is mechanism design, not information geometry.

The good news: **the fix is cheap and already in your product.** The transporter is
the third leg, and you were going to optimise transportation anyway.

Links: [[00-framing]] · [[14-what-it-actually-is]] · [[09-epistemology-agents]] · [[10-buhera-subtree]] · [[12-irreducible-bounded-phase-space]] · [[13-computational-operations-equivalence]]
