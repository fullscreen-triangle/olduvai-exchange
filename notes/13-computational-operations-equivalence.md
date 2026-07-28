# Paper: *Computational Operations Equivalence*
### A Single-Quantity Bookkeeping Framework for Kernel Operations

Source: `architecture/buhera/long-grass/docs/computational-operations-equivalence/` (830 lines,
self-contained, read in full)

---

## 1. Thesis — and what "equivalence" actually means here

⚠️ **Not categorical equivalence, not isomorphism, not bisimulation.** It is
**unit-conversion identity of a single scalar** — numbered equality of natural
numbers mediated by one architectural constant.

> "every operation in an operating-system kernel admits characterisation by a single
> dimensionless invariant `Q ∈ ℕ`, the operation's **computational weight**, from
> which all of its standard accounting properties follow as **unit conversions**."

**What is proved equivalent** — not algorithms, but:
- **Three measurement routes** to one number: Residue (count dispatch decisions) /
  Confinement (address-space cell occupation) / Negation fixed point (count survival
  iterations). `Q_I = Q_II = Q_III =: Q`, **exact integer equality**.
- **Four accounting properties** (weight, duration, identity, count) related by the
  reference frequency `f` alone.
- **A biconditional:** reproducibility ⟺ decision-count irreversibility.

> "The relation `t = M/f` is **not a measurement equation but an operational
> definition**: time as experienced by the kernel is the accumulated count of
> scheduling decisions divided by the reference frequency. **Wall-clock time and
> decision count are different units of the same underlying quantity.**"

Three axioms only: **bounded scheduling capacity** (finite `f_max`, finite class
count `N`), **decision distinguishability** (binary), **finite decision lag**
(`τ_p > 0` strictly).

## 2. Core results

**Time-Count Identity:** `dM/dt = f` exactly, no rounding. Every procedure for
measuring elapsed time "reduces to counting cycles of some reference oscillator."
The continuous formalism is the `f → ∞` limit — "a useful idealisation but **should
not be confused with a description of how kernel time exists physically.**"

**Two modes:** *keeping* time (generating transitions — an **active physical
process**) vs *telling* time (reading a frozen record — a **passive read**). Both
yield the same number from different substrates.

**Invariance:** switching reference frequency reprices elapsed time as `M/f₂` but
**`M` is preserved.**

**⭐ Three-Route Equivalence** — the core operational theorem, with a genuinely
useful corollary: **the consistency check is decidable in linear time per
operation.**
> "the kernel can compute `Q` three ways… and all three should agree. **Disagreement
> signals a kernel-internal inconsistency** — e.g. a decision was made but the
> corresponding cell was not allocated, or a negation iteration occurred without a
> dispatch event."

**Identity as fixed point:** an operation's identity is **what survives the
elimination of alternatives** — the negation operator `N_t` returns the survivor and
`⊥` for the rest.

**MTIC:** `t = Q/f`, `M = Q`, `Id = NegationFixedPoint(o, depth=Q)`, `Q` invariant
under measurement choice. ⟹ **Single-field accounting: one integer per operation.**

**⭐⭐ Sliding-Endpoint Theorem: reproducible ⟺ decision count irreversible.**
And **Rewind-as-Forward:** any operation purporting to reverse another **is itself a
forward operation incrementing the count.**
> "A kernel's decision log grows monotonically **by structural force**: every kernel
> operation, **including rollback operations, appends to the log.** The log cannot be
> truncated by any kernel operation; it can only be compacted by an **external
> (non-kernel) operation** that operates on the log as data."
> "Rollback is **not the inverse** of forward execution; it is a separate forward
> operation that records the rollback **alongside** the original. The log retains the
> full history."
> "A kernel that wants to be reproducible must accept the operational cost of growing
> its decision count; conversely, **any kernel that grows its decision count gets
> reproducibility for free.**"

**Source-Analyzer Indeterminacy:** two operations producing the same output have an
**internal cascade chain that is not recoverable from the output alone.**
⟹ **Substitutability is decidable: compare fixed-point values at the API boundary.**

**Cell-stability:** an interface is closed under additive evolution **iff** every new
operation is **cell-disjoint** from existing ones.

## 3. T0–T8 mapping

Never cites the ladder — written as standalone CS "provable from three axioms" — but
the mapping is exact.

- **T0** — **Axiom 3 IS the floor**: `τ_p > 0` strictly, the minimum time to
  distinguish two decision classes. Plus `K_conf` = inverse of the smallest
  addressable cell; `L=1` costs the maximum. **You cannot localise below one cell.**
- **T1** — the negation operator, literally. Identity is what survives elimination.
- **T2/T3** — the "residue" is the conserved quantity; Route II makes it **regional**
  (`L ≥ 1` forbids point-collapse); conservation appears as additivity.
- **T4** — `Q` is exactly the private invariant: one integer, invariant under
  measurement choice *and* under oscillator reparametrisation.
- **T5** — `N_t` is the gate; candidates compete, one survivor.
- **⭐ T6 — the paper's centrepiece, and it adds something the ladder does not: the
  CONVERSE.** Monotonicity is not merely necessary for reproducibility — **it is
  sufficient.**
- **T7** — many distinct cascade chains quotient to one fixed-point cell at the API
  boundary; **cell-disjointness is precisely the requirement that the quotient map be
  well-defined.** Cell collision = failure of the quotient.
- **T8** — finite `f_max`, finite class count, `Q ≤ f·t`.

**vs Triple Equivalence:** structurally parallel, **weaker in type.** Triple
Equivalence is *categorical* equivalence under explicit functors; this is *numerical*
equality of three instrument readings with **no functors constructed.** But the
skeleton is shared: Route I ↔ partition, Route II ↔ categorical addressing, Route III
↔ oscillatory. And **the `M` here is the operational definition of the `M` that
Triple Equivalence multiplies by `k_B ln n`.** Effectively the dimensionless,
`k_B`-free kernel-side shadow of the same structure.

**vs recognition/search identity — this paper supplies the missing side condition.**
Source-Analyzer Indeterminacy is the *failure boundary*: given the output you recover
the fixed-point cell (decoder direction works) but **not** the cascade chain (search
direction underdetermines). **Cell-disjointness is exactly the condition under which
the fibre map becomes single-valued and recognition/search become genuinely inverse.**

**vs mode–methodology equivalence:** Routes I/II/III are three *different observers*
applied through three *different procedures*, yielding one number — the
interchangeability specialised to kernel measurement.

## 4. ⚠️ Validation — read with care

**§17 is titled "Validation PROGRAMME" and is prospective** — "We outline a
fifteen-experiment validation programme." **No validation source code, no JSON
results, no test harness exists anywhere in the repo.** Every number below is
**caption-asserted only.**

Reported: 50 trials time-count (**max relative error 4.01e-7** — note this is *not*
the paper's own stated 1e-15 machine-precision criterion; a looser 1e-3 tolerance was
applied); 30 trials per route all exactly on identity; **maximum pairwise
disagreement exactly 0** across 50; 1000 reproducibility runs, zero divergence;
30/30 rollbacks strictly increase `M`; 1000-op mixed workload, every increment
non-negative, `M_final = 4980`; **50/50 cell-collision classification, zero false
positives, zero false negatives**; 40 cross-architecture trials across `f` spanning
more than a decade (5e5 to 1e7 Hz), zero recovery errors.

⚠️ **And: none tests the framework against a real kernel.** The instruments are
synthetic and constructed to satisfy the framework.

## 5. Limitations — unusually candid

Five named open questions: **multi-tenant** (single `f` assumed); **real-time**
(hard deadlines need augmentation); **⚠️ distributed** (`f` node-local, equivalence
becomes node-relative, **cross-node needs frequency synchronisation — not supplied**);
**⚠️ adversarial workloads** ("workloads designed to inflate `Q` relative to actual
cost could trigger the framework's accounting to mispredict"); **heterogeneous cores**.

Plus: `Q = f·t` **needs the equality case of Prop 6.3** — one decision per oscillator
cycle. A significant hidden saturation assumption. And the monotonicity guarantee is
scoped to *kernel-internal* operations only.

⚠️ **Two proof weaknesses worth recording:** the `Q_I = Q_II` step is close to
circular — `Q_II` is *inversely* proportional to `L` by definition while `Q_I` counts
cells touched (*proportional* to `L`); the identification only coheres if `L` is read
as cell *size* rather than cell *count*, which contradicts the stated definition.
And the Sliding-Endpoint (⟹) direction establishes only that residues are
non-negative *by definition* — closer to definitional than substantive.

Also: several figure captions reference labels that **do not exist in the body**,
including `thm:cross-arch` — cross-architecture invariance is asserted in a caption
and in validation item V15 but **is never a theorem.**

---

## 6. ⭐ Implications for Olduvai

Map the vocabulary once and the paper becomes an exchange spec. **The exchange IS the
kernel:** operations = order placement, amendment, cancellation, match, allocation,
grade assignment, delivery confirmation, settlement, dispute, reversal.
`f` = the sequencer rate. `M` = the global sequence number.

### 6.1 One integer per order — kill the multi-field order record
Do **not** store `created_at`, `matched_at`, `latency_ms`, `priority_score`,
`audit_seq` as independent columns — every one is a read-time division of `Q` by `f`.
**Order control block = `{op_id, class, Q}`. Everything else is a view.**
> This eliminates the classic exchange bug of a timestamp column disagreeing with a
> sequence column after failover — **they cannot disagree if only one is stored.**

### 6.2 ⭐ The sequencer tick is market-microstructure POLICY, not a hardware detail
`f` simultaneously sets: the finest distinguishable price/time priority granularity
(**two orders inside one `τ_p = 1/f` window are categorically indistinguishable — you
literally cannot break the tie fairly**); the latency floor a co-located trader can
exploit; the resolution of every SLA and regulatory timestamp.

**Changing `f` later is safe** — elapsed times reprice, **but `M` is preserved**, so
the audit history survives a sequencer upgrade intact.

**For produce specifically:** agricultural markets are slow relative to equities.
Choosing `f` far above the true rate of distinguishable events buys nothing and costs
storage. **Pick `f` near the true decision rate; document `1/f` as the
fairness-tie-break floor and disclose it to participants.**

### 6.3 ⭐⭐ Cancels, amendments, and busted trades are FORWARD operations
- A **cancel** does not remove the order — it appends with its own `Q ≥ 1`.
- An **amend** is delete-plus-insert, both appended.
- A **trade bust** (common in produce when a lot fails post-match inspection) does not
  un-happen the trade. **It sits in the log beside the original.**
- **Settlement reversal** on failed delivery: same.

**⟹ Never implement log truncation as an exchange operation.** Compaction/archival
must be an out-of-band service with separate credentials and its own audit trail.
*This aligns exactly with what grain-board and warehouse-receipt regulators demand:
a tamper-evident append-only record where **the correction is visible next to the
error.***

### 6.4 ⭐ Determinism and the audit log are ONE feature — budget once
Deterministic replay (regulatory session reconstruction, dispute adjudication —
*"what would have matched if this order had arrived 3ms earlier"* — crash recovery by
re-running the input log) comes **automatically** from the append-only monotone
sequencer. **No separate determinism mechanism needed.**

Conversely: **the moment anything can decrement or rewrite `M` — a manual DBA
correction, a "fix the sequence number" hotfix, a partition-merge that reorders —
replay determinism is dead.**

**⟹ The sequence number is a hardware-grade invariant. No admin path, no migration
script, no operator tool may write to it. Treat an unexpected decrement as a
halt-the-market condition, not a warning.**

### 6.5 ⭐ Three-book reconciliation — a formally justified fraud/bug detector
The three routes become three independent books:
- **Route I (residue)** = **matching-engine event count** — how many match decisions
  this order participated in.
- **Route II (confinement)** = **inventory/position ledger** — how many warehouse-lot
  cells, silo bins, grade-buckets, delivery-slot cells this order touched.
  *`K_conf` = inverse of the smallest tradable lot = the minimum contract unit. A
  single-lot order pays maximum per-unit confinement cost — **economically correct,
  since odd-lot and single-bin produce orders are the expensive ones to handle.***
- **Route III (negation fixed point)** = **order-lifecycle state machine** — how many
  matching cycles this order survived without cancel, expiry, credit rejection, or
  quality-grade knockout.

**⟹ If the three disagree, you know WHAT CLASS of wrong:**
- **Match with no inventory movement** = phantom fill or lost warehouse-receipt update.
- **Inventory movement with no match** = unauthorised allocation or settlement leak.
- **Survived lifecycle iteration with no dispatch event** = a stuck order the engine
  thinks is live but never considers.

Run as EOD batch invariant + staging hot-path assertion; disable the per-decision
version in production. **A formally justified three-book reconciliation instead of
the usual ad-hoc two-book comparison.**

### 6.6 ⭐⭐ Cell-disjointness as the listing admission rule — the sharpest result
**A new contract, grade, or delivery location may be listed iff it is cell-disjoint
from every existing listing.** Real and frequently-violated in produce:
- "White Maize Grade A, Lusaka, Nov delivery" vs "Maize #1, Lusaka, November" — if an
  incoming order routes ambiguously to either, that is a collision, and **you cannot
  recover which one the trader meant from the output alone.**
- **Overlapping grade bands** (Grade A = protein ≥11.5%, Premium = ≥11.0%) create a
  collision zone for any lot at 11.7%.
- Two delivery hubs with overlapping catchment polygons.
- A spot contract and a nearest-month forward settling to the same physical delivery
  on the same date.

**⟹ The listing protocol runs a cell-disjointness check as a hard gate**, rejecting
collisions with a diagnostic naming the colliding cell. (50/50 perfect
classification.)

**The payoff is cell-stability: because admission enforces disjointness, you can add
new produce contracts, grades, and locations forever without invalidating existing
ones — an exchange that grows by pure addition, never by breaking-change migration.
For an agricultural exchange that must add crops seasonally and grades as standards
evolve, this is the single most valuable architectural property in the paper.**

*Converges exactly with the cell-disjointness result in [[10-buhera-subtree]] and the
grade-taxonomy rule in [[09-epistemology-agents]] — three independent derivations of
the same listing gate.*

### 6.7 Matcher swaps — good news and a warning
**Good:** re-implement, optimise, or shard the matcher freely; validate by output
comparison alone. Ship in shadow mode, compare fixed-point outputs, cut over when
they agree.

**⚠️ Warning:** because the chain is **not** recoverable from the output,
**participants and regulators cannot audit the matching logic from fills alone.** If
your market requires demonstrable fairness — and agricultural exchanges with
smallholder participation usually do, politically — **you must publish the chain
separately or log it explicitly. Do not treat indeterminacy as a transparency
feature.**

### 6.8 `Q` as the billable unit — but not the priority unit
A fee schedule denominated in `Q` is simultaneously latency-based, message-based, and
resource-based — no reconciliation between fee models. Route II gives the
physically-meaningful produce version: **fee ∝ `K_conf/L` means small-lot orders bill
more per unit**, which is right, since odd lots impose the real handling cost.

**⚠️ But heed the adversarial caveat.** Quote stuffing, rapid amend/cancel cycles, and
order-splitting all inflate decision count. **If `Q` is billable, that self-corrects
(the spammer pays). If `Q` drives capacity allocation or priority, it is exploitable.
⟹ Bill on `Q`; do not prioritise on `Q`.**

### 6.9 ⚠️ Multi-region is an unsolved dependency, not a solved one
A produce exchange spanning regional floors, warehouse nodes, or country instances
has **node-local `f`**, and the equivalence becomes **node-relative**. Cross-node
operations (a Lusaka order matching a Ndola lot) require **frequency
synchronisation, which the paper does not supply.** Multi-tenant per-broker
priorities need per-tenant `fᵢ` with care at cross-tenant boundaries — **which is
every trade.**

**⟹ One authoritative sequencer per matching domain. Do not distribute the counter.
If you must federate, the inter-domain reconciliation protocol is YOUR engineering
risk, not a solved dependency.**

### 6.10 Build checklist
1. `{op_id, class, Q}` per operation; one `f` per matching domain, versioned, build-time.
2. Global monotone sequencer; no write path decrements; decrement ⟹ halt.
3. Append-only ledger; cancel/amend/bust/reversal all append; archival external.
4. Listing admission gate on cell-disjointness across contract × grade × location ×
   window.
5. Three-book reconciliation (match events / inventory cells / lifecycle survival).
6. Determinism by replay — **one feature with the audit log, not two.**
7. Matcher swaps validated by output equality in shadow mode; **matching logic
   published separately for fairness audit.**
8. Fees on `Q`; **priority not on `Q`.**
9. `f` near the true event rate; disclose `1/f` as the tie-break floor.

**The single sentence that most changes exchange design: a rollback is a forward
operation.** Build the ledger, the fee model, the reconciliation, and the regulatory
story around that and the rest falls out.

Links: [[00-framing]] · [[10-buhera-subtree]] · [[11-synthesis]] · [[12-irreducible-bounded-phase-space]]
