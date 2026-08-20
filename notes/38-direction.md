# 38 — The direction: probes, annotation, and the prompt that is everywhere

> *"The whole system has to have a 'direction'/purpose, read this paper
> `directional-model-ckg-catalogue.tex`"*

This note answers six asks in one design, because the paper says they are one thing. It is a
design note; §8 is the implementation order. Per the standing rule, **every rejection below names
its replacement in the same paragraph.**

---

## 1. ⭐⭐⭐ What the paper actually says, and why it settles the argument

The paper's central theorem (`thm:catalogue-table`) is one equation:

```
    cell(v)  =  Tab(v, v, P_rest)          the graph  =  the model at rest
    Tab(v0, x*, P)                          the model  =  the graph under process
```

⭐ **A causal knowledge graph and a generative model are not two systems needing an interface.
They are one map at two settings of its process argument** (`cor:one-object`: *"No translation
between them is required or possible: there is nothing to translate."*).

This is the direction the user asked for, and it is a strong claim with a concrete consequence:

> ⭐⭐ **Asking a question and building the profile are the same operation.**

Not "the questions are logged and later mined into a profile". The paper's `def:pair` includes a
**deposit map** that commits the residue of every process-side propagation into the graph as new
contacts, and `thm:blunt` makes that mandatory rather than optional — *"every act reduces the
instrument's uncommitted capacity and advances its record."* A system that answered questions
without depositing would be claiming to be the traceless instrument that `thm:no-perfect` shows
does not exist.

⚠️ So the user's sentence — *"any questions added are used to make the profile, which is a causal
knowledge graph"* — is not a feature request layered on top of a chat box. It is the architecture,
and a chat box that did **not** do this would be the specific thing the paper forbids.

### 1.1 ⭐ Why this repo is unusually well placed to take it

`thm:tau-agnostic` says the calculus is correct **for any term map**, and `cor:coarsen` says an
inaccurate extraction *coarsens* determinations rather than corrupting them. The term map
(`def:term-map`) is the single declared input: a function from sources to the set of distinctions
each draws. Nothing more.

⭐ **That is exactly the boundary this repo already draws around AI.** The three exclusions
(README ~106–112) keep models out of the address path, out of ranking, and out of deterministic
synthesis. `rem:term-map-is` puts the model in the one remaining place: *"a reading of unstructured
material… not a judgement about truth, relevance, or importance."* The exclusions and the paper
independently arrive at the same seam, which is the strongest evidence available that the seam is
real.

⚠️ And `purpose ckg` — already installed on this machine — implements precisely this construction.
Its `lens.toml` **is** a term map, and CLAUDE.md's hard-won lesson that `include.kinds` is the only
lever that matters is `def:refinement` observed empirically before it was read.

---

## 2. ⭐⭐ The six asks are one mechanism

| The user's words | The paper's object |
|---|---|
| "draw lines to create sections and annotate them" | a **source** contributing distinctions to τ |
| "information added to the profile, foreman" | the **deposit map** (`def:pair`) |
| "ask the ai questions related to that section" | a **process-side** evaluation `Tab(v₀,x*,P)` |
| "the profile, which is a causal knowledge graph" | the **catalogue side** — the same table at rest |
| grain price, ship movement, nearest airport | **probes** (`def:probe`) toward a target |
| "the whole system has to have a direction" | which of the two settings you are reading it at |

⭐ This is why the asks arrived in one paragraph. They are not six features; they are one loop:
**annotate → the annotation becomes a source → asking propagates through probes → the residue
deposits back as profile.** Building any one of them alone builds a chain, and `thm:linear-fails`
says a chain collapses when its terminus is removed.

---

## 3. ⭐⭐ Probes: what the extra APIs are *for*

The user's second ask — grain price, ship movement — reads as "wire more APIs". The paper says
what to wire them **as**, and the difference is load-bearing.

`def:probe` — a probe is a partial map that commits a contact and yields a new item.
`def:power` — its power is the fraction of above-floor alignment it closes toward the target.
`rem:probe-neutral` — ⭐ *"A probe may be a local computation, a remote retrieval, a deterministic
rule, or an inference by a trained model: none of the results below distinguishes these cases."*

⚠️ **That last one dissolves a distinction this repo has been enforcing too hard.** `lib/ai/sources.js`
and `lib/api/*.js` are two different worlds here. The paper says they are one kind of object, and
that a classification by kind is *"useful for scheduling — expected cost and latency differ — but
carries no weight in the theory."* Cost and latency are exactly what a scheduler needs, so the
existing split survives as a scheduling hint and stops being an ontological boundary.

### 3.1 ⭐⭐ Three probes, not one — `thm:triangle`

`thm:linear-fails`: a chain of probes each justified only by the next collapses when the terminus
is removed. `thm:triangle`: robustness requires **a directed cycle of length ≥ 3** — three probes
mutually supporting one another.

⭐ **This is the answer to "which APIs should I add", and it is not "as many as possible".** It is:
*for each question the system is meant to close, three independent probes or the determination is
not grounded.* For "where can I sell chamomile tea leaves" the current answer rests on Comtrade
alone — a chain of length one, and `thm:closure-stronger` explains precisely why it *looked*
confident: a single internally-consistent source always does.

⚠️ Note 36 §4.6 already recorded a **four**-source requirement from `thm:byzantine`, and asked
whether the four position sources are four independent channels or one counted four times. Three
and four are not in conflict: three is the floor for robustness against a *failure*, four is the
floor for robustness against a *lie*. ⭐ **The tea question needs three; the position question
needs four, and note 36's open question about channel independence stands unanswered.**

### 3.2 ⭐ Nearest airport — why it was always the right shape

> *"as for flights, wasn't the idea that, we locate the closest airport and then use data from
> there?"* and, earlier, *"in my other projects, I used the nearest airport as the first data
> reference."*

⭐ This is a probe in the exact technical sense, and a good one: it takes an item (a holding) and
yields another item (an aerodrome) by committing a contact. Its power is real because an aerodrome
is a **named, catalogued** entity carrying schedules, weather, and freight — distinctions a bare
lat/lng does not draw.

⚠️ It is also the honest reason flights currently show nothing. `/api/observe/flights` returns
`readings: []` because nothing ingests tracks, and the airport hop is what makes ingestion
*targeted* rather than a firehose: you do not want every aircraft, you want the ones using the
field your consignment would leave through.

⚠️ **Constraint carried from `routes.rs:385`, unchanged:** `flights` submits `corridor`, and a
corridor is *"distance from a line — not a place along it"*. The airport hop must not be allowed to
collapse into a fix — an aerodrome's coordinate is the *aerodrome's* position, not the
participant's, and folding it as a `fix` would drag the estimate onto a runway exactly as note
33 warns a mast would.

---

## 4. ⭐⭐ The map is a term map

> *"I wanted the maps to be 'interactive', that is, one can draw lines to create sections and
> annotate them (this is then information added to the profile, foreman etc)."*

⭐ **An annotated section is a source in `def:term-map`, and it is the highest-quality source the
system can get**, because it is the only one drawn by someone standing on the ground.

The mechanics, in the vocabulary already in this repo:

- A drawn polygon is an `Observation::Within` with `Source::Asserted` — already scheduled as note
  37 §7 item 7, and the shape is already accepted by `routes.rs` (`terrain` submits `within`).
- ⚠️ **Asserted, not instrument.** The user already ruled on this: *"If a farmer lies, they will
  get wrong results and thats it."* `cor:coarsen` is the formal version — a wrong term map
  coarsens, it does not corrupt.
- The **annotation text** is what supplies distinctions. The polygon alone draws one distinction
  (this region vs. the rest); the label "waterlogged in February" draws several, and those are the
  edges.

⚠️ **What is rejected, with its replacement.** A free-form annotation store keyed by polygon id is
the obvious build and it is wrong here: it is an edge table by another name, and note 36 §1.1
established that this codebase stores no adjacency structure *"and correctly so"*. **Replacement:**
an annotation is stored as `(address, text, taken_at, source)` and its relation to anything else is
**computed** from addresses by trie-factoring at read time, exactly as `trie.rs` already ranks. No
join table, no `relates_to` column.

---

## 5. ⭐⭐⭐ The prompt on every page

> *"on every side tab page, I expected the prompt to still be there, in the center of the page,
> with a transparent background… I mark some region on the map. I am then supposed to be able to
> ask the ai questions related to that section."*

⭐ **The prompt is not a widget that happens to appear on many pages. It is the process-side
evaluation of the table, and the page you are on is its seed `v₀`.** That is the whole content of
`Tab(v₀, x*, P)`: the question supplies the target, the page supplies the seed, the tab's probes
supply `P`.

This makes the omnipresence *derived* rather than a styling preference:

| Page | seed v₀ | probes available in P |
|---|---|---|
| terrain | the drawn section, or the holding | elevation, soil, weather |
| traffic | the haulage box | TomTom incidents, road graph |
| flights | the nearest aerodrome | schedules, freight capacity |
| prices | the commodity | Comtrade, IMF, exchange listings |
| position | the estimate | the four position channels |

⚠️ **A single global chat box with no seed is the thing to avoid**, and it is what the deployed
assistant currently is — which is why *"where can I sell chamomile tea leaves"* took two minutes
and said nothing. It had no seed, so every probe was equally far from the target and none had
measurable power. **Replacement:** the prompt carries the page's seed and the page's probe set,
and says so visibly above the input — *"asking about: the section you drew on the terrain map"* —
so the participant can see what the question is anchored to.

### 5.1 ⭐⭐ Two things the answer must do that a chat box does not

**(a) Decline, and say which classes it found.** `thm:decline`: every determination over a finite
probe registry ends in **convergent closure** (one class, report it) or **contested closure**
(several classes, report *decline* together with the distinct classes found). ⭐ This repo already
implements the principle — note 36 §3.5 calls it "the refusal principle", and the last commit
message is literally *"a planner that declines rather than guesses"*. The paper supplies the
missing half: **a decline must carry the classes.** "I could not determine this" is a worse answer
than "this splits two ways, and here they are."

**(b) Stop on closure, not on confidence.** `thm:closure-stronger` proves a determination can
satisfy any confidence threshold while an uninvoked probe would reach a *different* class.
⚠️ `rem:closure-failure` names the failure exactly: *"A single early source may report high
confidence purely because it is internally self-consistent."* **That is the Comtrade answer**, and
it is why it read as authoritative while being one source deep.

### 5.2 ⚠️ Where the AI is, and where it still is not

The prompt does **not** acquire the model any new authority. Mapping to the three exclusions:

| Exclusion | Still holds? | Why |
|---|---|---|
| Not in the address path | ✅ | addresses stay computed from coordinates |
| Not in ranking | ✅ | `thm:multiplicative` and `thm:waterfill` are arithmetic |
| Not in deterministic synthesis | ✅ | the table's output is a cut, not a generation |

⭐ The model's whole job is `def:term-map` — reading unstructured material (the annotation, the
question) into distinctions. `thm:tau-agnostic` is the licence: **the calculus is correct for any
term map**, so a fallible reader is safe to use. That is a much stronger safety property than the
current arrangement has, and it comes from restricting the model *more*, not less.

---

## 6. ⭐ Finding and pruning are two operations

`thm:separation-operators` / `prop:nec-subset`: reachability (what bears on the target) and
necessity (what may be discarded) are different computations, and `nec ⊆ reach` strictly.

⚠️ **This is a direct correction to how I have been using `purpose ledger`.** CLAUDE.md records
that a hub term makes it keep everything — goal `["parser"]` chaining through `code` to `billing`
kept every turn, 0% saved. That is `prop:nec-subset` observed and not understood: **`ledger`
computes reachability, and reachability is not relevance.** The missing operation is necessity,
which `prop:domination` says is *domination* — an item is necessary exactly when it lies on every
path from the target to some reachable item — computable in near-linear time.

⭐ Concretely for the profile: **reach decides what to show; domination decides what the profile
cannot lose.** A two-operator design, not one scored list.

---

## 7. ⭐ What is rejected, each with its replacement

1. **A global chat box** → the prompt carries the page as seed and names it (§5).
2. **An annotation join table** → `(address, text, taken_at, source)`, relations computed by
   trie-factoring at read time (§4).
3. **Adding APIs by count** → adding them in mutually-supporting threes toward a named target
   (§3.1).
4. **Airport as a position fix** → airport as a probe yielding an aerodrome item; flights stay a
   `corridor` (§3.2).
5. **Confidence-threshold stopping** → closure, with contested closure reported as a decline
   carrying its classes (§5.1).
6. **One relevance score** → two operators, reach and domination (§6).
7. **A `causes`-labelled edge** → unchanged from note 36 §1.1; identity is not in the label.

---

## 8. Implementation order

1. **✅ Done — OpenCellID accepts both key spellings** and the key is on the server. The second
   occurrence of one bug: a credential supplied under one name, read under another, reported as
   missing. `lib/api/opencellid.js` now accepts a set, and `observe/[source].js` gates on a set.
2. **Nearest aerodrome as a probe** (§3.2). Keyless OpenFlights data, note 31. Smallest item that
   is a genuine probe rather than a feed, and it unblocks flights.
3. **Map drawing → `Observation::Within`, asserted** (§4). Mapbox draw on terrain; the shape is
   already accepted by `routes.rs`.
4. **The seeded prompt** (§5) — centred, transparent, on every rail page, naming its seed.
5. **Decline carries its classes** (§5.1) — smallest change with the largest effect on the
   chamomile answer.
6. **Annotations as sources** (§4) — the deposit map, closing the loop.
7. **Probes in threes** (§3.1) — a second and third price source before the first is trusted.

⚠️ **Not on the list:** lifting the cohesion gate; any ontology or reasoner (note 36 §2, declined
on `thm:query-separation`); any stored adjacency structure.
