# S-entropy: how apples add to oranges — and what it costs

Source: `architecture/buhera/long-grass/docs/unconstrained-subtasks-trajectory/unconstrained-subtasks-trajectory-completion.tex`
(1380 lines, 12 parts, ~40 numbered environments, 14 experiments, seed 42, 14/14 pass, 0.10 s runtime.)

Title: *Receiver-Internal Backward Trajectory Completion: Mathematical Foundations of
a Categorical Operating System.*

**Relation to the musande paper:** ~55–60% shared skeleton, **not** a duplicate. This
is the **computer-science re-derivation**, reorganised around a different central
object — backward trajectory completion. The new material is substantial and most of
it is what matters for the exchange.

User's claim: *"basically, you can add apples to oranges with my framework."*

**Verdict: the claim is true, with a caveat that has to be stated plainly. The paper
never uses the words "unit", "dimension", "commensurable", or "apples". There is no
dimensional-analysis section.** The mechanism is a chain of five constructions that
*do* the work. The reading is correct; the paper does not announce it.

---

## 1. ⭐ The mechanism, in four sentences

1. **You never add the apples to the oranges.** You add their **S-values** —
   receiver-relative misalignment scores in `[0,100]` — which are dimensionless by
   construction. Axiom S4: `S_R(x,x*) = δ_R(Φ_R(σ_x), Φ_R(σ_x*))`. **Units die at the
   decoder boundary `Φ_R`.** Litres, kilos, machine-hours and dollars all enter as
   signals `σ ∈ Σ_R`; once decoded they are elements of one set `K_R`, and `δ_R` is a
   single distance on `K_R × K_R`. **The comparison is not between quantities but
   between knowledge states, and knowledge states are typeless with respect to source
   units.**

2. **The combination operator is the arithmetic mean over three coordinate slots.**
   Def `def:sub-coord`: a sub-coordinate decomposition of `s ∈ [0,1]` is a triple
   `(s₁,s₂,s₃)` with `(s₁+s₂+s₃)/3 = s`. And immediately after it, the sentence the
   whole design turns on:

   > **"The triple `(s₁,s₂,s₃)` need not lie in `[0,1]³`. It is admissible whenever its
   > mean is in `[0,1]`, regardless of individual signs or magnitudes."**

3. **The only preserved invariant is the mean** — equivalently the global S-value `S*`,
   equivalently the evaluated knowledge state. Component magnitudes, signs, local
   S-values, ordering, syntactic form: all free.

4. **Validity requires only** (a) the receiver is bounded so `S♭ > 0` exists;
   (b) the composition is evaluation-preserving in `K_R`; (c) **the aggregate** lies
   in range. The physical constraint applies to the sum, never to the legs.

**⟹ This is a genuine answer to the dimensional-typing problem from
[[17-barter-exchange]] §4.4 — but it is a different answer than the one I recommended.**
I proposed a dimensional type system that *rejects* incoherent additions. This
framework instead *routes everything through a common decoder first*, after which
there are no dimensions left to be incoherent. **Both are valid; they are not the
same thing, and the paper's approach has a cost the type system doesn't have** (§4).

---

## 2. What is preserved, what is lost

**PRESERVED:**
- Evaluated knowledge state `k* = eval(ξ)` (Lem `lem:compositionality` — load-bearing).
- Global S-value `S*` (Thm `thm:unconstrained-subtask`).
- Mean `s̄ = s` of every decomposition.
- Endpoint metric invariants: `S(p_k)`, geodesic distance, Fisher volume, centroid
  distance.
- Type safety: `dec(eval(ξ)) ∈ img(τ(ξ))` (Thm `thm:typecheck-soundness`).

**LOST, IRRECOVERABLY:**
- ⚠️ **The path.** Thm `thm:path-opacity`: two trajectories sharing an endpoint but
  with distinct intermediate decompositions are **observationally indistinguishable
  from any metric invariant computed at the endpoint.** Measured opacity rate **1.00**,
  100/100 pairs.
- Individual components `s₁,s₂,s₃` — only `s̄` survives.
- Local alignment: a leg at `σ=100` (maximally misaligned) is invisible at the global
  level.
- Anything below `S♭` (Cor `cor:smallest-error`, Thm `thm:floor-decision`).

**Explicitly NOT preserved that one might hope for:** no conservation law on
components, no invertibility of aggregation, **no claimed exchange rate between the
source units.** The mechanism is **many-to-one and deliberately lossy.**

---

## 3. ⭐⭐ Backward matching — the biggest operational result in the corpus

This is new here and it is not in anything I've read before. Two theorems:

**Thm `thm:forward-asymmetry`:**
> "Forward trajectory construction (from root to endpoint by step-wise refinement)
> **cannot** use virtual sub-states. **Only backward trajectory completion** (from
> known endpoint) can."

Reason: forward construction must produce each next state as an *actual partition
block*, forcing `ι(p) ∈ [0,1]³`. Virtual coordinates correspond to no block.

**Thm `thm:collapse` (Collapse Without Virtual States):**
> Backward completion **restricted to physical decompositions** is `Θ(N)` — **identical
> to forward enumeration.** `Σ_{j=0}^{k} 3^j = Θ(N)`.

**⟹ The freedom to leave the box IS the speedup. It is not a convenience.**

### Translation to the exchange

- **Forward matching** = start from what everyone holds, enumerate feasible swaps
  outward. Every intermediate must be a real valid holding. **`Θ(N)` — you enumerate
  the whole market.**
- **Backward matching** = **start from the desired settled allocation** ("at season
  end, A has water, B has tractor-hours, ...") and navigate back to current holdings.
  Intermediate legs need not be individually valid trades. **`log₃N`.**

**⟹ Build the matching engine as a target-allocation solver, not a want-ads board.**
Parties declare desired end-state bundles; the engine works backward through virtual
intermediates to executable legs.

Exp 08 measures it: depths 2–10, 900 random paths, step count `= log₃N` **exactly,
zero variance** (min = max = expected), 9/9 depths. Exp 14: at `N = 177,147` the gap
`C_hard/C₁ ≈ 1.6×10⁴` — 177,147 traversals vs 11.

**And Thm `thm:virtual-existence` says the heterogeneous case is the norm, not the
exception.** On the constraint plane, the fraction of decompositions that are virtual
→ 1 as the range grows. Measured: **0.917 at M=1, 0.975 at M=2, 0.996 at M=5, 0.998
at M=10** (1000 trials each).

> **An exchange that only permits bilateral, locally-fair swaps is discarding >99% of
> the feasible trade space.** That is a measured claim, not a rhetorical one.

This is [[17-barter-exchange]] §1 — "legs may be individually absurd provided they
sum" — given an algorithm and a complexity separation.

---

## 4. ⚠️⚠️ Path opacity is a governance problem for a barter exchange

**This is the most serious finding in the paper for our purposes, and it cuts against
the design.**

Thm `thm:path-opacity`, validated at rate **1.00**: given only the settled endpoint,
**no invariant reveals how the circle was assembled.**

The paper's own defence:

> "Path opacity is sometimes interpreted as a limitation. Within the present framework
> it is a feature: it formalises the receiver's freedom to perform internal
> computations ... **without exposing the internal trajectory to external observers.**"

**That is a feature for the receiver and a risk for the counterparty.** In a computer
it is elegant. **In a market where one farmer gave 400 kg of maize and the leg-level
accounting is unrecoverable, this is exactly the condition under which exploitation is
undetectable.**

And it compounds with **Cor `cor:miracle` (the Miracle Principle)**: you can construct
a settlement where a chosen party's leg is at `σ = 100` — maximally misaligned — while
the global figure is perfect. **That is precisely the shape of a farmer being cleaned
out inside a circle that "balances".**

> **The framework provides no fairness constraint whatsoever.** It proves such
> settlements exist and are *generic*. It does not prove any are acceptable.

**⟹ Mandatory, and not in the paper:**
1. **Log every leg explicitly and out-of-band.** Do not rely on endpoint invariants for
   audit — the theorem says they cannot serve.
2. **Per-party floor constraints** — `σᵢ ≤ σ_max` for *every* participant, not just the
   aggregate. This is exogenous; the mathematics will not supply it.
3. **Veto rights and independent leg-level review.**

**⚠️ Note the tension with [[19-sealed-sensors]] and [[16-foreman-as-continuous-verification]]:**
the whole fraud architecture is built on **route audit** — "endpoint audit is provably
insufficient, route audit is necessary and sufficient." **Path opacity says the
matching engine's own route is not recoverable from its endpoint.** These are
consistent (physical route ≠ computational trajectory) but the naming collision is
dangerous and the leg ledger must be kept as a **separate legally-binding artefact.**

---

## 5. ⭐ Whoever controls `Φ_R` controls the exchange rates

The sharpest honest limit, and it should be said to any stakeholder.

The framework does **not** tell you how many machine-hours a litre of water is worth.
It tells you that **once someone specifies the decoder, arbitrary heterogeneous
combination is mathematically consistent.**

> **"Which receiver?" is exactly the question "what is the exchange rate?", relocated
> rather than answered.**

`Φ_R` and `δ_R` are *given* in the model, never derived. **Whoever authors them sets
every exchange rate in the market, completely and invisibly.**

⟹ In a cooperative this is the single most politically loaded object in the system.
**Version it, publish it, change it only by explicit collective decision.** Anyone
claiming the mathematics makes the exchange "objective" is misreading it.

This corrects §5.2 of [[17-barter-exchange]], where I invoked the geometric-direction
result — "adjudicate by a metric neither party chose." **That defence is weaker than I
wrote it.** The metric is entailed *given the receiver*; the receiver is chosen.

⚠️ **And one more thing worth flagging.** The Local–Global Decoupling witness is
literally `ξ = ξ₀ + Σ(ηᵢ − ηᵢ)` — **additive cancellation.** The heterogeneity is
carried by terms that **cancel to zero.** They contribute no value, only local
S-value. That is a **weaker construction than "the apple genuinely priced against the
orange."** The existence theorem is real; it is not a pricing theorem.

---

## 6. Other results that transfer directly

### 6.1 Cascade design rule — with a hard failure mode
`cor:cascade-power`: chain matchers (village `κ₁` → district `κ₂` → national `κ₃`) and
end-to-end quality is `κ(Γ) = 1 − Π(1−κᵢ)`. Three stages at 0.5 give **0.875, not 1.5.**

`thm:cascade-saturation`: clearing requires **`Σκᵢ = ∞`** — stages of roughly constant
marginal effectiveness. Exp 12: `κᵢ = 0.1` constant → residual `~10⁻³⁰⁰` after 10,000
stages. **`κᵢ = 2⁻ⁱ` → residual stabilises at 0.578 and never clears.**

> **Design rule: do not build a matching pipeline whose tail stages are decorative.**
> A geometrically-decaying cascade provably never clears the market.

### 6.2 ⭐ Ledger sizing is cubic in precision
`thm:cmm-sizing`: `|K| ≥ ((100−S♭)/ε)³`.
- 1% settlement precision → **~10⁶** addressable cells.
- 0.1% → **~10⁹**.

**Precision in a barter exchange has a cubic storage cost. Do not promise finer
settlement granularity than the ledger can address.**

Paired with Exp 01, which confirms `S♭ = 100/|K|` across four decades (50.0 at |K|=2 →
0.0244 at |K|=4096): **"the floor and the address space are dual quantities."**

### 6.3 Minimum lot size is derived
`thm:floor-decision`: a decision problem with S-distinguishability `ε < S♭(R)` is
**undecidable by R, regardless of computational resources.**

⟹ Two bundles differing by less than the floor are indistinguishable to the exchange.
**Below the floor it must guess, and it will guess systematically.** Set an explicit
minimum lot size above `S♭` and refuse to arbitrate below it. Same shape as the
sensor-β rule in [[19-sealed-sensors]] §4.1 — **the third independent derivation of
"set the dispute threshold at β and defend it."**

### 6.4 Three books, and 3 is proved minimal
`thm:tem` + `def:circular-validity`: represent every trade **three** ways —
**oscillatory** (seasonal cycles, rainfall periodicity, repayment cadence),
**categorical** (the discrete ledger of goods and grades), **partition** (measure-
theoretic allocation of a fixed pool, e.g. total borehole-hours). Cross-check pairwise
at `θ > ½`.

> "with only two representations, mutual support reduces to circular definition
> without external check. **Three representations form the smallest non-degenerate
> cycle.**"

**Same theorem as the 2-cycle objection in [[15-marketplace-not-certifier]] §3.1,
arriving from a completely different direction.** Two books is provably insufficient
as an audit architecture. This is *derived*, not chosen.

### 6.5 The three axes, read agriculturally
`thm:s-uniqueness`: given (i) refinement-preservation, (ii) `S₃` symmetry across axes,
(iii) entropy/Fisher consistency, **the embedding is unique up to isomorphism** (a
Čencov/Amari rigidity argument).

A defensible agricultural reading of `(S_k, S_t, S_e)`:
- **`S_k`** (knowledge) — provenance, quality, certification, contract reliability.
- **`S_t`** (time) — **timing misalignment.** Water in October vs January are different
  goods; tractor-hours at planting vs post-harvest are different goods. **This axis is
  where an agricultural exchange earns most of its value**, because time-mismatch is
  the dominant real failure mode in smallholder barter.
- **`S_e`** (entropy) — physical throughput and loss: transport distance, spoilage,
  storage decay, fuel.

**If those three genuinely satisfy the hypotheses, the geometry is forced** — which
removes "whose weighting scheme?" from the negotiation, *conditional on agreeing the
axes.* That is a real governance asset, and a narrow one.

---

## 7. ⚠️ Where it does not reach

1. **Everything is proved on a ternary hierarchy with `N = 3ᵏ` and exactly three
   axes.** The `log₃N` result depends on ternary refinement; the uniqueness theorem
   depends on `S₃` symmetry over three coordinates. `N`-ary/`N`-axis extension is
   **open question 4**. ⟹ **Ternary structure would have to be imposed on the market**
   (village / ward / district, say), not discovered in it.

2. **Multi-receiver noise is unsolved.** Open question 3: the collective floor
   `S♭^coll = inf_i S♭(Rᵢ)` holds **only in the lossless case**; under noisy
   communication it is **explicitly unknown**. A barter exchange is a multi-receiver
   system with noisy communication by definition. **The floor guarantee does not
   transfer to the setting we would actually deploy in.**

3. **The mean is substitutive; agricultural needs partly are not.** The operator is the
   plain arithmetic mean of three slots — no weights, no priority, no hard constraints.
   **Water access has a hard lower bound**; a household below its water threshold does
   not get to average that against surplus maize. ⟹ **Non-substitutable goods must be
   handled by a pre-filter outside the S-machinery — as eligibility gates, not as
   coordinates.**

4. **No empirical validation of anything market-like.** Author's own words:
   *"the validation suite tests the theorems, not application performance."* All 14
   experiments are synthetic self-consistency checks in 0.10 s. **No evidence about
   matching quality, participant welfare, or strategic robustness — and no model of
   strategic agents at all.** Same gap as the other 28 papers, now for the 29th time.

---

## 8. ⚠️ Defects noted in the source

Consistent with the pattern in [[10-buhera-subtree]]:
- **Dangling forward reference.** The proof of `thm:five-names` says the commutation
  relation `[Ô_cat, Ô_phys] = 0` is *"developed in Part VII"* — **Part VII contains no
  such development.** The macros are declared in the preamble and used only in that one
  proof. Cut section.
- **Abstract overstates precision.** Claims *"maximum identity-discrepancy below
  10⁻¹⁰"*, but Exp 03's max frequency relative error is **0.498** — nine orders larger.
  Defended in-text as a *predicted discretisation bound* rather than an identity error,
  so the abstract's phrasing is loose rather than wrong.
- **Two broken figure references:** `fig:panel-floor-equiv` and
  `fig:panel-circular-recursive` are cited but never defined (actual labels differ).
- **Unstated hypothesis.** `thm:unconstrained-subtask` needs surjectivity of `δ_R`,
  used in the proof but absent from the statement.

---

## 9. Net

**What it gives the exchange:** a rigorous licence to clear multi-party circular trades
in incommensurable goods, by scoring everything as receiver-relative misalignment on
one dimensionless scale, combining via a three-slot mean whose components are
unconstrained, and **matching backward from a target allocation** with a proven
`log₃N` vs `Θ(N)` advantage that *depends essentially* on allowing individually-absurd
legs. Plus a cascade-accuracy formula, a cubic ledger-sizing law, a derived minimum lot
size, and a three-book audit architecture.

**What it does not give:** any exchange rate (hidden in `Φ_R`, which someone must
author and govern), any fairness constraint (the Miracle Principle guarantees
exploitative settlements exist and are generic), or any leg-level auditability (path
opacity, validated at rate 1.00, actively destroys it).

> **Build the matcher on this. Build the fairness constraints, the leg-level ledger,
> and the governance of `Φ_R` entirely outside it.**

Links: [[00-framing]] · [[17-barter-exchange]] · [[19-sealed-sensors]] · [[16-foreman-as-continuous-verification]] · [[15-marketplace-not-certifier]] · [[13-computational-operations-equivalence]] · [[12-irreducible-bounded-phase-space]] · [[10-buhera-subtree]] · [[11-synthesis]]
