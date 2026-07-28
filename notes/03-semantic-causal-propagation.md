# Paper 3: *Semantic Causal Propagation*
### An Individuation-Theoretic Calculus of Boundary-Free Search, and a DSL for Accountable Research Projects

Source (read in full): `C:\Users\kunda\Documents\semantics\graffiti\docs\publications\semantic-causal-propagation\semantic-causal-propagation.tex`
(2395 lines; `.pdf`, `figures/`, `validation/`)

**Position in the stack.** Third paper read. Same author, same floor, same ladder —
but this one is *constructive*: it goes all the way from the premise to a
specified executable language (**Graffiti**, `.grf`) with grammar, type system,
operational semantics, and proved scheduler guarantees. It is declared
self-contained (no companion manuscript assumed), so it re-derives the floor
rather than citing [[01-foundation-contact-graphs]].

**Note:** this is *not* the `sachikonye2025knowledge` paper cited by
[[02-coordinate-theory-of-advertising]] — no four-mode taxonomy, no bridge
theorem, no specification-slack theorem numbered 5.4. Still outstanding.

---

## 1. Setup — and one structural commitment worth noting

**Contact graph** here has a distinguished **medium vertex `m`** adjacent to
every other vertex. Non-medium vertices are **claims** (a fact, a document, an
entity, a value). `m` = "the undifferentiated totality of everything not yet
individuated."

**Separation cost** `σ(v)` = min weight of a cut placing `v` on one side and the
medium on the other. Exactly computable by max-flow.

> **No boundary between local and remote.** The definition draws *no distinction*
> between a claim on the querying machine and one on a remote server — before
> individuation both are contents of `m`. Deliberate: locality is not what makes
> a claim distinguishable; **cost of individuation is**. "The graph never encodes
> a location, only a cost."

**Non-completability** here is an *expanding family* `Γ₀ ⊆ Γ₁ ⊆ …` with no
terminal stage. For search: for any finite state there is always another
document, database, model, cross-reference not yet consulted. *"The absence of a
boundary is exactly the absence of a terminal stage."*

**Floor from non-completability** → `ρ(v) > 0` → `β := inf_v ρ(v) > 0`, and
`σ(v) ≥ β` for every claim. Third independent derivation of the same constant.

**Cor — no sharp result:** a search that appears to answer "exactly" has in fact
resolved to a region of width `≥ β`. And the framing matters: *this is a fact
about the medium, not a defect of the search process.* An ideal instrument could
not do better.

## 2. The recognition/search identity

The unifying premise. **Decoder** `Dec : Q → V` sends a query to the claim it
individuates. **Projector** `Ξ(v) := Dec⁻¹({v})` — the queries that decode to it.

**Thm:** `Dec(q) = v ⟺ q ∈ Ξ(v)`. Recognition and search are **inverse readings
of one relation**, not analogous procedures. `Ξ` is literally the fibre structure
of `Dec`; on a finite domain each determines the other.

> A search engine and a classifier are the same computational object queried in
> opposite directions.

This licenses **one language primitive** for both.

## 3. Representation mobility — paraphrase is free

A **representation** of claim `v` at dimension `N` is a tuple `(s₁,…,s_N)`
satisfying only an **averaging constraint** `(1/N)Σsⱼ = a(v,x*)`. Components are
otherwise *unconstrained in `R`* — a component may lie outside `(0,1]`.

**Thm — representation mobility:**
(i) the fibre is non-empty and **infinite** for `N ≥ 2` (an affine hyperplane);
(ii) switching representations **commits no new contact edge and leaves the
committed step count unchanged**;
(iii) any downstream computation depending on `v` only through the average is
invariant.

*Stash example:* "Peter" / "a Harvard medical student" / "a specialist in the
anatomical processes of diseased human physiology, training at an institution of
higher learning in Boston" are three representations of one claim. Producing the
third having established the first **commits no new search**.

**Thm — receiver-relative decoding is not error.** Two decoders over different
graphs may resolve the same query to different claims, both individuating at
their own floor, **neither in error**. "A ten-year-old and a physician are both
right" — there is *no third, privileged decoding of which both are approximations.*

Empirically: 90.4% of sampled components were "off-shell" (outside `(0,1]`), and
the fraction rises with dimension — representational freedom is the typical case,
not an edge case.

## 4. Path opacity — the result I did not expect

**Thm — convergence admissibility.** A propagation is admissible **iff** it
terminates at the target. Interior claims are **entirely unconstrained** — an
interior claim may look *maximally unrelated* to the eventual target without
rendering the walk inadmissible. **Inadmissibility arises exclusively from
failure to reach the target, never from local misalignment along the way.**

**Thm — path opacity.** No invariant computed from seed and target alone
distinguishes two propagations differing only in interior. *The interior of a
search trajectory is unobservable from its result.*

**Cor — the admissible set is a class, not a path.** A search's deliverable is
properly the *equivalence class*, not a single distinguished trajectory.

> A multi-stage search may pass through an intermediate result that looks
> unrelated, contradictory, or simply poor, and **this is not by itself evidence
> anything went wrong.** Evidence of failure is non-convergence — never the
> appearance of any single intermediate step.

Verified: 46 interior-permutation variants, endpoint invariants identical to
floating-point precision.

## 5. Catalysis — same algebra as paper 2

A **catalyst** is a partial map `V → V` realising a contact operation: a search
query, a local scan, a database lookup, **an inference from a trained model**.

- **Catalytic power** `κ ∈ [0,1]` = fraction of above-floor alignment closed.
- **Multiplicative law:** `κ(γ₁ ⋯ γₙ) = 1 − ∏(1−κᵢ)`. Identical to paper 2.
- **Diminishing returns**, **saturation dichotomy** (`Σκᵢ = ∞`, Borel–Cantelli).
- **Design consequence:** *diversify catalysts, do not repeat them.* A chain of
  near-duplicate invocations of one source accrues power slowly and may fail to
  saturate even in principle. This is checked **statically by the type checker**.

**Coherence requires a triangle** — same theorem, stated for evidence rather than
advert elements: linear support fails (terminal catalyst unsupported); 1-cycles
vacuous; 2-cycles fail the `θ > ½` majority condition ("two catalysts cannot
outvote their own mutual disagreement"); **≥ 3 mutually supporting, independently
sourced catalysts** required to ground a claim robustly against revision by a
single dissenting source. Ordinally decidable from signs alone.

## 6. ⭐ Closure — the paper's central operational contribution

**Definition.** A search is **closed** when, for every available-but-not-yet-invoked
catalyst, extending the search by it **cannot add a new equivalence class** to the
reachable target set. Every further admissible propagation lands in a class
already reached.

**Thm — closure is strictly stronger than a confidence threshold.** Construction:
two disjoint internally-dense claim clusters `A`, `B`, each connected to the
medium by one catalyst. A propagation via `γ_A` alone satisfies *any* fixed
confidence threshold trivially — yet `γ_B`, uninvoked, reaches a claim in a
distinct class. **High confidence, not closed.**

> A single early source may report high confidence purely because it is
> **internally self-consistent**, while a second independent source would reach
> an entirely different conclusion. Closure is not that the current path looks
> confident, but that **the space of paths has stopped producing new destinations.**

**Thm — convergent closure or honest decline.** Every search over a finite
catalyst registry terminates in exactly one of two states:
1. **Convergent closure** — one equivalence class; report its representative.
2. **Contested closure** — stabilised but **more than one class**; report
   **decline**: no single sufficient claim exists, together with the distinct
   classes found.

> **Decline is not failure.** A runtime must be able to report "the sources
> disagree" as a *first-class, correctly-terminating outcome*, rather than either
> looping or silently emitting one contested class as if it were unique.
> **Contested closure is itself useful research output: it identifies precisely
> where independent inquiry diverges.**

## 7. Graffiti — the calculus as an executable language

One primitive, `seek`, with four clauses, each the syntactic image of a theorem:

```grf
seek <name>
  not     { <boundary> }     -- the negation set (individuation by negation)
  toward  { <region> }       -- the target claim x*
  via     { <chain> }        -- optional explicit catalyst chain (>> seq, || par)
  until   converge [otherwise decline]   -- closure, not confidence
  yield   <ident>
```

Design principles, each theorem-backed:
1. **Exclusion is mandatory** — a `seek` with no `not` clause is **rejected at
   parse time**. An expression asserting no exclusion asserts no individuation.
2. **Projects are graphs, not scripts** — a DAG of `seek` bindings.
3. **Closure, not confidence, is the default stopping rule.** A script may opt
   into a weaker threshold *explicitly*.
4. **Decline is a value, not an exception.**

**Types:** `Claim`, `Region`, `Catalyst`, `Chain`, `Residue`. Every `Claim`
carries a floor annotation `β(v) > 0` and residue `ρ(v) ≥ β(v)`.

- **Thm — no zero-residue claim.** There is *no well-typed Graffiti expression of
  residue 0*. The floor is enforced by the type system.
- **Coherence rule** — a `seek` with explicit chain and `until converge`
  type-checks only if the support graph has a ≥3-cycle. Emits a
  `CoherenceWarning` (not a hard error) because a weaker `cond` may be
  deliberately chosen — *"provided this is not silently mistaken for full closure."*
- **Type soundness** by progress and preservation. Non-standard element: reduction
  is state-mutating, but preservation holds because the committed count is monotone.

**Monotonicity of the committed record** — T6 again, now as an operational
theorem: re-evaluating an already-bound `seek` is **a new committed step at
strictly higher count, never a cached recomputation**. An "undo" must commit a
compensating edge.

## 8. Orchestration — heterogeneity is free

**Catalyst registry** with four namespaces: **Local** (file/db scan), **Remote**
(API, network service), **Inference** (a trained model, locally hosted or
retrieved), **Composite**.

**Thm — namespace neutrality.** *Every* theorem of the catalytic section holds
identically regardless of namespace — the definitions take a catalyst as an
unstructured partial map and never inspect `ν`.

> A local file grep, a remote search-engine query, and an inference call to a
> language model are **computationally uniform catalysts**. A chain may freely
> mix them. **No special-casing of "AI catalysts" is required by the theory** —
> the namespace tag is *purely scheduling metadata* (latency, cost, contention)
> and carries no semantic weight.

**Scheduler:** priority `P(s) = Δ(M) / max(σ − β, β)`. Closed seek → `P = +∞`
(finalise immediately). Stalled seek (residue stopped falling) → `P = 0`, starved
of further dispatch.

- **Scheduler soundness** — never dispatches to a stalled seek; never withholds
  from a descending one; finalises closed seeks first.
- **No livelock** — each tick either strictly advances some committed record or
  the loop terminates, reporting each stalled seek's state for inspection.
- **Well-founded evaluation order** — project DAG, topological order, result
  independent of which order (by path opacity).

## 9. Validation

14 categories, **13,565 / 13,565 individual checks passed, zero failures**.
Exact Edmonds–Karp max-flow backend, no external dependency, seeded.
Runs in under one second.

Notable: the saturation test compares **log-residual growth across successive
horizons** rather than raw magnitude at one horizon — because raw residual
"underflows indiscriminately for both classes in floating-point arithmetic." Same
methodological care as paper 2's two sharpenings.

## 10. Honest limitations (stated by the author)

1. **Non-completability is a premise, not derived.** Every downstream theorem
   depends on it. A domain whose medium *could* be exhausted at a known finite
   stage would not satisfy the hypotheses.
2. **The alignment functional is one natural cut-based scalar.** Qualitative
   theorems hold for any cut-monotone alignment, but numerical values depend on
   the weighting, which is taken as given rather than derived.
3. **Closure is relative to a fixed finite registry** at check time. A registry
   growing mid-search requires closure to be re-checked; the orchestrator does
   not preclude this but does not automate it.

---

## 11. What this gives Olduvai Exchange

This is the most *operationally* transferable of the three. Papers 1–2 say what
structure must exist; this one shows the author's pattern for **turning the
ladder into a specified, type-checked, schedulable system**. That is directly
the problem from [[00-framing]] — the existing projects aren't arranged right.
This paper is a worked example of the right arrangement.

### Transferable machinery

1. **⭐ Closure as the stopping rule for price discovery.** The single most
   promising import. An exchange's central question is *when is a price
   discovered?* The usual answer is a confidence/liquidity threshold. This paper
   proves that criterion **strictly too weak**: a single internally-consistent
   source (one dense cluster of correlated trades) satisfies any threshold while
   an uninvoked independent channel would reach a different class. **Price
   discovery is closed when no further available price-forming channel can land
   in a new equivalence class** — not when a confidence number is crossed.
   Testable, and it distinguishes real discovery from self-consistent illiquidity.

2. **⭐ Contested closure = honest decline as a market outcome.** An exchange that
   *cannot* report "the sources disagree, here are the distinct classes" will
   silently emit one contested class as if it were the price. Making **decline a
   first-class settlement outcome** is unusual and defensible, and it is exactly
   what "run this as a research project, not a product" licenses — a product
   would never ship a market that can refuse to print a price. And per the paper,
   **contested closure is itself the useful output: it locates where independent
   inquiry diverges.** For agricultural markets that is arguably *the* finding.

3. **Path opacity ⇒ audit the endpoints, not the route.** Note the tension with
   the bridge theorem in [[02-coordinate-theory-of-advertising]]. Here: interior
   steps are unconstrained and *unobservable from the result*. There:
   endpoint-audit provably **cannot** detect a bridge, and **route**-audit is
   necessary. These are not contradictory — path opacity says the interior is
   invisible *to endpoint tests*, which is exactly *why* a bridge survives
   endpoint-audit. **Together they say: if you want to catch bridges, you must
   instrument the route, because nothing about the result will ever reveal it.**
   That is a strong architectural requirement for an exchange meant to be
   accountable — it must record routes, not just outcomes.

4. **Namespace neutrality ⇒ price sources are uniform catalysts.** A farmgate
   survey, a warehouse receipt, a remote exchange feed, and a model-based
   estimate are the same kind of object. The theory attaches no privilege to any
   of them; only their catalytic power and support structure matter. This is a
   clean answer to "how do we combine heterogeneous agricultural price
   information" — and it is *proved*, not asserted.

5. **The rule of three, for price.** A price claim grounded by fewer than three
   independently sourced, mutually reinforcing channels is **not robust against
   revision by a single dissenting source**. That is a concrete, checkable market
   design rule with a proof behind it.

6. **Representation mobility ⇒ contract paraphrase is free.** Different contract
   specs / grade descriptions / unit conventions expressing the same claim commit
   **no new price discovery**. Distinguishes genuine new information from
   re-encoding — the exchange should not treat a re-quoted price as a new one.

7. **The DSL pattern itself.** `seek` with mandatory `not`, target, chain, and
   closure condition, over a DAG, with a type system that **cannot express a
   zero-residue claim**. If Olduvai wants price claims that are accountable by
   construction, this is the template — enforce the floor in the type system so
   an unfounded price is *not expressible*, not merely discouraged.

### Sharpened questions

- Is Olduvai's core primitive a **`seek` over price-claims**? If price discovery
  is individuation-by-negation against a non-completable medium of market
  information, the analogy is not loose — it is the same operation.
- **What is the agricultural catalyst registry?** Enumerating it (local records,
  remote feeds, physical inspection, model inference) may be the first concrete
  design step, and namespace neutrality says the enumeration is scheduling
  metadata, not theory.
- **Does an exchange have to record routes to be auditable?** Papers 2+3 jointly
  say yes. That is an architectural commitment, not a feature.
- Does **path opacity** license a market whose intermediate prices look wrong?
  It says a weird intermediate is not evidence of failure — only non-convergence
  is. Potentially a real defence of volatility as non-pathological.

Links: [[00-framing]] · [[01-foundation-contact-graphs]] · [[02-coordinate-theory-of-advertising]]
