# Programming structure: Rust engine, Python analysis, Next.js frontend

User:

> the backend should be in rust, simply because its fast. That is, the computing is in
> rust. The data analysis obviously in python, and the frontend in react nextjs

**Agreed, and settled. Three decisions taken alongside it (§0) close the remaining
architectural forks.** This note records the split, the reason for each boundary, and the
API surface that follows.

---

## 0. Decisions taken

| Question | Decision |
|---|---|
| Do participants submit attributes or coordinates? | **Attributes only.** Server derives the triple. |
| Where does entry synthesis run? | **Rust, deterministic.** No model in the path. |
| How is precision tracked? | **Per-field, first-class.** Provenance + precision on every value. |

**All three preserve properties established in earlier notes rather than trading them for
convenience. The consequences are worked through below.**

## 1. ⭐ Why Rust — the reason is determinism, not speed

The stated reason was speed. **That is true and not the load-bearing one.**

The encoder is `Φ_R` ([[20-s-entropy-dimensional-typing]] §5, [[29-the-empty-dictionary]]
§5). Its output is a participant's address, and the properties the design rests on require
that address to be **byte-identical for every caller, forever, given the same attributes**:

- **Intrinsic addressing** ([[29-the-empty-dictionary]] §4a) — your position cannot be
  moved by who else joins. Two encoder implementations that disagree in the last trit
  break this silently.
- **Auditability** — a published coordinate function is only meaningful if anyone
  recomputing it gets the same answer. Divergence makes the audit unfalsifiable.
- **Ledger integrity** — an address recorded at assembly time must still resolve later.

⟹ **One implementation. Never a reimplementation in another language.** Speed is a
genuine bonus on top — `O(k)` traversal with `N` absent means query cost is a constant
handful of pointer hops, and Rust makes that constant small — **but determinism is the
requirement.**

## 2. Rust — the engine

**Contents:**

| Component | Note |
|---|---|
| **Encoder** | attributes → `(S_k, S_t, S_e)` → interleaved trit string. ~15 lines for the refinement loop; the coordinate functions are the substance. **Versioned.** |
| **Trie** | insert / exact / prefix / subtree enumerate / backtrack. ~200 lines. |
| **Query engine** | one traversal serving all six query shapes ([[29-the-empty-dictionary]] §3). |
| **Synthesis** | deterministic entry construction. See §5. |
| **Unit type system** | tonnes, tonne-km, tonne-days, bags as **distinct types**. |
| **Gate** | information test + ranking. **Separate module from the index.** |
| **Ledger core** | append-only, hash-chained. |

### 2.1 The unit gate is a compile-time obligation
[[25-the-actual-shape]] §5: a miller charges per tonne milled, a transporter per tonne-km,
a supplier per bag, storage per tonne-day. **Four unit systems inside one coalition.**
[[20-s-entropy-dimensional-typing]] §1 records that S-entropy makes the arithmetic *work*
— which is exactly why a silent unit error clears rather than erroring.

⟹ **Newtypes with no `Add` between them.** A `Tonnes + TonneKm` must not compile. This is
the cheapest correctness win in the system and it is only available in this layer.

### 2.2 Keep it exhaustively testable
The trie and encoder are small enough to brute-force against enumeration. **That is the
one discipline the corpus has never met** ([[24-moriarty-positioning-audit]] §4.2,
[[25-the-actual-shape]] §6). Concretely:

- Encoder: round-trip property test — encode/decode within `√3·3^(−⌊j/3⌋)`
  ([[29-the-empty-dictionary]], Distance Preservation).
- Trie: differential test against a naive linear scan on small `N`. **The `O(k)`-vs-`Θ(N)`
  claim is checkable, and must be checked rather than accepted from a paper.**
- Units: compile-fail tests.

### 2.3 Ships as one crate, three consumers
```
olduvai-core   (encoder, trie, query, units, gate, synthesis)
  ├── olduvai-server   binary — HTTP/gRPC
  ├── olduvai-py       PyO3 bindings
  └── olduvai-wasm     wasm-bindgen — DSL parser + client-side preview
```
**Python experiments and the browser run the same encoder as production.** No drift by
construction.

## 3. Python — where things are argued about

**Contents:** coordinate function design and calibration; the cohesion test; gate/ranking
policy experiments; all analysis and reporting.

**Why it is separate:** the three axes over agricultural participants are **not known**.
That is an empirical question with months of iteration in it, and it needs notebooks and
plots, not recompiles.

⭐ **But it calls the Rust encoder via PyO3**, so experiments run against the production
encoder. **When a coordinate definition settles it moves into the crate behind a version
bump** — it does not stay in Python and it is not reimplemented.

### 3.1 The falsifiable test lives here
[[29-the-empty-dictionary]] §8: does a proposed triple cluster groupings people already
recognise? The cohesion ratio `R = intra/inter` from the source paper transfers directly.
**If smallholders in one district do not cluster, the coordinates are wrong and the test
says so.** Cheap, and it is the could-have-come-out-otherwise standard.

## 4. TypeScript / Next.js — the interface

**Contents:** web client, DSL editor tooling, thin BFF.

Per [[28-matching-is-search]] §3 **the DSL is the interface, not a side project.** Query
authoring wants live feedback — parse errors, result previews, resolution depth adjusted
as you type.

⟹ **Compile the Rust parser to WASM.** The browser validates with the identical grammar
the server executes. Same argument as §1.

**The BFF holds session handling and response shaping only. No admissibility logic ever.**

## 5. ⭐ Consequences of the three decisions

### 5.1 Attributes only — the address stays intrinsic
Participants submit what they do, hold, and can move. **The server derives the triple.**

⟹ **Cell-shopping is impossible by construction.** A participant cannot aim at a
favourable region because they never touch the coordinates. This is what keeps
[[29-the-empty-dictionary]] §4a true in practice rather than in principle, and it means
`POST /participants` has **no coordinate fields at all** — not optional ones.

⚠️ **Cost:** bulk import from an external system requires an attribute mapping rather
than a coordinate dump. Accepted, and it is the right trade.

### 5.2 Deterministic synthesis — one verification story, not two
Entry construction is **fixed rules over entered fields plus the nearest occupied
prefix.** No model in the path.

⟹ **The dictionary inherits the exchange's verification boundary rather than adding one.**
Per the user's standard: *competence is verifiable as far as entered information is
precise, and not beyond.* With deterministic synthesis, output precision is a **function**
of input precision — computable, not estimated. A model would have put nondeterminism
exactly where the boundary sits.

⟹ **And it stays testable**: same inputs, same entry, forever.

**Shaped so a model can slot in later** — one trait, deterministic impl first:
```rust
trait EntrySynthesiser {
    fn synthesise(&self, q: &Address, ctx: &EntryContext) -> Entry;
}
```
**Nothing about synthesis needs deciding until real entries exist.**

### 5.3 Per-field precision — the gap is resolvable, not permanent
Every value carries `{value, unit, source, precision}`. `source` is the observed/asserted
distinction from [[27-miracles-are-for-missing-information]] §4; `precision` bounds what
can be checked.

⟹ **"This coalition's weight is weighbridge-verified and its location is asserted" is
expressible.** A single per-entry score cannot say that, and that sentence is precisely
what the gate needs to rank on.

⭐ **This is what makes the named gap improve over time rather than persist.** As entries
get more precise, more synthesis becomes checkable — **with no rearchitecting**, because
precision was a tracked quantity from the first commit rather than an assumption.

⚠️ **Cost:** every write path carries provenance. More verbose, and it must be enforced at
the type level or it will be filled in with defaults and become decorative.

## 6. API surface

**Versioning:** every response carries `encoder_version`. An address is meaningless without
knowing which `Φ_R` produced it, and per the source paper's Limitation 6 a normaliser
change re-addresses everyone. **Normalisers come from physical or contractual bounds, never
from observed data** ([[29-the-empty-dictionary]] §5).

```
POST   /v1/participants          attributes only → address (no coordinate fields)
GET    /v1/participants/{id}     entry + address + per-field provenance

POST   /v1/query                 { constraints, depth } → results at resolution
                                 depth omitted → engine picks; backtracks on empty node
POST   /v1/coalitions/assemble   { goal, window } → tuple + per-leg provenance + Y-gain
GET    /v1/entries/{address}     synthesised entry (deterministic; cacheable by address)

POST   /v1/ledger                append-only; hash-chained; per-leg
GET    /v1/ledger/{coalition}    full assembly record
```

⭐ **`/query` and `/coalitions/assemble` are the same engine** ([[28-matching-is-search]]
§3) — different result shapes, one traversal. They are separate endpoints for
response-shape clarity only, **not because they are separate subsystems.**

⭐ **`/ledger` is mandatory, not optional.** `thm:path-opacity` says the endpoint reveals
nothing about assembly, so the record must be written at assembly time or it is
unrecoverable ([[27-miracles-are-for-missing-information]] §5.1).

## 7. Build order

1. **Rust core** — units, encoder skeleton, trie, exhaustive tests. **No coordinate
   functions yet.**
2. **PyO3 bindings + calibration harness.** Coordinate design starts here, against real
   attribute data.
3. **Cohesion test.** ⭐ **Gate on this before building anything on top.** If the triple
   does not cluster, everything above it is built on sand.
4. **Query engine + deterministic synthesis.**
5. **Gate + ledger.**
6. **DSL grammar → WASM → Next.js.**

⚠️ **Step 3 is a real gate, not a checkpoint.** It is the first point where the design can
be shown wrong cheaply, and [[24-moriarty-positioning-audit]] is a catalogue of what
happens when that point is skipped.

## 8. Net

**Rust: everything that must be identical for every caller — encoder, trie, query,
synthesis, units, gate, ledger. Python: everything still being argued about — coordinate
design, calibration, the cohesion test. Next.js + WASM: the DSL and the client.**

**One encoder, three consumers, no reimplementation anywhere.**

**The three decisions all hold a property that was cheap to lose:** attributes-only keeps
addresses intrinsic; deterministic synthesis keeps one verification boundary instead of
two; per-field precision keeps the named gap resolvable.

Links: [[00-framing]] · [[29-the-empty-dictionary]] · [[28-matching-is-search]] · [[27-miracles-are-for-missing-information]] · [[25-the-actual-shape]] · [[24-moriarty-positioning-audit]] · [[20-s-entropy-dimensional-typing]]
