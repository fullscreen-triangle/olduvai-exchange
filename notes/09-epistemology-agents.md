# Epistemology: the agent papers

Covering: agent-coordination · synchronised-coordination · split-attention ·
operational-intelligence · agent-instantiation · epistemological-mode-equivalence ·
unconstrained-subtask-recursion. All read in full.

---

# A. *Finite-Agent Coordination on Cell-Truth*
`agent-coordination/finite-agents-coordination.tex` (1866 lines)

## Thesis
> "Coordination among n finite agents on a common goal is mathematically equivalent
> to the existence of an action-cell `C ⊆ X` such that every agent's
> decoder–projection chain admits a candidate at distance `≤ τ(C) − βᵢ` from `C`,
> **regardless of whether the agents' representation spaces, beliefs, motivations,
> or methodologies share any common content.**"

> "**The coordination object is not in the agents' representation spaces at all.
> It is in the outcome space.** The agents' representations need not agree — they
> only need to *decode to overlapping action-cells*."

Motivating vignette: three observers at a zoo (naïve observer, biologist, child)
with no shared beliefs, concepts, or language, all reliably keep a safe distance.
**What they share is the action.**

## Key results
- **Common-Cell Convergence** — one line: `S ≤ d(xᵢ*,C) + βᵢ ≤ (τ−βᵢ) + βᵢ = τ`.
  Places **no condition on the `Kᵢ`**.
- **Belief Incompatibility:** representation-disjoint agents have **no isomorphism
  class containing both beliefs, at every point.** But candidate-projections live in
  `2^X`, independent of the `Kᵢ` — > "**the overlap is in X, not in any Kᵢ.
  Cell-truth lives precisely at the level where overlap is possible.**"
- **Cell exteriority:** the cell depends on `(X, Act)` alone, **no receiver in the
  definition** — "available to all receivers simultaneously without coordination."
- **Coordination without common knowledge:** > "**No common knowledge of C, no
  common knowledge of common knowledge of C, and no iterated knowledge hierarchy of
  any finite or transfinite depth is required.**"
  > "The cell itself, as an object in outcome space, plays the role of the focal
  > point; agents need only **decode-to-it, not know-that-others-know-it.**"
- **Mode Non-Privilege:** a **pre-decoder** (reflex) layer with `β_{i*} < τ(C)` that
  fires attains the cell **independently of all decoder layers.**
- **Reachability ratio:** `μ(Reach)/μ(C) ≥ (1 + (τ−S♭)/r)^d` — **liquidity basin
  grows as the d-th power of the tolerance–floor gap.** With d=5, widening the gap
  20% grows the fillable order set ~2.5×. *Tolerance widening is superlinearly
  rewarded.*
- **`⊠` monoid:** `f₁⊠f₂ = f₁f₂/Σ`, commutative, identity Σ, absorbing 0.
  > "**floor multiplies, success ORs**."
- **Replication is heterogeneity-driven:** > "Two identical agents do not compose to
  a strictly lower floor than one; **n heterogeneous agents do.**" → mathematical
  justification for **protocol-diverse** over protocol-identical replication.
- **Gödelian residue = floor exactly.** > "The set of unanswerable questions about S
  is in bijection with `Π(D(S)) \ {S}`." Adding heterogeneous agents **shrinks the
  residue without eliminating it.**
- **Eleven-fold collapse:** > "The structural multiplicity of the prerequisites is
  **illusory**; they are eleven different ways of restating the same constraint."
- > "'Observation without bias' is mathematically equivalent to '**no observation.**'"
  The substantive question is the *size* of β.
- **On FLP:** > "We do not prove FLP from scratch; we provide a calculus in which
  **FLP-style impossibilities show up as positive composite-floor lower bounds.**"

## ⭐ For Olduvai — the cooperative-legitimacy paper

**When can a cooperative act as ONE trading entity? Three conjoined tests:**

1. **Single purpose (quotient-gate test).** There must exist **one fill class** such
   that every member's own goal-set maps onto it under that member's own action map.
   > **Members may have entirely different goals — cash today, a loan covenant, a
   > school-feeding contract — and still be one entity, provided those goals resolve
   > to the same fill class. Divergent motives do not fragment a cooperative.
   > Divergent fill classes do.**
   *Operational test — regrade-and-restate:* ask every member independently, "at what
   price, grade band, and window would you consider this lot sold?" If the answers
   lie inside one positive-tolerance cell, the co-op is one entity.

2. **⭐ Positive-tolerance intersection (fragmentation test).** > If two member blocs'
   acceptable fill regions intersect in a set of **zero tolerance** — no common
   price/grade/window band survives — **they are two collectives, and no governance
   rule can merge them.**
   **This is NOT a preference-aggregation problem to be solved by voting.** Voting
   over an empty intersection produces a nominal order no losing bloc will honour at
   delivery. **You get side-selling, and the default rate is the measure of the empty
   intersection.**

3. **Aggregate floor below contract tolerance.** A co-op whose combined grading and
   pricing noise exceeds the contract band cannot deliver as one entity, however
   aligned the intentions.

**Registration rule:** admit as one entity only on evidence of (a) a declared single
fill class, (b) demonstrated positive-tolerance intersection on historical lots,
(c) measured co-op floor below the band. Re-test annually.

**Dividend:** a legitimately-aggregated co-op is **robust to individual member
default by construction**, and you can size the default fund from the margin
`τ(C*) − S♭(E)` rather than from member count.

**⚠️ Two warnings:**
- **Independence is required and co-ops maximally violate it.** Members in one
  valley, one grading shed, one scale, one agronomist, one price source are
  **maximally correlated** — exactly the excluded case. Their floors do **not**
  multiply; honest model is `min_i S♭(Aᵢ)` — **one member's floor, not the product.**
  **Independence must be procured — rotating graders, cross-shed sampling, multiple
  price references — not assumed from membership count.**
- **The regime is OR-success.** A co-op's *delivery obligation* is **AND** (ships
  only if all deliver). **Use floor multiplication for price/grade discovery, not
  for delivery reliability.**

### What the clearing rule has to be (the action map, constrained hard)
- **(C1)** Publish a **finite explicit grid** of (grade band × lot × window ×
  point). **No fill class may be a singleton.** Continuous-price-continuous-grade
  matching is forbidden — it is point-meaning.
- **⭐ (C2) No intra-cell discrimination.** All settlements in a class are
  S-indistinguishable **to every receiver**. Sub-tick price improvement,
  discretionary grade uplift, relationship allocation = **asserting a distinction no
  participant can verify. Unarbitrable by construction — it generates exactly the
  disputes that cannot be resolved.** Uniform clearing price per cell; allocate
  within a cell by a rule making no claim to resolve sub-floor differences.
- **⭐ (C3) Receiver-independent — published, mechanical, auditable.** Any
  discretionary element — a clearing officer's judgement, a market-maker privilege,
  an ex-post grade adjustment — **destroys exteriority and with it the entire
  coordination guarantee. A discretionary clearing rule is not a clearing rule in
  this framework; it is another participant's decoder.**
- **(C4) Representation-invariant.** Quoting in USD/tonne vs ZMW/50kg-bag must
  produce **identical fills**. **Directly testable acceptance criterion: re-run the
  day's book in alternative units and diff the fills. The diff must be empty.**
- **(C5) Coarser is monotonically easier — a lever.** Under stress, **widening bands
  strictly increases attainment for every participant simultaneously.** Principled
  circuit-breaker: *widen the cell rather than halt trading.* Pre-declare
  band-widening tiers in the rulebook.
- **⭐ (C6) The order flow must be monotone.** Monotonicity is the **hypothesis** of
  the convergence theorem, not a consequence. **A rule permitting non-monotone
  re-quoting has no convergence guarantee at all.** This is the actual argument for
  clock auctions over free-form negotiation.
- **(C7) Layered matching is legitimate.** A simple mechanical rule — floor price,
  standing offtake bid, warehouse-receipt auto-match — **whose noise is below the
  band clears the trade on its own, with no need for the sophisticated layer.**
  Formal case for a floor-price backstop coexisting with an open auction.
- **(C8) Motive-blind.** Composite floor depends only on floors, not goal-content. A
  hedger, speculator, processor and food-security buyer with equal floors are
  **provably interchangeable for clearing purposes.**

**Participants fragment when — and only when:** (1) the cell is finer than the floor
(**a specification error, not a behavioural one — over-specified contracts fragment
markets**); (2) two cells with zero-tolerance intersection (**run two contracts, do
not force one book**); (3) participants outside the liquidity basin; (4) correlated
participants masquerading as many — **participant count is not the liquidity metric.
Independent-methodology count is.**

**⚠️ Mechanism design is entirely absent.** No IC, no IR, no budget balance, no
revelation principle, **no strategic agents at all** — agents decode and project,
they never misreport. Arrow is in the bibliography and never engaged. **This gives
you the contract geometry and nothing about incentives, and it assumes away fraud.**

---

# B. *Coordination Regimes of Synchronised Agents*
`synchronised-coordination/synchronised-agent-coordination.tex` (1351 lines)

⚠️ **This paper contains no contact-graph ladder at all** — no floor β, no
non-completability, no T0–T8, no monotone count, no gate. It is a
**Kuramoto/Onsager–Machlup variational-dynamics paper** — statistical physics of
synchronisation on a 5-D manifold. Different lineage.

⚠️ **It is also an explicit self-correcting rewrite**, and unusually honest about it:
> "agreement to 10⁻¹⁶ reflects **floating-point rounding of identities, not
> validation**."
> "We regard the presence of genuine corrections as evidence that the remaining
> confirmations are meaningful."

Corrections from the preliminary version: `K_c` was **wrong by a factor √(2π) ≈ 2.5**;
the five "regime transitions" are **retracted** as mere classification cut-offs
(removing "a circular argument: regimes defined by thresholds, thresholds then
'derived' from the regimes"); the sleep-stage ordering is **withdrawn** — real EEG
inverts it; Cooper-pair language **overstated** — "functional equivalence is not
ontological identity."

## The transferable payload
- **⭐ Agreement does not require shared representation** (the conservative core,
  and the one properly tested). `R_ens` depends only on `(Rᵢ, φᵢ)`, **not** on
  internal frameworks. **EXT08: four classifiers on mutually disjoint pixel
  quadrants (no shared feature) agreed at 0.51 vs 0.10 chance — and on the 29% where
  all four agreed, they were correct 100% of the time.**
- **Agreement has a sharp threshold.** `K_c = 2/[πg(0)]` — coherence gets harder in
  proportion to the spread of natural frequencies. **The only genuine phase
  transition in the model.**
- **⭐ Full lock kills discrimination cost but ALSO kills the diversity benefit.**
  Synchronised composition gives constant-in-n; **"more agents add no further
  benefit, but also no friction."**
- **Variance floor:** `V_var` penalises **both zero variance (premature lock-in) and
  large variance (indecision)**.

## ⭐ For Olduvai
- **⭐ Unanimity across disjoint sources as a settlement trigger.** When N
  independent price sources (farmer bids, warehouse receipts, regional feeds, buyer
  indications) agree within tolerance, **auto-clear with minimal challenge window**;
  when they disagree, route to a slower path. **A two-speed market that is fast
  exactly where it is safe.** Honest scope: ~29% coverage, not 100%.
- **⭐ Batch auctions, with a principled reason.** The variance floor penalises zero
  variance as heavily as indecision. **Continuous double auction on thin
  agricultural volume produces premature lock-in — a single order sets a price that
  anchors everything.** Frequent batch auctions impose a deliberate variance floor.
  And the floor **shrinks as coupling rises**, so **make the batch interval a
  function of measured order arrival density.**
- **Segment the book by cycle class** (spot / forward / seasonal) rather than
  pooling. Pooling inflates `σ_ω` and pushes `K_c` above what your liquidity can
  supply. ⚠️ Use directionally — the formula is valid only for unimodal symmetric
  distributions, and a market with two distinct populations is *bimodal*, exactly
  the case that failed empirically.
- **⭐ `R_ens` as a herding alarm.** A fully phase-locked market is one where everyone
  reacts to the same signal at the same time — **you have eliminated friction and
  eliminated price discovery.** For agriculture this is the harvest-glut failure
  mode. **If `R_ens` climbs toward 0.95, the market has stopped discovering prices
  and started stampeding.** Actively preserve desynchronisation: stagger information
  releases, avoid a single dominant reference price everyone slaves to.
- **⚠️ Do not treat the five bands as regime transitions** — the paper retracted
  them. Do not trigger circuit breakers at those values.

**⭐ The critical gap — does a market need a global clock?**
**No — it needs a global ORDER, which is strictly weaker and far cheaper.**
- The Kuramoto result genuinely licenses **decentralised cadence**: phase agreement
  emerges from *pairwise* coupling with no master clock. Real for federated regional
  nodes with unreliable connectivity.
- **But phase agreement is not event ordering.** This model has a fixed manifold,
  **reversible** noise-activated transitions, and an explicit refusal to claim
  irreversibility. **An exchange needs the opposite of all of it. Settlement finality
  is precisely a non-return claim, and this model's dynamics permit exactly the
  return that finality forbids.**
- **⟹ Sequence must come from a monotone committed count through a single gate.**
  State = (vertex, count). **Two-layer timestamping:** (i) a monotone sequence number
  assigned at commit — *authoritative*, never reused or reordered; (ii) wall-clock
  attached for legibility only, **explicitly non-authoritative and permitted to be
  non-monotone across nodes. Never let wall-clock break a tie.** This resolves the
  classic failure where a rural node's drifted clock reorders trades.
- **Define finality as a COUNT threshold, not a time threshold** — final at count c
  once the book reaches c+k with no successful challenge. **Robust to the clock
  drift the paper itself names as an irreducible noise channel.**
- **One matching engine per instrument, single-writer, assigning a total order;
  everything else is a client.** Regional nodes may cache, quote, queue — only the
  gate commits.
- **Use coupling for cadence; use the counter for order. Do not conflate them.**

---

# C. *Split-Attention Synchronised Agents*
`split-attention-synchronised-agents/` (1858 lines)

## Thesis
**Split attention is a theorem, not a defect** — for two logically independent
reasons: the **attention price `p*`** (water-filling, *conditional* on concave
returns) and **phase exclusion** (*unconditional*).

> "The appearance of split attention is **what optimal attention looks like from any
> one scene.**"

**⭐ And the limit, which is the paper's most important scope condition:**
> "If the environment presents a scene with **increasing returns** over some range,
> the objective is no longer concave... and the value-maximising agent
> **CONCENTRATES rather than divides**: it pours its whole budget into the scene
> that pays off under sustained attention and abandons the rest."
> "it is the law of bounded agency **in a concave-return environment**."

## Key results
- **Water-filling:** `γᵢ'(aᵢ*) = p*` on the support; `γᵢ'(0) ≤ p*` off it.
  **`p*` nonincreasing in budget; nondecreasing in the number and richness of
  competing scenes.**
- **Present but preoccupied in every scene at once** — `p*` is "a single readable
  dial for how reachable the character is."
- **Phase exclusion ⟹ intermittency:** > "An agent that ever forms new distinctions
  is unresponsive on a positive fraction of instants, **in every scene, regardless
  of attention budget.** Continuous immediate responsiveness is possible only for an
  agent that never reflects."
- **Fetch-access is architecturally incoherent** (independent of the search-only
  definition — this is the non-trivial claim): > "Fetch-access has the persistent
  character speak, in the present, **with the determinations of a self it no longer
  is.**" · > "A cached reply from session 1 returned in session 47 is not the same
  character being consistent; it is **a different, earlier character speaking out of
  turn.**"
- **History topology:** > "revisitation in feature space is permitted; **return in
  history space is forbidden.**"
- **Phase-lock is achieved, not automatic** — above a computable threshold
  `K_c = O(Δω)`, by committing coupling **which is itself a form of attention.**
- **⭐ Self-similarity:** > "purpose-as-attractor propagates upward as the invariant"
  — `p*` at agent scale and `P*` at society scale are **one law, not two of the same
  shape.** Validated: matched 6.0e-7 / 6.5e-7 agreement at both scales.

## ⭐ For Olduvai
- **⭐ Contract proliferation is self-defeating, and the mechanism is exact.**
  Adding a contract **raises `p*` and therefore evicts marginal contracts from every
  participant's attention set.** They go **dark, not merely thin** — the support
  condition gives literally zero, not exponentially small.
  **Before listing: estimate whether the new contract's `γ'(0)` clears the current
  `p*` of the target cohort. If not, it gets zero attention AND kills contracts that
  were previously marginal.** The correct move is often to **consolidate** delivery
  points, grades, or months rather than proliferate.
- **How many markets can one participant attend? Endogenous, not a fixed number** —
  `|{i : γᵢ'(0) > p*}|`. More capacity → lower price → more markets cross the
  threshold.
- **⭐ The matching engine is subject to phase exclusion, unconditionally.** A system
  that both updates its structure (reindexing the book, recomputing grade mappings,
  retraining a price model, ingesting a new receipt schema) and commits acts
  (matching) **cannot do both in one instant — and is unresponsive in every market
  simultaneously, because the construction phase is global.**
  **Make it explicit rather than hiding it.** Published construction/commitment
  windows give participants a contract they can plan against. **Hiding a rebalancing
  pause behind a "busy" flag is precisely the failure mode this is written against.**
  **⟹ Call-auction/batch designs are structurally aligned; CDA is in tension.** A CDA
  must steal those instants anyway — it just does so unpredictably.
- **⭐ Never cache a quote, price, margin, or fill decision.** In a produce exchange
  state changes constantly (arrivals, moisture readings, weighbridge tickets, truck
  delays, FX). **A cached basis quote is not stale-but-close; it is formally the
  answer to a different market.** Store the *index and the search apparatus*, never
  the output. A snapshot feed is a fetch; an incremental feed replayed against
  current state is a search — **prefer the latter for anything binding.**
- **The committed count is the settlement ledger.** Every fill, margin transfer,
  receipt transfer increments; **never decremented by any operation including undo,
  rollback, or restart. A trade bust is a new act at a higher count.** A restored
  snapshot is **a distinct individual** at count 0 — do not treat it as "the same
  exchange."
- **Coordination needs only a common outcome space, not harmonised beliefs.** The
  exchange's job is (a) define `O` — standardised grades, delivery points, lot
  sizes, quality tolerances, settlement units — and (b) fix `τ`. **That is the
  entire coordination requirement.** Formal argument for standardisation as the
  *minimal necessary* intervention.
- **⭐ Timing is a separate real cost.** `C = λ_c(1−R)`. Participants have different
  natural rhythms — smallholder decision cycles vs processor vs exporter. **Below
  `K_c` the incoherent state is stable and the market never coalesces no matter how
  long you wait.** The exchange's coupling is concrete: **fixed call-auction times,
  published settlement windows, mandatory pre-trade declaration deadlines, a common
  market calendar. For fragmented smallholder markets with high `Δω`, the auction
  schedule is not a convenience — it is the coupling term.**
- **⭐ Crowd sharpening needs PARALLEL attainment.** Collective failure = `∏qᵢ`,
  geometrically decreasing (0.59 at M=1 → 1.5e-3 at M=10). **But physical delivery of
  a named lot is serial/conjunctive — every link must succeed — in which case the
  product runs the OTHER way and reliability DECREASES in M.**
  **⟹ Strong argument for fungible, pooled, substitutable lots (any of M deliverers
  satisfies the contract) over named-lot bilateral matching.** That is precisely what
  turns `∏qᵢ` from a liability into an asset.
- **⚠️⭐ The one thing that could break all of it — non-concave markets.**
  Agricultural markets frequently present **increasing returns to attention**: a thin
  market that only becomes tradeable once you've committed enough presence to *make*
  it liquid; building a delivery-point network (partial infrastructure worth much
  less than complete); establishing a benchmark price (half a benchmark is not half
  as useful). **In all of these the optimum sits at a vertex — concentrate the whole
  budget on one market and abandon the rest.**
  **⟹ Classify each contract by gain-profile curvature and run TWO policies.**
  Concave (mature, liquid) contracts go in the water-filling pool. **Convex
  (bootstrap-phase) contracts must be pulled OUT and given dedicated undivided
  budget — because if you leave them in, the single-price rule will correctly compute
  they deserve ~0, and they will never launch.**
  Note the trap: the scheduler isn't miscomputing; **it is optimising an objective
  that does not describe the situation.**

---

# D. *Operational Intelligence in Bounded Agents*
`operational-intelligence/operational-agent-intelligence.tex` (983 lines)

## Thesis
Intelligence is **not** performance, correctness, or coordination. It is **the
agent's own receiver structure being mutable in a structured way** — the capacity to
add genuinely new categorical distinctions carving out action-cells that did not
previously exist.

> "intelligence lives in the agent's **receiver structure being mutable in a
> structured way**, and not at the level of methodology execution, cell-attainment,
> or inter-agent phase-locking."
> "**The agent is intelligent only when the substrate of selection itself can grow.**"

## What it rules out — the most consequential section
- **Success rate on tasks.** > "Floor positivity guarantees every bounded agent fails
  some fraction of the time. A definition equating intelligence with high success
  rate is **incompatible with floor positivity, hence with bounded agency.**"
  *(A direct rejection of benchmark-score-as-intelligence.)*
- **Point-correctness.** > "Distinguishing point outputs within a cell is forbidden
  by the receiver floor; doing it anyway is **not intelligence but a category error.**"
- **Meta-methodology.** > "Selecting which methodology to apply — a hard-coded
  knapsack solver — is **methodology-routing, not intelligence.**"
- **Coordination and synchronisation.** > "A fully synchronised collective (a flock,
  a phase-locked oscillator network) is not intelligent in any individual capacity.
  **It exhibits a regime; the regime is not intelligence.**"

## The four-condition definition + index
Intelligent iff there exist extensions with (i) **cell-disjoint extension**, (ii)
**novel cell construction**, (iii) **floor reduction** `S♭ < τ(Cᵢ)`, (iv)
**synchronisation feasibility** (*could*, not *does*).

`I(A) = (A_con/A_act) · (T_con/T_ref) · κ_A` — **necessary for intelligence;
`I ≈ 1` is the healthy point, not `I` maximal.** Bounded: **no maximally intelligent
agent exists.**

**Zero-Work Aperture:** the gate is a topological constraint on configuration
position only — `W_aperture = 0` identically. **It costs nothing yet determines
everything about what is reachable and in what order.**

**⭐ Uncertainty principle `σ_K·σ_Y ≥ β·τ`:** you can be open to new categories OR
committed to an action, **never both.** That is the mathematical content of "the gate
fixes the order."

**Six failure phenotypes**, each decidable in O(1) from the index decomposition:
P1 construction-deficient · **P2 hyper-constructive** (novel cells generated but
*inadequately tested*) · P3 construction-deprived · **P4 perceptually decoupled**
("cells become private; intelligence collapses to idiosyncrasy") · P5
action-cycle disrupted · **P6 construction-cycle disrupted** ("acts competently
within its existing K but cannot grow it").

## ⭐ For Olduvai
- **Grades/lots/ticks must be cells with declared positive tolerance.** Cell-Truth
  says any two deliveries in the same grade cell are *equally conforming* — **an
  arbitration process that ranks two in-spec lots is committing the named category
  error. Design so "in-cell" is terminal: no appeal can subdivide below τ.**
- **⭐ Set τ ABOVE the inspection floor and publish β alongside every τ.** Condition
  (iii) is literally `S♭ < τ(C)`. **A grade band finer than your apparatus can
  resolve makes the contract unsettleable by construction and will generate
  systematic disputes.** Enforce `β < τ` as a listing precondition.
- **⭐ New contract admissibility is not "is it useful?" but "is its cell DISJOINT
  from every existing contract's cell?"** Overlapping contracts **retroactively
  corrupt the settlement history of the old contract** — a lot in the overlap is
  deliverable against two contracts. *A formal argument against listing a "premium"
  grade that partially overlaps an existing standard grade.*
  **Refinement is the only permitted contract-evolution operation — split an
  existing cell into disjoint sub-cells whose union is the old cell.** Then old
  contracts stay settleable, historical price series stay meaningful, no basis
  discontinuity. **Forbid overlap outright in the listing rules; keep the spec
  registry append-only.**
- **⭐ The exchange itself must alternate construction and action phases —
  unconditionally.** *Action phase:* the trading session — contract specs frozen,
  grades frozen, matching deterministic. **By the uncertainty principle the exchange
  CANNOT learn new categories during a live session — redefining a grade mid-session
  is forbidden by theorem, not merely by good practice.**
  *Construction phase:* a **scheduled, trade-free interval** where new grades,
  delivery points, instruments are constructed.
  **An exchange that only ever trades is P6** — it executes competently in a fixed
  taxonomy and cannot grow it, so it will fail to track a changing crop, changing
  climate zones, changing varietals, changing buyer requirements. **`T_con/T_ref`
  becomes a measurable governance KPI, not a vibe.**
- **⭐ The aperture is a membership/eligibility/state constraint, NOT a price
  intervention.** Who may quote, which lots are eligible, which sessions are open,
  what state a receipt must be in. **It does not mean price collars, intervention
  buying, or discretionary halts based on where prices are moving. Any mechanism
  that does work on prices is not an aperture and forfeits the guarantees.**
- **⭐ Log the trajectory, not just the terminus.** Two market states with identical
  closing prices reached by different sequences are **different states.** Audit
  record must be the ordered path; design for full sequence reconstruction, not
  end-of-day snapshots.
- **Phase-locking is binary — you do not get 70% of the friction benefit from 70%
  standardisation.** Either the grade standard is universally and identically
  decoded, or you are in the regime where **FLP and Byzantine impossibility bite** and
  you need expensive explicit consensus (bilateral inspection, escrow, third-party
  assay on every trade). **Strong argument for investing heavily and early in a
  single canonical grading standard rather than incrementally harmonising several.
  The payoff is discontinuous.**
- **⭐ What automated participants CANNOT do:** by the uncertainty principle, a bot
  running continuously in action phase is **provably confined to parameter updates
  within the existing framework, not framework extension.** It can retune weights
  forever; **it cannot invent a new grade category, and it cannot recognise that the
  taxonomy has stopped fitting reality** — a new pest, a new post-harvest treatment,
  a climate-shifted maturity profile, a new export requirement.
  **⟹ The taxonomy-revision function must be human-in-the-loop, scheduled, and
  trade-suspended. It cannot be delegated to the trading automation, however
  capable.** And **do not certify an algorithmic participant as "smart enough to
  manage the taxonomy" on backtest scores** — success rate is explicitly ruled out.
- **⚠️ P2 risk:** an ML system with elevated construction is the exact failure mode of
  a model proposing many plausible new grade categories **never validated against
  physical delivery. Gate proposed new cells behind mandatory action-phase
  verification (actual settlement against actual lots) before listing. Elevated
  construction is NOT good — the healthy point is I ≈ 1, not I maximal.**
- **⚠️ P4 risk:** a bot whose internal representation drifts from others' breaks
  pairwise isomorphism and **reintroduces coordination friction across the whole
  federation. Mandate decoder conformance testing for algorithmic participants, not
  just risk limits.**

---

# E. *Agent Smith* — a specification language for instantiating agents
`agent-instantiation/agent-instantiation-syntax.tex` (1248 lines)

## Thesis
A declaration of **purpose + scenes + the material that makes it an agent** — never
a script of conduct, never a domain routine.

```
agent ι { purpose π  scenes { S… }  self { parts, separations }
          budget α  floor β  coherence κ }
```

> "every well-typed Agent Smith compiles to an agent that honours, **by
> construction**, four runtime invariants — conserved identity, a never-resetting
> committed count, search-not-fetch world access, and construction/commitment phase
> exclusion — and **no ill-typed script is instantiated**."
> "The compiler does not re-prove the invariants; **it earns them** by producing an
> object the theory already covers."
> "Agent Smith carries the intent; **the mechanism is delegated**."
> "The language never learns to forge or to solve; it learns only to build an agent
> that is *for* forging or solving."

## T8's three bounds, realised
- **(I) Open-endedness** — finite script, unbounded run. > "Nowhere does the script
  say 'at tick 5, hammer.'"
- **(II) Non-duplication** — > "A re-run of an agent's past act is **a new act at a
  higher count — a genuine re-derivation against the grown graph, not a replayed
  cache.**" · > "One authors the standing structure; **one does not author the
  accumulated count, which individuates the token.**"
- **(III) Floor-limited authorship** — the **behaviour hook** is opaque. Swapping
  same-typed hooks leaves typing and denotation identical. **The author specifies the
  type of the interior, never its content.**

## Key machinery
- **Typing IS the theory's hypotheses made decidable:** > "Typing is not an extra
  discipline layered on the theory; **it *is* the theory's hypotheses made into a
  decidable front-end check.**"
- **Four rejected failure modes:** > "no agent is ever instantiated with a
  **zero-floor self, a non-convex drive, a dead scene, or a non-positive budget.**"
- **Tick loop** = commit ∘ diagnose ∘ observe, in phase order.
  > "an agent acts on the state of the solution, **not on its own internal
  > reasoning**."
- **Ω is not stored inside any agent** — each reads a slice on demand. Two reading
  tiers: **Tier 0 probe** (cheap, deterministic, ranked slice, *holds no domain
  answers, only the means to search for them*) and **Tier 1 deep read** (model-backed,
  invoked only on escalation).
- **⭐ Commit gate — "release at sufficiency, not at completion":** fires iff the act
  lowers the **parent** intent's residual **and** preserves coherence — *not* that
  the agent's own gap closes.
  > "The commit decision is a function of the act's **outcome** in the shared space
  > ... and never of how the agent's hook computed the act. **This is why an agent
  > needs no model of any other agent.**"
- **Diagnose returns a typed limit:** CONVERGING / COMPUTE-LIMITED /
  **STRUCTURE-LIMITED**. > "A stalled agent does not fall silent: it **emits
  STRUCTURE-LIMITED**, a diagnosis the conductor layer reads."
- **Pure observer** — costs one Tier-0 probe per tick, contributes zero, **and the
  instant the shared state changes so its act clears the price, the gate fires.**
  > "A society may contain **arbitrarily many pure observers at negligible cost**."
- **Society is closed under composition** — a well-formed society is itself a
  well-formed agent.

## ⭐ For Olduvai — yes, declare participants and instruments formally
**The four admission rules map directly:**

| Failure mode | Exchange analogue — rejected at declaration |
|---|---|
| **zero-floor self** | A participant/contract with a **zero-cost distinction** — two grades, windows, or locations declared separate with no positive separation cost. **This is the wash-trade / fungibility-abuse hole.** Any two deliverable variants must differ by ≥β or they are **the same deliverable and must be collapsed.** |
| **non-convex drive** | A participant with **no unique objective** — a hedger who is also a speculator on the same book. No unique attractor ⟹ no admissible-response test. |
| **⭐ dead scene** | A **venue/instrument a participant may trade that serves no declared purpose.** *The single most valuable rule: it makes "why is this participant in this market at all" a **statically checkable** question rather than a surveillance question.* |
| **non-positive budget** | Unpriced order flow. |

- **⭐ `coherence keeps {…}` is the hard risk limit — and it is a RUNTIME-OWNED gate
  evaluated on the OUTCOME, before every fill.** > *That is the correct architecture
  for margin and position limits: **never trust the participant's internal risk
  model, read the outcome.***
- **⭐ One language, two regimes:** `purpose minimise φ` with a **standing** minimum →
  a **persistent member** (co-op, miller, market maker). `purpose reach o` with
  **attainable** `o` → an **instrument/contract instance** that halts at quiescence.
  **Participants and instruments declared in the same language, checked by the same
  checker, with the lifecycle difference falling out of one clause. A settled
  contract is not deleted — it reaches its attractor and halts.**
- **⚠️ What must NOT be in the declaration language:** the pricing algorithm, matching
  heuristic, grading procedure, logistics routing are **hooks — opaque, same-typed,
  swappable.** Declare *that* `scene grade serves quality_residual with grading_hook`;
  **do not encode maize-moisture rules in the exchange language.** A different
  country/crop/season swaps the hook and **nothing re-types, nothing re-certifies.**
  **But: the exchange guarantees NOTHING about a hook's internal correctness. A
  well-typed exchange with a broken grading hook is still well-typed. Do not oversell
  the certificate — audit hooks out-of-band.**
- **Ω = the order book / clearing record**, shared and external, **not stored inside
  any participant.** Participants coordinate **through the outcome space, never by
  modelling each other** — a privacy property *and* an anti-collusion property.
- **⭐ Steal the Diagnose typology as a market-health taxonomy.** CONVERGING (price
  discovery working) / COMPUTE-LIMITED (add liquidity) / **STRUCTURE-LIMITED (acts
  committed but the gap did not close — more of the same will not help; route a
  different kind of participant here — a missing counterparty class, a failed grade
  definition, a logistics bottleneck).**
  > **Make illiquidity an EMITTED TYPED SIGNAL, not an absence of prints. Absence of
  > trades and structural failure look identical otherwise.**
- **⭐ The pure observer legitimises the non-trading smallholder.** Costs one probe
  per tick, contributes zero to the residual, **and the instant the state changes so
  its act clears the price, it acts.** ⟹ **Admit arbitrarily many smallholders who
  watch for months and trade twice a year at negligible cost — they are valid members
  and their presence is the latent liquidity.** Plus the crowd-sharpening argument:
  **many cheap readers beat one expensive one where judgment is uncertain** (grading,
  harvest forecasting, quality disputes) — a direct argument for distributed
  smallholder price-reporting over a single central assessor.
- **⭐ "Release at sufficiency, not at completion"** = the settlement rule. **Release
  goods, funds, or a partial fill when the counterparty's requirement is met, not
  when the seller's book is flat.** Legitimises partial fills and staged delivery as
  first-class and **prevents the deadlock where every party waits for its own
  completion.**
- **Composition:** the exchange, the clearing house, a co-op, and a single farmer are
  **all declared in the same language and checked by the same checker**, with
  conditions: **every declared tie has cost ≥β** (forbids the shell-entity graph) and
  **the graph is connected** (an isolated participant cluster is a formal error
  surfaced at declaration rather than at settlement).
- **⚠️ The compiler must be the SOLE instantiator** — no back door. **If any legacy
  path can register an entity without typing, the entire guarantee collapses.**
- **⚠️ The riskiest inherited hypothesis is "floored"** — it requires every
  distinction the market makes (grade, origin, window) to genuinely cost something to
  maintain. **Where a market lets distinctions be free, the floor is violated at the
  root and none of the guarantees apply.**

---

# F. *Epistemological Mode–Methodology Equivalence*
`epistemological-mode-equivalence/epistemological-methodology.tex` (1099 lines)

## Thesis — two senses of equivalence
**(a) Mode Non-Privilege:** reflex (pre-decoder), cognition (decoder), and
**testimony/delegation** are **interchangeable routes** to the same action-cell.
Knowledge is **not** the privileged mode.

**(b) ⭐ Mode–Methodology Equivalence (the titular result):** a **receiver** (who is
observing) and a **methodology** (the procedure being run) contribute to attainable
certainty through **the identical algebraic law.** They are "algebraically
interchangeable factors."

$$S♭(R∘M) = S♭(R) + S♭(M) − S♭(R)S♭(M)/Σ$$

and for layers + methodology stack, **the two products are entirely symmetric —
nothing in the expression records which factors were observers and which were
procedures. That indistinguishability IS the equivalence.**

> "swapping a receiver-layer for a methodology with the same floor leaves the
> composite floor invariant. This is the calculus's analogue of **duality between
> observer and observation-procedure.**"

## Key results
- **Cell-Truth**, and > "singletons are not action-cells... **practical truth is
  granular**."
- **Three encodings isometric ⟹** > "Choice of representation is **computational,
  not epistemic.**"
- **Zoo example:** naive observer (reflex fires), biologist (decoder), child
  (**parental delegation**) — all three reach the same cell. > "decoder knowledge is
  **not necessary**; the cell-membership is the operational truth."
- **⭐ Methodological floor `S♭(M) = σκ/(1−κ)`; `liminf_N T^N ≥ S♭(M) > 0`.**
  > "The standard scientific reflex 'replicate the experiment to drive uncertainty to
  > zero' is **structurally incomplete**: replication compounds catalytic factors but
  > **cannot remove the methodology's own floor.** Driving below `S♭(M)` requires
  > **switching to a methodology with smaller floor, not running more iterations of
  > the same one.**"
- **Production/completion incompatibility:** producing knowledge needs `σ>0`;
  committing an action needs `σ=0`. **Mutually exclusive at any single iteration ⟹
  any agent that does both must ALTERNATE.**
- **Anti-monopoly:** `sup Know ≤ Σ − β`. > "Total knowledge of any subject **cannot
  reside in a single bounded receiver.** It is necessarily distributed." · > "The
  distribution is **forced by receiver-floor positivity, not added by convention.**"

⚠️ **Manuscript defects to record:** an unresolved *increases-vs-decreases*
contradiction between the composition corollaries and the algebra; a residual false
start (with a literal question mark) in the composition proof; a `τ` definition in
tension with its later use.

## ⭐ For Olduvai — the unified evidence ledger

**The five fact-establishing routes map onto ONE slot:**

| Exchange mechanism | Paper's object |
|---|---|
| **Physical inspection** | pre-decoder / decoder layer, agent-controlled |
| **Lab assay** | methodology `(T,κ,σ)` — σ = assay reproducibility |
| **Certification** (GlobalGAP, organic, phytosanitary) | **delegated layer** — external receiver "not controlled by the agent" |
| **Reputation** (seller track record) | pre-decoder — fires on identity, not the consignment |
| **Model inference** (satellite NDVI, ML grade prediction) | methodology |

> The composite formula **does not record which factors were people, which
> instruments, and which institutions.** ⟹ **a single unified evidence ledger:**
> every route registered as one object with one number (its floor), combining by one
> rule. **You do not need separate reasoning systems for "human grading" vs "lab
> result" vs "certificate on file." That is the design payoff.**

- **⭐ Grade bands, not point values — and this is not a compromise.** Two lots at
  13.1% and 13.4% moisture, both inside "Grade A ≤14%," are **epistemically identical
  for the purpose of the trade.** A contract specifying "moisture 13.2%" is strictly
  *worse* than "Grade A (≤14%)": it demands resolution within the fibre, which is
  unnecessary and impossible.
  **Set band width above the floor of the cheapest adequate method** — this is a
  *design inequality*: if your handheld meter has β=0.8%, **do not write bands
  0.5% wide — no route on the platform can adjudicate them and every trade becomes
  disputable.** Conversely, to permit cheap inspection, widen the band.
  **Adjudicate disputes at cell membership: a dispute over 13.1 vs 13.4 inside Grade
  A is not a real dispute.** *Kills the common failure mode of over-specified
  contracts generating arbitrage on measurement noise — under cell-truth, arbitrage
  lives at band boundaries only, so put quality-control effort there.*
- **⭐ Evidence combines MULTIPLICATIVELY. Never sum confidence scores.** Marginal
  value of the n-th route **decays geometrically** — the fifth certificate is worth
  far less than the first lab assay. **Buy one route from each independent family
  before buying a second of any family.** And **no route ever becomes redundant** —
  every factor strictly moves the product.
  ⚠️ **Flag the paper's sign inconsistency to whoever specifies the confidence
  engine — it must be resolved before it is coded.**
- **⭐⭐ Independence is the binding constraint, and it is where produce exchanges
  actually fail:**
  - **Certification and reputation are not independent** — reputation is largely
    *built from* certification history. Stacking double-counts.
  - **Model inference and lab assay are not independent** if the model was *trained
    on* lab assays. The model contributes almost no new factor.
  - **Two inspections by graders trained at the same institute share a decoder** —
    substituting one for the other changes nothing.

  **⟹ Mandates:** (1) require an **independence declaration** for every registered
  route — a certificate route must declare whether the certifier's sampling used the
  same lab; model routes must declare training provenance. (2) **Discount correlated
  routes explicitly** — don't let a seller stack five certificates from bodies that
  all subcontract the same lab. (3) **⭐ Price evidence by independence, not by
  cost** — for a lot with a lab assay and a certificate, *physical inspection at
  delivery* is worth more than a second assay.
- **⭐ Do NOT build a "run the assay three times" quality tier.** N iterations
  converge to the floor and stop. **If a buyer needs tighter certainty than the
  platform's ELISA can give, the answer is HPLC (a different methodology with smaller
  floor), not three ELISAs.** Encode a **method ladder, not a repetition count.**
  And: floor is **linear in dispersion σ** with slope `κ/(1−κ)` ⟹ **investing in
  sampling protocol standardisation (which reduces σ) is the single
  highest-leverage quality intervention**, more so than buying better instruments.
- **⭐ Separate the dispersion window from the commitment gate.** Price discovery /
  quality assessment is `σ>0` (**multiple graders disagreeing IS the information
  production — suppressing it stops the platform learning**). Settlement is `σ=0`
  (**two runs on the same inputs must give the same answer, or it is not an
  exchange**).
  **Architect as an explicit alternation:** a quality window (dispersion allowed,
  disagreement recorded) → a hard **commitment gate** (one grade emitted, settlement
  deterministic and replayable). **Do not let evidence keep arriving after the gate —
  that is the source of post-settlement dispute chaos. Once the gate fires, the grade
  is final and residual dispersion becomes a PRICED RISK INSTRUMENT (warranty,
  arbitration bond, insurance), not a re-litigated measurement question.**
- **⭐ Anti-monopoly: reject a single authoritative grader, lab, or certification
  body — on epistemic grounds, not antitrust.** The monopolist's own floor caps the
  platform's attainable certainty **permanently, and no volume of throughput lowers
  it. The platform's competitive advantage IS aggregation across independent floors,
  which a single actor cannot do — the theoretical justification for the exchange
  existing at all as distinct from a large trading house.**
  **Publish β per participant** — makes the composite computable and makes evidence
  markets possible.
- **Format-agnostic intake:** PDF certificate, signed JSON, on-chain token, LIMS
  record, SMS grade code — **normalise aggressively, do not privilege a format.**
  ⚠️ **But keep two operations distinct in the schema: re-encodings are free;
  quotients are commitments.** Transcribing "13.4% moisture" → "Grade A" is *not* a
  re-encoding — it is the cell map.

---

# G. *An Equivalence Calculus of Unconstrained Subtask Recursion*
`unconstrained-subtask-recursion/unconstrained-subtask-recursion-equivalence.tex`
(2972 lines — longest in the corpus)

## Thesis — three claims
**(a) Triple Equivalence:** oscillatory / categorical / partition are
**categorically equivalent** under explicit functors. Any computation may be
relocated to whichever representation is cheapest.
> "the choice between them is **computational, not informational**."

**(b) Unconstrained Subtask Theorem — path opacity:** all expressions in the same
receiver-evaluation class are indistinguishable at the global level.
> "**the local S-value of the subtask is NOT constrained by the global S-value of the
> expression as a whole.**" · > "**The local types are surface; the global S-value is
> what is asserted.**"

**(c) No privileged level + scale homomorphism.** The author's own ranking of the
three load-bearing theorems: **Floor Theorem** ("the structural reason why perfect
knowledge is impossible"), **Triple Equivalence**, **Unconstrained Subtask**.

## ⭐ The scale homomorphism, stated three times at increasing strength
1. **Scale invariance:** `S` and evaluation invariant under level-shift.
2. **`σ_{d→d+1}(ξ ⋆ η) = σ_{d→d+1}(ξ) ⋆ σ_{d→d+1}(η)`** — a homomorphism for **every**
   binary operation. *The literal scale homomorphism.*
3. **`ρ_d(ξ₁ ⋆ ξ₂) = ρ_d(ξ₁) ⋆ ρ_d(ξ₂)`** plus **`ρ_{d₁} ∘ ρ_{d₂} = ρ_{d₁+d₂}`** —
   a homomorphism-valued **semigroup in depth**.

> "the same expression appears as 'global' at depth d and as 'subtask' at depth d+1,
> **with identical S-value in both roles.**" · > "**The choice of global is a
> labelling convention, not a structural property.**"

Also: **Locally-impossible catalysts can have positive power** — > "locally
infeasible ('miraculous') subtasks compose into globally feasible expressions."
And **circular validation is necessary**: linear justification provably fails;
**three mutually-supporting sources at θ>0.5** suffice; below 0.5 the graph
fragments into two-element sub-cycles.

## ⭐ For Olduvai — the nested-aggregation paper

**Decomposition is genuinely free, provided it recomposes.**
- Split by crop, geography, grade, delivery window, tenor, any mixture — **at least
  `2^(k−1)` distinct valid decompositions, all equally admissible. Do not waste
  governance capital arguing the "natural" split. The only legitimate criterion is
  COST** — pick the decomposition where matching, settlement, and dispute are cheapest.
- **⭐ Submarkets may run losses, hold negative inventory, or look locally absurd.**
  A regional book clearing at an obviously wrong price, a cooperative net short — **not
  a defect if the composed national clearing is correct.** Formal warrant for
  cross-subsidy, a deliberately loss-making buffer-stock desk, a market-maker of last
  resort in thin regional books.
  **⟹ Do NOT put local-feasibility constraints on submarket books.** Requiring every
  regional book balanced, every co-op net-flat, every crop desk profitable **buys
  nothing (global value is invariant) and destroys the compositional freedom that
  lets you place liquidity where it is cheap.**
- **Type-mixing is admissible** — kg, bags, hectare-forwards, moisture-adjusted
  tonnes, cash, input-credit compose **without a special mixed-type operation** —
  *provided* the exchange publishes and enforces the conversion functors.
  **⚠️ This is not permission to be sloppy: ALL the discipline lives in the
  conversions.**

**Nested aggregation farmer → coop → region → national — the same rules apply at
every scale, as a THEOREM:**
1. **⭐ One rulebook, four levels.** A level-specific rulebook is not merely
   redundant — **it is a category error**, because the same entity occupies two levels
   simultaneously. **A cooperative running "co-op rules" internally and "regional
   rules" externally produces homomorphism violations exactly at the boundary where
   arbitrage lives.**
2. **⭐⭐ Test the homomorphism continuously.** Implement
   `aggregate(match(a,b)) == match(aggregate(a), aggregate(b))` **as a production
   reconciliation check at every level boundary.**
   > **Any failure is a real leak: reconciliation break, double-counted lot, or a
   > grade conversion that isn't invertible. This is the single highest-value
   > invariant in the whole design.**
3. **Three-slot ledger per node** from the triple structure: **k = quantity/knowledge
   (what is physically there and graded), t = timing (delivery window, storage,
   spoilage clock), e = value (price, basis, quality discount).** At depth 4 that is
   `3⁴ = 81` coordinate paths — **a tractable and complete reporting schema. The
   recursive S-tuple IS your risk dashboard.**
4. **Aggregation must be an explicit, published functional.** > **A volume-weighted
   regional price and an unweighted one are DIFFERENT EXCHANGES with different
   floors.** Volume-weighting is the one you almost certainly want for price and
   almost certainly do NOT want for quality.
5. **⭐ Aggregation does not improve accuracy for free.** The collective floor equals
   the best member's **only when communication is lossless; strictly worse with
   noise.** With SMS price reports, paper weighbridge tickets, delayed grade
   certificates, **the national floor is strictly worse than the best regional
   floor.** ⟹ **Investment in the reporting channel IS investment in the national
   floor** — a quantitative argument for digital weighbridges and at-source grading,
   **stronger than the usual efficiency argument: without it the aggregation CANNOT
   inherit the best local accuracy, as a matter of theorem.**
6. **⭐⭐ Path opacity is a settlement guarantee — and a hard limitation.**
   Two routings delivering the same graded quantity to the same buyer at the same
   price are **indistinguishable by any test the exchange can run. ⟹ Settle on
   endpoints, not on route.** Whether a co-op sourced 20t from 40 farmers or 400, one
   truck or five, via warehouse or direct, is **outside the exchange's admissible
   tests.** Dramatically simplifies clearing.
   **⚠️ But equally: traceability and provenance are NOT recoverable from the
   exchange's own evaluation map.** For export certification, organic claims, or
   deforestation compliance you **must build provenance as a SEPARATE receiver with
   its own framework and its own floor — the trading receiver is structurally blind
   to it.** *This is the single most important negative design finding in the paper.*
7. **⭐ Intervention portfolios must have NON-SUMMABLE effectiveness.** Convergence
   happens **iff Σκᵢ = ∞**. A portfolio with geometrically decaying effectiveness (a
   launch subsidy, then a smaller one, then smaller) **provably stalls above the
   floor — levelling off halfway to nothing.** Harmonic decay still converges.
   ⟹ **Your roadmap must be sustained recurring capability improvement, not a
   decaying series of launches. A sharp testable criterion for whether a
   market-development programme will converge or merely plateau.**
8. **Interventions compose multiplicatively** — 30% + 40% gives 58%, not 70%.
   **Order matters even when outcome doesn't**, and **most interventions are
   irreversible — you cannot un-launch a futures contract. Sequence deliberately.**
9. **Circular validation, minimum three sources, θ > 0.5.** There is **no**
   terminating chain of price authorities ending in an unquestioned reference price.
   **Price discovery must rest on ≥3 mutually-cross-checking sources** — exchange
   trades, independent spot surveys, border/import parity — with a strongly connected
   validation graph. **Never a single reference price, never a two-source pair**
   (below 0.5 they quietly confirm each other while drifting).
   ⚠️ Stability budget `δ ≤ θ/(|A|−1)`: **more sources means each may deviate LESS.
   A large panel of loosely-controlled reporters is worse than three well-controlled
   ones.**
10. **Multi-floor tiering:** SMS spot prices → certified warehouse receipt →
    third-party lab assay. **Each tier genuinely more accurate, each requiring a
    specific enabling instrument, and no tier reaching zero. Price the tiers by the
    floor they deliver.**
11. **⭐ Closure as the ship/no-ship test:** the exchange is feature-complete when no
    further instrument **creates a new distinguishable equivalence class of
    allocations.** If a new contract type, grade, or window doesn't cause the exchange
    to distinguish two allocations it previously conflated, **that feature adds cost
    with no informational gain. Far sharper than "is there demand."**

**⚠️ The paper insists domain applicability is CONJECTURAL.** The most fragile
assumption for an exchange: **grading must be MONOTONE in true quality. Where grading
is non-monotone or gameable, the theorems do not transfer.**

Links: [[00-framing]] · [[04-corpus-map]] · [[07-market-equilibrium]] · [[08-economics-remaining]]
