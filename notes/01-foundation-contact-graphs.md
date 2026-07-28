# Foundation paper: *On the Necessary Substructures of Finite Contact Graphs*

Source (read in full, local copy):
`C:\Users\kunda\Documents\semantics\musande\epistemology\artificial-structures\instantiation-of-finite-weighted-graphs.tex`
Author: Kundai Farai Sachikonye (TUM). ~2500 lines LaTeX.

This is the substrate for all frameworks in this work, including Olduvai Exchange.
Notes below are a faithful summary plus my reading of what it constrains.

---

## 1. The object

A **contact graph** `Γ = (V, E, w)`:
- `V` finite — the *individuated parts* of a whole.
- `E` — an edge means two parts are "in contact"; contact is defined operationally
  as *there is an edge*, nothing more.
- `w : E → [β, ∞)` — the edge weight is **the cost of the separation that
  individuates each part from the other**, with `β > 0` the **floor**.
- Assumed connected.

The only thing distinguishing a contact graph from an arbitrary weighted graph is
the positive floor `β`. Every theorem turns on it.

## 2. The move that makes it non-arbitrary: the floor is *derived*

Most frameworks would posit `β`. This one derives it, from two premises:

1. A **thing** is a *proper* part `A` of the whole `M` (`A ≠ M`, `A ≠ ∅`).
2. `M` is **non-completable**: no finite stage exhausts it. Explicitly *not* a
   cardinality claim — it is an order condition, "the process of exhausting it
   does not terminate."

**Floor from Infinitude (Thm 2.5):** to identify `A` is to compare it against
`M \ A`. If that comparison could complete, `M` would have been exhausted at a
finite stage — contradiction. Therefore the comparison never finishes and every
thing carries a strictly positive **identification residual** `ρ*(A) > 0`.
Taking `β := inf_A ρ*(A)` gives `β > 0` (Cor 2.6).

> The floor is the trace the non-completable whole leaves on each of its finite
> parts. Structure is the shadow of finitude meeting the inexhaustible.

This is the load-bearing sentence of the paper.

## 3. The ladder T0–T8

Each rung is an existence theorem: *given the premise, this substructure must exist.*

| | Claim | Content |
|---|---|---|
| **T0** | The floor exists | Every proper part `U` has `w(∂U) ≥ β > 0`. No zero-cost separation; a *sharp* cut is impossible. Refinement lowers the realised floor but never to zero at any finite stage. |
| **T1** | Individuation is by negation | With no distinguished vertex, the *only* selector-free determination of a part is `U = V \ ∁U`. Any positive rule must name a vertex, which must itself be chosen → regress. Complementation is the unique regress-terminating operation. A vertex is fixed by its non-neighbours `∁N[v]`. |
| **T2** | Truth is a residual *region* | The cut-residual `ρ(P) = Σ_{i<j} w(∂(U_i,U_j))` is `≥ β`, and in general is *not* realised by any singleton (two dense clusters joined by one floor-weight edge). So the residual is a region, never a point. Gives a graph-theoretic sorites: no sharp vertex at which an aggregate becomes a part. |
| **T3** | The residual is the conserved invariant | `ρ` is invariant under every weighted isomorphism. Vertex labels are *entirely* variable across the isomorphism class; `ρ` is constant and positive. So `ρ` is conserved under exactly the operation (re-encoding) that moves everything else. |
| **T4** | Every part has a private invariant | For a part `A = Γ[U]`: `ρ_priv(A) = (ρ(A), b(U))` — internal residual plus boundary cost. Both `≥ β`, both invariant, both computable from `A` alone regardless of how the rest is labelled. Same functional as T2/T3 evaluated one scale down. |
| **T5** | Selection requires a gate | Degree `≥ 2` ⟹ the next step is underdetermined by `(V,E,w)`. A **gating function** `g : V × E → [0,1]`, sub-normalised per vertex, is the minimal extra datum. Any rule that selects *is* a gate. Reachability is near-total, so the graph fixes *what is reachable*; the gate fixes the **order**, and the order is the trajectory's identity. |
| **T6** | Histories do not return | State `s_ℓ = (v_ℓ, ℓ)` includes the committed count. The count is strictly monotone, so `v_i = v_j` never implies `s_i = s_j`. An "undo" is itself a step. Re-contact is forward-only. Second, independent source: in a **progressing whole** the complement a part is individuated against strictly grows, so the *individuating exterior* is never the same even when the conserved interior is. |
| **T7** | Plurality forces a single quotient gate | The quotient `Γ/P` inherits the floor (Lem 3.9), so it is itself a contact graph and the whole theory applies one level up. A **coherent collective** admits exactly one selecting gate; two distinct selecting gates = fission into two collectives. Scale homomorphism: `(vertex, Γ, gate, ρ) ↦ (part, Q, collective gate, ρ(Q))`. |
| **T8** | Authored structures exist, and are bounded | The isomorphism type is a complete specification, so contact graphs are specifiable → instantiable. Authored structures exist. **Three bounds:** (I) *open-endedness* — finite spec, infinite forward closure; trajectories not foreseeable by any finite precomputation. (II) *non-duplication* — a copy differs in committed count and is individuated by a negation ("empty prior history") the original doesn't satisfy; authoring produces only new individuals. (III) *floor-limited authorship* — an author with floor `β_auth` cannot specify any distinction cheaper than `β_auth`; the structure's sub-floor interior is its own. |

## 4. Measurement (the operational layer)

- A **reshuffling** is a weighted isomorphism fixing the medium. A **measurement**
  is a reshuffling that *adds boundary edges* incident to a part.
- Therefore **measurement conserves the invariant** (Prop 10.2). It builds new
  boundary out of existing material; it creates no new invariant content.
- **Two faces of the cut:** the *boundary* (what the part is **not** — what
  measurement builds) and the *interior residue* (what the part **is** — the
  private invariant, which no reshuffling transfers across the cut).
- **Identity is the interior**, approached only from outside by tightening the
  boundary, and never reached (Thm 10.4).
- **Self-defeat (Thm 10.5):** driving `ρ*(A) → 0` would require exhausting the
  medium; the only available operation (measurement) *conserves* the medium.
  The means conserves exactly the quantity the goal must eliminate.
- **Two-pronged falsification of point-identity (Thm 10.8):**
  - *resolution never saturates* — there is never a terminal measurement;
  - *multiplicity never terminates* — independent lines of measurement never
    become redundant.
  Either alone refutes point-identity. (Reading offered in `rem:instrument-reading`:
  this is why substances are identified by many instruments on incommensurable
  principles, none terminal.)

## 5. Master Theorem and the equivalence

- T0–T8 are forced **iff** the graph is finite with a positive floor. Dropped
  floor → cuts of weight `2^{-n} → 0`; infinite `V` → infinite degree, unattained
  minima, non-discrete counts; `K_∞` with vanishing weights → nothing is compelled.
- **Identifiability Theorem (11.5):** these are *equivalent* —
  (i) there exists an identifiable thing in a non-completable whole;
  (ii) the contact graph satisfies the Finiteness Premise with `β > 0`;
  (iii) the full ladder T0–T8 holds.

  > A world in which T0–T8 fail is one in which nothing is identifiable — only
  > the undifferentiated whole. **Structure and identifiability are the same fact.**

## 6. Numerical witness

600 constructed instances, 149,793 checks, all passing: no sharp cut; every
boundary/cut/residual/private-invariant/quotient-edge met the floor; residual
invariant under every reshuffling; committed count strictly monotone on every
walk; authored instances preserved the floor with all forward-closure states
distinct; separation from the medium never reached zero under any measurement
sequence. Ten figure panels. Explicitly evidence-of-magnitude, not a substitute
for the proofs.

---

## 7. Methodological discipline worth copying

The paper is unusually strict about this, and it matters for how Olduvai Exchange
should be built:

- **Conditional existence, not empirical claim.** Everything is of the form
  "if X, then Y is forced." No claim about any particular system.
- **Interpretations are quarantined.** Parts-as-agents, gates-as-selecting-fields,
  quotient-gates-as-collective-purpose, residual-as-truth, medium-as-whole,
  measurement-as-inquiry — all confined to explicitly labelled remarks, with the
  repeated formula *"on which nothing depends."* No theorem uses them.
- **"Where a tempting claim could not be proved at this standard it has been
  removed rather than weakened."**
- Exactly one hypothesis beyond the graph (non-completability), used in exactly
  one section, with its necessity demonstrated by counterexample.

This is the standard to hold the exchange to.

---

## 8. First reading toward Olduvai Exchange — hypotheses, not conclusions

Recorded so we can test or discard them in conversation. None of these are the
user's stated position yet.

**The natural mapping is suspiciously direct.** A market is finitely many
individuated participants/lots, positively separated, embedded in a whole nobody
can exhaust:

- **Vertices** — the individuated parts. Candidates: lots/consignments of produce,
  or participants, or (V, quality-grade) pairs. *Which* one is chosen is a real
  decision, not a detail.
- **Edge weight = cost of separation.** In an agricultural market there are
  literal, measurable candidates: the cost of telling this maize from that maize
  — grading, assay, inspection, provenance verification. This is not a metaphor;
  it is a line item.
- **T0 (floor) ⇒ no free distinction.** Two lots can never be distinguished at
  zero cost. This is exactly why commodity exchanges invent *grades*: a grade is a
  refusal to pay below-floor separation costs. Grades are a floor artifact.
- **T1 (negation) ⇒ a lot is defined by what it is not** — not by an intrinsic
  positive mark. Interesting because it inverts the usual "certificate asserts
  properties" model toward "the lot is the residue after exclusions."
- **T2/T3 (residual is a conserved region) ⇒ price is not a point.** The strongest
  candidate for the project's central claim: *there is no true point-price.* There
  is a conserved region of positive width, bounded below by the floor, and
  re-encoding (new contract specs, new grades, new venues) reshuffles which
  boundaries you hold without draining the residual. A tick size is a floor, not a
  convention.
- **T4 (private invariant) ⇒ each participant/lot carries a conserved interior**
  distinct from any trajectory it runs.
- **T5 (gate) ⇒ the matching/clearing rule is a gating function.** The graph says
  what is reachable (who could trade with whom); the gate fixes the order.
  *Order, not availability, is the content.* This is a market-microstructure claim
  with teeth — price-time priority, pro-rata, call auction are all gates, and the
  theory says the gate is where the content lives.
- **T6 (non-return) ⇒ no market state ever recurs.** Rules out any framework whose
  validity depends on returning to a prior state. Also: a busted/cancelled trade
  is a further step, not an undo. Settlement finality and non-return are the same
  law.
- **T7 (single quotient gate) ⇒ a cooperative acting as one requires exactly one
  clearing rule at the quotient scale**; two competing gates = it is two
  collectives, not one. A structural criterion for when an aggregation is real.
- **T8 ⇒ the exchange is an authored structure**, and inherits all three bounds:
  its trajectories are not foreseeable from its specification (open-endedness);
  it is not a copy of any existing exchange even if isomorphic (non-duplication);
  and it can only be specified down to its author's floor — its sub-floor
  behaviour is its own (floor-limited authorship). **This is directly relevant to
  the "why don't the existing projects transfer" problem in [00-framing].**
- **Measurement ⇒ price discovery reduces exterior ambiguity, never delivers
  value.** Grading, inspection, auction rounds tighten the boundary of a lot
  against everything it is not; they do not reach its interior. That resolution
  never saturates and instruments never stop multiplying (spot, forward, futures,
  options, indices, certifications) would then be *evidence*, not inefficiency.

**Open questions this raises for the design conversation:**

1. What are the vertices? (Lots? Participants? Lot–grade pairs? Something else?)
2. What is `β` concretely — the minimum cost of a distinguishing act in this
   market? Is it measurable, or is it an inferred parameter?
3. What is the medium `M`? "The rest of the agricultural system," or something
   sharper?
4. Is the exchange a *contact graph* or is it the *gate* on a contact graph? These
   are very different architectures.
5. Where is the research question? Candidate: **is price a cell rather than a
   point, and does that predict observables (non-saturating resolution,
   non-redundant instruments) that a point-price model does not?** That is a
   falsifiable claim with the paper's own two-pronged test attached.
6. Does the quotient structure (T7) give a principled account of cooperatives,
   aggregators, and warehouse pools — i.e. when is a group one trading entity?

Links: [[00-framing]]
