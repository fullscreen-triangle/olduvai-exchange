# Paper: *Mathematical Foundation for Price*
### Cell-Values, Dual Spreads, and Fundamental Value in the Receiver-Agent Framework

Source: `systems/fourth-stomach/economic_agents/foundation-for-price/foundation-for-price.tex` (1121 lines, read in full)

**Position:** Paper 4 of a 4-paper economics sequence. Cites `sachikonye2025agents`
(agent primitives / Floor Theorem), `sachikonye2025market` (ensemble equilibrium /
purpose cell), `sachikonye2025het` (heterogeneity & efficiency) — all three are in
the same folder and are being read.

**This is the most directly load-bearing paper for Olduvai read so far.**

---

## 1. Thesis

**Price is a theorem, not an assumption — and it is a cell, never a point.**

> "Price is not a primitive but a derived object: a cell `C(p,τ)` in outcome
> space `X`. Point prices are unattainable for any bounded agent."

> "All three approaches assume that agents can specify and respond to point prices
> with arbitrary precision — an assumption that … requires each agent's receiver
> floor `β` to be exactly zero."

> "This is not a technical inconvenience but a structural feature: **the positivity
> of the floor is the mathematical fingerprint of bounded rationality.**"

Ten classical objects (price, bid, ask, spread, discovery rate, fundamental value,
no-arbitrage, transaction feasibility, law of one price) are derived as
*consequences* rather than postulated.

The deeper structural claim is the **dual-floor split**: there are **two** floors
in any ensemble, hence two spreads and two values, measuring genuinely different
things — **the cost of trading vs. the quality of knowing.**

## 2. The two ensemble floors — the hinge of the whole paper

Per-agent floor `S♭(Aᵢ) = βᵢ · S♭(Mᵢ)/Σ`. Canonical `Σ = 100`.

| | Formula | Governs |
|---|---|---|
| **Aggregate** | `S♭,agg(Eₙ) = minᵢ S♭(Aᵢ)` | ability to attain a cell in **one step** (one agent fires) |
| **Composite** | `S♭,comp(Eₙ) = ∏ᵢ S♭(Aᵢ) / Σⁿ⁻¹` | **collective information** about the cell (all agents contribute) |

> "This distinction … is the mathematical origin of the dual-spread structure."

Min vs. normalised product. Two different aggregation algebras over the same
private invariants — and that inequivalence is the paper's original content.

## 3. Core results

### Price-Cell Theorem (`thm:price-cell`)
`C(p,τ) := B(p,τ)`; `p` mid-price, `τ` half-spread.
- **(a)** If `τ(C)=0`, then `S ≥ β > 0` for all `x`. **No bounded agent ever
  attains a point price.**
- **(b)** If `τ(C) > β`, attainable states exist.
- **(c)** Minimum achievable tolerance is `τ_min(A) = S♭(A) > 0`. Any cell with
  `τ ≤ S♭(A)` is **unattainable** by `A`.

> "The half-spread `τ` is not a trading cost to be minimised but a structural
> feature of any bounded receiver."

> "**Minimum tick size is endogenous**: it is determined by the floors of the
> market participants, not by regulatory fiat." (A two-decimal equity quote *is*
> the cell `C(p, 0.005)`.)

### Dual-Spread Theorem (`thm:dual-spread`)
`Δᵀ := 2·S♭,agg` (trading spread) · `Δᴵ := 2·S♭,comp` (information spread)
- **(a)** `Δᴵ ≤ Δᵀ`, equality **iff n=1**.
- **(b)** `Δᵀ` depends on **only the single best agent**. Adding any agent above
  the minimum changes it **not at all**.
- **(c)** `Δᴵ` depends on **all** agents. Adding *any* agent with `β < Σ`
  **strictly reduces** it (multiplies by `f₊₁/Σ < 1`).
- **(d)** `Δᴵ/Δᵀ = ∏qᵢ / min qᵢ` where `qᵢ = S♭(Aᵢ)/Σ`.

### ⭐ Two-Value Theorem (`thm:two-value`) — main result
`Vᵀ(C) = τ(C) − S♭,agg` · `Vᴵ(C) = τ(C) − S♭,comp`
- **(a)** `Vᴵ ≥ Vᵀ ≥ 0`.
- **(b)** Information premium `Π = Vᴵ − Vᵀ = S♭,agg − S♭,comp ≥ 0`, `= 0` iff n=1.
- **(c)** `Π` **strictly increasing in ensemble size n** *and* **strictly
  increasing in floor heterogeneity** (majorization sense).
- **(d)** Relative premium `Π/S♭,agg ∈ [0,1)`.

> "The **trading spread** `Δᵀ` is what a market maker quotes — determined by the
> single best participant, measuring the cost of transacting. The **information
> spread** `Δᴵ` is what the market **knows** about true value — determined by all
> participants collectively, measuring informational efficiency. **A market can
> have a tight trading spread (one excellent market maker) while remaining
> informationally inefficient. Conversely, a market with many diverse but
> individually imprecise agents can be highly informationally efficient while
> maintaining a wide trading spread.**"

**Worked magnitude:** floors `{10, 20, 35}` → `S♭,agg = 10`, `S♭,comp ≈ 0.7`.
A **14× gap** between what the best trader knows and what the market collectively knows.

### Equilibrium Price Theorem (`thm:equil-price`)
`p*` = centre of the purpose cell `C*`; unique fixed point of the discovery
operator `T(p) = centre(C*(p))`. `r* > S♭,agg` (purpose margin) and `r* < Σ/2`.
`B* = p* − S♭,agg`, `A* = p* + S♭,agg`, so `Δᵀ = 2·S♭,agg`.
*(Caveat: the symmetric bid/ask is **definitional**, not derived — the proof admits it.)*

### Price Discovery Rate (`thm:discovery-rate`)
`d(p_t,p*) ≤ ρᵗ·d(p₀,p*)` with **spectral radius `ρ = S♭,agg/Σ`**.
- **(b)** Adding an agent **better than the current best** strictly reduces `ρ` →
  faster discovery.
- **(c)** Adding an agent **worse than the best** leaves `ρ` unchanged but
  **strictly reduces `S♭,comp`** → better information, same speed.

**This asymmetry is sharp and actionable: speed is bought only by recruiting a
better-than-best agent; knowledge is bought by recruiting anyone at all.**

### Fundamental Value (`thm:fv`)
For Borel–Cantelli-efficient ensembles: `S♭,comp → 0`, `S♭,agg → inf βᵢ`.
- **(d)** **If `S♭,agg,∞ > 0`, then `C*∞` is an interval of width `2·S♭,agg,∞`:
  the fundamental value is a cell, not a point.**

> "Even with infinitely many agents, if the best agent has positive floor, the
> market cannot pin down a point price. This provides a rigorous account of the
> **Grossman–Stiglitz paradox**."

### No-Arbitrage Theorem (`thm:no-arb`)
- Equilibrium exists **iff** ∃ cell with `τ(C) > S♭,agg`.
- If `S♭,agg ≥ Σ/2`: **no-trade zone — no equilibrium price exists at all.**
- Characterisation: `minᵢ S♭(Aᵢ) ≥ max_C τ(C)`.
- **(d)** Adding one agent below the current minimum **may restore equilibrium.**

> "Market failure is a floor excess condition."

### Transaction Theorem (`thm:transaction`)
Buyer and seller transact **iff `S♭(A_B) + S♭(A_S) ≤ 2τ(C*)`**.
Transaction interval `[p* − τ + S♭(A_S), p* + τ − S♭(A_B)]`, width `2τ − β_B − β_S`.
**Cor:** if the best agent is on the buy side, *any* seller with
`β_S ≤ 2τ − S♭,agg` can trade. **A precision buyer lets imprecise sellers in.**

### Law of One Price (`thm:loop`)
Same knowledge framework `K_i = K_j` + simultaneous attainment at same state ⟹
decoded values agree.
> "Distinct prices within the cell do not violate the law of one price; they
> reflect **floor-bounded measurement noise**."
> "**The law of one price holds in outcome space, not in representation space.**"
Violation *requires* disjoint `K` — i.e. genuinely different grading standards.

### Classical results re-expressed in floor language
- Fama: weak/semi-strong efficiency = `S♭,comp ≈ 0`; **strong efficiency =
  `S♭,agg = 0`, impossible for bounded receivers.**
- Glosten–Milgrom: information rent of informed agents **= the premium `Π`**.
- Kyle: price impact `λ` **= `S♭,agg/Σ` = the spectral radius.**
- > "The 'auctioneer' is the Banach contraction `Ψ_E`, and 'market clearing' is
  > attainment of `C*`. **No auctioneer, no complete markets, no point prices.**"

## 4. Connection to T0–T8

Doesn't use T-labels (speaks in "Paper 1/2/3"), but the correspondence is direct.
**This paper is essentially the economic instantiation of T0.**

- **T0 (floor)** — the entire load-bearing premise, consumed not extended. Every
  negative result is a direct citation. *Contact-graph reading: tick size IS an
  edge weight; the cost of separating two adjacent price levels is bounded below.*
- **T2/T3 (region not point)** — `thm:price-cell` and especially `thm:fv`(d).
  Fundamental value is region-valued even in the infinite limit.
- **T4 (private invariant)** — each agent's floor `S♭(Aᵢ)`. **The Dual-Spread
  result is exactly the observation that two aggregations of private invariants
  (min vs product) are inequivalent.**
- **T5 (gate)** — attainment `S(E,x;C) ≤ τ(C)` is a gate. No-arbitrage is
  gate-existence; the Transaction Theorem is a two-sided gate.
- **T6 (non-return)** — `S♭,comp` strictly decreasing in n; adding an agent is a
  commitment that cannot be undone.
- **T7 (single quotient gate)** — `S(Eₙ,x;C) = minᵢ S(Aᵢ,x;C)` + Banach
  uniqueness of `C*`. Many agents, one gate, one equilibrium cell.
- **Closure** — **the paper implies TWO closure conditions, one per floor.**
  Trading-closure arrives as soon as you have the best agent; information-closure
  is only asymptotic.

**What it adds beyond the ladder:** the bifurcation of one floor into two with
different aggregation algebra, and the proof of a strict quantified gap `Π`.

## 5. Validation

45 experiments (E01–E45), 9 clusters, **all pass**, max relative error ≤ 1e-12.
5,000 point-price cases; every proper subset of pools up to n=20; 2,500 cell
evaluations; 500-step contractions from 5 initial cells converging to within
1e-12; infinite ensembles simulated to n=500; no-trade boundary identified
exactly in all 5 tests; 100 same-`K` LoOP pairs all agree, 100 disjoint-`K` pairs
all violate.

⚠️ **These are self-consistency checks of closed forms against their own
simulations. There is no empirical market data anywhere — no real exchange, no
historical prices, no calibration to observed spreads.** "Validation" = internal
numerical verification, not empirical confirmation.

## 6. Limitations (mostly implicit scope conditions)

1. **Ball cells / ball projections only** — the reduction `S = max(β, d(x,C))`
   underlies nearly every proof.
2. Bounded outcome space, `diam(X) ≤ Σ`.
3. Requires `fᵢ < Σ` strictly.
4. `thm:two-value` needs `τ(C) > S♭,agg`.
5. `thm:fv` needs Class `C_E` imported from Paper 3; point-valued `V*` requires
   `inf βᵢ = 0`, which T0 forbids.
6. `thm:loop` needs identical `K` **and** simultaneous same-state attainment.
7. **Bid/ask symmetry is definitional, not derived** (proof works in 1-D and
   admits the choice).
8. Bilateral only — no many-to-many matching.
9. **Floors are exogenous constants, not choices.** No agent exit, no time-varying
   floors, no strategic misreporting, no adversarial behaviour.
10. Three proofs (`dual-spread`(a), `transaction`, `loop`) contain visible
    drafting false starts; `thm:loop` is more an appeal to Paper 1's Cell-Truth
    than an independent derivation.

---

## 7. ⭐ Direct implications for Olduvai

Agricultural produce is an unusually **good** fit, because produce genuinely *is*
region-valued: a lot of maize is never "grade A" as a point — it is a moisture
band, an aflatoxin band, a broken-kernel band. **β is not an abstraction; it is
the measurement error of the moisture meter, the grader's eye, the assay kit.**

### 7.1 Build a cell book, not a point-price order book
- Tradable unit is `C(p,τ)` — mid plus half-spread — not a limit price.
- **Tick size := `S♭,agg` = min participant floor. Endogenous, not decreed.**
  Quoting finer than the worst relevant participant's floor manufactures fake
  precision and creates apparent arbitrage that is actually noise.
- **Display `τ` alongside every quote.** A price shown without its cell radius is
  a lie about what the exchange knows.

### 7.2 ⭐ Grades ARE cells — derive them from floors
Single most actionable transfer. A grade ("White maize, Grade 1, ≤13.5% moisture")
*is* a cell with tolerance `τ(C)`.
- **`thm:price-cell`(c): any grade band narrower than the field instrument's floor
  is unattainable — sorting into it is random.** Disputes, delivery rejections,
  reputation for arbitrary grading.
- **`thm:no-arb`: a grade with `τ ≤ S♭,agg` has NO equilibrium price.** It appears
  in the rulebook and never trades. The theory says why and gives the fix.
- **Procedure:** measure field-instrument floor per attribute → set band strictly
  above it with margin → verify `τ > S♭,agg` per listed grade → **delist grades
  that fail.**
- Contact-graph reading: **two grades whose separation cost exceeds their nominal
  gap are the same grade and should be merged.** That is a *closure condition on
  the grade taxonomy* — stop adding grades when no further grading catalyst
  produces a new equivalence class.

### 7.3 ⭐⭐ Run TWO spread metrics — biggest design payload
| | Set by | Measures | Improved by |
|---|---|---|---|
| `Δᵀ = 2·min βᵢ` | the **single best** participant | cost to transact | **only** recruiting better-than-best |
| `Δᴵ = 2·∏βᵢ/Σⁿ⁻¹` | **all** participants | how well the market knows value | recruiting **anyone**, especially diverse |

- One excellent warehouse-receipt market maker with lab assay → tight `Δᵀ`. Cheap;
  you need *one* good actor. **Does nothing for information quality.**
- If 4,000 smallholders have crude price information, `Δᴵ` stays high and the
  **published reference price is not informative** about true regional value.
- **Two budgets, different returns:** precision investment (reference lab, bonded
  warehouse with certified assay) → `Δᵀ` + discovery speed. Breadth/heterogeneity
  investment → `Δᴵ` + reference-price accuracy. **Most agricultural exchange
  projects fund only the first and then wonder why their reference price isn't
  trusted.**
- **Publish both.** `Δᴵ ≤ Δᵀ` always, so they never cross; the gap `2Π` is a clean
  single number for "how much better is collective knowledge than the best trader."

### 7.4 Heterogeneity is a productive asset
`Π` strictly increases in **size AND floor heterogeneity**; empirically
`Π ≈ Σ(1−e^(−n·CV²/2))(β̄/Σ)` — grows with the **coefficient of variation of floors**.

**This inverts the usual instinct** to screen out "unsophisticated" participants.
A heterogeneous mix (large cooperative + regional aggregator + processor +
exporter + thousands of smallholders across agro-ecological zones) produces a
**higher information premium** than a homogeneous club of five equally-good traders.

> Geographic and functional diversity of membership is not a social-inclusion
> nicety — **it is the mechanism by which the reference price becomes accurate.**
> Onboarding a remote district improves `Δᴵ` even though those farmers will never
> tighten `Δᵀ`.

**Direct convergence with the heterogeneity results in
[[02-coordinate-theory-of-advertising]]** (dissidents theorem, no universally-okay
temperature). Heterogeneity is forced by individuation *and* productive.

### 7.5 Discovery speed: only the best participant matters
`ρ = min βᵢ/Σ`; half-life `= ln(½)/ln ρ` sessions.
- Adding 500 ordinary members does **not** speed convergence at all.
- **For fast credible post-shock repricing: build ONE flagship reference contract**
  with tightest achievable measurement — certified warehouse, certified assay,
  published lot-level data. Let the rest anchor on it.
- **Design target:** pick desired half-life → back out required `min βᵢ` →
  engineer the instrument that achieves it. (β = 2% of Σ → 98% decay per round;
  β = 30% → ~2 rounds to halve.)

### 7.6 The no-trade zone is a diagnosable failure mode
Familiar pathology: thin, remote, or newly-listed commodities where the book is
simply empty.
- **Diagnostic:** compute `min βᵢ` for that commodity-location-grade vs. widest
  offered tolerance. Floor ≥ tolerance ⟹ **no amount of marketing produces trades.**
- **Fix:** introduce **one** participant below the current minimum — market maker
  with certified assay, buyer of last resort with published grading protocol,
  warehouse-receipt operator. **A single sufficiently-precise actor unlocks a
  market that no volume of imprecise actors can.** Strong argument for seeding new
  listings with a designated *precision* participant rather than liquidity subsidies.
- **Alternative fix:** widen `τ` — offer a coarser grade. Retreating to
  "feed-grade maize" when "milling-grade ≤13%" is in a no-trade zone is the
  mathematically correct move.

### 7.7 Matching-engine admission logic — free from the theory
- Store estimated `βᵢ` per participant (measurement capability, historical
  dispersion, declared instrument grade).
- **Admit a match iff `β_B + β_S ≤ 2τ(C*)`.** If it fails, don't match — the trade
  will generate a quality dispute at delivery. Tell the parties why: *"combined
  measurement uncertainty exceeds the grade band."*
- **Show the transaction interval width `2τ − β_B − β_S` as negotiating room.**

### 7.8 Dispute taxonomy
- **Intra-cell price dispersion is NOT a violation** — floor-bounded measurement
  noise. Surveillance must **not** flag it as manipulation. Flag only dispersion
  exceeding `2τ`.
- Real violations require disjoint `K` — different grading standards. That's not a
  price dispute, it's a **standards harmonisation problem**.
- **⟹ Enforce a single shared `K`**: one grading standard, one moisture protocol,
  one unit convention, one certified lab methodology. `thm:loop` is the formal
  justification that **standards harmonisation is the precondition for a
  functioning exchange, not an optional refinement.**

### 7.9 Reference price publication
**Never publish a single number.** Publish `[p*−τ, p*+τ]` with `τ` from the
current aggregate floor, plus `Δᵀ` (cost to trade) and `Δᴵ` (how well we know it).
Three numbers.

> The band width `2·S♭,agg` naturally narrows as the exchange matures → **the
> published band width is an honest, auditable KPI of exchange development.
> Far better than volume.**

### 7.10 Checklist
1. Measure `βᵢ` per participant class — everything derives from this.
2. Tick := `min βᵢ`.
3. Grade bands `> S♭,agg` for the field instrument; delist failures.
4. Publish **two** spreads.
5. Split budget: precision → `Δᵀ`+speed; breadth → `Δᴵ`+accuracy.
6. Recruit for floor **diversity**, not just quality.
7. Seed new listings with one precision participant.
8. Matching gate `β_B + β_S ≤ 2τ`.
9. Enforce one shared grading framework `K`.
10. Publish reference as a **band**; narrowing width = maturity KPI.

---

## 8. My assessment

Mathematically light — most proofs are 2–3 lines on min-vs-product algebra plus
imported results. Originality is almost entirely the **dual-floor split** plus a
systematic translation of Walras/Marshall/Kyle/Glosten–Milgrom/Grossman–Stiglitz/
Fama into floor language. Some proofs are unpolished (visible false starts;
`thm:loop` leans on Paper 1 rather than deriving; bid/ask symmetry is definitional).

But for Olduvai the two results carrying nearly all practical weight are
**Dual-Spread** (two independent quality metrics needing two independent
investment strategies — a genuinely non-obvious and actionable claim) and
**No-Arbitrage** (thin markets fail for a computable, fixable reason). The
**Transaction Theorem** hands you matching-engine logic essentially for free.

Links: [[00-framing]] · [[01-foundation-contact-graphs]] · [[04-corpus-map]]
