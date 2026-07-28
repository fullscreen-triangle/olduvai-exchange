# Paper: *Market Equilibrium as Purpose Fixed-Point*
### A Mathematical Theory of Coordination among Bounded Economic Agents

Source: `economic_agents/market-equilibrium/market-equilibrium.tex` (1679 lines, read in full)
**Paper 2 of the economics sequence.** Base = [[06-economic-agent-theory]]; Paper 3 = heterogeneity; Paper 4 = [[05-foundation-for-price]].

---

## 1. Thesis — equilibrium is a REGION

**Equilibrium exists, but it is a positive-width cell, not a point price — and it is reachable
without shared beliefs, without common knowledge, without convexity, without complete markets.**

Equilibrium is redefined as a **purpose** `C*`: a cell where the ensemble's purpose functional
saturates its irreducible floor.

> "The equilibrium is not a point price but an interval: the **equilibrium spread** is
> `τ(C*) − S♭(E)`."

> "The Nash framework is recovered as the limit `βᵢ → 0`, `τ(C*) → 0` — the degenerate case
> where agents have infinite precision. The floor theorem proves `βᵢ > 0` for every bounded
> receiver, so **the Nash limit is unattainable for any bounded agent.**"

Second load-bearing claim — **coordination relocates from belief space to outcome space**:

> "The overlap between agents' candidate-projections lies in `X` — the outcome space — not in
> any `Kᵢ`. An action-cell `C ⊆ X` exists **independently of any agent's representation
> framework**. This is the mathematical basis for coordination without shared beliefs: agents
> coordinate in outcome space, not in belief space."

## 2. Core results

**Aggregate floor:** `S♭(E) = minᵢ S♭(Aᵢ)`; multi-agent `S(E,x;C) = minᵢ S(Aᵢ,x;C)` (OR-semantics
— the best-placed agent carries the ensemble).

**Belief Incompatibility.** If `Kᵢ ∩ Kⱼ = ∅` then for **every** state there is no isomorphism
class containing both beliefs. Structurally incompatible at every state.
> "In financial markets, buyers and sellers hold incompatible beliefs about fundamental value —
> indeed, **this incompatibility is *why* trade occurs.** … The transaction does not require
> belief reconciliation; it requires only that each agent's projection contains a candidate
> within cell tolerance."

**Identical Input, Incompatible Belief.** Decoded beliefs incompatible, **yet candidate
projections in `X` may overlap arbitrarily.** `2^X` is entirely independent of any `Kᵢ`.

**⭐ Common-Cell Convergence (CCC).** If for each `i` there is `xᵢ* ∈ Πᵢ(Dᵢ(x))` with
`d(xᵢ*, C) ≤ τ(C) − βᵢ`, then **every** agent attains the cell. One line:
`S ≤ d(xᵢ*,C) + βᵢ ≤ (τ−βᵢ) + βᵢ = τ`.

**Cor — coordination without representation overlap.** CCC places *no condition* on the `Kᵢ`.
Agents with mutually exclusive belief systems attain the same `C` simultaneously.

**Cell Exteriority.** `C_y = Act⁻¹({y})` depends only on `(X, Act)` and on **no receiver**.
> "The cell exists in outcome space and is **simultaneously available to all receivers without
> coordination.**"

**⭐ Coordination without Common Knowledge.**
> "**No common knowledge of `C`, no common knowledge of common knowledge of `C`, and no iterated
> knowledge hierarchy of any finite or transfinite depth is required.**"
> "The coordination arises because all chains terminate in the same `X`, not because agents share
> any epistemic state." · "The iterated hierarchy collapses to a single structural fact about `X`."

**Catalytic composition.** `q(A₁◇…◇Aₙ) = ∏qᵢ` where `qᵢ = S♭(Aᵢ)/Σ`. Reachability volume
monotone in ensemble size; depth `≥ v_d(r + τ(C*) − S♭(E))^d` — **Kyle depth, with a formula.**

**Purpose functional** `Φ_E(C) = sup_{x∈C} S(E,x;C) ≥ S♭(E)`. A **purpose** is a cell with
(1) `Φ_E(C*) = S♭(E)` (saturates the floor) and (2) `τ(C*) > S♭(E)` (sufficient tolerance).

**⭐ Purpose Existence — the single testable condition.** If `S♭(E) < Σ` and there exists a cell
with **`τ(C) > S♭(E)`**, then that cell *is* a purpose.
**Existence is a tolerance-vs-floor inequality, and that is the whole condition.**

- **No convexity required** — Banach contraction on cells under the Hausdorff metric replaces
  Kakutani. "without any convexity assumption on `X`, on preferences, or on the action map."
- **Uniqueness** only up to reachability equivalence, same action, measure-preserving `Act`, μ-a.e.
- **Stability:** a purpose survives a floor shock `ε < τ(C*) − S♭(E)`.
- **Dropout robustness:** `C*` survives removal of `A_k` iff `S♭(Eₙ)/q_k < τ(C*)`.

**ω-Limit Theorem.** Any flow with non-increasing `S` drives every trajectory in
`Reach(E,C*)` to `C*`.
> "This is the mathematical statement that **markets clear** for bounded agents. The convergence
> is not assumed (as in Walrasian tâtonnement) but **derived**."
> vs. Walras: stability needs gross substitutability / diagonal dominance — "conditions that fail
> generically with more than two goods (**Sonnenschein–Mantel–Debreu**)." The `S`-non-increasing
> condition "is far weaker than gross substitutability."

**Motivation Heterogeneity.** The composite floor depends **only** on goal-*floors*, **not** on
goal-*contents*. "Agents with arbitrarily disparate or opposing goals compose to a common
cell-attaining floor."
> "Market efficiency is determined by **participant quality (the floors), not by the direction of
> their trades.**"

**Replication is heterogeneity-driven.** `q₁q₂ < min(q₁,q₂)` strictly. Two identical agents give
`Σq²`, but **no single agent acting twice achieves below `Σq`.** *Independence, not repetition,
buys the floor reduction.*

**The ⊠ algebra.** `f₁ ⊠ f₂ := f₁f₂/Σ` is a commutative monoid with identity `Σ`, absorbing `0`.
Goal-quotient functor `Q: Agent → Float` sends `A ↦ S♭(A)`; composition factors through `Q`.
> "**Markets aggregate information quality, not information content.**"

**Coalition lattice.** Pareto-reachable cells form a lattice; a merger `E⁽¹⁾ ∪ E⁽²⁾` can attain
cells **neither sub-market could reach independently.** Zero-tolerance intersections are excluded.

**EMH as theorem.** Perfect efficiency requires `Σ log(1/qᵢ) = ∞`. **For any finite ensemble
`S♭(E) > 0` strictly.**
> "**Grossman–Stiglitz is resolved**: because `S♭(E) > 0` for any finite ensemble, information
> collection is always privately profitable, so the market never becomes perfectly efficient at
> finite size."
> Index funds and identical algo traders: "their identical floors contribute multiplicatively with
> constant factor `q`, **never driving the composite to zero at finite n**."

**Bid-ask spread formula:** `spread_min = τ(C*) − S♭(E)`.
⚠️ **Unreconciled tension:** this theorem calls that quantity the *minimum spread* (growing toward
`τ(C*)` as the market becomes efficient), while another passage calls `S♭(E) = Σ∏qᵢ` "the
irreducible bid-ask spread." **Treat `S♭(E)` as the irreducible width and `τ(C*) − S♭(E)` as the
safety margin** — that reading is consistent with the rest of the ladder.

## 3. Against classical GE

> "**None of these conditions holds in any real market.**" (on Arrow–Debreu's prerequisites)

- AD price vector `p*` ↔ **centre of the purpose cell**; market clearing ↔ `Φ_E(C*) = S♭(E)`.
- **Incomplete markets reduce `τ(C*)` but do not eliminate `C*`** — purpose equilibrium exists
  under any market structure. Externalities enter through `Act`.
- Rational expectations: "knowing the true model corresponds to `β = 0`. Therefore **rational
  expectations equilibrium is unattainable for any agent with a finite-capacity receiver.**"
- Distributed computing bridge: **FLP impossibility appears in the aperture-dominated regime**
  (`βᵢ ≥ τ(C*)` for all i); in the phase-locked regime coordination is robust to failure.
- Gödel: "no bounded receiver has `β = 0`, just as no formal system is both complete and consistent."

> "The framework requires no convexity, no common knowledge, no complete markets, no continuous
> preferences, and no rational expectations — only the primitive of a bounded receiver agent triple
> and the algebra of floor composition."

## 4. Validation

45 experiments, all pass, ≤1e-12. Notables: **500/500 CCC attainment cases** across 5 disjoint
ensembles; **500/500 ω-limit trajectories** converged; purpose found at all 5 tolerances; monoid
laws over 1000 random pairs; catalytic composition max error **1.89e-16**.
**Synthetic only — no market data anywhere.**

## 5. Limitations

1. **Independence required for every composition result.** Correlated agents break the product law
   entirely. Checkable form: *no agent's decoder is a deterministic function of another's.*
2. **`τ(C) > S♭(E)` is a hard boundary** — below it **no purpose exists** (not degraded, absent).
3. Uniqueness is weak: only up to reachability equivalence, same action, measure-preserving, μ-a.e.
4. The ω-limit theorem **assumes** the flow is `S`-non-increasing; and requires `x₀ ∈ Reach`.
5. **OR-success composition is a modelling choice.** AND-composition / consensus is not covered.
6. The `qᵢ`-as-failure-probability step is **interpretive, not derived**.
7. Synthetic validation only.

---

## 6. ⭐ Implications for Olduvai

### 6.1 Price the CELL — quote bands with published width
- `"Grade A white maize, Harare delivery, week 31: 412–429 USD/t"` — never `420.50`.
- Publish `τ(C*)` **and** `S♭(E)`. **A published band width is a published honesty statement about
  how much the market actually knows.**
- **All trades inside the band are equivalent executions.** Do not rank fills by price inside the
  band — free up the tiebreak for policy (see 6.7).

### 6.2 ⭐ Compute and publish `S♭` per contract — the core metric
`S♭(E) = Σ∏qᵢ`. Per-participant floor proxies for agriculture:
- **assayer/grader** — variance between grade call and independent re-assay;
- **trader** — dispersion of bid from subsequent realised transaction bands;
- **farmer/cooperative** — variance in declared vs delivered quality;
- **weather/yield model** — backtested forecast error;
- **warehouse** — shrinkage and moisture-measurement variance.

Publish as **"Price Confidence Width"** per contract. A thin sesame contract with three correlated
traders shows a wide floor; a deep maize contract with eleven independent participants shows a
narrow one. **No existing exchange publishes this.**

### 6.3 ⭐ Independence is the scarce resource — engineer for it
- **Adding a copy of a participant you already have contributes almost nothing.** Ten aggregators
  all pricing off the same SAFEX screen have effectively **one decoder**; their `qᵢ` are correlated
  and the product law fails.
- **Recruit for decoder-disjointness:** farmers (field-level agronomy), millers/processors
  (demand-side order books), satellite/remote-sensing yield estimators, transporters (logistics
  cost), local physical assayers, weather forecasters, export buyers (FX + freight), warehouse
  operators (stock levels). **A satellite NDVI model and a village assayer share no representation
  alphabet whatsoever** — belief incompatibility says they can never agree on beliefs; CCC says
  **that does not matter.**
- **Build a decoder-correlation monitor.** When two participants' quotes become deterministic
  functions of each other, flag it: they are **one agent** for floor purposes, and the published
  floor must be corrected upward. **A market that looks deep but is decoder-correlated has a much
  wider true floor than its participant count suggests** — a live fragility risk the theory makes
  measurable.

### 6.4 Require only cell attainment — not belief agreement, not common knowledge
- **No consensus protocol, no universally-trusted reference-price oracle, no "true price" round.**
- **The contract spec IS the gate** — grade definition, moisture band, delivery window, location,
  lot size. Write it once, publish it, **never let a participant redefine it mid-session.**
- **Onboarding corollary:** don't educate farmers into the traders' mental model. A smallholder
  pricing in "bags per hectare and school fees" and an export desk pricing in "USD/t FOB Beira"
  have disjoint `K`. **Build the UI in each participant's native representation and let the cell do
  the reconciling. Do not force a common vocabulary.**

### 6.5 ⭐ `τ(C*) > S♭(E)` is the listing validator
- **A too-tight grade spec makes the market non-existent, not merely illiquid.** Orders will not
  match, and the failure looks like "no liquidity" when it is a **spec error**.
- **Widen to create a market; narrow to sharpen it — only as far as the floor allows.**
- **Tiered contracts:** coarse (wide `τ`, always tradeable, thin participation OK) alongside fine
  (narrow `τ`, requires deep heterogeneous participation). List progressively finer specs as
  participation deepens — **a principled listing ladder rather than guesswork.**
- **`τ(C*) − S♭(E)` is the liquidity buffer.** When it approaches zero the contract is one dropout
  away from having no equilibrium.

### 6.6 Nightly dropout stress test
For every contract, every participant `k`: check `S♭(E)/q_k < τ(C*)`. Participants failing it are
**systemically critical**. Thin agricultural markets typically have one or two dominant
aggregators; this tells you exactly which contracts collapse if they leave — **before they leave.**
Contracts failing single-dropout should not be settlement references for anything else.

### 6.7 Matching-engine consequences
- **Match on cell membership, not price-time priority on a point price.** Within the band, price
  priority is meaningless (practically equivalent), so the tiebreak is free for policy:
  **smallholder priority, geographic proximity to cut transport, earliest harvest date,
  quality-above-spec.** A genuine design freedom point-price exchanges do not have.
- **No auctioneer needed** — any `S`-non-increasing update rule converges. **Design rule: every
  order-update mechanism must be `S`-non-increasing**; forbid oscillation. That one invariant buys
  convergence.
- **Quarantine orders outside the reachability band** `r + τ(C*) − S♭(E)`.
- **Publish depth** `≥ v_d(r + τ(C*) − S♭(E))^d` — it grows with the *margin*, giving participants
  a reason to care about the floor metric.

### 6.8 Merging regional exchanges creates newly-existent contracts
The coalition lattice: a merged coalition reaches cells outside both sub-markets. **The
mathematical case for regional integration is not just more volume — it is contracts that could
not previously exist.** Warning: overly specific cross-products (Grade A × village × week) collapse
to zero tolerance and **do not exist as products.** Don't list them.

### 6.9 What NOT to promise
- **Not convergence to a "fair price."** Every real exchange is finite, so `S♭ > 0` **always**.
  There is a permanent irreducible band. **Say so publicly — it is a credibility asset**, and the
  honest version of what every exchange's marketing overclaims.
- **Not that more participants of the same type improve prices.**
- **Not arbitrage elimination as a goal.** Residual floor is *why* participants invest in bringing
  information. **The floor is the participants' revenue source and therefore the exchange's supply
  of information.** Don't compete it away with fee structure.

### 6.10 ⭐ The gap to build: contested closure
The broader corpus ([[03-semantic-causal-propagation]]) treats "sources disagree, decline to
conclude" as a first-class correct outcome. **This paper has the raw material — the no-purpose
region `τ(C) ≤ S♭(E)` — but does not develop it into a market primitive.** Build it:
- Third settlement state beside *matched* and *unmatched*: **"no equilibrium — contested."**
- Publish the disagreement rather than a price: *"Sesame, Gokwe, week 31: no clearing cell.
  Composite floor 6.2% exceeds contract tolerance 4.0%. Participant valuations span 780–1,140."*
- **Never synthesise a settlement price in the contested state.** A fabricated point price in a
  no-purpose region is precisely the failure the whole theory exists to forbid — reporting a point
  where the mathematics guarantees only a region, **at the exact moment the region is widest.**
- Fires on: thin/new contracts, post-shock sessions (drought announcement, export ban, currency
  move), contracts that lost a critical participant. **Exactly the moments when a false price does
  most damage** — to farmers pricing off it, lenders collateralising off it, downstream contracts
  referencing it.

---

**Bottom line.** The contribution is a **licensing condition** and a **metric**. Licensing:
`τ(C) > S♭(E)` — a contract may exist only if its tolerance exceeds its market's composite floor.
Metric: `S♭(E) = Σ∏qᵢ` — computable, publishable, falsifiable from participant error statistics.
Everything else follows from taking those two seriously.

Links: [[00-framing]] · [[05-foundation-for-price]] · [[06-economic-agent-theory]] · [[04-corpus-map]]
