# moriarty: rail-network-yield and phase-locked-finance

Location: `physics/sighthound/moriarty/docs/` — a paper collection I missed on the
first pass entirely. ~12 subtrees, each with paper + validation code + committed JSON.

Two read here because they are directly the exchange's subject matter.

**Headline: `rail-network-yield` is the best-executed document in the corpus so far and
supplies a real link-pricing mechanism. `phase-locked-finance` is the worst, and it
does NOT contain three results I have been attributing to it.**

---

## PART 1 — ⭐ rail-network-yield: the transport-pricing layer

`docs/rail-network-yield/german-rail-network-yield.tex` + `experiments/`

### 1.1 What it proves

A **three-way equivalence**, from the abstract:

> For a network whose sole scarce resource is quantized by a resolution floor β₀ equal
> to the minimum block headway, the following are equivalent: **(i) the configuration is
> yield-optimal; (ii) it is a deterministic-closure fixed point;** and **(iii) it is
> supported by a clearing price system in which every section's price equals its
> separation cost.**

And the structural claim underneath it:

> **β₀ simultaneously plays three roles** — the physical resolution floor of occupancy,
> the algorithmic separation threshold for closure, and the **minimum lot of the price
> system** — and **that coincidence is what makes the equivalence hold.**

⭐ **This is β from [[01-foundation-contact-graphs]] appearing as the minimum lot size of
a market**, derived rather than asserted. It is the same object as the sensor floor in
[[19-sealed-sensors]] §4.1 and the minimum-trade-size result in
[[20-s-entropy-dimensional-typing]] §6.3 — **now with a proof that optimality, closure,
and clearing coincide only when the three floors are the same number.**

Prop 6.5 says the equivalence **fails when the three floors differ** — which is a
directly actionable warning for the exchange (see §1.5).

### 1.2 The mechanism — genuinely reusable definitions

- **Block-second** (Def 2.3): `⟨σ,k⟩` = section σ during `[kβ₀,(k+1)β₀)`. β₀ ≈ 90–120 s
  under LZB/ETCS.
- **Useful displacement**: `Δ(⟨σ,k⟩) = Σ_{x∈S} [r(x) − ρ(hd(σ),τ(x))]⁺`
  — ⭐ note the `[·]⁺`: **only progress toward the actual buyer counts.**
- **Network transport yield**: `Y(C) = Σ Δ / Σ[ n(σ,v) + λ·ℓ(σ)·g_u(v) ]`
- **⭐ Separation cost**: `ς(σ) = Y* − Y(C_{−σ})` — **the marginal yield lost by denying
  section σ.**
- **Fare as line integral of scarcity**: `F(x) = Σ_j ς(σ_j)·n(σ_j,v_j)`

### 1.3 Validation — synthetic, but honestly so, and internally sound

**No real data.** Networks are literals typed into the script; grep for
`requests|urllib|http|csv|gtfs|api` finds exactly one hit, which *writes* the results
file. The "German rail network" is **four hardcoded section lengths** (Nuremberg–Erfurt–
Halle-Leipzig–Bitterfeld–Berlin: 190/120/30/120 km at 300/300/160/160 km/h).

**⭐ But the paper says so, repeatedly and unprompted** — at lines 65, 110, 667, 737,
781, 789, 809:

> "We ground all quantities in representative figures from the German high-speed network
> … **purely to make the idealized object concrete. The results are theorems about this
> model and are not claims about any deployed or deployable system.**"
>
> "The purpose is **internal corroboration of the proofs, not empirical measurement**."

**That is the correct posture**, and it is the first document in this corpus to take it.
Contrast [[21-buhera-west-audit]] and [[22-sighthound-audit]], where synthetic results
were presented as measurements.

**Experiments 1–4 are legitimate internal corroboration.** Ground truth is **brute-force
exhaustive enumeration** over the full product space — which for checking an optimality
claim is *stronger* than a baseline, because you compare against the exact optimum.
Outcomes could have gone the other way and didn't:

- **Exp 2 is a real result:** `v*` moves 300 → 300 → 250 → 115.4 → 53.6 km/h as λ goes
  0 → 1e-4, found by a 3000-point grid sweep. Could have come out flat or non-monotone.
- `best_reassignment_gain = 0.0` over 58 enumerated neighbours; `max_deviation_profit
  = 0.0` under `p = ς`. Real enumeration results.
- **`ς(AB_fast) = 6.194`** — genuine marginal-value computation (`AB_slow` substitutes at
  lower yield). **The most substantive number in the corpus to date.**
- **Figure captions quote numbers that actually match the JSON.** Worth stating given
  §2.4 below.

⚠️ **Three real defects:**
- **Experiment 5 is circular.** Line 445 *defines* `predicted_price_band = |β_alg −
  β_econ|`; lines 471-475 *check* `predicted_price_band == |alg−econ|·β₀`. That is
  `x == x`. And every `measured_*` column is `0.0` in all five trials because the split
  constants are never passed to the checkers — so it **cannot distinguish split from
  unified.** The paper claims at line 775 that Exp 5 "confirms Proposition 6.5". **It
  does not.**
- **`ς(BC) = 19.982 = Y*` is a sentinel, not a counterfactual.** `model.py:397-398`
  falls back to `0.0` when no delivering config avoids BC. Directionally right
  (BC is essential), but the specific value is the fallback.
- **`h_hold` defaults to `0.0` and is never set nonzero.** The anti-fragmentation term
  the transfer corollaries lean on is **untested.**

### 1.4 ⭐ What is genuinely reusable

1. **Separation cost as the price of a logistics link.** The price of a truck slot on a
   route-day = the yield the network loses without it. **Bottleneck roads price high,
   redundant ones near zero.** This is a computable answer to a question
   [[14-what-it-actually-is]] left open: *what does the exchange charge for transport?*
2. **Yield as useful-displacement-per-scarce-resource.** Swap "target-ward km" for
   **value-weighted produce delivered before spoilage**, and block-seconds for
   **truck-hours** or **cold-chain-hours.** The `[·]⁺` is exactly right for produce.
3. **Fare as line integral of scarcity** — a defensible farmer-facing tariff: pay for
   the congestion you cause. High on the contested trunk, near-free on a slack feeder.
   **Internalises the externality**, and it is *derived*.
4. **Backpressure liveness (Thm 8.6):** the price a stranded consignment raises on its
   relieving link is exactly the yield that summons a truck to it. **A proved
   no-starvation property for a spot logistics market.**
5. **Route/vehicle/item continuity are decoupled (Cor 9.4)** — consignments needn't ride
   one truck end-to-end. Consolidation and hub transfer fall out naturally.

### 1.5 ⚠️ What is missing, and one is severe for produce

- **⚠️⚠️ NO TIME WINDOWS.** `Item` has only `name`, `loc`, `target` — **no deadline, no
  ready-time, no perishability decay.** And configurations collapse to a *single window
  per section*, so the temporal index `k` that Def 2.3 introduces **is never exercised in
  code.** For produce — a mango has ~5 days, a tomato ~48 hours — **the entire time
  dimension is absent.** This is the single biggest gap.
- **Buffer capacity declared but never implemented** — `Network` has no per-station
  capacity field. For finite cold storage at collection points, that is exactly the
  binding constraint.
- **No multi-modal cost heterogeneity.** Item transfer between vehicles *is* modelled
  (Cor 9.4), but all vehicles are homogeneous processors on one graph. Truck→rail→ship
  is not.
- **Brute force will not scale.** Full Cartesian enumeration takes 0.97 s on **three
  sections.** Needs a real solver — consistent with the `C_hard` warning in
  [[17-barter-exchange]] §5.1.
- **No incentive compatibility** — explicitly disclaimed at line 801: *"we prove no
  incentive-compatibility or strategy-proofness."* **The corpus gap, now for the 30th
  time, and this time stated by the author.**

### 1.6 ⭐ The Prop 6.5 warning, applied

The equivalence holds **only when the physical floor, the algorithmic threshold, and the
minimum price lot are the same β₀.** For the exchange that is a direct design constraint:

> **The sensor resolution ([[19-sealed-sensors]] §4.1), the dispute threshold, and the
> minimum tradable lot must be the SAME number.** If they diverge, yield-optimality,
> closure, and clearing come apart — and the market can be at a closure fixed point that
> is not optimal and not clearing.

That unifies three separate "set the threshold at β" recommendations I derived
independently in [[16-foreman-as-continuous-verification]], [[19-sealed-sensors]], and
[[20-s-entropy-dimensional-typing]]. **They are not three rules. They are one rule.**

---

## PART 2 — ⚠️⚠️ phase-locked-finance: do not use, and a correction to my own notes

`docs/phase-locked-finance/phase-locked-finance.tex` + `validation_experiments_plf.py`

### 2.1 ⚠️⚠️ CORRECTION: three results I attributed here are NOT here

I have been carrying, from the economics subtree ([[08-economics-remaining]],
[[11-synthesis]]) and repeating since:

- **Phase lock** — COMPILE and EXECUTE mutually exclusive, deriving call auctions over
  continuous matching
- **Receiver Uncertainty Principle** — `σ_K · σ_Y ≥ ħ_R = βτ`
- **Transaction clock** — `Θ = ∫|G|`

**An exhaustive grep of this paper and its code finds none of them.** COMPILE and
EXECUTE appear nowhere. No uncertainty relation, no `ħ_R`, no `σ`, no `Θ`, no auction, no
matching engine, no order book, no price series. The only hit for "phase-lock" is the
paper's **title**; the only "mutually exclusive" refers to set-disjoint positions.

⟹ **Those three results live in some other document and I have not located their source.**
They are load-bearing — the phase-lock result is what derives call auctions over
continuous matching, which is a concrete architectural decision — so **the source must be
found and audited before anything is built on them.** Flagging as an open task, not a
finding.

### 2.2 What the paper actually is

A **bilateral hash-chain payment channel.** State `S = (b_A, b_B, n, H)` with
`H = Hash(b_A ‖ b_B ‖ n)`; transfer decrements one balance, increments the other, bumps
the nonce, rehashes. Six theorems whose "proofs" restate the algorithm's own checks.

**Standard since Lightning (2015)**, and weaker than deployed systems. The paper concedes
its own central primitive is undefined (line 481): *"What physical, computational, or
abstract substrate enables position coherence?"*

### 2.3 ⚠️⚠️ The validation is constructed so that it cannot fail

Not merely synthetic — **tautological.** Every assertion is compared against a literal set
one to three lines above it.

```python
nonce_after = nonce_before + 1                                    # line 45
nonce_monotonic = state_after['nonce'] == state_before['nonce'] + 1   # line 58
```
`x+1 == x+1`. Reported `atomic_rate: 1.0`.

```python
can_revert = prior_nonce >= current_nonce   # 5 >= 7 -> False
irreversible = not can_revert
```
`irreversibility_rate: 1.0` is `not (5>=7)`.

**The privacy theorem is the most naked:**
```python
has_external_record = False
has_ledger_entry = False
transaction_broadcast = False
privacy_perfect = not (has_external_record or has_ledger_entry or transaction_broadcast)
```
**Theorem 3.6 ("Perfect Privacy") is "validated" by writing `False` three times.**

**The headline speedup is a hardcoded literal:**
```python
plf_finality_ms = 0.001            # <-- the claimed result
```
Nothing is timed anywhere in the file — no `time.perf_counter`, no benchmark. The
"10⁶× faster than blockchain" is `uniform(600,1200) / 0.001`.

**Zero baseline.** Grep for `baseline|persistence|benchmark|naive` → **no hits.**

### 2.4 ⚠️⚠️ The one experiment that could fail, did — and is reported inverted

`plf_validation_results.json` records **`"forgery_detection_rate": 0.0`** — every trial
`"forgery_detectable": false`.

The paper (line 429) and the figure caption both state:

> "Forgery detection rate: **100% of forgery attempts are detected.**"

**The committed JSON says 0%.** The cause: the "forgery" is built as
`forged_complement = 1 - forged_evidence` — i.e. a *valid* involutive pair — so the script
constructs a well-formed transaction, correctly finds it valid, and **the paper reports
the inverse.** And since `generate_panels_plf.py` plots the measured mean, **published
Panel 3B must show a 0% bar contradicting its own caption.**

**This is categorically worse than the tautologies.** A result that came out negative is
published as its opposite.

⚠️ Also: the security claim is contradicted by the paper's own definition. `complement` is
**bitwise NOT** — public, keyless, trivially computable — while Thm 3.4 claims forging it
"requires physical coherence with A." And all six theorem cross-references are **broken**
(`??` throughout the compiled PDF); the comparison table doesn't render (missing
`booktabs`).

### 2.5 Relevance: near zero, by the paper's own admission

Its Remarks rule out the use case directly: **"PLF is incompatible with external audit
requirements"** and **"unsuitable for regulated financial institutions."** Multi-party
clearing is listed as an open problem.

An exchange needs audit trails, dispute resolution, multilateral clearing
([[17-barter-exchange]]), and regulatory reporting. **All four explicitly disclaimed.**
And path opacity ([[20-s-entropy-dimensional-typing]] §4) already tells us leg-level
auditability must be *added*, not removed.

---

## 3. Net

**Take from `rail-network-yield`:** separation cost as link pricing, yield-as-useful-
displacement, fare as line integral of scarcity, backpressure liveness, and the
**β₀-coincidence constraint** — which unifies three thresholds I had derived separately.
**Treat the code as a specification sketch, not an engine**, and build time windows,
perishability, and storage capacity yourself.

**Take from `phase-locked-finance`:** nothing.

**And find the real source of the phase-lock / uncertainty-principle / transaction-clock
results before they are used.** ⚠️ They are not where I recorded them as being.

Links: [[00-framing]] · [[14-what-it-actually-is]] · [[17-barter-exchange]] · [[19-sealed-sensors]] · [[20-s-entropy-dimensional-typing]] · [[21-buhera-west-audit]] · [[22-sighthound-audit]] · [[08-economics-remaining]] · [[11-synthesis]] · [[01-foundation-contact-graphs]]
