# The actual shape: a multi-role search engine that facilitates transactions

User's closing statement of the design:

> Olduvai Exchange is **just a search engine, for agricultural related items**. Anyone
> involved in the theme can join and make an account — **from a transporter, to someone
> with a mill, to someone with fertilizer.** It's not just farmers and buyers. And the
> system tries to **optimise the transaction** — which means **facilitating the users
> that can participate in a transaction.**

And the framing for why this repo exists at all:

> There are **too many different repos that contribute portions to the idea** — hence
> the reason for a dedicated repo.

**This is the most important message in the conversation, and it resolves the largest
open objection in these notes.**

---

## 1. ⭐⭐ Why the role expansion is a structural fix, not a feature addition

I raised the **double-coincidence-of-wants** problem in [[17-barter-exchange]] §5.1 as
the classic objection to barter, and answered it weakly: *multilateral clearing solves
it in principle, but finding the cycle is the hard part.*

**Opening the platform to millers, input suppliers, and transporters answers it
properly, and the corpus explains why.**

From [[03-semantic-causal-propagation]]: the contact graph has a **medium vertex
adjacent to every other vertex**, and in [[17-barter-exchange]] §4.3 I identified money
as that vertex — the thing that connects to everything, which is why it dominates when
present.

**A farmers-and-buyers-only platform is a bipartite graph.** Bipartite graphs have
**no odd cycles at all.** And from [[10-buhera-subtree]] / [[20-s-entropy-dimensional-typing]]
§6.4, the result that keeps recurring:

> **Cycles of length 2 reduce to mutual definition without external check. Only cycles
> of length ≥3 are circularly valid.**

⟹ **A two-role market can only produce 2-cycles and even cycles routed through the
money vertex.** It is structurally incapable of the ≥3 validation the corpus requires,
*and* structurally incapable of most clearing cycles.

**Adding millers, input suppliers, and transporters makes the graph non-bipartite.**
Triangles become possible: *farmer → miller → input supplier → farmer.* That is
simultaneously:
- **a clearable barter cycle** (holonomy closes — [[17-barter-exchange]] §4.1), and
- **a valid validation cycle** (length ≥3, strongly connected).

**⟹ The same structural change fixes both the liquidity problem and the trust problem.
That is not a coincidence — both were the same missing property: odd cycles.**

## 2. ⭐ "Facilitating the users that can participate" — the gate, precisely stated

This is the sharpest formulation of the product so far, and it lands exactly on T5.

From [[14-what-it-actually-is]]: **Olduvai is the GATE, not the graph.** The graph fixes
what is *reachable*; the gate fixes the *order*. The user's phrasing —
*"facilitating the users that can participate in a transaction"* — **is the gate
operation stated in plain language.**

Note what it is *not*: it is not matching a buyer to a seller. It is **assembling the
set of participants who make a transaction possible at all.** A maize sale that needs a
truck, a mill, and a storage slot is not a buyer-seller pair — it is a **coalition**, and
the exchange's job is to find one that closes.

⟹ **Restating the vertex definition from [[14-what-it-actually-is]].** I had it as
`(seller, buyer, route, window)` quadruples. **That is now too narrow.** The unit is a
**feasible coalition**: an arbitrary-arity set of participants plus a window, whose
required roles are all filled and whose cycle closes.

**And this is exactly the backward-matching object** from
[[20-s-entropy-dimensional-typing]] §3: you do not enumerate forward from who holds
what; you **start from the desired settled end-state and navigate back to a set of
participants who can realise it.** The roles are the intermediate legs — and the
theorem says those legs need not be individually sensible, only jointly closing.

## 3. ⭐ "Just a search engine" — take this literally, it is a discipline

The user has said *search engine* consistently from the first design message and again
here. **It is worth reading as a constraint rather than modesty**, because it excludes a
great deal:

- **No warehouse, no inventory, no position** — stated at the outset, still true.
- **No certification claim** — [[15-marketplace-not-certifier]].
- **No price setting.** A search engine surfaces; it does not quote.
- **No custody.** The coalition transacts; the platform does not stand between.

⟹ **What Olduvai owns is the index and the gate.** Everything else is the participants'.

**And this is what makes the corpus fit.** The framework is an *information geometry* —
what is resolvable, at what floor, through which decoder. It has **no mechanism design**
(recorded ~30 times now, most recently confirmed by the rail paper's own disclaimer in
[[23-rail-yield-and-phase-locked-finance]] §1.5). **A search engine does not need
mechanism design. A market maker does.**

⟹ **Staying a search engine keeps the product inside the region where the corpus is
actually load-bearing.** The moment it takes positions, sets prices, or holds custody,
it walks into the corpus's largest hole. **That is a real argument for the stated scope,
not just a preference.**

## 4. What the multi-role model changes in the existing notes

### 4.1 Decoder-disjointness gets easier — and is now *free*
[[16-foreman-as-continuous-verification]] §2.1 argued the validation sources multiply
because they are decoder-disjoint, but leaned on satellite/NDVI which
[[21-buhera-west-audit]] found is **not built.**

**Multi-role fixes this without any new instrument.** A miller weighing intake, a
transporter logging a pickup, an input supplier recording a seed sale — these are
**genuinely decoder-disjoint commercial records**, generated as a side effect of each
party's own business, with no shared representation alphabet.

⟹ **The strongest available validation layer is other participants' ordinary
bookkeeping.** It costs nothing, and unlike satellite data **it exists today.**

### 4.2 ⭐ The input-supply side closes the season-record loop
[[19-sealed-sensors]] §4.2 identified **homogeneous shortfall** (18 t of correct maize
sold as 22 t) as the residual fraud that sensors cannot catch, requiring the
season-record cross-check.

**Input suppliers on-platform supply the other half of that check directly.** Seed and
fertiliser purchases → implied planted area → implied harvest band. That is exactly the
agronomic loop closure from [[18-accomplice-fraud-and-the-container]] §4.1 — **and now
both sides of it are on the platform as ordinary transactions.**

⟹ **The oversell check stops depending on a yield model that does not exist
([[21-buhera-west-audit]] §8) and starts depending on purchase records that do.**

### 4.3 The transporter is no longer a bolt-on third leg
[[15-marketplace-not-certifier]] §4.1 proposed the transporter as the third validation
leg to escape the 2-cycle. **In the multi-role model the transporter is simply a
participant like any other**, and there are typically several other roles present too.
The 3-cycle requirement is met **by the ordinary structure of the market** rather than
by a control bolted on for audit purposes.

### 4.4 Separation-cost pricing now has a market to price
[[23-rail-yield-and-phase-locked-finance]] §1.4 gave a computable link price:
`ς(σ) = Y* − Y(C_{−σ})`. **With transporters as accounts rather than external
contractors, that price has someone to be quoted to** — and the fare-as-line-integral
tariff becomes a thing participants can actually see and respond to.

## 5. ⚠️ What gets harder

Being straight, as has been the pattern:

- **⚠️ The registry problem grows.** Cell-disjointness ([[07-market-equilibrium]],
  three independent derivations) now governs a **role taxonomy** as well as a product
  taxonomy. "Miller" and "processor", "transporter" and "haulier", "input supplier" and
  "agro-dealer" must not be ambiguously routable cells. **Same gate, wider registry** —
  and this is the layer most likely to be got wrong early and be expensive later.
- **⚠️ Coalition search is combinatorially worse than pair matching.** Finding *a*
  closing coalition is tractable; finding the *optimal* one across all participants,
  roles, and windows is `C_hard`. **Clear greedily and often; do not promise optimal
  coalitions** — unchanged from [[17-barter-exchange]] §5.1, but now the default case
  rather than an edge case.
- **⚠️ More roles means more surface for the mechanism-design gap.** Every additional
  participant type is another party who can misreport, and the corpus still supplies
  nothing here. Coalition formation in particular has well-known strategic pathologies
  (a participant joining only to be bought out) that are **pure mechanism design.**
- **⚠️ Dimensional typing is now unavoidable.** Millers charge per tonne milled,
  transporters per tonne-km, input suppliers per bag, storage per tonne-day.
  **Four different unit systems in one coalition.** Per [[20-s-entropy-dimensional-typing]]
  §1, S-entropy makes the arithmetic *work* — which is exactly why the strict type gate
  must sit in front of it, or a unit error clears silently.

## 6. ⭐ Why the dedicated repo is the right call

The user's stated reason — *too many repos contribute portions* — is confirmed by the
audits. The relevant material is genuinely scattered:

- **Theory** — `musande/epistemology`, `fourth-stomach/economic_agents`,
  `buhera/long-grass` (~30 papers)
- **Transport pricing** — `sighthound/moriarty/docs/rail-network-yield` ⭐
- **Weather plumbing** — `buhera-west`'s Open-Meteo client (~30 useful lines)
- **Positioning primitives** — `sighthound`'s parsers and multilateration
- **DSL work** — `cynegeticus/compiler`, `web/src/dendra`, `kwasa-kwasa/turbulance`

**But the audits also establish what a dedicated repo must NOT inherit.** Across four
independent codebases the same pattern recurs — **the claimed result produced by the
construction meant to test it** ([[24-moriarty-positioning-audit]] §5). The one document
that avoided it did so by being **small enough to check exhaustively.**

⟹ **The dedicated repo's first commitment should be methodological:** every number that
sits under a financial promise gets a test that **could have come out otherwise.**
Brute-force verification on small instances first, scale after.

**That is the discipline the corpus has never had, and it is the thing a serious
research project is actually for.**

---

## 7. Where this leaves the design

**The object:** a search engine over agricultural participants and goods, whose unit is a
**feasible coalition**, assembled backward from a desired end-state, admissible when its
cycle closes within accumulated floor.

**Why it works:** multi-role membership makes the participant graph non-bipartite, which
supplies odd cycles — **simultaneously the clearing structure and the ≥3 validation
structure.** One property, both problems.

**What it owns:** the index and the gate. Not price, not custody, not certification,
not position.

**What is still missing, unchanged and now well-characterised:**
1. **Mechanism design** — ~30 papers, zero. The largest hole, and coalitions widen it.
2. **Any empirical floor.** No yield model, no validated weather skill, no measured β on
   anything. [[21-buhera-west-audit]] §10.
3. **Location attestation** — [[22-sighthound-audit]] §7, conventional crypto, not built.
4. **Time windows and perishability** — absent from the one good transport paper
   ([[23-rail-yield-and-phase-locked-finance]] §1.5), and central to produce.

Links: [[00-framing]] · [[14-what-it-actually-is]] · [[15-marketplace-not-certifier]] · [[16-foreman-as-continuous-verification]] · [[17-barter-exchange]] · [[19-sealed-sensors]] · [[20-s-entropy-dimensional-typing]] · [[23-rail-yield-and-phase-locked-finance]] · [[24-moriarty-positioning-audit]] · [[21-buhera-west-audit]] · [[03-semantic-causal-propagation]]
