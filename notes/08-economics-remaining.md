# Economics papers 3, 5, 6, 7, 8

Covering: heterogeneity-theorem · shadrach · kirchoff-residual ·
intensity-of-monetary-activity · etf-construction. All read in full.

---

# A. *The Heterogeneity Theorem for Market Information*
`heterogeneneity-theorem/heterogeneity-theorem.tex` (1498 lines)
**Paper 3 of the economics sequence.**

## Thesis
Fix `n` agents and fix the **arithmetic mean** floor `β̄`. Then:
- the **most heterogeneous** floor vector **minimises** the composite floor and the
  spectral radius, and **maximises** the spectral gap;
- the **homogeneous** vector `(β̄,…,β̄)` is the **unique worst case**;
- strict whenever the vector is non-constant.

The whole thing rests on one line: **the composite floor is a product**
`S♭ = Σ^(1−n)∏βᵢ`, and **the product function is Schur-concave.** Spreading the
`βᵢ` apart at fixed sum strictly shrinks the product.

> Heterogeneity is not noise to be averaged out; **it is the engine of market
> informational efficiency.** A market of identical agents is the *worst possible*
> market at its own average quality level.

## Key results
- **Schur-concavity of the product** (the mathematical core): via Schur–Ostrowski,
  `(βᵢ−βⱼ)(f/βᵢ − f/βⱼ) = −f(βᵢ−βⱼ)²/(βᵢβⱼ) ≤ 0`, equality iff `βᵢ=βⱼ`.
- **Spectral gap** `γ = 1 − S♭/Σ` — the market's **information efficiency
  coefficient.** Convergence `d_H(Ψᵗ(C₀),C*) ≤ ρᵗ d_H(C₀,C*)`; **perturbation
  bound: a shock ε shifts the equilibrium cell by at most `ε/γ`.**
- **Log-floor additivity:** `log(Σ/S♭(Eₙ)) = Σᵢ ℓᵢ`. **The n-th agent contributes
  `ℓₙ` independently of n and of all prior floors.** Measured in **nats**.
- **Borel–Cantelli classification** — every infinite ensemble is in exactly one of:
  **Class E** (`Σℓᵢ = ∞`, floor → 0) or **Class O** (`Σℓᵢ < ∞`, floor → positive limit).
- **⭐ Floor-Variance bound:** `S♭ ≤ (β̄ⁿ/Σⁿ⁻¹)·exp(−n·CV²/2 + O(n·CV³))`.
  **The heterogeneity saving grows exponentially in BOTH n and CV².**
- **Optimal recruitment:** cumulative cost `∏ₙ(σ)` is minimised by **ascending**
  floor order (best first), because the first entrant's log-floor carries weight
  `w₁ = n` across all subsequent rounds. > "Recruiting a high-quality agent late
  **squanders n−1 rounds of compounding.**"
- **Critical floor `β_crit = Σ/e ≈ 36.79`** (at Σ=100). Below → contributes >1 nat;
  above → <1 nat. **No ensemble entirely at-or-above `β_crit` can decay faster
  than `e⁻ⁿ`.**
- **Phase transition — sharp at `p_c = 0`.** *Any* positive fraction of informed
  participants puts the market in Class E. Rate exponent **linear in p**.
- **Stability:** efficiency class is invariant under **any finite** perturbation.
  ⚠️ **Cuts both ways:** > "To move from Class O to Class E, an **infinite**
  sequence of improved agents is necessary and sufficient." **No finite
  intervention rescues a Class-O market.**

## Against representative-agent modelling
The representative agent replaces `β` with `n` copies of `β̄` — landing **exactly on
the unique maximiser** of the composite floor. The error is:
- **systematically one-signed** (always overstates the floor),
- **exponential in n** (worsens with population size, doesn't wash out),
- **exponential in CV²**.

At CV=0.5, n=20: the true heterogeneous floor is `e⁻⁵ ≈ 0.007` times the
homogeneous baseline — **a 140× discrepancy attributable entirely to diversity.**

Also: Fama's strong-form efficiency proved equivalent to Class E; Grossman–Stiglitz
*recovered* not contradicted; Kyle extended (vanishing informed fraction still
suffices); **majorization offered as an agent-theoretic refinement of Blackwell's
order on experiments**.

> "The framework requires no convexity, no common knowledge, no rational
> expectations, and no complete markets."

## Validation
45 experiments, 9 clusters, all pass. 5,000 AM-GM cases; 500 pairwise marginal
checks; 30,000 perturbations all remaining in Class E; ascending recruitment
beats descending by **2.1–8.7×** (median **4.8× at n=10, 23× at n=20**).
⚠️ Abstract claims max error <1e-14; Table 1 contradicts this in 4 of 9 clusters
(the conclusion states the qualified version correctly).

## ⭐ For Olduvai — this is the participant-strategy paper

**Do not homogenise participants.** The four classes have **structurally different
decoders**:
- **Smallholder** — very low floor on *local physical state* (actual germination,
  pest pressure, moisture at harvest, on-farm losses); very high on aggregate price.
- **Cooperative** — pooled regional signal; sees across plots, not across regions.
- **Trader** — low floor on *movement and near-term scarcity*; high on what's in
  the ground next season.
- **Processor** — low floor on *forward demand and specification*; very high on
  upstream field conditions.

> This is the exchange's most valuable asset, not a friction to be smoothed.
> **Standardise the protocol; never standardise the participants.**

- **Do NOT build "everyone becomes a trader-equivalent."** Don't force smallholders
  through a trader-shaped interface that erases what they alone can see.
- **DO build class-specific channels** matched to what each class is genuinely
  low-floor on. **Two classes reporting the same observable is `βᵢ=βⱼ` — the
  equality case, where marginal contribution is exactly nil.**
- **Quantify homogenisation before committing.** Compute CV of the roster's floor
  vector; score every rule change by its effect on CV. **If a rule reduces CV it
  has a quantified information cost even if it reduces operational cost.**
- **⚠️ Membership screens are information taxes.** Minimum volume, capital
  requirements, warehouse-receipt-only participation, minimum lot sizes — each
  selects for a narrower type, each cuts CV, and the loss compounds exponentially
  in n. **An exchange admitting only large traders and processors has converged
  toward the provably worst configuration at its own average quality.**
- **⭐ Smallholders are the highest-value information contributors, not a welfare
  cost.** Their `ℓᵢ` contribution is **additive and does not decay with n** — the
  thousandth smallholder contributes as much as the first, provided the decoder is
  genuinely distinct. **Inclusion and efficiency are the same objective here.**
  Route their participation through what they know: planting intentions, harvest
  windows, observed field conditions, delivered quality — **not price opinions.**
  And: **volume weighting is an information-theoretic error** — it weights by goal
  magnitude when the theorem weights by `ℓᵢ`.
- **Launch sequencing: ascending floor order.** Anchor with lowest-floor classes
  (processors with firm forward books; cooperatives with real warehouse+grading),
  then traders, then broad smallholder onboarding. 4.8–23× cumulative saving.
  ⚠️ **But this optimises the transition, not the destination** — terminal floor is
  order-independent. **Don't let it become an excuse to defer smallholder
  onboarding indefinitely.**
- **A small informed cadre suffices** (`p_c = 0`) — you do not need most
  participants sophisticated. But p buys *speed* linearly. Invest in p for speed,
  in CV and n for depth.
- **⚠️ The catastrophic failure mode:** every participant a price-taker reading the
  same government reference price = identical floors *and* all above `β_crit` =
  simultaneously the homogeneous worst case **and** Class O. **It plateaus forever
  and no amount of growth rescues it.**
- **Instrument across `β_crit` rather than excluding.** Moisture meters, calibrated
  scales, standardised grading at the cooperative, GPS-tagged receipts — each flips
  a class from sub-nat to super-nat. **Far better use of capital than raising
  membership requirements, which shrinks CV and n simultaneously.**
- **⭐ Heterogeneity is the shock absorber.** Perturbation response scales as `1/γ`.
  A homogenised exchange **amplifies** shocks a diverse one damps. *Probably the
  strongest argument to make to a regulator or board: diversity of participants is
  a quantified stability property.*
- **Get the class right at launch.** Class O cannot be escaped by finite intervention.

---

# B. *Shadrach: A Cut-Primitive DSL for Financial Instruments*
`shadrach-financial-instrument/shadrach-financial-instrument.tex` (1548 lines)

⚠️ **Scope correction:** this is **not** a financial instrument. It is a
**programming language** (`.shad`). "Financial instruments" is the domain, not the
artifact. **No futures, forwards, options, swaps, warehouse receipts, delivery,
clearing, margin, or agriculture anywhere in 1548 lines.**

## Thesis
> "A price is not a number with error attached; it is, irreducibly, a **bounded
> region** — and the width of that region does not shrink to zero as information
> improves, because the comparison that would shrink it to zero **can never be
> completed**."

Four operations collapse into **one operation, the cut, at four arities**:
`cut` (arity 1 = position) · `~` (arity 2 = bond) · `close` (closure = portfolio)
· `track` (chain = rebalance).

> "Opening a position is not a different verb from rebalancing a portfolio; **it is
> a track of length one.**"

## Core results
- **Floor from Infinitude re-derived in financial vocabulary** — market
  non-completable (always a further counterparty, further private information,
  further cash flow), instrument is a proper part ⟹ `ρ(A) > 0` ⟹ `β = inf ρ(A) > 0`.
- > "The bid–ask spread **is not a market imperfection to be modelled away** by
  better information or lower latency. It is the trace the non-completable market
  leaves on every finite instrument."
- **⭐ Thm: no zero-residue value. The frictionless, perfectly liquid, zero-spread
  market is NOT EXPRESSIBLE** — it is a *compile-time type error*.
  > "A value claiming residue below the floor, or exactly zero — a frictionless
  > market, a costless bond, a fully arbitraged portfolio — is not a value; it is
  > the forbidden sharp cut, and the type system rejects it."
- **Price-Cell Thm:** `Cᵢ = [pᵢ − β/2, pᵢ + β/2]`, width `τᵢ = β > 0` for **every**
  instrument, and **`τᵢ` does not depend on `i`** — *all instruments priced by the
  same receiver share the same minimum spread.* (The most falsifiable claim here.)
- **Bonding criterion:** conductance `w_ij = 1/(Σᵢᵢ + Σⱼⱼ − 2Σᵢⱼ) = 1/Var(Rᵢ−Rⱼ)`;
  bond admitted **iff `w_ab ≥ β`**.
- **Kirchhoff Portfolio Formula:** `w* = L†μ_c + (1/m)1`, satisfying `Lw* = μ_c`.
  ⚠️ Requires `1ᵀμ_c = 0` (mean-centred capital demand) for exactness — the proof's
  own algebra shows this; the theorem statement doesn't declare it.
- **Fiedler risk bound:** `σ(w*) ≤ ‖μ_c‖₂/λ₂`.
- **Monotone cut count** = the clock. > "There is no reduction that un-commits
  boundary — **an 'undo' is itself a further cut.**" Re-evaluating is a new cut at
  higher count, **never a cached recomputation.**
- **Two targets** (Rust exact / TypeScript-WebGL interactive) equivalent **up to the
  floor**: `|ρ(v_R) − ρ(v_T)| ≤ β`.
- **Path-independence = KVL = no-arbitrage.** > "The requirement that `w*` be a
  single-valued function of the graph alone — **not path-dependent on the order
  bonds were formed** — is Kirchhoff's voltage law."

## ⚠️ The critical gap — endpoint-only audit by design
> "The intermediate allocations of a track are **unconstrained**… `Admit` inspects
> only the **terminal convergence** of the chain, not the plausibility of
> intermediate `ρᵢ`."

**This is a pure endpoint-audit, by explicit design — exactly what a bridge slips
through undetected.** The `Path` type *records* the full residue chain, so the
material for route-audit exists, **but no rule inspects it.**

## For Olduvai
- **Set β from physical assay/grading tolerance** — moisture meter reproducibility,
  weighbridge precision, inspector disagreement. Publish every price as
  `[p−β/2, p+β/2]`. The paper's example uses `floor 0.01`; an agricultural exchange
  might set `floor 2.50` per tonne.
- **⭐ Reject frictionless assumptions at compile time.** Any pricing model, margin
  calculator, or basis engine submitted to run on exchange infrastructure that
  assumes zero spread **fails to type-check and cannot be deployed.** Turns a policy
  into a mechanical gate.
- **⭐ Settlement finality IS the monotone cut count.** Append-only ledger; **a trade
  bust is not an un-commit — it is a further cut at higher M.** No netting that
  erases history; audit reconstruction at any M; two ledger states with identical
  positions but different M are **distinct states**.
- **Basis-risk gate:** white maize at Silo A vs Silo B bond iff `1/Var(R_A−R_B) ≥ β`.
  Decides which delivery locations are fungible, which grades cross-margin, which
  hedges get margin offset. ⚠️ Two silos on the same siding give `Var = 0` and
  `w = ∞` — **merge such nodes before building the graph.**
- **`λ₂` as a market-health metric.** A fragmenting market (regional silos
  decoupling, a corridor closing) shows `λ₂ → 0` and the risk bound blows up.
  **If `λ₂ ≤ 0` the graph is disconnected and `close` fails outright — two regions
  with no price linkage cannot be cleared as one book. Check connectivity before
  you net.**
- **Clearing = `close`; margin shortfall = vacancy `ν = Lw − μ_c`.** Clearing cycle
  complete iff `ν = 0`. **Compute clearing by the closed form, not by sequential
  netting** — sequential netting is path-dependent and can silently embed arbitrage.
- **Deploy Rust for the clearing house, WebGL for member terminals**; the equivalence
  theorem means **member disputes below β are meaningless by construction and can
  be dismissed by rule.**
- **⭐ Must add: route audit over `Path`.** A member could route a rebalance through
  intermediate allocations that are individually abusive (cornering a delivery
  point, transient concentration breaching position limits) while the terminal
  allocation is impeccable and `Admit` passes. **The data is there; the check is not.**
- **Must also add:** time (no `t` anywhere — futures, expiry, carry, seasonality all
  inexpressible), short positions, a feasibility fallback when `w*` leaves the
  simplex, transaction costs, perishability, grading uncertainty.

---

# C. *Multi-Horizon Kirchhoff Residuals*
`kirchoff-residual/multi-horizon-kirchoff-residuals.tex` (1230 lines)

## Thesis
A **Kirchhoff residual** here is a **node-balance** residual, not cycle holonomy:
`Lw*(τ) = μ̂(τ) − μ̄(τ)1` — Kirchhoff's **current** law. **Multi-horizon:** indexed
by prediction horizon τ, giving a **horizon surface** `Σ: τ ↦ w*(τ)`, a Lipschitz
curve with constant **`L_μ/λ₂`**.

Three headline claims:
- **⭐ Portfolio incommensurability:** > "Kirchhoff residuals of systems with
  different graph structures inhabit **incommensurable normed spaces**; no single
  external scalar (Sharpe ratio, alpha, drawdown) can serve as a universal
  performance proxy."
- **Drift bound:** `‖w*(t) − w*(t')‖ ≤ ‖μ(t) − μ(t')‖/λ₂`. High connectivity damps drift.
- **Gear network:** nested thresholds `θ₁ < … < θ_K`, each layer firing when the
  layer below accumulates threshold imbalance. **Globally self-consistent without
  any external rebalancing signal.**

## Key results
- Kirchhoff balance reading: > "the weighted net flow from asset i to its neighbours
  equals the excess return of i over the portfolio average. **Assets with
  above-average predicted returns export weight; below-average import weight.**"
- **Gear ratio:** layer k fires ≈`θ_{k+1}/θ_k` times per layer-(k+1) firing —
  **and Panel 4A reports this is independent of the gain-loss distribution.**
- **Incommensurability proof (iii):** any scalar benchmark implicitly assumes a
  common reference Laplacian `L_B`; **changing `L_B` reverses the ranking with
  probability one.** The set of `L_B` preserving a ranking has **measure zero**.
  > "a linear comparison G−G′ mixes residuals measured in different inner products,
  > **analogous to subtracting temperatures in Kelvin and Fahrenheit** without
  > conversion."
- **Self-referential consistency:** `E[G(t,τ)] = 0 ⟺ Lw = μ̂_c is solved by w*(τ)`.
  > "the gear network is **self-referentially complete**: its equilibrium is
  > diagnosed and maintained entirely by its own residuals."
- **Ergodic self-benchmark:** the time-averaged portfolio converges a.s. to
  `E_π[w*(τ)]` — > "It requires **no external index, no market factor, and no peer
  comparison.** It is the system's own long-run equilibrium."
- **Martingale property:** with conditionally unbiased forecasts, `G` is a
  martingale difference sequence — the no-arbitrage analogue.
  **Contrapositive is the usable one: persistent drift in `S_K` is evidence of a
  biased forecast or a mis-specified graph.**

## ⚠️ Holonomy: present only in its zero form
The model *assumes* `w` is a node potential, so the induced flows are exact
(gradient) and **cycle holonomy is zero by construction** — arbitrage-freeness is
not *checked*, it is made *unrepresentable* by choice of representation.
**There is no incidence matrix, no cycle basis, no Hodge decomposition.** The model
structurally cannot represent a non-integrable price field.

## ⭐ For Olduvai
- **The graph is OBSERVABLE here, not estimated** — this is the single biggest
  advantage over the equity case. `ω` = transport cost + spoilage (space), **storage
  cost + shrinkage (time — this is the carry)**, regrading/cleaning/drying/blending
  (grade), substitution cost. **`ω` is a logistics quote, not a statistical
  estimate.** That removes the paper's worst governance hazard (unauditable `L`).
- **⭐ Publish the Laplacian.** Freight tariffs, silo rates, grading fees are all
  quotable. This converts incommensurability from a hazard into a strength — your
  reference structure is on the record and residuals against it are contestable.
- **Admission rule from `β > 0`:** never list two contracts that are perfect
  substitutes at zero cost (they are one contract); never list an island (a
  commodity/location with no costed link). **A disconnected board gives `λ₂ = 0` and
  every bound becomes infinite.**
- **Horizon surface as a forward-curve consistency test:** adjacent delivery months
  should not produce allocations further apart than `(L_μ/λ₂)Δτ`. **Estimate `L_μ`
  from full carry, not from data** — you know a priori that the curve is bounded by
  storage+insurance+finance+shrinkage. Gives a *derived, defensible* tolerance.
- **⭐ Seasonality — where the assumptions break, and the fix.** Ergodicity requires
  stationarity; agricultural prices are violently non-stationary in calendar time.
  **The transaction clock is the paper's own answer and it is a good one:** activity
  is intensely seasonal, so running the exchange on accumulated-residual time rather
  than calendar time absorbs the seasonality. **A quiet March week and a frantic
  June day are then the same amount of clock.**
  Also: **make seasonality part of `μ̂`, not the noise.** A persistent seasonal
  pattern in `S_K` is **not a market signal — it is a bug report on your price model.**
  ⚠️ And note the graph itself is seasonal (storage cost per month is not constant).
  **Re-estimate `L` at fixed seasonal epochs and treat each epoch as its own system**,
  accepting that residuals across epochs are not comparable. Honest; the alternative
  (time-varying `L`) is convenient but unproven.
- **Storage IS the time-direction edge weight.** This makes the Kirchhoff law
  economically meaningful rather than metaphorical, and makes the per-node residual
  `[Lw−μ_c]ᵢ` **attributable and interpretable at silo level. Publish it.**
- **⭐ Two audit numbers per session, and the second is the one that catches bridges:**
  1. `max |rᵢ|` — node balance (the paper's test).
  2. **`max_C |∮_C f|` over a cycle basis, normalised by carry — route consistency
     (your extension).**
  The canonical agricultural arbitrage is the cycle
  `Harare Nov → Harare Mar (store) → Mutare Mar (truck) → Mutare Nov (store back) →
  Harare Nov (truck)`. Each leg individually correctly priced; **nonzero loop sum =
  physically realisable arbitrage (store-then-ship vs ship-then-store). Endpoint
  audit of any single contract will not catch it.**
  **Alert threshold: `|∮_C f| > Σ_{e∈C} ω_e`** — friction *is* the β floor and it
  absorbs small holonomy. **β becomes the no-alert band.**
- **Gear layers = session architecture:** spot (continuous) → weekly warehouse-receipt
  repricing → seasonal contract roll → annual policy signal. **Theorem 7.1's
  hypotheses become a delisting rule: every listed contract must actually trade
  (`σ_min > 0`) and carry non-trivial weight (`w*ᵢ ≥ δ`) or the timing guarantee
  fails.** Set `θ_k` from target re-mark interval and measured residual volatility
  via `(θ/σ_G)²`.
- **Do NOT publish a cross-board efficiency score.** Maize vs soya vs a foreign
  exchange have different `L`. **A published cross-board ranking is not a
  measurement; it is an artefact of an unstated choice.**

---

# D. *Transactional Magnitude Calculus* (Intensity of Monetary Activity)
`intensity-of-monetary-activity/transactional-magnetude-calculus.tex` (1273 lines)

## Thesis — a replacement of the clock
Classical analysis differentiates against calendar time. This paper asserts the
correct denominator is **accumulated transactional magnitude**:
`Θ(t) := ∫₀ᵗ |G(s,τ)| ds` where `G = w*ᵀ[R − μ̂]` is the **Kirchhoff gain-loss** —
the realised *surprise*.

**Intensity of monetary activity = `Θ̇ = |G|`.** Not volume, not trade count, not
notional turnover — **the magnitude of unforecast portfolio-level gain and loss.**

> "A stock that trades ten thousand shares in a second has advanced further along
> its economic trajectory than a stock that trades ten shares over a day, even if
> both share the same calendar elapsed time."

⚠️ **"Monetary" here means transactional magnitude within a market — NOT money
supply.** No velocity of money, no quantity theory, no monetary aggregates, no
central banking. A reader arriving from macro will be misled by the title.

## Key results
- **Monetary derivative:** `df/dΘ = (df/dt)/|G|`. Linearity, product rule, chain
  rule, fundamental theorem all hold.
- **`df/dΘ` in calendar time = ordinary derivative in transaction time.**
- **⭐ Variance rescaling:** `Var[Y(s)] ~ σ²s/ḡ`. **Higher activity compresses
  per-transaction-unit variance. More active markets are quieter per unit of
  transacted magnitude.**
- **S-entropy dimensionlessness:** > "S-entropy allows one to **add apples and
  oranges**: by mapping every quantity into the common currency [0,100] before
  differentiating, the monetary derivative strips away all legacy units."
  `dP̃/dΘ + dṼ/dΘ` is well-defined — **meaningless in calendar time** (dollars/sec +
  shares/sec is ill-defined).
- **Telescoping gear-ratio:** `df̃/dΘ_K = (df̃/dΘ)·∏ρ_k` — a pure algebraic identity,
  independent of f. Higher layers **attenuated** (`ρ_k < 1`), converging a.s. to
  `∏ρ̄_k`.
- **No-Privileged-Level:** identical algebraic laws at every gear layer; the layer
  enters **only through the denominator**.
- **Ergodic convergence at `O(K^{−1/2})`.**
- **Floor persistence:** `|f̃(t₂) − f̃(t₁)| ≤ 100 − S♭` — the floor caps total excursion.

## ⭐ For Olduvai — is volume the right measure? No, and the paper says why precisely
Volume and trade count are **proxies**; `|G|` is the *direct* measure. The
distinction is decisive for a thin market:
- 500t of maize at exactly the posted reference price → **high volume, near-zero
  `|G|`. Almost no transaction time elapses. Nothing was learned.**
- 5t of tomatoes clearing 40% above forecast after a frost → **trivial volume, large
  `|G|`. A great deal of transaction time. This is where the market did work.**

> **Volume measures throughput; Θ measures price discovery.** An exchange that
> reports volume is reporting logistics.

**This matters enormously for a thin market, where volume-based metrics make the
exchange look permanently moribund even when it is efficiently discovering prices.**

- **Publish `Θ(t)` as the headline activity series**, with `Θ̇ = |G|` as the
  instantaneous intensity tick. Keep volume for settlement/warehousing/logistics —
  **but not as the market-health KPI.**
- **⭐ The forecast `μ̂` is the design crux — and a governance decision, not a
  technical one.** Options ascending: previous session VWAP per
  commodity-grade-location; seasonal-naive; model forecast. **The framework requires
  conditional unbiasedness** for `G` to be a martingale difference. **Publishing the
  forecast makes Θ auditable; an unpublished forecast makes Θ unfalsifiable.** Set
  the rule in the rulebook; change only with notice.
- **Kirchhoff graph for produce:** edge weights encode **substitutability**
  (maize↔sorghum high, maize↔tomato low). Then `λ₂` = **how integrated is the
  produce complex** — a low value means the exchange has fragmented into
  disconnected commodity islands with no cross-price transmission.
  And `w*` gives a **principled composite index weighting derived from substitution
  structure rather than volume shares** — a volume-weighted agricultural index is
  dominated by the single bulk staple; a Kirchhoff-weighted one is not.
  Mean-centring means a uniform inflation shock registers as **low `|G|`** — correct,
  since nothing was discovered about relative scarcity.
- **⭐ Redefine liquidity: `ḡ = E[|G|]`**, with participant-facing risk `σ²/ḡ`.
  **Right behaviour for agriculture:** a market trading once a week but always at a
  surprising price is *illiquid* under this measure even if weekly volume is high —
  which matches trader experience.
- **Dashboard per commodity-grade-location:** `ḡ` (liquidity) · `σ²/ḡ` (execution
  risk) · `Θ(t)` over the season (cumulative discovery) · `g_min` (dormancy floor).
- **Gear layers = agricultural decision horizons:** intraday clearing → weekly
  warehouse-receipt repricing / collateral revaluation → seasonal contract roll /
  planting signal → annual policy / strategic reserve. **Set thresholds to achieve a
  target firing cadence *without knowing the price distribution* — converts "how
  often should we reprice collateral?" from judgement into a threshold ratio.**
  Higher layers are **automatically smoothed** — noise filtering for free.
- **⚠️ The failure mode to engineer around: `G = 0`.** Agricultural markets go quiet;
  off-season a commodity may not trade for months and the derivative blows up.
  **Implement the floor, don't assume it:** set explicit `g_min` in the rulebook,
  compute `|G| ∨ g_min`, publish it. Then you get a **hard auditable bound
  `|df/dΘ| ≤ C/g_min` on every reported rate** — no metric can spike to infinity on
  a thin day. **Or freeze the clock during declared off-season** (semantically
  correct: no discovery occurred).
- **⭐ Report Θ-elapsed alongside calendar-elapsed on every contract.** A forward with
  60 calendar days to expiry but only 0.3 units of expected Θ remaining is **nearly
  mature — almost no discovery will happen before it settles.** Genuinely useful and
  non-obvious for perishables and harvest-window contracts.
- **Build analytics on transaction-time bars, not daily bars.** Then estimation error
  is `O(K^{−1/2})` in the number of Θ-bars, so you can compute in advance how many
  bars you need for a target confidence and translate to calendar via `ḡ`. Lets you
  tell a policymaker *"the seasonal signal for this commodity will not be
  statistically meaningful until roughly N weeks of typical activity,"* **derived
  rather than guessed.**
- ⚠️ **No Itô calculus exists yet** (open). Restrict use to **measurement and
  reporting, not contingent-claim valuation.** Fixed thresholds only. And `f*`
  (truth) is never constructed by the paper — **the largest implementation gap.**

---

# E. *Optimal ETF Construction via Banach Fixed-Point Theory*
`etf-construction/etf-construction-banach.tex` (895 lines)

⚠️ **No contact-graph vocabulary at all** — self-contained quantitative finance
paper in spectral-graph + convex-analysis language. Connections below are inference.

⚠️ **Sign inversion, important:** edges weighted by **correlation** (high correlation
= strong edge), which is the *dual* of a contact graph (high correlation = cheap to
treat as one = *low* separation cost). Anyone porting must either accept the
inversion or substitute `w_ij = β/c_ij`.

## Thesis
The two ETF problems — *what to hold* and *when/how to rebalance* — "share a common
mathematical substrate." `T(w) = Π_Δ[(I − γL)w + γμ]` is a **contraction** with
`κ = 1 − γλ₂`, giving existence + uniqueness + **an explicit convergence rate**,
which Markowitz does not.

> "graph connectivity is the precise mathematical object encoding portfolio risk
> reduction."

## Key results
- **The contraction proof turns entirely on the budget constraint:** `w,v ∈ Δ_m ⟹
  1ᵀ(w−v) = 0`, so the difference is orthogonal to `ker(L) = span(1)` — **the kernel
  direction is annihilated purely by the budget constraint.**
- `w* = L†μ/(1ᵀL†μ)`, Kirchhoff equilibrium `Lw* = μ − ξ1` with **ξ = market average
  return**.
- **Markowitz recovered:** on the complete graph with uniform weights, `w* ∝ μ`.
- **Fiedler risk bound** `σ(w*) ≤ R₀/λ₂`; **diversification premium** — adding
  *edges* raises `λ₂` and lowers risk; **a singleton asset has `λ₂ = 0`.**
- ⚠️ **Path-graph tightness:** `λ₂(P_m) ≈ π²/m²`, so risk grows as `O(m²)` —
  **poorly-connected asset graphs lead to unbounded risk as m → ∞.**
- **Harmonic clusters:** assets sharing a dominant frequency (or small-integer
  frequency ratios) have **strictly higher `λ₂`** and therefore **strictly lower
  risk** than the full universe.
  > "frequency analysis of asset return spectra provides a principled, model-free
  > method for identifying low-risk baskets. **Assets sharing a dominant frequency
  > are natural co-constituents.**"
- **Composition-inflation:** `T(n,d) = d(d+1)^{n−1}` labelled compositions
  pre-computed offline; online execution `O(n₀)` + O(1) hash lookup.
- **Self-healing:** if `λ₂ < λ_min`, add the **argmax-correlation missing edge** —
  "maximally increases `λ₂` per unit of portfolio change." Terminates in ≤ `C(m,2)−|E|` steps.

## Validation
**180 random ETF instances: all 180 below the bound, zero violations.** Tightness
highest (ratio→1) for **small `λ₂`** — i.e. the bound is most informative exactly
where risk is worst.

## ⭐ For Olduvai — the aggregation paper

**λ₂ > 0 is the legitimacy test for pooling. This is where the paper and T7 coincide.**

> A pool of smallholder lots may be issued as **one tradeable unit** iff the pooling
> graph is connected. **If `λ₂ = 0` the pool has ≥2 components and is not one
> thing** — it is two baskets wearing one name.

**Why this isn't merely analogical:** the contraction proof *requires* one-dimensional
kernel. With two components the kernel is 2-dimensional, `κ = 1`, and **there is
literally a continuum of solutions — any weighting you publish is arbitrary.**
**A disconnected pool cannot be fairly priced as one unit.**

- **Compute and publish `λ₂` for every proposed pool before listing.** More
  informative than "number of farmers" or "tonnes" because it measures whether the
  pool *coheres*. Set `λ_min` per instrument class; gate every session.
- **⭐ The Fiedler vector's sign pattern tells you exactly where to split a
  cooperative.** If two farmer groups persistently disagree about grading rules,
  delivery timing, or payout — check `λ₂`. **A near-zero Fiedler value with a bimodal
  Fiedler vector *is* that disagreement, made numerical.**
- **⭐ Form baskets by harvest CYCLE, not crop name or district.** Agriculture is the
  ideal domain because `ω` is not a statistical artefact — **it is the actual harvest
  cycle, known a priori from the agronomic calendar.**
  - Annual staples (maize, sorghum, wheat) — `ω₀` = 1/yr, harmonic 2-cluster.
  - Two-season crops — `ω = 2ω₀`, still admissible at k=3.
  - Perennials/tree crops — `ω = ω₀/2`, combinable at k=3.
  - **Continuous-production goods (dairy, eggs, broilers) have NO dominant seasonal
    frequency. They are not harmonic with crop cycles. Separate basket —
    mixing degrades `λ₂` of both.**
  - Check the weak-external-coupling condition: **the basket must be more internally
    coupled than it is coupled to everything outside it.**
- **⭐ Member payout rule:** `Lw* = μ − ξ1` — each lot's **premium above the
  cooperative average is exactly balanced by its net correlation flow to neighbours.**
  A highly substitutable lot (high degree) gets pooled toward the average; a
  distinctive lot (low degree) retains more of its own price signal.
  **Distinctiveness is compensated; substitutability is averaged.** Defensible,
  auditable, and matches how a good cooperative *should* treat an unusual
  high-value variety versus the commodity everyone grows.
- **⭐ The guarantee a smallholder needs before agreeing to pool:** `L†` kills only
  the all-ones mode, so **idiosyncratic value survives the quotient. Aggregation
  removes common noise, not their specific quality.**
- **⚠️ Recruit for CONNECTIVITY, not headcount.** "A singleton asset has `λ₂ = 0`" —
  but the sharper point: **adding members is not what helps; adding *connections* is.**
  500 farmers all growing the same crop in the same valley is a **path graph**:
  `λ₂ ≈ π²/m²`, risk growing as `O(m²)`. **Scale without connectivity actively makes
  things worse.** Recruit for *bridging* diversity — different agro-ecological zones,
  different crops with correlated-but-not-identical price paths.
- **Self-healing = rule-based cooperative repair.** Each season re-estimate; if
  `λ₂ < λ_min`, admit the **highest-correlation missing link** (a lot type, a
  substitution/grading equivalence). **The single highest-value edge is computable,
  not negotiated — removing a major source of capture in cooperative governance.**
- **⭐ Composition-inflation for low-infrastructure deployment.** The `d=3` regime
  axes translate cleanly: price trend / volatility (weather, border closure, fuel) /
  cross-lot coherence (macro-FX shock vs crop-specific event). **Ordering matters** —
  "volatile-then-calm" ≠ "calm-then-volatile" (T6, and agriculturally correct).
  At `n₀=6, m=40`: **~0.5 MB — fits on a feature phone, a smartcard, or an offline
  USSD gateway.** At `n₀=8`: ~7.9 MB, trivially embeddable in an offline Android app.
  > **Pre-compute the entire basket-weight table centrally, ship it as a small file
  > to every rural depot, and let depots price baskets fully offline** with an
  > `O(n₀)` key computation and a hash lookup. Reconcile when connectivity returns.
  **Correct basket pricing does not require the depot to have a network connection
  or a solver.** — genuinely valuable for African/emerging-market exchange design.
- **⚠️ Biggest gap: no creation/redemption mechanics.** Physical delivery is **lumpy
  and integer** — a farmer delivers 2.4 tonnes, not a simplex coordinate.
  **Publish `w*` as a tolerance band, not a point**, using the Banach error ball as
  the band radius, and accept any physical basket inside the band. Also missing:
  transaction/rehandling costs (dominant for produce), perishability/storage decay,
  grading uncertainty. **And `λ₂` is manipulable** — a participant could engineer
  apparent correlation to game basket admission. Add anti-gaming controls.
- ⚠️ **Thin data warning the paper cites but never confronts:** DeMiguel et al. show
  naïve `1/m` often beats sample mean-variance out of sample. With one harvest per
  year, τ=5 means *five years of data*. **Default to near-equal weights and let `w*`
  deviate only where `λ₂` is high and τ is adequate.**

Links: [[00-framing]] · [[04-corpus-map]] · [[05-foundation-for-price]] · [[06-economic-agent-theory]] · [[07-market-equilibrium]]
