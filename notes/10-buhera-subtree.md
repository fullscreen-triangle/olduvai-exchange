# The Buhera subtree — 7 papers

`musande/epistemology/buhera/` — os-system · architecture · backward-navigation ·
trajectory-completion-mechanism · blank-screen · vaHera · knowledge-thermodynamics ·
unconstrained-subtasks-computing. All read in full (~9,200 lines).

---

## ⚠️ First, the finding that matters most

**Two of these papers assert the negation of the contact-graph foundation.**

`os-system.tex` and `architecture.tex` contain **no contact graph, no cost of
separation, no floor β, no non-completability, no T0–T8, no gate, no monotone
committed count.** They are built on a *categorical/thermodynamic* story (partition
space, Maxwell demons, Triple Equivalence) that is logically independent of — and in
two places in direct tension with — the ladder in [[01-foundation-contact-graphs]]:

- **T0 violated.** `W_cat = 0`; "categorical operations incur zero thermodynamic
  cost." **The headline result is that separation is FREE.**
- **T2/T3 violated.** Partition Completeness: every state is the limit of nested
  cells — refinement converges **to a point.** The penultimate state is **unique**.
  Computation proceeds "from `1̂` toward `0̂`," the finest partition of singletons.

**For Olduvai this is decisive: an agricultural exchange is a machine for pricing
the cost of separation, and these two papers' headline claim is that separation is
free.** Grading, cold chain, transport, storage — the costs the exchange exists to
price — are exactly what `W_cat = 0` denies.

**The other five papers do carry the floor**, and carry it well. `vaHera`,
`knowledge-thermodynamics`, `unconstrained-subtasks-computing`,
`backward-navigation`, and `trajectory-completion-mechanism` all have `S♭ > 0`
explicit and load-bearing. **Where the papers conflict, the later/floored ones are
the defensible documents.**

Also worth recording: `architecture.tex` (Mar 2026) is a **self-correcting rewrite**
of `os-system.tex` — scoped to research computing, with explicit limitations, and
the zero-cost claim downgraded to *deferred*-cost (Landauer erasure pushed outside
the operation's time horizon — an accounting choice, not a free lunch). And the two
disagree on tier direction, on the metric, on address uniqueness, and on whether the
penultimate state derivation is degenerate.

---

## The papers that DO carry the floor

### `knowledge-thermodynamics.tex` — the market-design paper of this subtree

> **Duplicate confirmed.** `architecture/buhera/long-grass/docs/knowledge-thermodynamics/`
> is **byte-identical** to the musande copy — same MD5 `cc4f5364bfe4381e94ddfe0ae8d728ee`,
> 71,172 bytes, 963 lines, `diff` empty. The long-grass copy adds only build artifacts,
> six PNG panels, `references.bib`, and a standalone duplicate of the figure captions.
> **There is no fuller version.** Additional detail recovered on re-read is folded in
> below and in §"Additions from the second read" at the end of this section.

**⭐ The Receiver Uncertainty Principle: `σ_K · σ_Y ≥ β·τ`** — `ħ_R = βτ` as a
receiver-domain constant, with the action map "playing the role of the Fourier
transform conjugating position and momentum."

Read `σ_K` = **price-discovery dispersion**, `σ_Y` = **execution/settlement
dispersion**, `β` = **grading floor** (finest quality distinction the inspection
regime can make), `τ` = **contract tolerance** (spec width). Then:

> **An exchange cannot simultaneously offer tight price discovery and firm
> execution.** Firm deterministic execution (`σ_Y → 0`) requires `σ_K → ∞` — that
> is the **fixed-price forward contract**: execution certain, price information
> destroyed. Sharp price discovery (small `σ_K`) requires real execution
> variability — partial fills, spec deviations, rejections. That is the **spot
> auction**.

**No market design escapes this.** An exchange promising both guaranteed price and
guaranteed delivery-to-spec is claiming `σ_K σ_Y < βτ`, which is forbidden.
**The only genuine product improvement is lowering `βτ` — better inspection (lower
β) or narrower spec (lower τ). Everything else is a trade along the hyperbola.**

**⭐ Saturating allocation: `σ_K = σ_Y = √(βτ)`.** The optimum is a **call auction
with a short bounded discovery window and a settlement tolerance band of comparable
width.** Being off-curve costs you a *higher floor* — worse grading resolution — not
merely inconvenience.

**⭐ Phase Lock: DISCOVERY and EXECUTION must not run concurrently.** A hard
architectural mandate — a two-state machine. During discovery, no trade commits;
when the book commits, discovery stops. **Concurrence is forbidden.** ⟹ **batched
call auctions, not continuous matching.** *This independently reproduces a known
market-microstructure result from a completely different axiom set.*

**Grades ARE action-cells** — and **all lots within a grade have `S = β` identically.
This is the mathematical justification for fungibility: within-grade lots trade at
one price because the exchange's receiver cannot resolve them.** Verified: in-cell
`S = β = 1.0` uniformly across all four test cells.

**⭐ Cell-disjointness is decidable (30/30, sound and complete on the test grid).**
A new grade may be added **iff its predicate is logically disjoint from every
existing grade.** Add "Premium" as diameter ∈[20,24] while "Grade A" is [18,22] and
the cells overlap on [20,22] — **existing Grade-A contracts become ambiguous.**
⟹ **Every new product listing must pass an automated disjointness check against the
entire registry before going live.** This is the single most directly implementable
result across the whole subtree: an O(1)-per-pair decision procedure with
demonstrated 100% accuracy.

**⭐ Floor monotonicity — the fundamental trade-off of product design:**
> "more refined domains expose more action distinctions but at the cost of higher
> floor."
Splitting Grade A into A1/A2/A3 buys more price signals but **degrades the
reliability of each distinction.** There is an optimal grade granularity and the
theorem locates it.

**Composite floor:** `β(∨) ≥ max(βᵢ)` — a "Kenya AA Nairobi March" contract inherits
the **worst** floor among {origin, grade, timing} resolutions. **Do not over-specify
contracts; each additional dimension ratchets the floor upward.** Exact number for
independent attributes: `β₁₂ = β₁ + β₂ − β₁β₂/Σ` (verified to machine precision
across 81 pairs). Grade resolution 5 + origin resolution 8 → joint floor **12.6**.
A directly computable **specification-quality budget.**

**⭐ Cascade switching = the inspection budget allocator.** `ρᵢ = (1/cᵢ)·log(Σ/(Σ−βᵢ))`;
invoke verification methods in decreasing `ρᵢ` until budget exhausted. Closed-form,
online, O(k) per step. Greedy within 5% of brute-force optimal across 40 instances.

**⭐⭐ Replication bifurcation — the most actionable QA result.**
> **Weak replication strictly dominates strong replication for every n ≥ 2.**
> Running the *same* inspection five times: floor stays at `S♭(M)`. **Five identical
> inspections are worth exactly one.** Running five *different* inspections: floor
> drops multiplicatively.

**⟹ Never re-inspect a lot the same way. Always inspect it a different way.**
An exchange that triple-checks moisture with three moisture meters has wasted two
checks; one moisture meter + one visual + one lab assay strictly dominates.

**Federation:** `β_fed = min βᵢ` (verified exactly across 30 federations) — adding a
warehouse/inspector gives the network the resolution of its **best** member, a
strict ratchet downward. **Onboard iff `ΔI(F,R*) > c*`** — marginal ignorance
reduction vs onboarding cost, **decidable in O(|F|)**. A node covering only
already-covered regions contributes exactly zero and must be rejected however cheap.

**Knowledge entropy is a STATE FUNCTION** — path-independent. ⟹ **the informational
quality of an exchange depends only on its current inspection structure, not its
history. Incumbency confers no informational advantage per se**; a new entrant
replicating the inspection regime achieves the same entropy immediately. What
incumbents have is *network size* (federation), which does ratchet.

⚠️ **Defect to record:** the Federation Inequality is **stated backwards relative to
its own proof** — the proof visibly self-corrects mid-text ("*Wait*: this gives the
opposite") and introduces a second entropy `I` only inside the proof, never as a
numbered definition. **Cite the `I` form, not the theorem statement.** Also: the
uncertainty constant is rigorously `βτ/2`; the tightening to `βτ` is asserted.
And the "15/15" pass rate is labelled **expected**, not reported.

#### Additions from the second read (long-grass duplicate)

**⭐ Grades are cells, and disjointness governs the whole registry's history.**
> If "Grade A" and "Premium Organic" can **both** hold for one lot, cell-truth
> invariance breaks and **every historical Grade A price series is retroactively
> ambiguous.** Freeze the grade registry; permit only cell-disjoint additions; **every
> legacy contract then remains valid forever.** *This is the difference between an
> exchange that can add products without renegotiating old ones and one that cannot.*

**⭐ Two lots inside one grade cell are PROVABLY indistinguishable to the exchange**,
so they must clear at one price. **The residual quality difference between them is not
mispricing to be arbitraged away — it is conserved structure.** Budget for it as a
permanent basis-risk line, not a defect to be engineered out.
**And there is no finite stack of inspections, no volume of data, and no price
mechanism that makes `β = 0`.** An exchange cannot promise "the price fully reflects
the lot."

**⭐ The uncertainty principle as a microstructure tradeoff, sharpened.** Tightening
`τ` (narrowing the grade band) lowers `ħ_R` — **but floor monotonicity says finer
grading RAISES `β` for the domain. The tradeoff is not free.**
> An exchange publishing one authoritative grade with no dissent (low `σ_K`) **will be
> paid in violent price dispersion** (high `σ_Y`); one that agonises over grading
> (high `σ_K`) gets stable prices **but cannot clear.**

**⭐ Phase lock is a DERIVATION of the call-auction/continuous split**, not an analogy:
a PRICE-DISCOVERY phase where orders accumulate and nothing commits, then an EXECUTE
phase committing to a single clearing price. **Running both simultaneously is not
merely bad design — it is off the admissible curve.** For thin agricultural markets
with lumpy harvest-season liquidity this argues for **scheduled call auctions over
continuous matching.** Transition back to discovery only on new information arrival,
and **the commitment is irreversible — no un-ringing a print.**

**⭐ The lattice is the argument for harmonised national standards.** Meet = the
consensus grading two regions both accept, and `β_∧ ≤ min(β₁,β₂)` — **the shared
coarse standard has the BETTER floor.** Join = full refinement, `β_∨ ≥ max` —
**refusing to harmonise costs you resolution.** ⟹ a national standard that regional
exchanges refine downward, rather than each inventing its own.

**⭐ The anti-monoculture result, stated sharply:** `n` runs of the *same* test leave
the floor **exactly unchanged regardless of n**. > "**Triple-sampling with one lab is
worthless; one sample each at three methodologically different labs is not.** Budget
for diversity of inspection method, never for repetition."

**Federation screening:** the federated exchange inherits the **best** floor among
members, so admitting one high-resolution participant lifts everyone — **but
`ΔI = 0` exactly for redundant members. An exchange whose grading is dominated by an
existing member adds literally nothing.** Use the `O(|F|)` decidability to screen
membership applications.

⚠️ **The proof error, verbatim from inside the proof:**
> "***Wait***: this gives `H(fed) ≥ max_i H(R_i)`, **the opposite.** Re-checking: the
> entropy is large when knowledge is large, so federation *increases* entropy."

**The abstract, the architecture section, AND the summary all still assert the
uncorrected direction.** Only the proof body carries the fix. **Any use of this result
must take the ignorance form `I(fed) ≤ min_i I(R_i)`, never the `H` form.**

⚠️ **And there is NO second law proved.** Whether `dH ≥ 0` under federation holds is
posed as an open question, not established.

⚠️ **Validation is prospective.** The summary table reports **"15/15 expected"**, and
the text says "the expected pass profile." **These are stated predictions, not
reported measurements** — the figure captions do carry concrete numbers, but the table
itself hedges. Re-runnable at seed 42 via `python -m driven.src.kt.run_all_kt`.

### `unconstrained-subtasks-computing.tex`

**⭐ The conservation law: mean-recovery with unconstrained parts.**
`(s₁+s₂+s₃)/3 = s`, with `sᵢ` **arbitrary in ℝ** — may be negative, may exceed 1,
may be arbitrarily large.

> **The aggregate is conserved; the components are entirely free.**

For an exchange this is the **netting/aggregation law**:
- **CAN:** decompose a settlement into arbitrarily many legs with wildly off
  individual values — negative legs, legs exceeding physical range — provided the
  aggregate recovers the true figure. **This is the licence for netting,
  multilateral clearing, offsetting positions, carry-and-storage decompositions,
  warehouse-receipt splitting, pooled-lot allocation.**
- **CANNOT:** violate mean-recovery. **A clearing house may create any leg structure
  it likes, but the legs must sum. There is no other freedom and no other
  constraint.**

⚠️ **Risk-management corollary:** intermediate positions in a netting chain carry
**no information about correctness** (tested at −1000 to +10000, all preserved).
**You cannot audit a clearing chain by inspecting its legs. Design margin and risk
monitoring at the aggregate, never at the leg.**

**⭐⭐ Forward asymmetry + Collapse — the deepest market-design result in the subtree.**
> **Forward construction cannot use virtual sub-states; only backward completion
> can. Restricted to physical states, backward completion collapses to Θ(N) —
> identical to forward enumeration.**

Translated: an exchange building allocations **forward** from the book
(order-by-order, physically realisable at every step) is **Θ(N)**. An exchange
starting from a **declared clearing outcome** and working backward, permitting
intermediate legs that correspond to no deliverable lot, is **log₃N**.

**⟹ Design mandate: the clearing engine's intermediate representation must be
allowed to be non-physical; only the FINAL allocation must be physically realisable.
If your engine insists every intermediate state be a valid deliverable allocation,
you have provably thrown away the entire advantage.** (85–95% of decompositions are
virtual; the physical ones are the rare exception.)

**⭐ Path opacity is a theorem, not a policy** (100/100 verified). Two clearing paths
reaching the same allocation are **provably indistinguishable from any invariant
computed at the outcome.** ⟹ publish clearing price and allocations; **the netting
path, the order of matches, and who was matched against whom are unrecoverable.
Farmers' and buyers' bilateral exposure is hidden by construction, not by
redaction.**

**⭐ Circular validation — the exchange needs THREE validators, not two.**
Linear justification **fails** (no chain of authorities ever grounds a valuation,
because `S = 0` is impossible). **Cycles of length 2 "reduce to mutual definition
without external check." Only cycles of length ≥3 are circularly valid**, requiring
strong connectivity and θ > ½.

> **A two-party attestation (seller + inspector) is provably insufficient. And no
> linear chain of certification authorities, however long, grounds anything.**

Implementable as three mutually-checking representations of lot state: *temporal*
(delivery schedule, throughput) / *categorical* (grade, class) / *partition*
(physical location, warehouse allotment). Consistency among all three is the
integrity monitor.

**⭐ Architectural self-similarity + frozen interface.**
> "Routers, specialists, root nodes, and leaf nodes are the same kind of object
> (a Resolver) at different depths." · "The contract is **not a design choice; it is
> forced** by the requirement of self-similarity."

**⟹ A village aggregation point, a district market, a regional hub, and the national
exchange must all implement the identical interface.** Agricultural markets *are*
hierarchical (farm → collection point → district → region → national → export) and
the standard failure mode is a different system at each tier. **A tier-heterogeneous
exchange loses the logarithmic advantage and lands back at Θ(N).**

**Floor-bounded undecidability:** a quality distinction with true distinguishability
`ε < S♭` is **undecidable by this exchange regardless of computational resources.**
If two maize lots differ by less than the inspection floor, **no amount of data, ML,
or compute will let the exchange price them differently. Any attempt is guessing
dressed as discovery.** ⟹ principled answer to "should we offer finer grades?":
only if you have first lowered the floor below the distinction you want to sell.

**CMM sizing:** `|K| ≥ ((100−S♭)/ε)³` — with `S♭=5`, `ε=0.5`: **~6.86M addressable
cells.** Cubic, so a 2× resolution improvement costs 8× address space.

**Cascade saturation:** residual → 0 **iff Σκᵢ = ∞.** A verification pipeline with
geometrically decaying stage power (a strong first check, then progressively weaker)
**never reaches the floor** however many stages. Constant per-stage power does.
**⟹ Do not stack ever-weaker checks. Stack checks of roughly constant strength.**

**Composition multiplicity `2^(n−1)`:** for an n-leg settlement there are at least
`2^(n−1)` evaluation-identical clearing structures. **The exchange can choose the
decomposition cheapest in fees, tax, logistics, or regulatory treatment, with the
settlement outcome provably unchanged.** ⚠️ **Equally a real abuse surface —
regulators should be told.**

### `vaHera.tex` — the language

**⭐ The conservation law that constrains the market.** `W_cat = 0` under
`[Ô_cat, Ĥ] = 0` says: **operations that only re-partition (relabel, re-sort,
re-group, re-index) cost nothing AND create nothing.** An exchange may freely
re-sort the book, re-grade lots, re-bundle baskets, re-index by region —
**but none of these create value, because they conserve the medium exactly.**

> **Any exchange business model premised on earning a margin purely from
> re-sorting, re-grading, or re-bundling is claiming energy from a commuting
> operator, which the theorem forbids. Value is only created at the open aperture —
> `W_phys = k_B T ln 2` per bit — at the point of actual physical interaction: the
> truck moving, the cold store running, the inspector measuring, the payment
> settling.**

**⟹ Charge fees at the aperture, not at the sort.** Free re-listing, free
re-grading, free search; fees on logistics, inspection, settlement, custody.
*Not a business preference — what the commutation relation licenses.*

**⭐ `(S_k, S_t, S_e)` maps onto produce economics almost directly:**
- **`S_k` = turnover/velocity.** Fast-moving (leafy greens, tomatoes) → low → spot
  floor. Slow (stored grain) → high → warehouse tier.
- **`S_t` = literal perishability / cold-chain state.** "Localized energy → low
  `S_t`; thermalized → high" — a refrigerated pallet has low `S_t`, an ambient one
  at hour 30 has high. **Since `S_t` has entropy dimension in the type system,
  spoilage is a first-class typed quantity.**
- **`S_e` = counterparty sharing.** Farm-gate lot committed to one buyer → low;
  listed across many buyers / pooled → high.

Each lot gets address `S(turnover, perishability, sharedness)` and **the tier ladder
routes it to a venue automatically** — L1 spot floor, L2/L3 day market, RAM forward,
Storage warehouse receipt. **Venue routing by coordinate, not by human category.**

**Dimensional typing with entropy as the 8th SI dimension.** Never allow a price
(currency/kg) to be added to a freight rate (currency/km) or a quantity (kg) —
**reject at contract-definition time, not at settlement.** Given produce trades mix
kg, crates, tonnes, hectares, days-to-spoil, and multiple currencies, **a
dimensional type system on the contract schema is the single highest-leverage
correctness feature.** Memory pressure has dimension `E·L⁻³` — the natural type for
**warehouse/cold-store congestion.**

**Unknowable origin** (100 trials, mean error 0.040, **zero perfect
reconstructions**): the settled price and allocation **do not reveal the negotiation
path.** Bidders cannot reverse-engineer each other's reservation prices from the
clearing outcome. **Publish the address; never the trajectory.**

**Poincaré complexity is FLOPS-independent** (constant 72 across 10⁶–10¹² FLOPS).
**Throwing compute at the exchange does not reduce categorical complexity.** Buy
servers for aperture work (logistics optimisation, image-based grading), not for
matching.

### `backward-navigation.tex` + `trajectory-completion-mechanism.tex` + `blank-screen.tex`

**⭐ Build the continuous metric BEFORE the matcher.** If the produce catalogue is a
flat set of SKUs with only equality, **every matching query is Ω(N) and the exchange
will not scale past a few thousand listings.**
> "the continuous metric **IS** the hierarchy" — you do not separately maintain a
> category tree (Cereals → Maize → White Maize → Grade A); a well-built embedding
> generates it implicitly **and keeps it consistent as new produce types appear.**

**Three coordinates are necessary and sufficient.** Collapse to 2D and **a lot that
has been paid for aliases onto one that has merely been listed. That is a settlement
bug expressed as a geometry bug.**

**⭐ Fisher metric — weight matching distance by `1/(S(1−S))`.** The difference
between "moisture 13% ± 3%" and "13% ± 0.5%" matters enormously at the margin.
Distances near the boundary diverge, meaning **the exchange should charge, in
matching-distance terms, an increasing amount for the last increment of certainty.**
Exactly right economically: **the last assay is the expensive one.** Do not use
Euclidean distance — you will systematically over-match near-certain lots with
uncertain ones.

**Ternary is semantically natural for produce grading**: below/at/above spec;
reject/hold/accept; local/regional/export. **Design the grading rubric as ternary
decisions and the address falls out** — 37% depth reduction over binary, and each
lot's ternary address IS its catalogue position, storage address, and matching key
simultaneously.

**⭐ Miracle count as a progress metric.** For any open position, state the number of
unresolved ternary decisions remaining to settlement. **Far better than a percentage
bar — it is the actual remaining decision depth.** When count = 1, exactly one
action remains. Validated scale-independently across depths 3–10.

**⭐ Scale ambiguity ⟹ ONE matching engine for every granularity.** The same code
matches a 50 kg bag to a household buyer, a 30-tonne lot to a processor, a
cooperative's seasonal output to an export contract, and a region's aggregate to a
national tender. **Do not write four matching engines.** A very large engineering
saving, and the theorem entitles you to it.

**⭐⭐ Geometric direction is external — a non-circular basis for disputes.**
The circularity theorem says: within a content system, "good" reduces to "consistent
with the system," and two systems with disjoint closures are **mutually
unjudgeable.**

> **This is precisely the structure of an agricultural price dispute.** The farmer
> has a content system (local market knowledge, last season's price, what the
> neighbour got, input costs). The buyer has a different one (export parity,
> processing yields, their cost curve). The closures are largely disjoint. Neither
> can evaluate the other's claim from inside their own — **and the theorem says this
> is not stubbornness or bad faith, it is structural.** This is why agricultural
> price disputes are so intractable.

**The way out:** adjudicate by **S-distance from the delivered lot's coordinate to
the contracted lot's coordinate**, not by argument about whether the maize was
"good." The distance is computed from assayed attributes through a metric **neither
party chose.** And because the substrate is *entailed rather than selected*,
**you can tell the farmer and the buyer that the exchange did not pick the yardstick
in anyone's favour.** For an exchange whose business depends on being trusted by
counterparties with opposed interests, **this is the trust architecture, not a
philosophical flourish.**

Corollary that applies to the exchange itself: > "A coherent body of knowledge tends
to grow more coherent without necessarily growing closer to truth." **An exchange
that evaluates its own pricing against its own historical prices will drift
coherently away from real value. Anchor to external physical assay, not internal
price history.**

**⭐ Empty dictionary abolishes the onboarding form — the largest drop-off point.**
No user-supplied key; the farmer supplies content, the system derives the address.
**There is no "select category" step. Ever.** A farmer describes the lot in
vernacular; the encoder produces a coordinate; the coordinate is the listing. Two
farmers 400 km apart using different local names for the same variety land at nearby
coordinates and become mutually substitutable **without anyone maintaining a synonym
table.** (25/25 exact recovery from free text, across dissimilar object classes.)
And **if the description is ambiguous, `S_k` is high — which is information, not an
error, and should drive a targeted follow-up question.**

**⭐ Synthesis fragility — a MARKET-INTEGRITY requirement, not a UX nicety.**
Synthesis is reliable for strongly-structured domains, unreliable for weakly-
structured ones. **Agricultural pricing sits in between: physical attributes
(moisture, protein, kernel size, spoilage kinetics) synthesize well; market
attributes (local scarcity, political events, buyer sentiment, road closures) do
not.** ⟹ **Synthesize physical properties; retrieve market prices.**
Every price must be labelled **Observed / Retrieved (with distance) / Synthesized
(with confidence). Publishing a synthesized price as an observed one is a false
market.**

**PVE = the pre-trade compliance gate**, and its four obligations translate cleanly.
The third is the one that matters most: **address injectivity ⟹ no double-listing of
the same physical lot.** This is the fraud control that matters most in
warehouse-receipt systems — the same 30 tonnes pledged to two buyers. **Address
injectivity makes it structurally impossible rather than a detection problem.**

**⭐ Trajectory monotonicity ⟹ the exchange has NO rollback, and that is correct.**
- A cancelled trade is **not** a reversal — a new forward transition to a "cancelled"
  terminal coordinate. The original persists.
- A refund is **not** an undo — a new payment in the opposite direction with its own
  address, own verification, own audit entry.
- A re-grade after dispute is **not** an edit — a new assay at a new coordinate,
  with the original retained.

> **T6 gives the theoretical warrant for insisting on an append-only ledger with
> compensating entries, against engineers who want `UPDATE trades SET status=...`.**

**Categorical isolation ⟹ multi-tenancy.** Competing traders, rival cooperatives and
the operator coexist without leakage: each tenant's private book occupies a disjoint
coordinate region; the public book is the shared boundary. **And the anti-front-
running control falls out: a participant cannot name a coordinate, only describe
content, so they cannot probe another tenant's region by address.**

**Federation by isometry ⟹ regional exchanges interoperate by construction.** Because
the metric is forced rather than chosen, **two independently-built regional
exchanges that both derived their substrate from the same constraints are
automatically interoperable.**

**⚠️ The translator is the weakest layer, and agriculture makes it weaker.** Research
users write standard English about chemistry. Agricultural users bring **vernacular
languages, code-switching, dialect, local units (a "tin," a "debe," a "bag" of
unspecified mass), regional variety names, SMS abbreviation.** Mitigations the papers
supply: per-region LoRA probes trained on real farmer/trader corpora; a pattern-
matcher fallback for offline operation; and the architectural safety net — **a bad
translation produces a rejected or flagged operation, not a bad trade**, provided
PVE stays blocking on anything that moves money.

**⚠️ The empirical weak leg.** Flat scaling — the most commercially decisive claim
(onboard smallholders at no marginal query cost, which is the entire economic problem
of agricultural exchanges) — is validated on **boot sizes 5 through 40.**
**Validate at 10⁵–10⁷ listings before betting the architecture on it.**

---

## What to take, what to leave

**Take:**
1. **`σ_K σ_Y ≥ βτ`** — the hard trade-off between price discovery and firm
   execution, and `σ_K = σ_Y = √(βτ)` as the design point.
2. **Phase lock ⟹ batched call auctions**, discovery and execution never concurrent.
3. **Cell-disjointness as an automated listing gate** — decidable, 30/30.
4. **Weak > strong replication** — never re-inspect the same way twice.
5. **Aggregate-conserved / parts-free** as the netting law; audit at the aggregate.
6. **Backward clearing with non-physical intermediates**; only the final allocation
   must be deliverable.
7. **Three-validator circular validation**; two-party attestation is insufficient.
8. **One interface at every tier** — village to national.
9. **Fees at the aperture, not at the sort.**
10. **External geometric adjudication** for disputes.
11. **Empty dictionary** — no category dropdown, ever.
12. **Append-only ledger with compensating entries**; address injectivity kills
    double-listing.
13. **Observed / Retrieved / Synthesized labelling** on every published price.
14. **Dimensional typing** on the contract schema.

**Leave:**
- The zero-cost thermodynamics of `os-system.tex` (contradicts T0 and the exchange's
  whole reason to exist).
- Point-convergent partition refinement (contradicts T2/T3).
- The PSS "nearest-to-completion priority" scheduler — **no starvation control at
  all in the later version.** An exchange needs **strict price-time priority**;
  nearest-to-completion is a *fairness* violation and likely a regulatory one.
- The OS as a substrate. Run on conventional, auditable infrastructure.
- Any claim of sub-linear performance for genuinely combinatorial routing
  (`C_hard`), or for multi-stakeholder negotiation and arbitration — **excluded by
  the papers' own scope conditions.** Route those to humans.

Links: [[00-framing]] · [[01-foundation-contact-graphs]] · [[04-corpus-map]] · [[09-epistemology-agents]]
