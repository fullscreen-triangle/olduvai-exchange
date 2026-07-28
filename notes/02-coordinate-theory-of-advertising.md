# Paper 2: *A Coordinate Theory of Advertising*
### Bounded Receivers, Action-Cells, and the Calculus of Decoder-Shifts

Source (read in full): `C:\Users\kunda\Documents\portfolio\pugachev-cobra\publications\advertising-coordinate-receivers\advertising-coordinate-receivers.tex`
(2400 lines; also `.pdf`, `experiments_extended.py`, `results_extended.json`, `panels/`)

**Relation to [[01-foundation-contact-graphs]]:** this is the first *applied*
layer. §14 (`sec:foundations`) proves the decoder graph **is** a contact graph,
so T0–T8 hold of it, and the advertising theorems become instances of the
general ladder. It also cites a third paper — `sachikonye2025knowledge`, a theory
of knowledge-graph reconfiguration — which I have not yet read and which is
load-bearing here (Thms 5.1–5.4, 6.4, Prop 4.2). **That is the obvious next read.**

---

## 1. The primitive: the bounded receiver

Where paper 1 starts from a whole and its parts, this starts from the *receiver*.

Three spaces, three axioms:
- **Percept space** `(X, d, Σ)` — bounded pseudometric on audiovisual configurations.
- **Action space** `(Y, d_Y)` with an action map `A : X → Y`.
- **A1 Bounded representation** — internal vocabulary `K` with `|K| < |X|`.
- **A2 No null state** — decoding is *total*; the receiver is always in some state.
- **A3 Finite resolution** — percepts closer than `δ > 0` are not distinguished.

**Receiver** `R = (K, D, Π, β)`:
- `D : X → K` — the **decoder**. This is *perception*.
- `Π : K → 2^X \ {∅}` — the **candidate projection**. This is *inference*.
- `β` — the **noise floor**, `β = sup_x inf_{x' ∈ Π(D(x))} d(x,x')`.

Note the separation of concerns: `D` is what the viewer sees *as*; `Π` is what
they infer *could be*; `β` is the residue surviving both.

## 2. The Floor Theorem — same shape, different derivation

`S(R, x; C) = inf_{x' ∈ Π(D(x))} d(x', C) + β` — the **S-functional**, semantic
distance from percept to target region.

**Floor Theorem:** `β > 0` and `S ≥ β > 0` always. Proof: `β = 0` forces
`Π ∘ D` injective on `d`-classes, i.e. an injection from `X`'s distinguishable
classes into `K` — contradicting A1.

This is the *same floor* as paper 1, reached from finite memory rather than from
non-completability. Two independent derivations of one constant.

**Cor: no perfect persuasion.** No advertisement drives `S` to zero. The limit is
the receiver's finiteness, not a defect of the message.

## 3. The strongest section: cells all the way down

This goes further than paper 1 in one important way — it argues the **percept
itself**, not just the valuation, is region-valued.

- **Percept-cell theorem:** `x` is registered as the cell `D⁻¹(D(x))`, diameter
  `≥ β`; fixed by negation (cites paper 1's T1 directly); and region-valued
  perception forces region-valued valuation.
- **Cor "cells all the way down":** there is *no level* at which a percept, a
  fact, or a valuation is point-valued. The spread is not introduced when
  valuing a point-fact — **the spread is already in the percept.**
- Remark on "knowing 21°C": to know it is to hold the *complement* — to rule out
  freezing, scorching, 15°, 30°. Even a thermometer reads a cell; its column
  rules out temperatures outside its graduation. *"To know anything is to hold
  the spread of what it is not."*

### Four everyday reductios for region-valued perception

Each is impossible under point-perception; each is observed; so perception is
not point-valued. Independent directions: **structural, temporal, consistency,
distributional.**

1. **Opinion on a fact** (Thm: *opinion is the witness of slack*). Placing a fact
   in a valuation cell requires slack. A point has one placement — nothing to
   opine. Two people disagreeing about 21°C are both correct route-readings;
   if the fact were a point one would be wrong.
2. **Variable recall of a fixed fact** (Thm: *recall is re-individuation*). A
   stored point fetched twice is identical. Describing the same unchanged image
   differently proves recall is a *walk on the current graph*, not a fetch from
   an address. Via T6: the receiver incremented, so the complement changed, so
   re-individuation lands elsewhere. *"Nothing changed out there and everything
   moved in here."*
3. **Catching a lie** — requires truth to be a region with auditable interior
   (zero holonomy), not a point with no interior.
4. **Dissent from a bridge** — you can only be disaffected by something that
   closes on a truth.

**Validated empirically:** 91.7% of receiver pairs disagreed on the token for the
same fact (E13); 59% of fixed stimuli got different descriptions after a graph
increment, and *all* 150 receivers showed some re-individuation (E14).

## 4. Cell-truth and the locus of action

- **Action-cell** `C_y = A⁻¹({y})` with positive tolerance.
- **Cell-Truth Thm:** for any `x₁, x₂ ∈ C_y`, `S(R,x₁;C_y) = S(R,x₂;C_y) = β`.
  All percepts within a cell are **receiver-indistinguishable**.
- **Principle — operational meaning is granular:** what an advert *means* is the
  cell its percept falls into. Two adverts placing the viewer in the same cell
  are operationally equivalent however different they look.
- **Point-value is forbidden.** No bounded receiver carries point-value; no
  theory of effect can rest on point-valued utility or quality.
- **Representational invariance:** `S` is preserved under isometric re-encoding.
  Meaning lives one level above its carrier. (Verified to `5.3e-15`.)

**⚠️ Directly relevant to Olduvai — Remark on the granularity of price:**
> The same argument applied to a price percept makes a **"price" a band, not a
> number**: a viewer registers "about twenty dollars," a cell of tolerance `β`,
> not the point `$19.99`. The cent-precise sticker is a **carrier** whose decoded
> value is a cell. Willingness-to-pay is then the **slack** `τ(C) − β` between the
> width of the price-cell and the floor.

This is the paper explicitly making the move I flagged as a hypothesis in
[[01-foundation-contact-graphs]] §8. It is not my inference — it is stated.

- **Decoder Locus Thm:** holding product and cell geometry fixed, any change in
  response is realised through *exactly three* modifications, exhaustive and
  mutually distinguishable:
  (a) change `D` — **re-perception** (the product is *seen as* something else);
  (b) change `Π` — **re-inference** (it is *inferred to imply* something else);
  (c) change `C_y` — **re-framing** (the response boundary moves).
- **Principle:** *the product does not move; the map does.*

## 5. Effects, carriers, and decoupling

**Effect** `ε = (c, Δ)` — a carrier (physical transformation, what a renderer
executes) bound to a decoder-shift (movement in meaning-space). **Coherent** iff
`D(c(x)) = Δ(D(x))`: the carrier actually produces the claimed meaning.

**Decoupling Theorem:**
(i) *Multiple realisability* — distinct carriers induce the same shift;
(ii) *Receiver relativity* — one carrier induces different shifts across receivers;
(iii) *Binding* — `Δ = D ∘ c ∘ D⁻¹`; carrier and shift are **conjugate
representations of one object**, not cause and annotation.

Meaning is "the filter's other face, the one a parameter-only pipeline discards."

**Affinity is ordinal.** `ε : C ≻ C'` asserts only a comparison, never a
magnitude — exactly what the Floor Theorem permits.

## 6. The calculus of power

**Catalytic power** `κ_C(ε) ∈ [0,1]` — the fraction of *above-floor* distance closed.

**Multiplicative law:** `κ(ε₁ ◇ … ◇ εₙ) = 1 − ∏ᵢ(1 − κᵢ)`.
Proof is one line: residuals multiply.

Corollaries, all with closed forms:
- **Diminishing returns** — `1 − (1−κ)ⁿ`, converges to 1, never reaches it.
- **Frequency saturation** — repeating the *same* stack cannot go below
  `β + r₀∏(1−κᵢ)`. Design law: **diversify routes rather than multiply impressions.**
- **Impossibility of total persuasion** — no finite advert makes purchase certain.
- **Campaign saturation (Borel–Cantelli dichotomy):** a campaign saturates the
  cell **iff** `Σκᵢ = ∞`. Divergent-sum power sequences drive residual → 0;
  convergent-sum sequences plateau above the floor. *Verified numerically.*

## 7. Coherence — the rule of three

- **Linear justification fails**: a chain `ε₁ → … → εₙ` leaves `εₙ` unsupported.
  A spot that is a *list* — fact, fact, logo — hangs on nothing.
- **Coherence requires a triangle:** the shortest grounding cycle has length ≥ 3.
  A 1-cycle is vacuous self-support; a 2-cycle is mutual definition with no
  independent check ("two elements cannot outvote their own disagreement").
  **Two elements can only assert each other; three can check each other.**
- **Ordinal detectability:** coherence is decidable from the *sign* of each
  pairwise support relation alone. Warrant for an automated **assessor**
  (type-checker over decoder-shifts) distinct from the **producer**.
  *Verified: a sign-only critic reproduced the magnitude verdict with 100%
  agreement across 2000 adverts.*

## 8. Holonomy — the algorithmic form of coherence

**Coherence holonomy** `η(c) = Σ Δ` around a cycle. **Coherence ⟺ vanishing
holonomy**: every cycle of decoder-shifts returns to its origin. Incoherence is
a cycle with `η ≠ 0` — *the routes to the target cell disagree.*

This converts the coherence condition into an audit that needs only directional
agreement, not magnitudes.

## 9. The bridge — and why it matters beyond advertising

**Four modes** of effect by `(κ, s)` = (closes holonomy?, alternate paths survive?):
`(1,1)` honest reinforcement · `(0,1)` misleading but correctable ·
`(1,0)` lock-in · `(0,0)` structural manipulation.

**Bridge advert** — a *fifth* configuration invisible to endpoint classification:
every stated claim is individually anchored to a genuine cell, but the
**argumentative route passes through a non-invariant intermediate**. The claims
check out; the path between them does not.

**Thm — endpoint-audit cannot detect a bridge.** Fact-checking the stated claims
produces *no finding*. Only route-audit locates the incoherent cycle. And no
function of the endpoint holonomies determines the bridge holonomy — route-audit
is *necessary and sufficient*. (Verified: endpoint-audit 100% miss, route-audit
100% catch, across 400 trials.)

**Thm — dissidents and perpetrators are co-present and necessary.** For any
population with non-identical decoder graphs, a bridge forces a three-part
distribution: **dissidents** (hold enough cross-paths to detect the failing
holonomy), **compliant**, **perpetrators** (the bridge closes most cleanly).

> The existence of dissidents **proves the cells were true**: one is disaffected
> by a cell that closes holonomy, not by one that does not. A lie produces no
> route-auditors, only disbelief. *Dissent proves region-truth.*

Worked through on the fuel-price claim ("cheaper *for me*" is reached through
each receiver's own dependent routes — grocery bill, commute, wage) and on
temperature: **no universally-okay temperature exists**, and universal agreement
on a valuation would be equivalent to *the absence of individuation*.

Prescription: *"the defense is not to find the universally-okay temperature — it
does not exist — but to keep the routes visible."* A healthy polity is one where
enough receivers hold enough cross-paths that bridges fail for a large enough
fraction.

## 10. Converse biconditional — no floor, no events

Sharpest single result in the paper for my purposes.

If `β = 0`: no distinguished cells → no terminal state → **every path is
infinite** → every path is circular → **there are no events** (an event is the
completion of a finite walk at a terminal cell).

> **individuation ⟺ positive floor ⟺ finite terminating paths ⟺ there being
> events at all**

Remark: *"Unlimited possibility is not freedom; it is paralysis."* With no floor
nothing forbids any transition, so a path has no reason to stop, no preferred
step, no terminal condition. **The floor is what gives a path a place to stop.**
*"Truth is not what you reach; truth is what makes reaching possible."*

## 11. Other structural results

- **Non-extractability of the decoder-shift** — a shift is a *reconfiguration of
  reachability*, categorically a different type from a vertex or a walk. It
  cannot be recovered as a located object from the reconfigured graph.
- **Effects are floored and irreversible** — "you can't unsee it," derived. A
  reversal is a further edit at higher count; the receiver is *changed, not
  restored*.
- **Creative non-uniqueness** — for any shift on a graph with `|V| ≥ 3` there
  are always ≥ 2 distinct adverts realising it. "The idea" is the invariant
  content their specifications share, not any particular execution.
- **Compilation target** — an advert is a typed program; well-formedness =
  (i) every effect coherent, (ii) all affinities positive toward target,
  (iii) support graph contains a triangle. Producer builds the carrier;
  **assessor type-checks before a frame is rendered.**

## 12. Validation

17 experiments, 17 pass. Percept space = finite point cloud in `R²`; receiver =
finite codebook with nearest-codeword decoder, Voronoi projection, induced
covering-radius floor. Identities to machine precision (`2.2e-16` on the
multiplicative law); structural claims at 100% where predicted.

Notable methodological honesty: **two experiments initially failed and each
failure sharpened a theorem rather than contradicting it** — the saturation
dichotomy is a *limit* statement (harmonic sums decay as `1/N`, so the test must
compare decay across horizons), and the saturation theorem concerns the *tail*
(a single absolute catalyst must be excluded). Both absorbed without altering a
theorem, and the changes are stated in the text.

---

## 13. What this contributes to Olduvai Exchange

### Confirmed, not hypothesised
Paper 1 let me *infer* that price might be region-valued. This paper **states
it**: price is a band, the sticker is a carrier, and **willingness-to-pay is the
slack `τ(C) − β`**. So the central claim I flagged in `01` §8 is already the
author's position, and Olduvai can build on it rather than argue for it.

### New machinery this paper adds
1. **The receiver as primitive.** An exchange has *many* bounded receivers with
   *non-identical decoder graphs*. That heterogeneity is not noise — it is what
   Thm `dissidents` says produces structured, predictable distributions.
2. **The three loci of change.** Anything an exchange does to a participant's
   response is re-perception, re-inference, or re-framing. Exhaustive. That is a
   complete taxonomy of market-design levers: grading changes `D`; disclosure and
   certification change `Π`; contract-spec and tick-size changes move `C_y`.
3. **Holonomy as an audit primitive.** Coherence = every cycle of shifts returns
   to origin. For an exchange: **do all routes to a price agree?** Arbitrage-free
   pricing is a zero-holonomy condition — and holonomy is *computable from
   directional agreement alone*, no magnitudes.
4. **The bridge, which I think is the most transferable result.** True endpoints,
   failing intermediate, undetectable by endpoint-audit. In an agricultural
   market this is exactly the structure of: verified farmgate price + verified
   retail price + an unaudited intermediate route ("the farmer benefits"). Every
   stated figure checks out. **Only route-audit finds it.** If Olduvai is a
   research instrument, *making routes visible and auditable* may be its actual
   function — the paper's own prescription, applied.
5. **Non-return / irreversibility** as settlement finality (already flagged in `01`).
6. **Ordinality as a discipline.** The theory refuses cardinal scores because the
   Floor Theorem proves they are unavailable to any bounded participant. *"A
   theory promising cardinal effectiveness would be promising the impossible."*
   An exchange that reports point-prices as if they were points is making that
   error. What can Olduvai legitimately report? Cells and orderings.

### Sharper open questions for the design conversation
- If price is a cell and WTP is slack, **what is the floor `β` of an agricultural
  market concretely?** Candidate: minimum cost of a distinguishing act — the
  cheapest assay/grade/inspection that separates two lots. Measurable in principle.
- **Is the exchange's job to reduce `β`, or to make cells and routes legible?**
  These are different products and different research programmes. Paper 2's
  prescription ("keep the routes visible") argues for the second.
- **Who are the receivers, and are their decoder graphs heterogeneous by
  construction?** Smallholder, cooperative, trader, processor — if they have
  different graphs, then by `thm:dissidents` disagreement about "is this a fair
  price" is *forced*, not a failure of information. That reframes the entire
  fairness question.
- **Is an exchange a bridge-detector?** The most interesting possible answer to
  "what is the research question."
- Does the **campaign-saturation dichotomy** (`Σκ = ∞`) have a market analogue —
  when does repeated price discovery converge vs. plateau above the floor?

### Reading queue
- **`sachikonye2025knowledge`** — theory of knowledge-graph reconfiguration.
  Load-bearing here (Thms 5.1–5.4, 6.4, Prop 4.2 all cited as proof steps).
  Supplies: reconfiguration units, specification slack, the four-mode taxonomy,
  the bridge theorem. **Need this before the picture is complete.**

Links: [[00-framing]] · [[01-foundation-contact-graphs]]
