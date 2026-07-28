# ⚠️ Correction: matching IS search — there is no second system

User:

> **Linking a buyer to a seller, is still searching...**

**Correct, and it collapses a distinction I had been drawing for several notes. There is
one system, not two.**

---

## 1. What I had been doing wrong

In [[26-global-objective-not-local-match]] §6 I wrote that the exchange is
*"not a marketplace… a **dispatcher** with an objective function — closest conventional
analogue."* And in [[25-the-actual-shape]] §3 I treated "just a search engine" as a
**scope limitation** — a discipline that kept the product small.

**Both framings were wrong in the same way: I was treating matching as a second,
different capability layered on top of search.** It isn't. Assembling a coalition is a
query whose result set happens to be a tuple of participants rather than a list of
documents.

**The user has said "search engine" consistently from the first design message. I kept
hearing it as a limitation on ambition. It is a statement about mechanism.**

## 2. ⭐ Why this is exactly right in the corpus's own terms

The framework has said this throughout, and I recorded the pieces without joining them.

**A search returns the reachable set; the gate fixes the order** (T5,
[[01-foundation-contact-graphs]]). Both "find me maize in Manicaland" and "find me a
coalition that delivers 20 t to Beira in June" are the **same operation over the same
graph** — a traversal returning what is reachable, ordered by a gate. The second query
has more constraints and a tuple-shaped answer. **It is not a different kind of act.**

⭐ **And [[20-s-entropy-dimensional-typing]] §3 already said matching is search**, though
I filed it under "matching":

> **Backward matching** = start from the desired settled allocation and navigate back to
> current holdings. `log₃N` rather than `Θ(N)`.

**That is a search.** Navigating from a target state to the states that reach it is
retrieval, not scheduling. The paper's `Complete(P, p_k)` algorithm is a traversal.

⟹ **The `log₃N` result is therefore a claim about the exchange's core query
performance**, not about a separate optimiser. That is a much more direct application
than I had it.

## 3. ⭐ What follows — the whole product is one query engine

If matching is search, then several things I listed as separate components are **one
thing at different query complexities**:

| Query | Result shape |
|---|---|
| "What maize is available near Mutare?" | list of listings |
| "Who can mill 20 t in June?" | list of participants |
| "What's the road capacity to Beira this week?" | network state |
| **"Assemble a coalition that delivers 20 t to Beira in June"** | **tuple of participants + route + window** |

**Same index. Same traversal. Same gate. Same floor.** The last query is not a different
subsystem — it is the same engine with a richer result type and more constraints.

⟹ **⭐ This is the strongest argument yet for the dedicated repo's architecture**: one
index, one query language, one admissibility test. Not a search product with a matching
product bolted on.

**And it explains why the DSL work across the repos keeps recurring.** `dendra`,
`cynegeticus`, `turbulance` — the user has repeatedly built **query languages**. If the
whole exchange is a query engine, **the DSL is not a side project. It is the interface**,
and the vaHera AST from [[20-s-entropy-dimensional-typing]] is its specification.

## 4. ⭐ The information test is a ranking function

This is the part that snaps into place, and it connects to
[[27-miracles-are-for-missing-information]].

An information-first admissibility test — *is this leg observed or asserted?* — read as
**search** rather than as **allocation**, is simply **relevance ranking with a
verifiability signal.**

- A coalition whose legs are backed by weighbridge tickets, mill intake records, and
  signed input purchases is a **high-confidence result.**
- A coalition resting on unbacked assertions is a **low-confidence result.**
- **Below β, you do not rank at all** — you emit contested closure
  ([[03-semantic-causal-propagation]]).

⟹ **The system is not "deciding who trades." It is returning results ordered by how well
they are evidenced, and declining to return results it cannot ground.**

**⭐ That substantially defuses the exclusion problem from
[[26-global-objective-not-local-match]] §5 and [[27-miracles-are-for-missing-information]]
§5.3.** A search engine that ranks a poorly-evidenced participant lower has not
*excluded* them — it has **stated its confidence**, and the participant can improve their
position by generating records. **"Rank low pending evidence" is a fundamentally
different act from "deny access,"** and it has an obvious remedy path built in.

⚠️ **It does not fully dissolve the problem** — the concentration argument in
[[26-global-objective-not-local-match]] §5 is about the *objective*, not the framing, and
increasing returns still favour dense corridors. **But it changes the ethical shape from
gatekeeping to ranking**, which is both more honest about what the system does and more
tractable to fix.

## 5. ⚠️ Correcting the mechanism-design walk-back

In [[26-global-objective-not-local-match]] §6 I said *"independently allowing
transactions is closer to a market maker than a search engine"* and that the
mechanism-design gap therefore **grows** and sits on the critical path.

**Partly withdrawn.** If the operation is retrieval-and-ranking rather than allocation,
the strategic surface is **the one search engines have**, not the one exchanges have:

- **Not:** collusion in an auction, price manipulation, order-book gaming — the exchange
  quotes no prices and holds no positions.
- **But:** **spam and SEO.** Inflated availability, phantom capacity, fabricated records
  to rank higher. **Adversarial information retrieval**, which is a mature field with
  known defences.

⟹ **⭐ That is a genuinely better-understood problem than mechanism design**, and the
corpus's information machinery bears on it directly — decoder-disjointness, the
independence requirement, β as the no-alert band. **Ranking manipulation is fought with
independent corroboration, which is exactly what multi-role membership supplies
([[25-the-actual-shape]] §4.1).**

**The gap is smaller than I said in [[26-global-objective-not-local-match]], and it is a
different gap.** Standing correction: it is an **adversarial-IR** problem, not a
mechanism-design problem — *provided the exchange never takes positions or sets prices.*
The moment it does, the earlier warning applies again in full.

## 6. Where this leaves the design

**One system.** An index over agricultural participants, goods, routes and windows; a
query language; a traversal that assembles results from single listings up to whole
coalitions; a gate that orders them; and a floor below which it declines to rank.

**The unit of retrieval scales with the query.** A document, a participant, or a
coalition — same engine.

**And the honest description of the product** is neither "marketplace" nor "dispatcher"
but: **a search engine whose richest queries return the set of people who, together, can
make a thing happen.**

⟹ **That is what "optimise the transaction" and "facilitate the users that can
participate" have meant all along**, and it took me until now to stop hearing them as
two different features.

Links: [[00-framing]] · [[25-the-actual-shape]] · [[26-global-objective-not-local-match]] · [[27-miracles-are-for-missing-information]] · [[20-s-entropy-dimensional-typing]] · [[14-what-it-actually-is]] · [[03-semantic-causal-propagation]] · [[01-foundation-contact-graphs]]
