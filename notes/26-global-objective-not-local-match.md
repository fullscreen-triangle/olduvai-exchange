# The system optimises the graph, not the transaction

User:

> People who sell **machines, pesticides, or even labourers** can all make an account,
> and **hope to be included in a transaction** — that is, the **intelligent system is
> the one independently allowing transactions, for the benefit of the whole graph, not
> just one transaction.**

**This is the strongest claim in the design, and it changes what the exchange is.
Three phrases carry it: *hope to be included*, *independently allowing*, and *benefit of
the whole graph*.**

---

## 1. ⭐⭐ "Benefit of the whole graph" — the objective function changes

Every prior note assumed **local admissibility**: a coalition is admissible iff its
cycle closes ([[17-barter-exchange]] §4.1). That is a *feasibility* test. Each
transaction is judged on its own.

**This says something different: transactions are judged by their effect on the
network.** The objective is global, and the corpus supplies the exact machinery —
from [[23-rail-yield-and-phase-locked-finance]] §1.4:

> **Separation cost** `ς(σ) = Y* − Y(C_{−σ})` — the marginal yield lost by denying σ.
> **Network transport yield** `Y(C) = Σ Δ / Σ[cost]`.

⟹ **The admissibility test stops being "does this cycle close?" and becomes "does
admitting this coalition raise `Y`?"** Those are different tests, and they disagree:
a coalition can close perfectly and still consume a scarce link that a higher-yield
coalition needed.

**⭐ And this is why the rail paper matters far more than I credited it.** I filed it as
a *pricing* result. It is actually the **objective function of the entire exchange** —
the three-way equivalence says yield-optimality, closure fixed-point, and clearing
prices coincide. **The user has just specified (i); the theorem hands over (ii) and
(iii) for free.**

That is the single tightest corpus-to-product fit found in this whole conversation,
tighter than the holonomy result.

## 2. ⭐ "Hope to be included" — participants are not entitled to trade

This phrasing is precise and worth preserving. A machine seller, a pesticide supplier, a
labour contractor **posts availability and waits to be selected.** They do not initiate,
they do not match themselves in.

**That is the gate, exercised on participants rather than on listings** — and it is T5
used at full strength. The graph fixes what is *reachable*; **the gate fixes what is
actually admitted, and in what order.**

Concretely it means the platform is not a noticeboard. Nobody browses and contacts.
**The system assembles, and being on the platform is standing to be assembled into
something.**

⚠️ **This has a hard consequence that must be said plainly:** if inclusion is the
system's decision and not the participant's, then **exclusion is also the system's
decision.** A labourer who is never selected has been ranked out by an algorithm.
See §5 — this is now the design's most serious ethical exposure and it is not
theoretical.

## 3. ⭐ "Independently allowing" — the exchange is the deciding receiver

*Independently* means: not at a participant's request, and not on a participant's terms.

From [[20-s-entropy-dimensional-typing]] §5, the finding I flagged as the sharpest limit
in the corpus:

> **Whoever controls `Φ_R` controls the exchange rates, completely and invisibly.**
> *"Which receiver?" is the exchange-rate question relocated, not answered.*

**The user has now answered it: the exchange is the receiver.** Olduvai authors `Φ_R`
and `δ_R`, and decides.

⟹ **This is a legitimate and coherent design — and it moves the governance problem from
"unresolved" to "load-bearing and concentrated in one object."** Every warning in
[[20-s-entropy-dimensional-typing]] §5 now applies with full force rather than
hypothetically:

- **`Φ_R` must be versioned and published.** Not the code — the *decision rule.*
- **Changes to it are changes to everyone's terms of trade**, and should require an
  explicit, dated, announced act.
- **"The mathematics decided" is not available as a defence.** The mathematics is
  neutral *given* the receiver; the receiver was authored.

## 4. ⚠️⚠️ The global objective collides with the Miracle Principle

This is the important technical problem, and I want it stated before anything is built.

Optimising `Y` across the whole graph means **individual legs are not optimised.** The
corpus is explicit that this is not merely permitted but *generic* — from
[[20-s-entropy-dimensional-typing]] §4:

> **Cor `cor:miracle`:** you can construct a settlement where a chosen party's leg is at
> `σ = 100` — maximally misaligned — while the global figure is perfect.
> **The framework provides no fairness constraint whatsoever.**

And **Thm `thm:path-opacity`** (validated at rate 1.00): given only the settled endpoint,
**no invariant reveals how the coalition was assembled.**

⟹ **A system that optimises the whole graph, is authored by one party, and destroys
leg-level auditability is exactly the configuration in which a smallholder can be made
worse off inside a transaction that is globally optimal — undetectably.**

**That is not a hypothetical risk. It is the mathematically generic case.**

**⭐ Mandatory, and none of it comes from the corpus:**
1. **Per-participant floor constraint.** `σᵢ ≤ σ_max` for **every** participant, checked
   *before* admission — not just the aggregate. This is the single most important line
   of code in the system.
2. **Leg-level ledger, kept out-of-band**, because path opacity means the endpoint
   cannot reconstruct it. Legally binding, not derived.
3. **Right of refusal.** A participant may decline inclusion in a coalition without
   penalty to their standing. This is the individual-rationality condition the corpus
   never states, and it is cheap to implement.
4. **Publish the yield gain and the participant's share of it.** If the coalition raises
   `Y`, say by how much and who got what.

⟹ **Global optimisation without (1) and (3) is extractive by construction. With them it
is a genuine efficiency gain.** The difference is four constraints, not a philosophy.

## 5. ⚠️ Exclusion is now an algorithmic act

If the system independently allows transactions, then **never being selected is a
decision the system made about you.**

Two corpus results bear on this directly and neither is comfortable:

**Water-filling vs concentration** ([[08-economics-remaining]]):
> Water-filling is optimal **only under diminishing returns.** Under **increasing
> returns the optimal agent concentrates.**

⚠️ **Agricultural logistics has increasing returns** — full loads, dense corridors,
consolidated milling. ⟹ **A pure `Y`-maximiser will provably concentrate**: the same
efficient participants on the same dense corridors, repeatedly. **The remote smallholder
and the small labour contractor are not unlucky — they are the predicted output of the
objective function.**

**Heterogeneity theorem** ([[08-economics-remaining]]): composite floors are products,
products are Schur-concave, so **homogeneous rosters are the unique worst case.**

⟹ **These two point in opposite directions and that is the design tension.** Yield says
concentrate; robustness says diversify. **The exchange needs an explicit
diversity/inclusion term in the objective, and the heterogeneity theorem is the
principled justification for it** — not fairness sentiment, but the floor of the whole
network being a *product* over its participants.

**⟹ Concretely: `Y` alone is the wrong objective. `Y` subject to per-participant floors
and a roster-heterogeneity term is the right one.** And the corpus argues for the second
term on its own terms.

## 6. What this settles about the product

- **Not a marketplace.** Nobody browses and contacts. Participants post availability.
- **Not an auction.** The system decides, not a price mechanism.
- **A dispatcher with an objective function** — closest conventional analogue, and worth
  saying because it is the thing to benchmark against.
- **⭐ The unit of admission is the coalition; the unit of accounting is the network.**

And a consequence for [[25-the-actual-shape]] §3: I said staying a search engine keeps
the product inside the region where the corpus is load-bearing, and that a market maker
would need mechanism design. **Independently allowing transactions is closer to the
second than the first.** A system that decides who trades is making allocation
decisions, and allocation invites strategic behaviour — inflated availability, phantom
capacity, coalition-joining to be bought out.

⟹ **The mechanism-design gap does not shrink under this design. It grows, and it is now
squarely on the critical path.** ~30 papers, still zero. This is the thing to build
conventionally and early.

## 7. ⭐ The research question, sharpened

[[17-barter-exchange]] §6 had: *does multilateral barter clearing create markets cash
pricing cannot?* This is sharper and more testable:

> **Does a globally-optimising coalition-assembler produce higher network yield AND
> broader participation than bilateral matching — and what is the frontier between
> them?**

Both quantities are measurable: `Y` from the rail paper's definition, participation as
the distribution of inclusion across the roster. **The trade-off between them is the
finding**, and per §5 the corpus predicts there *is* one.

⟹ **And this is the honest version of the project's contribution.** Not "we built an
efficient exchange" but: *here is the measured frontier between network efficiency and
participation breadth in a thin agricultural economy, and here is where we chose to sit
on it, and why.*

That is a genuine development-economics result, it is falsifiable, and — unlike almost
everything in the corpus — **it requires real data to state, which means it cannot be
verified against itself.**

Links: [[00-framing]] · [[25-the-actual-shape]] · [[23-rail-yield-and-phase-locked-finance]] · [[20-s-entropy-dimensional-typing]] · [[17-barter-exchange]] · [[08-economics-remaining]] · [[14-what-it-actually-is]] · [[24-moriarty-positioning-audit]]
