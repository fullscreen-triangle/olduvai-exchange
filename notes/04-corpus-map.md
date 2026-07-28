# Corpus map

The material is a single body of work by Kundai Farai Sachikonye, built on one
derived constant (the floor `β > 0`) and one ladder of theorems (T0–T8). This
file tracks what exists, what has been read, and how the pieces relate.

**Stated by the user:** this is *half* the material. A physics/technical side
still to come.

---

## Read in full (notes written)

| # | Paper | Location | Note |
|---|---|---|---|
| 1 | *On the Necessary Substructures of Finite Contact Graphs* | `musande/epistemology/artificial-structures/` | [[01-foundation-contact-graphs]] |
| 2 | *A Coordinate Theory of Advertising* | `portfolio/pugachev-cobra/publications/advertising-coordinate-receivers/` | [[02-coordinate-theory-of-advertising]] |
| 3 | *Semantic Causal Propagation* (Graffiti DSL) | `semantics/graffiti/docs/publications/semantic-causal-propagation/` | [[03-semantic-causal-propagation]] |

## Batch 2 — in progress

### A. Economic agents — `systems/fourth-stomach/economic_agents/`

Eight papers. This is the directly load-bearing set for an exchange.

| Paper | Lines | Why it matters here |
|---|---|---|
| `mathematical-theory-economic-agents/economic-agent-theory.tex` | 1948 | The agent primitive. Probably the base of this subtree. |
| `market-equilibrium/market-equilibrium.tex` | 1679 | Equilibrium — expect region-valued, not point. |
| `shadrach-financial-instrument/shadrach-financial-instrument.tex` | 1548 | A specific instrument. What is traded. |
| `heterogeneneity-theorem/heterogeneity-theorem.tex` | 1498 | Heterogeneity as forced, not noise. |
| `intensity-of-monetary-activity/transactional-magnetude-calculus.tex` | 1273 | Measuring activity — is volume even the right measure? |
| `kirchoff-residual/multi-horizon-kirchoff-residuals.tex` | 1230 | Cycle consistency across horizons. Holonomy, economically. |
| `foundation-for-price/foundation-for-price.tex` | 1121 | Price from first principles. |
| `etf-construction/etf-construction-banach.tex` | 895 | Aggregation/baskets. Expect T7 (single quotient gate). |

### B. Epistemology — `musande/epistemology/`

Eight standalone papers plus the seven-paper Buhera subtree.

| Paper | Lines | Expected core |
|---|---|---|
| `unconstrained-subtask-recursion/…-equivalence.tex` | 2972 | Longest in corpus. Scale homomorphism / self-similarity. |
| `irreducible-bounded-phase-space/` (+ 10 `_s*.tex`) | 1890 | What can and cannot be known. |
| `agent-coordination/finite-agents-coordination.tex` | 1866 | T7. When is a collective one thing? |
| `split-attention-synchronised-agents/` | 1858 | T5 gating under divided attention. |
| `synchronised-coordination/synchronised-agent-coordination.tex` | 1351 | T6 clock + T7 gate. Ordering. |
| `agent-instantiation/agent-instantiation-syntax.tex` | 1248 | T8. Declaring agents formally. |
| `epistemological-mode-equivalence/epistemological-methodology.tex` | 1099 | Are modes of knowing equivalent? |
| `operational-intelligence/operational-agent-intelligence.tex` | 983 | What intelligence *is*, operationally. |

### C. Buhera subtree — `musande/epistemology/buhera/`

Seven papers. Appears to be an OS / computational architecture — i.e. **what the
whole thing runs on**.

| Paper | Lines |
|---|---|
| `os-system.tex` | 1899 |
| `vaHera.tex` | 1592 |
| `backward-navigation.tex` | 1332 |
| `unconstrained-subtasks-computing.tex` | 1309 |
| `blank-screen.tex` | 1048 |
| `trajectory-completion-mechanism.tex` | 1044 |
| `knowledge-thermodynamics.tex` | 963 |

---

## Still outstanding

- **`sachikonye2025knowledge`** — cited as load-bearing proof steps in
  [[02-coordinate-theory-of-advertising]] (Thms 5.1–5.4, 6.4, Prop 4.2).
  Supplies reconfiguration units, specification slack, the four-mode taxonomy,
  and the bridge theorem. Not yet located; not the same as
  [[03-semantic-causal-propagation]]. **User says it will be shown later.**
- **The physics/technical half** — not yet provided.

---

## The invariant spine

Every paper read so far re-derives or reuses the same structure. Worth stating
once, because it is the thing that will decide Olduvai's architecture:

1. **Non-completability** (an *order* condition — no terminal stage — never a
   cardinality claim) + **proper parthood**
2. ⟹ **positive floor `β`** — derived, not posited. Three independent
   derivations so far: from non-completability of a whole (paper 1), from finite
   memory `|K| < |X|` (paper 2), from non-completability of a search medium
   (paper 3).
3. ⟹ **individuation by negation** — a thing is fixed by what it is *not*;
   any positive selector regresses.
4. ⟹ **region, never point** — residual is conserved, bounded below, realised
   by no singleton. *Price is a band; the sticker is a carrier.*
5. ⟹ **a gate is required to select** — the graph fixes what is reachable, the
   gate fixes the **order**, and order is the trajectory's identity.
6. ⟹ **no return** — monotone committed count; an undo is a further step.
7. ⟹ **one gate per coherent collective** — two gates means two collectives.
8. ⟹ **authored structures are bounded** — open-ended, non-duplicable,
   floor-limited.

Plus two recurring cross-cutting results:
- **Coherence needs three.** Linear support fails; 2-cycles cannot outvote their
  own disagreement; the shortest grounding cycle is a triangle. Decidable from
  *signs alone*.
- **Closure, not confidence.** Finished ⟺ no further available catalyst can add
  a new equivalence class. Strictly stronger than any threshold. Two termination
  states: convergent closure, or **honest decline** (contested closure — a
  first-class, correct outcome).

Links: [[00-framing]] · [[01-foundation-contact-graphs]] · [[02-coordinate-theory-of-advertising]] · [[03-semantic-causal-propagation]]
