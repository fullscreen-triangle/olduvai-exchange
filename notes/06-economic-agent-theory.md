# Paper: *A Mathematical Theory of Economic Agents*
### Receivers, Floors, and the Algebra of Bounded Inquiry

Source: `economic_agents/mathematical-theory-economic-agents/economic-agent-theory.tex` (1948 lines, read in full)

**Position: Paper 1 of the economics sequence — the base.** [[05-foundation-for-price]] is
Paper 4; `market-equilibrium` is Paper 2; `heterogeneity-theorem` is Paper 3.

---

## 1. Thesis

**The economic agent is not a primitive.** It is derivable from the *receiver*
`R = (K, D, Π, β)`, and every property economists normally *posit* is a theorem
about that receiver, driven by one fact: `β > 0`.

> "Bounded rationality, selective rationality, the impossibility of point-values,
> the irreducibility of private information, and the structural limits of value
> theory are all theorems that follow from the receiver's definition. They are not
> modifications of the standard model; **they replace it**."

Four stated defects of the canonical `U: X → ℝ` agent:
1. Preferences are assumed, not derived.
2. Bounded rationality is a behavioural patch.
3. Substrate neutrality is lacking.
4. Point-valued utility requires infinite precision.

## 2. Core apparatus

**Outcome space** `(X, d, Σ)` — `d` is a **bounded pseudo-metric** (`d(x,x')=0`
does *not* imply `x=x'`; this is the hook cell-value hangs on). **Action map**
`Act: X → Y`, a measurable surjection. **Action-cell** `C_y = Act⁻¹({y})` with
tolerance `τ(C_y) > 0` and `diam(C_y) < Σ`.

**Receiver** `R = (K, D, Π, β)`: `K` knowledge framework, `D` decoder
(*perception*), `Π` candidate-projection (*inference*), and
`β := sup_x inf_{x'∈Π(D(x))} d(x,x') > 0` the noise floor.

`S(R,x;C) := inf_{x'∈Π(D(x))} d(x',C) + β`

⚠️ **Notational inconsistency:** the body/proofs use the *additive* form above;
all five figure captions use `max(β, d(x,C))`. Both give `S ≥ β` with equality
in-cell, so theorems are unaffected, but the forms differ off-cell.

## 3. The theorem chain

**Floor Theorem** — `β > 0` is the irreducible lower bound on `S` for every `x`
and every cell, and it is *attained*: `x ∈ C ⟹ S = β` exactly.

**Bounded rationality is a theorem** — `S_t ≥ β` for all finite `t`, because
**β is a property of the receiver `(K,D,Π)`, not of the methodology `M`**. No
amount of iteration touches it.
> "The floor is not a constraint appended to the model; it is derived from the
> receiver structure. The theorem extends Simon's observation from a behavioral
> description to a mathematical necessity."

**Cell-Truth** — for any `x₁, x₂ ∈ C_y`: `S(R,x₁;C_y) = S(R,x₂;C_y) = β`.
> "All states within the same action-cell are S-indistinguishable... Two states
> that produce identical practical actions are operationally equivalent,
> regardless of how different they appear in the representation space `K`."

**Representational Invariance** — `S` is preserved under isometric bijection.
Three canonical encodings (oscillatory `L²` / categorical / partition) all
isometric, so:
> "The choice among these encodings is **computational, not epistemic**."

**Layered receivers** — `S(R•,x;C) = min_i S(Rᵢ,x;C)`; layer floor
`= min_i βᵢ`. Layers are *pre-decoder* (constant `D`, reflex), *decoder*
(deliberative), *delegated* (outsourced).
- **Mode Non-Privilege:** if a cheap pre-decoder layer fires (`S ≤ τ(C)`), the
  aggregate is `≤ β_{i*}` **regardless of every decoder layer's value**.
- **Selective rationality as optimality:** the optimal response is the *cheapest*
  layer with `βᵢ < τ(C)`. Any more expensive layer costs more and **cannot lower
  the min**.
> "This is not a heuristic bias but the mathematically optimal response of a
> layered receiver." (Kahneman System 1/2 derived, not assumed.)
> Satisficing "is not an approximation to optimality; it *is* optimality." And
> **the aspiration level IS `τ(C)`** — set by the outcome space, not psychology.

**Methodology** `M = (T, κ, σ)` — Banach fixed point `S̄(M) = σκ/(1−κ) > 0`,
geometric convergence `κᵗ`. **Never attained in finitely many steps.**
**Composition:** `q₁₂ = q₁q₂` (dimensionless floors multiply), hence
`S̄(M₁◇M₂) ≤ min(S̄(M₁), S̄(M₂))` — *sequential composition always beats either alone.*
⚠️ The choice of `q₁q₂` over inclusion–exclusion `q₁+q₂−q₁q₂` is **asserted, not
derived** from the definition. Weakest proof in the paper.

**Agent** `A = (R, M, G)`; **agent floor** `S♭(A) = β·S̄(M)/Σ`.

**Receiver Uncertainty Principle:** `σ_K · σ_Y ≥ β·τ(C)`.
⚠️ **Internally inconsistent** — Fig. 5C reports all 600 sampled products falling
*strictly below* `βτ` under the parameterisation `σ_K = αβ`, `σ_Y = (1−α)τ`
(which forces `≤ βτ/4`), while E33 claims `≥` verified in all 500 cases.

## 4. ⭐ Point-meaning is forbidden — the eleven-fold collapse

**Thm:** No bounded receiver carries point-meaning. `β > 0` ⟹ `Π(D(x))` is
**never** a singleton; ∃`x*` with `d(x,x*) ≥ β/2`.

**Thm:** *Every* bounded receiver carries **cell**-meaning. Constructive:
`C_k := Π(k) ∪ B(Π(k), β)` — **the floor generates the region.**

**Eleven-fold collapse** — eleven classical prerequisites for point-meaning each
*individually* entail `β = 0`: temporal predetermination access; absolute
coordinate precision; oscillatory convergence control; quantum coherence;
consciousness substrate independence; collective truth verification;
thermodynamic reversibility; method determinability; zero temporal delay;
information conservation; temporal dimension fundamentality.

**Cell-value:** `V(x) := C_{Act(x)}` — value is **set-valued, not real-valued.**

> "A market price is not a point `p ∈ ℝ` but a **price-cell** `C_p ⊆ X`... The
> width of this cell (its diameter) **is the bid-ask spread**. The receiver floor
> `β` is the **minimum achievable spread** — below it, no bounded market
> participant can distinguish buy from sell prices. The classical notion of a
> 'true price' is the `β = 0` case, proved here to be impossible."

> "Debreu's framework describes the `β = 0` limit that is mathematically
> consistent but structurally unreachable by any bounded agent."

## 5. The Gödelian residue

**Thm:** residual uncertainty about the *derivation* of a solution is exactly `β`.
**The set of unanswerable questions about `S*` is in bijection with
`Π(D(S*)) \ {S*}`** via `S' ↦ "why S* rather than S'"`.

**Cor — private information is irreducible:**
> "**No disclosure mechanism, incentive scheme, or revelation principle can
> reduce the agent's residual private information below `β`.**"
> "Full information disclosure is impossible not because of strategic withholding
> but because `β > 0` is a structural property of bounded receivers."
> "The revelation principle is correct for the coarse information above `β`;
> **it cannot penetrate the floor**."

**Bias is decoder, observation is projection** — systematic bias *is* the
deviation `d(x, Π(D(x))) ∈ [0,β]`. "Observation without bias" requires `β=0`.

Grossman–Stiglitz: > "The paradox is not a paradox — it is a theorem about
positive `β`." Akerlof's lemons: the residue is the irreducible source.

## 6. Arrow, reconsidered

**Prop:** if preferences are **cell-valued**, Pareto + non-dictatorship +
unrestricted domain **are compatible**. The incompatibility arises only for
point-valued outcomes (the `β=0` limit).
> "there exist aggregation rules that satisfy Pareto, non-dictatorship, and
> unrestricted domain while violating Arrow's independence condition only within
> cells — **a violation that is operationally undetectable because the states
> concerned are S-indistinguishable**."

⚠️ **Honest caveat, stated by the author:** for `m_C ≥ 3` distinct cells the
Arrow argument **still applies**. The escape is only that intra-cell IIA
violations are undetectable. Confirmed empirically — E29 failed **3/100**, and
the three failures were exactly where cell diameters → 0.

**Incompatibility Theorem:** production (`σ>0`) and completion (`σ=0`) are
mutually exclusive at any finite iteration. > "An agent cannot simultaneously be
in creative and decisive mode." (March's exploration/exploitation, derived.)

## 7. T0–T8 mapping

Never cites the ladder — structural isomorphism only.

- **T0** — ⚠️ **`β > 0` is *stipulated* in the receiver definition, not derived.**
  The contact-graph derivation from [[01-foundation-contact-graphs]] is what
  supplies the missing justification. Conversely the **eleven-fold collapse is
  the converse argument**: eleven independent routes by which denying `β>0`
  collapses the apparatus.
- **T1** — `Π(D(x))` *is* individuation-by-negation made computational: a state is
  fixed by the set the decoder cannot rule out.
- **T2/T3** — the spine. Cell-Truth, cell-meaning generic, `V(x) := C_{Act(x)}`.
  `C_k = Π(k) ∪ B(Π(k),β)` shows the region is exactly a **β-thickening**.
- **T4** — the Gödelian residue: every agent carries an irreducible private
  invariant of magnitude exactly `β`, unextractable by any mechanism.
- **T5** — `Act: X → Y` **is** the gate; `τ(C)` is its aperture. Selection is never
  on `X` directly.
- **T6** — production/completion exclusivity; floor never attained finitely.
- **T7** — strongest contact *and* tension. Agents with **disjoint goal-sets `Gᵢ`
  can have overlapping goal-cells `C_{Gᵢ}`** — two nominal gates, one effective
  quotient. The paper **assumes** one `Act` per outcome space and would inherit
  T7 as its justification.
- **T8** — construction phase (expand `K`, refine `D`/`Π`) is authorship; the
  Uncertainty Principle bounds it.

**Extends the ladder:** the layered-receiver algebra and the methodology algebra
are new machinery — a **cost calculus over floors**.

**Holonomy:** Representational Invariance = zero holonomy under the isometry group.

## 8. Validation

35 experiments, 7 clusters, all PASS, ≤1e-14. **All synthetic — no real market
data anywhere.** Notables: E19 composition law max error **1.89e-16**; E21 all
2000 projection sets non-singleton, diameter 0 **never observed**; E27 500
disclosure events, residue **never reduced below β**; **E29 the one non-perfect
result — 97/100, the 3 failures at `diam → 0`, exactly where theory predicts.**

## 9. ⭐ Implications for Olduvai

### Quote in bands; make the band a first-class schema object
Store a **price-cell** `{lower, upper, cell_id}`, not `price: 4.35`. Midpoint is a
*derived, lossy projection*. A system requiring a point price has silently
assumed `β=0`.

### Tick size := β — the most direct engineering number
`diam(C_p)` *is* the spread; `β` is the **minimum achievable spread**. Tick finer
than `β` manufactures phantom levels no participant can distinguish → quote
flicker, spurious "improvement," latency arms races over noise. **Tick = β is the
design optimum.** (Converges with [[05-foundation-for-price]] §7.1.)

### Grade classes ARE action-cells; the grading standard IS the gate
`Act` maps consignment state (moisture, size, defects, brix, variety, harvest
date, origin, cold-chain) → transaction class. Requirements:
- `τ(C) > 0` = **minimum clearing distance between grades.** Two grades separated
  by less than the inspection floor are **one grade with a fictional boundary** —
  every near-boundary trade is a dispute waiting to happen.
- `diam(C) < Σ` — no "Grade C: everything else" bucket.
- **Test:** for each adjacent grade pair, verify inspection separates them with
  margin > β. Failures must be **merged**.

### ⭐ Measure β empirically — it is inspection reproducibility
**Re-inspect the same lot with independent inspectors/instruments; the spread of
resulting classifications IS β.** Everything else — tick size, grade boundaries,
dispute thresholds, arbitration tolerance — calibrates off this one measured
constant. Make it a standing monitored metric.

### Cell-Truth gives a free settlement rule
Within a grade, **no participant may claim a quality-based price differential** —
unverifiable by the exchange, must be rejected. Converts an endless source of
agricultural dispute ("my lot was better than the other Grade A lot") into a
closed question: same gate ⟹ same price-cell.

### Stop trying to eliminate information asymmetry — price it
- Mandatory disclosure should target the coarse information **above β** (origin,
  harvest date, cold-chain log, treatment history, aggregate assay). **A rulebook
  promising "full transparency" promises something provably impossible and will
  be litigated on that gap.**
- **The residual β is what pays for inspection.** If `β→0` nobody would fund
  grading infrastructure. Price the inspection service against the residue it
  resolves.
- Adverse selection cannot be regulated to zero — only *bounded* by widening
  cells or by recourse mechanisms sized to β.

### ⭐ Build the matching engine as a layered receiver
- **L1 pre-decoder (cheap):** photographic grading, lot-tag lookup, seller
  reputation, prior-lot history. Large `β₁`, tiny cost.
- **L2 decoder (expensive):** physical inspection, moisture meter, sampling assay.
- **L3 delegated:** third-party lab certification.

**Rule (proved optimal): invoke the cheapest layer with `βᵢ < τ(C)`, and STOP.**
Escalating to lab assay when photographic grading already separates the grades is
*strictly suboptimal*. This is an implementable escalation policy that is
mathematically optimal, not a cost-cutting compromise.

Two corollaries:
- System resolution is `min_i βᵢ` — **don't fund inspection upgrades that don't
  lower the min.**
- Fraction resolvable by cheap L1 is **monotone increasing in `τ(C)`** ⟹
  **widening grade bands directly and predictably reduces inspection cost.** A
  tunable dial: grade width ↔ inspection spend. Quantify and set deliberately.

### Chain cheap checks rather than buying one perfect instrument
`q₁₂ = q₁q₂`: two independent `q=0.1` checks give `q=0.01`. Don't buy one
`q=0.01` instrument if two `q=0.1` checks are cheaper combined.
⚠️ Assumes **independence** — verify empirically, because correlated failure modes
in agricultural inspection are common (both fooled by the same surface treatment).

### Separate CONSTRUCTION from ACTION phases
Revising the grading standard and running live matching are **mutually exclusive
modes**. **Freeze the grading standard for the session/season; revise only in
scheduled announced windows.** Amending grades mid-session is not merely
inconvenient — it is incoherent. Publish a **versioned** standard with effective
dates; every trade records the version it cleared under.

### ⭐ ONE gate — resist multi-standard fragmentation
> If buyers, sellers, and the exchange operate different grading standards
> (`Actᵢ`), you do not have one market with a disagreement — **you have two
> markets wearing one name.**

Cell-Truth, the settlement rule, the tick rule, and the Arrow escape *all*
silently assume a single `Act`. Admitting a second standard (an export standard
alongside a domestic one on the same book) breaks the quotient and invalidates
settlement. **If you need two standards, run two order books.**

### Governance: rank bands, not points
Cell-valued voting escapes Arrow — but keep governance options **few and
genuinely distinct (wide bands)**. Fine-grained ballots with many near-identical
options reintroduce Arrow (E29's 3 failures).

### Encoding freedom is real
Multi-currency and multi-unit (kg/bushel/crate) quoting is safe **under isometric
conversion**. Non-isometric transforms (lossy quality-score compression to a
single scalar) fall outside the theorem and *will* change `S` — **never in the
settlement path.**

---

⚠️ **Carry into the build:** everything rests on `β > 0`, which this paper
*assumes*. And all 35 experiments are synthetic. **The empirical β-measurement is
the mandatory first step — it is the one number the whole design hangs on, and
the paper gives you no value for it.**

Links: [[00-framing]] · [[01-foundation-contact-graphs]] · [[05-foundation-for-price]] · [[04-corpus-map]]
