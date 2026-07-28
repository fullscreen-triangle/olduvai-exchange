# What Olduvai actually is

From the user, after the corpus read. **This supersedes several assumptions in the
earlier notes.** Recording the design as stated, then what the corpus says about it,
then what I think is genuinely at risk.

---

## 1. The thing itself

**Primarily a search engine.** Very detailed information on
agriculture / weather / transport, such that **anyone can find almost all the
information they need about that topic** — starting with Zimbabwe.

**Two user classes:**
- **Buyers** — anyone in the world wanting produce produced in Zimbabwe.
- **Farmers** — account holders who use the application as a **"foreman."**

**The goal:** connect any buyer to any seller, **optimise the transportation, and
that's it.**

**⭐ Explicitly NOT:** no warehouse, no product to sell. **The exchange holds no
inventory and takes no position.**

**Then the emergent layer.** That arrangement *becomes* a financial instrument:
> a European customer for South African beef could buy maize from a Zimbabwean farmer
> and then sell it to the South African rancher with a small markup — or do that to
> avoid fraud.

⟹ **a futures market, generating money for farmers without them borrowing from banks.**

Still to come: **geosciences / geolocation** material.

---

## 2. What this settles

### The fork from paper 1 is answered: Olduvai is the GATE, not the graph
[[01-foundation-contact-graphs]] left open whether the exchange is the contact graph
or the gate on one. **"No warehouse, no product to sell" settles it.**

The graph is the world — farms, roads, depots, borders, seasons, weather. Olduvai
does not own it and does not hold positions in it. **Olduvai is the gating function:
it fixes the ORDER — which buyer meets which seller by which route.** T5's exact
content: *the graph says what is reachable; the gate fixes the order, and order is
the trajectory's identity.*

That is a much better fit than "the exchange is a market with inventory," and it
means the T5/T7 results are the load-bearing ones, not the warehouse-receipt material.

### Vertices are ROUTES, not lots
Given "connect any buyer to any seller, optimise transportation," the individuated
part is not a lot and not a participant. It is a **(seller, buyer, route, window)
quadruple** — a *deliverable arrangement*. That is what gets priced, what gets a
cell, and what becomes the instrument.

### ⭐ The research question, answered by the design
[[11-synthesis]] listed four candidates. The design picks **(b) — the exchange as a
bridge-detector** — and the user said it in plain language: **"or do that to avoid
fraud."**

The intermediation-to-avoid-fraud case *is* the bridge structure. True farmgate
price, true delivery, true buyer — and an intermediate route that either does or does
not hold. **Endpoint audit cannot tell them apart. Only route audit can.** And the
whole product is routes. This is not a research question bolted onto a product; it is
the product.

---

## 3. What this invalidates in my earlier notes

Being explicit, because a lot of the corpus-derived design assumed a different animal.

| Earlier note | Status |
|---|---|
| Warehouse-receipt registry, double-listing prevention via address injectivity | **Mostly moot.** No warehouse. Survives only if receipts appear later as collateral. |
| Grade bands as the central design object, delisting grades that fail `τ > β` | **Demoted, not dead.** Grades still matter for the *futures* layer, but the search/matching layer is about **routes and availability**, not grade taxonomy. |
| Batched call auctions over continuous matching | **Probably wrong for the primary product.** Phase lock argues for it in a *clearing* market. A search-and-match service has no book to clear. It applies to the futures layer only. |
| Tick size = β, cell book, order book design | **Applies to the futures layer only**, not the search engine. |
| Inventory-cell reconciliation (Route II of the three-book check) | **Reinterpret.** With no inventory, Route II becomes **route/capacity cells** — truck slots, border windows, road segments. |
| `Θ = ∫\|G\|` as the activity metric | **Still good, and arguably better here** — a thin, seasonal, no-inventory matcher has almost no "volume" to report. |

---

## 4. What the corpus says about THIS design

### 4.1 The search engine — closure is the whole product
[[03-semantic-causal-propagation]] is now the most relevant paper in the corpus, and I
underweighted it.

**"Anyone should be able to find almost all the information they need"** is exactly
the **closure** criterion: a search is finished when **no further available catalyst
can add a new equivalence class.** Not when a confidence threshold is crossed.

And the two termination states are the product's core UX contract:
- **Convergent closure** — here is the answer.
- **⭐ Honest decline** — *"the sources disagree, and here are the distinct classes."*

For agricultural information in Zimbabwe — where a maize price genuinely differs
between a district survey, a border-parity calculation, and a trader's quote — **the
decline case is not a failure mode. It is the most valuable output**, and no existing
agricultural information service produces it.

**Namespace neutrality** matters enormously here: a local file scan, a remote API, a
satellite estimate, and a model inference are **computationally uniform catalysts.**
You can mix a farmer's SMS report with an NDVI raster in one chain, and the coherence
and saturation theorems apply unmodified. **No special-casing of "AI sources."**

**The rule of three** applies directly to every published figure: a price, a yield
forecast, a road-condition claim needs **≥3 independently-sourced mutually-supporting
catalysts**, or it is not robust against a single dissenting source. Decidable from
**signs alone** — no magnitudes needed.

### 4.2 The farmer-as-foreman — this is Agent Smith, almost exactly
[[09-epistemology-agents]] §E is now directly applicable rather than analogical.

A "foreman" is a **standing purpose with scenes** — `purpose minimise <residual>` with
a *standing* minimum (there is always more to farm), so the agent **runs on** rather
than halting. Scenes = plant / irrigate / spray / harvest / sell / hire. Each declares
what it serves; **a scene serving no declared purpose does not type.**

Two results that transfer immediately:

**⭐ The pure observer legitimises the farmer who watches for months and trades twice
a year.** Costs one cheap probe per tick, contributes nothing to the residual, **and
the instant the shared state changes so its act clears the price, the gate fires and
it acts.** > "A society may contain arbitrarily many pure observers at negligible
cost." For a Zimbabwean smallholder base that is *most* of your users most of the
time — and the corpus says admit them all, because **their presence is the latent
liquidity.**

**⭐ STRUCTURE-LIMITED as an emitted signal.** The foreman that stalls does not fall
silent — it emits *"more of the same act will not close this gap."* For a farmer that
is: *"no truck at any price will fix this; the road is out"* or *"no buyer at this
grade exists; the problem is the grade, not the price."* **Make unmatched-ness an
emitted typed signal, not an absence of results.** Absence of matches and structural
failure look identical otherwise — and in a thin market they are constantly confused.

**Release at sufficiency, not at completion.** The gate fires when the act lowers the
*parent* intent's residual, not when the farmer's own book is flat. That legitimises
partial fills and staged delivery as first-class and **prevents the deadlock where
every party waits for its own completion** — a real failure mode in smallholder
aggregation.

### 4.3 Transport optimisation — where the corpus is weakest, and you should know it
Both Buhera and the economics papers are explicit: **genuinely combinatorial
vehicle-routing with time windows and multi-drop is `C_hard` — no navigation
advantage, `O(N)`, no sub-linear promise.**

**⟹ Do not promise real-time optimal routing.** Batch it, use conventional solvers,
and say so. The corpus gives you the *classification*, which is worth having — it
tells you which queries are `C_0`/`C_1` (fast, promise them) and which are `C_hard`
(batch, don't).

**But the Kirchhoff material is genuinely useful for transport** — and this is where
the geolocation half will land. Edge weight = transport cost + spoilage in transit.
**`ω` is a logistics quote, not a statistical estimate.** `λ₂` of the
depot/corridor graph is a **market-integration metric**: low `λ₂` means Zimbabwe has
fragmented into disconnected islands with no cross-price transmission. **Publish it.**

### 4.4 ⭐⭐ The futures layer — the corpus is most emphatic and most cautionary here
This is where I'd be most careful, because the corpus gives one strong enabling result
and several hard constraints.

**The enabling result — no-inventory intermediation is legitimate and free.**
The netting law from [[10-buhera-subtree]]: **the aggregate is conserved; the
components are entirely free.** Legs may be negative, may exceed physical range, may
be individually absurd — *provided they sum.* That is exactly the European-buyer /
Zimbabwean-maize / South-African-rancher chain. **The intermediary holds no position;
the chain nets. The corpus says this is structurally sound.**

And `W_cat = 0`: **re-routing, re-matching, re-bundling are free and create nothing.**
Value is created only at the aperture — the truck moving, the inspection happening,
the payment settling. **⟹ Charge at the aperture, not at the match.** Free search,
free listing, free re-matching; fees on logistics, verification, settlement.

**The constraints:**

**⚠️ Path opacity means you cannot audit a chain by inspecting its legs.** Intermediate
positions carry **no information about correctness.** Margin and risk monitoring must
be **at the aggregate, never at the leg.**

**⚠️ And the same theorem says provenance is structurally invisible to the trading
receiver.** For a Zimbabwe→Europe chain with any certification claim — organic,
phytosanitary, deforestation — **you must build provenance as a SEPARATE receiver with
its own floor.** The matching engine cannot see it. This is the single most important
negative finding for the design as stated.

**⚠️ Two-party attestation is provably insufficient.** Farmer + buyer does not ground a
claim. **≥3 mutually-supporting, independently-sourced validators**, strongly
connected. For fraud avoidance — the user's own stated motive — this is the binding
constraint, and it is exactly what an intermediation-to-avoid-fraud product must
supply.

**⚠️ No mechanism design anywhere in 28 papers.** No incentive compatibility, no
strategic agents, **agents never misreport.** A futures market where farmers sell
forward against unharvested crop is *precisely* where misreporting pays. **The corpus
gives contract geometry and nothing about incentives. That layer is unwritten.**

**⚠️ And time is largely absent.** `shadrach` has no `t` at all — futures, expiry,
carry, seasonality are inexpressible. The Kirchhoff paper has horizons but assumes
**stationarity, which agricultural prices violate violently.** Its own fix is the
transaction clock — run on accumulated-activity time, not calendar time — which
absorbs seasonality. **That is the most promising available route, and it is
untested.**

---

## 5. The thing I'd flag hardest

**Increasing returns, from [[09-epistemology-agents]] §C.**

Water-filling — spreading attention across many markets — is optimal **only where
returns diminish.** A thin market that only becomes tradeable once enough presence
*makes* it liquid has **increasing** returns, and there the optimal agent
**concentrates.**

**A Zimbabwe-first agricultural matcher is exactly that case.** It is not liquid until
it is liquid. If you treat commodity coverage as a portfolio to spread across —
maize, tobacco, beef, horticulture, all at once — the single-price rule will correctly
compute that each deserves ~0 attention, **and none will launch.**

> The scheduler isn't miscomputing. **It is optimising an objective that does not
> describe the situation.**

⟹ **Concentrate until one corridor is liquid, then diversify.** One crop, one
corridor, one buyer class. Bootstrap contracts must be pulled *out* of the
water-filling pool and given dedicated undivided budget.

---

## 6. What I'd want to know next

1. **Does the geolocation material carry the transport graph?** — `ω` as an observable
   logistics quote rather than a statistical estimate is the strongest available
   footing, and it is the one thing the corpus repeatedly says makes the agricultural
   case *better* than the equity case.
2. **Is the futures layer meant to be a genuine market, or a bilateral forward book?**
   The corpus supports the second far better than the first. A genuine market needs
   the mechanism-design layer that does not exist in 28 papers.
3. **Who verifies?** ≥3 independent validators is a hard constraint, not a preference,
   and in Zimbabwe the question of *who those three are* is the whole design.
4. **`sachikonye2025knowledge`** — the bridge theorem is now the load-bearing result
   for the stated fraud-avoidance motive, and I still only have it second-hand.

Links: [[00-framing]] · [[03-semantic-causal-propagation]] · [[09-epistemology-agents]] · [[10-buhera-subtree]] · [[11-synthesis]]
