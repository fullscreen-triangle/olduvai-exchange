# 34 — What survived extraction from note 31

Status: **implemented** (`web/src/lib/navigation.js`, `pages/api/observe/[source].js`,
`pages/api/position.js`, `pages/api/process/[stage].js`, `lib/ai/agents.js`,
`components/RailPage.js`).

Note 31 supplied roughly 1,100 lines of example React across three items. The instruction
governing what to do with it was explicit and had been given twice:

> *"I knew the code was useless, and that is the whole reason I decided to have this
> framework here. I wanted you to extract ideas that we can implement here."*
>
> *"Its no issue if some items do not survive. The point was for extraction of relevant
> methods for this tool and using those, not replicating the cesium examples."*

So this note records the extraction, in the manner of note 33 §8: what was taken, what was
dropped, and why in each case.

---

## 1. Item 1 was already built

Note 31 item 1 asks for a staged AI system — Ollama as base, HuggingFace for specialised
domain models — and states:

> *"Every linked page in the sidebars is an agent instance of the main home page model."*

That sentence is implemented in `lib/ai/agents.js`, and was before this note was read. It is
worth restating *how*, because the obvious implementation is the wrong one: an instance is
**the same pipeline with one substitution** (domain, subject, gate), not a per-page bot. Five
bots with five prompts are five models that will drift, not five instances of one.

The ~440 lines of `AgriDashboard` example under item 1 — hover-zone sidebars, a five-step
`FOREMAN_STEPS` workbook, `generateWorkflow(data)` branching on crop stage, a static `PAGES`
copy object, inline `C`/`S` style objects — contributed nothing, because the thing they
illustrate exists in a form that satisfies the sentence more strictly than they do.

⭐ One idea from that example *did* survive, and it is not a code idea: **the foreman is a
rail entry**. It was in the note as a modal workbook. It is now a page on the process rail,
for the reason in note 33 §3 — it is a participant's own record of their own activity, which
makes it process, not context.

---

## 2. ⭐ The extraction that mattered: four rail entries are one thing

Note 31 item 2 lists a left rail of **Terrain, Satellites, Shipping, Flights, GPS,
Atmosphere, Economics, Traffic** — eight entries, with four unrelated rendering examples
(`three-geo`, `react-globe.gl` + `satellite.js`, a submarine-cable map, an OpenFlights arc
map) and four bare bullets.

Read as a task list, that is eight integrations. Read structurally:

⭐ **Four of the eight are position observation sources.** Satellites, Flights, GPS and
Terrain are four *shapes of input to `olduvai_core::fusion`* — a `Corridor` from an
overflying aircraft, a `Fix` from a handset, a `Within` from a terrain tile, an `Overpass`
computed from a TLE.

Note 33 reached that conclusion from the data side, a session earlier and from a completely
different starting point (the aircraft remark). The rail reaches it from the navigation side.
⚠️ They have to agree, or the rail is lying about what the pages are — so `kind:
"observation"` and `constrains: "<variant>"` are carried on those entries in the manifest,
and `pages/api/observe/[source].js` is **one route with four sources**, not four routes.

The three `kind` values now on every rail entry:

| `kind` | Meaning | Provenance |
|---|---|---|
| `observation` | Would contribute to `fusion::Estimate`; names its variant in `constrains` | varies — see §4 |
| `context` | Informs a person, never becomes a field | always `Source::Asserted` |
| `process` | A view onto the exchange's own record | n/a |

### 2.1 The entry note 31 does not have

⭐ **Position.** The note lists four sources and no page showing what they combine into.
Four individually-weak sources with no fold is four rendering demos; the fold is the entire
argument (*"A combination of noisy sensors plus kalman filtering produces more precise
data."*). `/dashboard/position` and `/api/position` are additions, not extractions.

⚠️ Its blocked response is the one worth looking at. It carries `sigma: "200 km"` and
`rests_on_observation: false` rather than nulls, because with no observations
`Estimate::uninformed` still returns an estimate — 200 km is *the encoding of "we do not know
where you are"*, not a missing value (note 33 §7). A spinner there would be less true than
the number.

---

## 3. What did not survive

**⚠️ Shipping.** The example is a submarine-cable map from submarinecablemap.com. This
exchange moves maize by road between inland holdings; a cable landing point constrains
nothing about a consignment. Freight *corridors* do matter — and are already Transport on the
process rail, where they belong, because a leg is process rather than context. Keeping
"Shipping" would have meant keeping a rail entry for the sake of the example that produced
it.

**⚠️ Atmosphere as a separate entry.** Folded into Weather. The note's own weather example
fetches eight parameters from one Open-Meteo call — temperature, humidity, pressure, dew
point, cloud, wind, precipitation. Those *are* the atmosphere. Two rail entries over one
provider call would have been two pages arguing about which one owns pressure.

**⚠️ Every rendering library.** `d3`, `react-globe.gl`, `three`, `satellite.js`. No
dependency was added; the build's First Load JS is unchanged at ~120 kB. Three separate
reasons, and only the third is about weight:

1. **`satellite.js` is the wrong side of a line we have already drawn.** Propagation is
   `olduvai-core::orbit`, reached through WASM, because the element set and timestamp go in
   the ledger and the arithmetic is published — so the overpass is recomputable by a third
   party years later. A figure lifted from a browser globe widget is not. This is the same
   "public feed in, our computation out" rule that makes `satellites` the one entry in the
   observe table declaring `source: "instrument"`.
2. **The `d3` weather example is a hand-rolled TopoJSON decoder, an IDW interpolator and a
   2,500-particle wind animation.** ⚠️ The IDW interpolation is the problem, not the particle
   count: it *invents values between grid points*. On a page whose entire declared purpose is
   to state the provider's grid resolution, silently smoothing across it would contradict the
   page's own declaration.
3. **`three-geo` for terrain is a rotatable mesh where what is needed is the soil/elevation
   relation and the resolution it was measured at.** `components/EarthViewer.js` already
   argued this once for the landing page ("all cost, no benefit, at this scope") and the
   argument has not changed.

⭐ None of these is a permanent ruling. If a renderer earns its place it goes *inside* the
relevant page, below the statement of what the reading constrains — not in place of it.

---

## 4. An observation declares what it constrains, not what it knows

This is the load-bearing consequence of the aircraft remark, now carried through four layers
so it cannot be lost at any one of them:

| Layer | Where it appears |
|---|---|
| Manifest | `constrains` on each observation rail entry |
| Route | `SOURCES[x].constrains`, plus a per-source `sigma` in prose |
| View | `CONSTRAINT_CAPTION` in `RailPage.js` |
| Agent | `CONSTRAINT_NOTE` in `agents.js`, injected into the system prompt |

⚠️ The agent layer is the one that is easy to skip and expensive to skip. An agent on the
flights page asked *"so where am I"* has every incentive to answer with a point — the blurb
says "tracks crossing your area", and a track has coordinates. The honest content of a
corridor is its **along-track silence**, and silence is exactly what a model fills in unless
told not to. So the prompt says, verbatim, that the reading *"says nothing whatever about
where along that line the participant is, and you must not answer as though it did."*

The same block also states that no source here checks any other. That is the correction from
note 33 §1.1, restated to the model because it is the mistake I made first myself.

---

## 5. ⚠️ A latent bug the new sources exposed

`RailPage.js`'s `Declaration` rendered a **fixed** caption after the provenance value:

```js
<span className="text-light/90">{declaration.source}</span>
<span className="text-muted/60"> — context, not evidence</span>
```

That was accurate for as long as every declaration came from `api/feeds/[feed].js`, where
`asserted` is universal *"deliberately and without exception"*. The observation sources broke
it: `satellites`, `flights` and `gps` declare `source: "instrument"`.

⭐ Left alone it would have labelled **our own recomputable computation as non-evidence, on
the very pages where that distinction is the entire point.** The caption is now derived from
the value (`PROVENANCE_CAPTION`), and an unrecognised provenance renders no caption at all
rather than a guessed one — a wrong caption there misstates whether a reading can carry
evidential weight.

Worth recording as a shape: a constant that is true of every current caller is a lie waiting
for the next one, and the ones that hurt are in the layer that *describes* data rather than
the layer that computes it, because nothing type-checks a sentence.

---

## 6. Four new gates, and why they are four

Note 30's existing gates all wait on the cohesion test or the ledger. These do not, and
collapsing them into `no-provider` would have sent people to configure APIs for no reason.

| Gate | Waits on | ⚠️ Not to be confused with |
|---|---|---|
| `no-observations` | A first reading | `no-provider` — ⭐ **the filter is built and tested**; the log is empty |
| `no-elements` | TLE ingestion | `no-provider` — element sets are public and free, so this is ingestion, not a commercial decision |
| `no-participant-record` | A participant recording activity | anything on the platform side — the foreman is advisory to one person |
| `no-forecast-method` | ⚠️ **a decision that an honest forecast is possible at all** | every other gate here, which waits on *work* |

⚠️ `no-forecast-method` is written as a gate that **may never lift**, and the wording says so
rather than implying a schedule. A yield prediction that cannot state what it rests on is a
number that will be read as evidence. The third AI exclusion — an entry must be recomputable
from the ledger years later by someone without the model — exists precisely because a
plausible unrecomputable number is worse than no number.

⭐ Predictions is also the one page assigned domain `general` rather than `agronomy`. A yield
specialist there would be a model with an opinion about the forecast, on the one page whose
entire content is that no forecast method has been chosen.

---

## 7. Verification

`npm run lint` — clean. `npm run build` — 23 routes, all 17 dashboard pages and 12 API
routes present, First Load JS unchanged at ~120 kB (no dependency added).

⚠️ Every new page was blocked, and every new route returned 503 with its gate. That was the
correct state, not an unfinished one: `RailPage.js` fetches rather than rendering the gate
statically, so these pages light up on their own the day an endpoint answers.

⭐ **That day arrived for four of them, and no page changed.** Position, GPS, Terrain and
Flights now answer 200 the moment `olduvai-server` is running, because §8's first item is
done — the machinery was always the missing part, not the view. This is the check the design
was making: if lighting the pages up had required editing them, the gate would have been
decoration rather than a fetch.

---

## 8. Done, and what it taught

**`/v1/position`, `/v1/observe/:source`, `/v1/foreman` exist upstream.** `routes.rs` and
`participant.rs` are new; `positions.rs` lost its module-wide `allow(dead_code)` as its own
doc instructed, keeping targeted attributes with reasons on the two members a route genuinely
should not call. 197 tests pass, clippy is clean at `-D warnings`, and the four endpoints were
exercised end-to-end through the BFF against a running server.

Three decisions came out of building it that were not visible from the design:

### ⭐ The source/shape pair had to be *enforced*, not documented

A provider wired to `flights` posting a `fix` would be folded isotropically — inventing the
along-track position `Corridor` exists to withhold. ⚠️ And it would produce a **tighter**
sigma, so it would read as an improvement. `routes.rs` refuses it with 422 `wrong_shape`. The
BFF keeps its own copy of the table as documentation for a reader, and the server's copy wins,
because a check in the BFF is admissibility logic in the BFF.

### ⭐ `satellites` constrains `within`, not `overpass`

`overpass` was a category error hiding in a table, and it was in *three* files. An overpass is
the window in which a sensor could have seen a holding; the observation is the reading taken
during it, and a reading covers ground. `constrains` names an `Observation` variant, and
`overpass` is not one — the manifest was telling anyone wiring a provider to send a shape that
would be refused.

### ⚠️ An outage must never be reported as a fact about the data

The sharpest thing this session surfaced, and it was live behaviour that showed it rather than
any test. With the server stopped, `/api/observe/gps` reported `no-observations` — *"Nothing
observed yet"* — and `/api/process/foreman` reported `no-participant-record`. Both are claims
about the participant's record, produced by a stopped process. A participant with a hundred
readings would have been told they had none.

⭐ **An outage that renders as an epistemic limit is the most flattering possible lie about a
deployment**, because it reads as honesty. `upstream-unreachable` is now its own gate, and the
routes distinguish it from the gates that describe genuinely unbuilt things — payments still
falls to `gate-and-ledger` when the server is up and the route 502s, which is the case that
matters.

---

## 9. Open

- **Anisotropic covariance for `Corridor`** (note 33 §9) — would make flight tracks
  meaningfully stronger, and the flights page states a sigma that is currently across-track
  only by collapse rather than by construction. ⭐ Now the highest-value item: `Corridor`
  readings are accepted end-to-end, so the weakness is in the arithmetic rather than in the
  absence of a path to it.
- **Aerodrome and aircraft ingestion** — the sources themselves. Nothing writes to the log
  yet except a caller posting by hand.
- **`Observation` does not record its own source.** `GET /v1/observe/:source` filters the
  participant's log *by shape*, so `terrain` and a farmer's drawn boundary both produce
  `within` and the endpoint cannot tell them apart. ⚠️ Fixing it is a change to core's
  `Observation` and belongs there, not in a filter in the server.
- **`Positions` is in memory only.** Every log is lost on restart. The ledger is the eventual
  home, and the shape is already right — the log is the truth and the estimate is a cache that
  proves itself against it — but nothing persists.
- **`min_separation` in `analysis/cohesion.py`**.
- **A renderer inside a page**, if one earns it (§3). ⚠️ A CZML serializer, should a globe be
  built, belongs at the presentation boundary and nowhere else (note 33 §8).
- **16 npm vulnerabilities (1 critical)** from the Next 13 / ESLint 8 floor.

⚠️ Two gates in `navigation.js` are **not** on this list because they are not implementable:
`cohesion-gate` waits on an experiment that is allowed to fail, and `no-forecast-method` waits
on a decision that an honest forecast is possible at all — §6 states it may never lift.
