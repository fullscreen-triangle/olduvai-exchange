# ⭐⭐ The empty dictionary — entries do not exist until asked for

User, on the origin:

> I was in semantics, and realised I had to create a dictionary (look up table), and
> then I wondered, **what if, in this dictionary, instead of flipping through pages
> hoping the word you want exists in the dictionary, or has a sufficient description,
> you enter a word, and the entry/meaning is synthesized on demand**

Provenance: **semantics first**, then sequencing, then the chemistry papers. The chemistry
is the third application, not the origin.

Sources read: `dmitri/publications/categorical-compound-database/categorical-compound-database.tex`
(full) and `dmitri/publications/cheminformatics-model/categorical-cheminformatics-models.tex`.

**This resolves the layer I told you was the weakest one in the piece list. It is the
single most useful idea handed over since the rail paper.**

⚠️ **Rewrite note.** §2 and §5 originally read this as a *sparse index* — cells
materialising on insertion, taxonomy as an emergent output. **That was the weaker of the
two readings present in the papers, and it is not the one that was meant.** The trie
sections do describe sparse storage ("compounds are stored at the terminal node"), and I
anchored there because that section carried the validation table. But the definition, and
Models III–V, take it literally. **Both sections are rewritten below on the synthesis
reading.**

---

## 1. The principle, stated

`categorical-cheminformatics-models.tex:163`:

> **Definition (Empty Dictionary Principle).** A computational system satisfies the empty
> dictionary principle if it **contains no stored data** and generates correct outputs
> through **real-time synthesis from the structure of the input alone.**

And the mechanism that makes it more than a slogan, from the database paper:

> "To insert a compound, one follows the trajectory defined by its trit string — **the
> insertion algorithm IS the address.** … **There is no separate 'indexing' step: the
> encoding is the index.**"

> "only the nodes along paths to stored compounds are instantiated" — memory is
> `O(N·k)`, **not** `O(3^k)`; empty subtrees are never allocated.

**So "empty" is precise, not rhetorical — and it is stronger than sparse storage.** The
address space is fully defined before anything exists: all `3^k` cells are addressable
because an address is *computed*, not allocated. **What is absent is not just unoccupied
cells but the entries themselves.** Models III–V take this literally — property prediction
computes the answer from the query's own coordinates; the GPU model states outright that
"textures need not be stored… [they are] re-observed on demand."

⟹ **You do not look up. You ask, and the answer is constructed against what you asked.**

## 2. ⭐⭐ What this fixes — the registry problem, structurally

I said in the piece list that **Layer 0 (registry + unit types) was the weak layer**, and
in [[25-the-actual-shape]] §5 that *"the registry problem grows… this is the layer most
likely to be got wrong early and be expensive later."* The reason was concrete:

> **cell-disjointness requires a populated taxonomy authored before the market exists.**
> "Miller" vs "processor", "transporter" vs "haulier" must not be ambiguously routable.

⚠️ And the real objection was worse than taxonomy hygiene: **in a thin agricultural
economy you cannot know the roles in advance.** Someone who transports three days a week
and contracts labour the other four does not fit a role you declared before you met them.
A pre-authored taxonomy is a guess about a market you have not yet observed, frozen into
the schema that everything else keys off.

**The empty dictionary removes the guess entirely, and more cleanly than I first wrote.**

⭐⭐ **There is no entry for "transporter-slash-labour-contractor" because there is no
entry for "transporter" either.** The question *what is this person* is not answered in
advance by a schema. It is answered **when it is asked, against the specific thing being
asked** — can this person move 20 t to Beira in June. That question has an answer
computed from their declared capabilities. **"What category are they" never has to be
asked at all.**

⟹ **The taxonomy is not deferred, weakened, or made emergent. It is unnecessary.** My
earlier version had occupied cells becoming the market's real categories — but occupancy
presumes stored entries to observe, and on the synthesis reading there is nothing to
observe. **The registry problem doesn't get a better answer; it stops being a question.**

**What the authored object becomes instead:** not a role list but **the coordinate
functions plus the synthesis rules.** Smaller, publishable, versionable — see §5, which is
where the authorship actually lands.

⚠️ **The chemistry validation still matters, but for a different claim than I gave it.**
Cell `[110]` containing exactly the hydrogen halides with no chemistry encoded is evidence
that **a well-chosen coordinate triple carries real structure** — which is what makes
synthesis-from-coordinates possible at all. It is not evidence for an emergent taxonomy,
because on this reading there isn't one.

## 3. ⭐ It also collapses four pieces into one

[[28-matching-is-search]] §3 listed four query result-shapes and asserted "same index,
same traversal, same gate." The trie makes that literal rather than aspirational:

| Piece I listed separately | What it actually is |
|---|---|
| Index | The trie — **is** the encoding, not built from it |
| Exact lookup | Traverse `k` trits, `O(k)`, **independent of `N`** |
| Fuzzy / broad search | **Prefix truncation.** Depth `k` *is* the resolution knob |
| Ranking / similarity | **Longest common prefix.** Ultrametric, parameter-free |
| Constraint query ("who can mill 20 t in June?") | Constraint → set of valid prefixes → subtree enumeration |
| Nearest-neighbour fallback | **Free.** Backtrack to depth `k′`; `thm:nn_fallback` |

**Six things, one structure.** And ranking needs no tuned threshold — the resolution
parameter is the depth, which has an operational meaning (one more observation) rather
than being a knob fitted on a validation set.

⟹ **This is the mechanism behind the `log₃N` claim** I recorded in
[[28-matching-is-search]] §2 without knowing where it came from. It is not `log₃N`; it is
**`O(k)` with `N` absent from the complexity entirely.** `N` affects storage, not search.

## 4. ⭐ Two properties that matter more for an exchange than for chemistry

**(a) Addresses are independent of the database.** From the database paper §"The Trie as
a Physical Object":

> "Adding a new compound does not change the trie structure… **the address of a compound
> is independent of all other compounds.**" In traditional databases "adding or removing
> entries can change the results of similarity searches."

⟹ **For Olduvai this is a fairness property, not a performance one.** A participant's
position in the index cannot be moved by anyone else joining or leaving. Contrast a
learned embedding or a clustering-based catalogue, where a large new entrant silently
re-ranks everyone. **Here, your address is yours, computed from your own attributes.**
That is directly responsive to the exclusion worry in
[[26-global-objective-not-local-match]] §5 — the *index* cannot concentrate, whatever the
gate does.

**(b) Graceful degradation is structural.** A participant whose address reaches an
unoccupied node is not "not found" — backtracking returns the nearest occupied prefix.
⟹ **A new smallholder in an empty region of the space is still reachable**, at coarse
resolution, on their first day, with no history. That is a bootstrap path for the
unobserved participant I flagged as required in
[[27-miracles-are-for-missing-information]] §5.3 — **and it comes free from the structure
rather than as a special case.**

## 5. ⭐ The verification boundary — where synthesis stops being trustworthy

⚠️ **This section previously said the analogy fails because "agricultural participants
have no spectrum," treating measured coordinates as the real case and derived ones as a
degradation. That was mis-aimed.** Semantics has no spectrometer either, and semantics is
where the principle came from. **The derived-coordinate case is the canonical one.** The
chemistry papers are the *unusual* instance, distinguished only by having an instrument.

**The real boundary is precision, and the user stated it exactly:**

> since users continuously enter information, **the competence can be verified by the
> system as far as entered information is precise, beyond that, not possible**… but again,
> no system is perfect, and **it's better to have the system with a few gaps we can
> resolve in the future than nothing**

⟹ ⭐⭐ **This is the same boundary as [[27-miracles-are-for-missing-information]] §4, not a
new one.** A synthesized entry is trustworthy exactly where the fields it was built from
are observed rather than asserted. Below that, it is a construction over a virtual region
— which is precisely what `thm:forward-asymmetry` says the miracle machinery is for.

**⭐ Consequence: the dictionary inherits the exchange's existing correctness story rather
than needing its own.** It does not sit in front of the graph and it does not replace it.
Same gate, same observed/asserted distinction, same floor β below which you emit contested
closure instead of ranking.

I had treated *"is a synthesized entry a description of the sought thing, or a pointer to
something real?"* as an architectural fork. **It isn't one** — the same confidence gradient
runs through both, so the answer is: it is whichever the entered information supports, and
the system says which.

⟹ **The failure mode to avoid is not gaps. It is a system that cannot name its gaps.**
This one can, via precision-of-entry — and per [[30-programming-structure]] §5.3 precision
is tracked per field, so the gap is **resolvable as entries improve**, not permanent.

### 5.1 ⚠️ Where the authorship actually lands

⚠️ **The authorship moves — it does not disappear.**
[[20-s-entropy-dimensional-typing]] §5 recorded the sharpest limit in the corpus:

> **Whoever controls `Φ_R` controls the exchange rates, completely and invisibly.**

**The empty dictionary does not abolish `Φ_R`. It relocates it — from a role taxonomy into
three coordinate functions.** That is a genuine improvement, and I want to be exact about
why rather than overselling it:

- **Smaller.** Three scalar functions instead of an open-ended nomenclature.
- **More auditable.** A coordinate function can be published, versioned, and recomputed by
  anyone holding the inputs. A taxonomy's boundary cases are adjudicated case-by-case by
  whoever runs the registry, and that is unauditable in practice.
- **Falsifiable.** You can check whether occupancy at depth 3 matches groupings people
  independently recognise — which is precisely the cohesion test (`R = intra/inter`) the
  paper runs. **If the coordinates are badly chosen, the clusters will be nonsense, and
  that is visible.**

⚠️ **But it is still authored, and the paper is honest that its own reference constants
are a weakness** (Limitation 6: the normalisers are set by the database extremes, and
extending the database *shifts every existing address*). **For an exchange that is not a
footnote — it means a badly-chosen normaliser silently re-addresses every participant
when the market grows.** Pick normalisers from physical bounds, not from observed data.

## 6. ⭐ What the coordinates plausibly are — the design question this opens

I am not going to pretend the mapping is obvious. But the structure of the chemistry
coordinates is suggestive, because each measures something an exchange also has:

| Chemistry | What it measures | Plausible exchange analogue |
|---|---|---|
| `S_k` — spectral distribution | Is activity concentrated in one mode or spread evenly? | **Concentration of a participant's activity** across goods/roles. A monocrop farmer is low `S_k`; a mixed operation is high. |
| `S_t` — timescale span | Ratio of fastest to slowest process | **Operating tempo** — daily labour hire vs a seasonal harvest vs a multi-year orchard. ⭐ **This is where perishability and time windows enter the address itself**, which is the fourth gap from [[25-the-actual-shape]] §7. |
| `S_e` — harmonic network density | Fraction of mode pairs in simple ratio | **Complementarity density** — with what fraction of the roster does this participant have a compatible interface? |

⭐ **`S_e` is the interesting one.** It is not an attribute of the participant alone — it
counts *pairwise relations*. In chemistry that is harmonic proximity between the
molecule's own modes. For an exchange the natural reading is **how connectible you are**,
which is a graph property. **If `S_e` is defined over the roster, addresses stop being
independent of the database and property (a) in §4 is lost.** So it must be defined over
the participant's own declared capabilities and unit interfaces — *intrinsic* — or the
fairness property goes.

⟹ **That is a real constraint on the design, and it falls straight out of taking the
paper's own claim seriously.** Worth writing down before anyone codes anything.

## 7. What this does to the build order

**I previously put registry first and said the market cannot exist until the taxonomy is
authored. Withdrawn — there is no taxonomy.** The order changes (and see
[[30-programming-structure]] §7 for the version with the language boundaries in it):

1. **Coordinate functions** `(S_k, S_t, S_e)` for a participant/offer, with normalisers
   fixed by physical or contractual bounds, **not** by observed data. ⭐ **This is now the
   single most consequential authored object in the system** — it is `Φ_R`.
2. **Encoder + trie.** Small, and the paper's algorithm is ~15 lines. Interleaved
   refinement, `j mod 3` selects the axis.
3. **Query engine + synthesis** — exact traversal, prefix truncation, subtree
   enumeration, backtracking fallback, and **deterministic entry construction from
   entered fields ∪ nearest occupied prefix.** All one traversal.
4. **Gate** — the information test from [[27-miracles-are-for-missing-information]] §4,
   ranking observed legs above asserted ones. **Separate from the index**, and it must
   stay separate: the index is intrinsic and per-participant; the gate is global and
   authored. Conflating them is how the fairness property in §4(a) gets destroyed.
5. **Ledger** — unchanged, still required by `thm:path-opacity`.
6. **DSL** — unchanged, still the interface.

**Units and roles do not vanish** — a miller still charges per tonne milled and a
transporter per tonne-km, and [[25-the-actual-shape]] §5's four-unit-systems warning
stands. **But that is a type gate on the arithmetic, not a taxonomy for the index.**
Those were the same layer in my piece list and they should not have been.

## 8. ⚠️ The honest caveat, stated once

**The coordinates are the whole thing.** They determine both the address and — because
synthesis reads from the query's own coordinates and its nearest occupied prefix — **the
content of every synthesized entry.** A badly chosen triple does not merely file people
wrongly; it constructs wrong answers.

⟹ **So the cohesion test has to be passed, not assumed.** Do Zimbabwean maize smallholders
in one district land near each other? **If not, the coordinates are wrong and the test says
so** — cheaply, before anything is built on top.

⟹ **That is a good position to be in.** It is a falsifiable design decision with a cheap
test, which is more than most of the corpus offers, and it is exactly the
"could-have-come-out-otherwise" standard from [[24-moriarty-positioning-audit]] §5.

---

## 9. Net

**The empty dictionary is: no pre-declared key set and no pre-written entries. You do not
flip through pages hoping the right one exists — you ask, and the entry is synthesized
against what you asked, from coordinates computed from the item's own attributes.**

**What it gives Olduvai:** the registry problem disappears rather than getting a better
answer — nobody has to be categorised in advance because *what is this person* is never the
question; index, ranking, fuzzy search and fallback collapse into one traversal; and a
participant's position cannot be moved by anyone else joining.

**What it costs:** the authorship problem moves into the coordinate functions and the
synthesis rules, and stays there. **Smaller, publishable and versionable — but it is still
`Φ_R`, and it is now the first thing to get right.**

**Where it stops:** ⭐ synthesis is trustworthy exactly as far as entered information is
precise. **That is the same boundary the exchange already had** — not a new one the
dictionary introduces.

Links: [[00-framing]] · [[30-programming-structure]] · [[28-matching-is-search]] · [[27-miracles-are-for-missing-information]] · [[26-global-objective-not-local-match]] · [[25-the-actual-shape]] · [[20-s-entropy-dimensional-typing]] · [[24-moriarty-positioning-audit]] · [[07-market-equilibrium]]
