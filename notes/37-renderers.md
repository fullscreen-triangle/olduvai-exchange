# 37 — Replacements for everything note 34 §3 rejected

Status: **design**. Nothing here is built yet. Written because note 34 §3 has a defect of
form, not of reasoning.

---

## 0. ⚠️ The defect

Note 34 §3 rejected four things — `react-globe.gl` + `satellite.js`, the `d3` weather
example, `three-geo`, and the submarine-cable map — and **every rejection ends at the
rejection.** The reasons are still correct. The form is wrong, and the correction is the
user's:

> *"you skipped out everything and gave reasons for it, which is fine, but then, nothing to
> replace that was given. As in, if you do not like some idea, then you should provide an
> alternative. For example, react-globe was considered insufficient, and no replacement. You
> could easily have just generated a globe using threejs, and done the same. The d3 weather
> example, you said uses idw interpolation, fine, can't you implement what works with the
> page's declaration. Three-geo for terrain is a rotatable mesh where whats needed is soil
> elevation, fine, thats why I provided cesium and mapbox and react-three-map, all that could
> solve that problem"*

⭐ **"This library is wrong" and "no visualisation belongs here" are different claims, and
§3 wrote the first while acting on the second.** Each objection was specific and each has an
answer that keeps the objection intact:

| §3 rejected | Because | ⭐ The objection survives if |
|---|---|---|
| `satellite.js` | propagation must be recomputable from the ledger | **we** propagate — `olduvai-core::orbit` through WASM — and only the *drawing* is a library |
| the `d3` example | IDW invents values between grid points | we draw the grid **as** a grid: one mark per cell at the provider's stated resolution |
| `three-geo` | a rotatable mesh is not the soil/elevation relation | render the relation — elevation against the thing it constrains — not the terrain |
| cable map | a landing point constrains nothing about a consignment | ✅ **stands, with no replacement.** See §6 |

⚠️ Note 34 §3 already said *"None of these is a permanent ruling. If a renderer earns its
place it goes inside the relevant page, below the statement of what the reading
constrains."* That sentence describes the pattern and names no instance of it. This note is
the instances.

---

## 1. ⭐ The pattern already exists and was not written down

`components/PositionMap.js` is the thing §3 said would happen one day. It is worth stating as
a rule because all four replacements below are the same rule:

> **Draw the uncertainty first. Draw the value only if it was measured.**

Its implementation of that: a filled circle of radius sigma in *geographic* coordinates, and
a centre dot **only** when `rests_on_observation` is true. Uninformed, there is a 200 km disc
and no dot.

⚠️ Two decisions in it are load-bearing and are the reason it is a model rather than an
example:

- **The disc is a GeoJSON polygon, not a `circle-radius` layer.** Mapbox sizes `circle` in
  screen pixels, so a styled circle keeps its size as you zoom and therefore encodes nothing
  about ground distance. The uncertainty is metres on the ground; it has to scale with the
  map or it is decoration.
- **A missing token renders a sentence, not a broken canvas.** "The deployment was not
  configured" and "the map is broken" are different claims.

⭐ So the test a renderer must pass here is not "does it look good", it is **does it become
less confident when the data does.** A pin cannot. A disc can.

---

## 2. Where a renderer mounts

`RailPage` takes **`children` as a render prop**, called with the endpoint's `body.data`
(`RailPage.js:121`), and it is called **only** when `body.ok === true`. A gated route never
reaches it. That is the whole integration surface and it is already correct.

⚠️ **But `Declaration` renders only on `status === "blocked"` (`RailPage.js:109-111`).** So
today no page can show both a declaration and live data — the moment a route starts
answering, the provenance chrome disappears, on exactly the pages where provenance is the
point. Note 34 §5 caught this same shape once already ("a constant that is true of every
current caller is a lie waiting for the next one").

⭐ **Fix before any renderer is built:** `Declaration` renders in `ready` as well as
`blocked`, and `PROVENANCE_CAPTION` / `CONSTRAINT_CAPTION` are exported so a child can label
its own marks with the same words the page uses. Duplicating those strings in a renderer
would let the caption and the drawing disagree, which is the §5 bug with a canvas.

Ordering inside a page, and it is not cosmetic:

```
blurb  →  Declaration (what this reading constrains, and its provenance)  →  renderer  →  Assistant
```

⚠️ The renderer goes **below** the constraint statement, never above it. Above it, the
drawing is the page and the sentence is a footnote — and the sentence is the part that stops
a corridor being read as a place.

---

## 3. Satellites — a globe we propagate for

**§3's objection, unchanged:** `satellite.js` propagating in the browser puts the arithmetic
on the wrong side of the line. The element set and timestamp go in the ledger and the
computation is published, so an overpass must be recomputable by a third party years later. A
figure lifted from a browser widget is not.

⭐ **The objection is about the propagator, not about the globe.** Replacement:

- **Propagation:** `olduvai-core::orbit`, compiled to WASM and called from the page. Same
  code the server runs, same bytes.
- **Drawing:** `three` directly — a sphere, a texture, a polyline per ground track, a marker
  per overpass window. This is roughly 150 lines and has no opinion about orbits, which is
  exactly what we want from it. `react-globe.gl` was rejected for bundling a propagator and a
  camera opinion we do not need; `three` is the same drawing without either.

⚠️ **Blocked on two things that are absent, and neither is the renderer:**

1. **`olduvai_core::orbit` is not exported to WASM.** `crates/olduvai-wasm/src/lib.rs` exports
   11 functions — `encode`, `decode`, `agent_check`, `water_fill`, `accept_proposal` and
   friends — and **none of them is `orbit` or `fusion`**. There is also **no built wasm
   package anywhere in `web/`**: no `pkg/`, no `.wasm`, no `wasm-pack` step in
   `package.json`. The crate compiles and is not wired to the client at all.
2. **No TLE ingestion exists.** Nothing fetches Celestrak or Space-Track. `no-elements` is
   the honest gate and it names this precisely.

### 3.1 ⚠️ A false claim in the code, to be corrected

`web/src/pages/api/observe/[source].js:43-46` states that `Estimate::update` is *"reached
natively by the server and **through WASM by this browser**"*. **That is not true.** No
fusion type crosses the WASM boundary and no wasm package is loaded by the web client.

⭐ It is worth recording *why* the sentence got written: it describes the design correctly and
was written while the design was the only thing that existed. A comment that describes an
intention in the present tense becomes a lie the moment someone reads it as a description of
the build — and this one would send a reader looking for a WASM call that is not there.
Correct it to say the browser does not fold anything today, or make it true. Either is fine;
leaving it is not.

---

## 4. Weather — the grid, drawn as a grid

**§3's objection, unchanged and the sharpest of the four:** the `d3` example's IDW
interpolation *invents values between grid points*. On a page whose declared purpose is to
state the provider's grid resolution, smoothing across it contradicts the page's own
declaration.

⭐ **Replacement, and it is the user's phrasing exactly — "implement what works with the
page's declaration":** draw **one mark per grid cell, at the resolution the provider
states**, and nothing between them.

- A square or a dot per cell, coloured by value, sized to the cell's real ground extent.
- ⚠️ **Visible gaps between cells are correct and must not be closed.** The gap *is* the
  declaration: it says the provider sampled here and here, and made no claim in between. A
  continuous field is a claim about every point in it.
- Open-Meteo returns its `generationtime_ms` and its grid coordinates; the cell the
  participant falls in gets an outline, the rest do not.

⚠️ This is strictly *more* faithful than the d3 example, not a reduced version of it. A
smooth heatmap and a grid of cells encode different claims, and only one of them is a claim
the provider made.

### 4.1 A live/gated contradiction to resolve first

`lib/ai/sources.js` **calls Open-Meteo keylessly right now** and it works (measured 176 ms).
`pages/api/feeds/weather` still returns 503 with *"which provider is a research decision"*
and gates on `OLDUVAI_WEATHER_API_KEY` — and gates **even when the key is set**, because no
provider client exists (`feeds/[feed].js:110`).

⭐ So the assistant answers weather questions from a live feed while the weather *page* says
the question of a provider is open. `sources.js:16-19` already calls this out. The renderer is
pointless until the route serves what `sources.js` has been serving all along; **wire
`feeds/weather` to the same Open-Meteo call first.**

---

## 5. Terrain — the relation, not the mesh

**§3's objection, unchanged:** a rotatable mesh is not what the page needs; what is needed is
the soil/elevation relation and the resolution it was measured at.

⭐ The user named three tools for this, and the correct reading is that they answer *different*
questions rather than competing for one:

| Tool | Answers | Use here |
|---|---|---|
| **Mapbox** (installed) | "where, on a real basemap" | ⭐ the holding, its cells, and — from note 31 §2 — **the boundary a farmer draws** |
| **Cesium** | "at what altitude, with what LOD, with what metadata, picked" | the terrain page proper; CZML at the presentation boundary (note 33 §8) |
| **react-three-map** | "a 3-D scene *registered to* a map" | the join — a mesh in Mapbox's coordinate space rather than beside it |

⚠️ **None is installed.** `web/package.json` today: `mapbox-gl@^3.28.1`,
`@google/model-viewer`, `framer-motion`, Next/React/Tailwind. No `three`, no `cesium`, no
`react-three-map`. Note 34 §3's *"no dependency was added; First Load JS unchanged at
~120 kB"* was true in a way it did not say — **the alternatives are not present either.**

⭐ **What to draw, and it is not a landscape:** elevation *against the thing it constrains*.
The declared units are `elevation: m`, `slope: deg`, `resolution: m`, and the observation is
a `Within` — a region, at the tile's resolution. So:

- the cell, at its **real** ground size, with its resolution printed on it;
- the elevation and slope as values attached to that cell;
- ⚠️ **no interpolated surface between cells** — same rule as §4, same reason.

A rotatable mesh drawn from a 30 m DEM looks identical to one drawn from a 90 m DEM, and the
difference between those two is the entire content of `footprint::Reading::is_distinguishing_for`.

⚠️ Terrain is gated `no-provider` on `OLDUVAI_TERRAIN_API_KEY` and no provider client exists.
**Pick a keyless DEM source first** — the same "keyless is an enforced design constraint"
rule that `sources.js:35-41` already applies to all four live sources.

---

## 6. ✅ Shipping stays rejected, and this is what a rejection with no alternative looks like

The submarine-cable map is the one item with **no replacement, deliberately.** A cable
landing point constrains nothing about a consignment of maize moving by road between inland
holdings. There is no better renderer for it because the *data* is unrelated to the exchange,
and freight corridors — the part that does matter — are already Transport on the process
rail.

⭐ Recorded explicitly so this note is not read as "every rejection was wrong." One of the
four was a rejection of an **idea**; three were rejections of **implementations** dressed as
rejections of ideas. Only the first kind may end without an alternative.

---

## 7. Order of work

⚠️ Every renderer below is behind a data problem, and in three of four cases the data problem
is the whole blocker. Building the view first produces a component with nothing to draw.

1. **`Declaration` renders in `ready`**, and the two caption maps are exported (§2). Small,
   and everything else assumes it.
2. **Correct or fulfil the WASM claim** in `observe/[source].js:43-46` (§3.1).
3. **Wire `feeds/weather` to Open-Meteo**, matching `sources.js` (§4.1).
4. **Weather grid renderer** — first renderer, because after (3) it is the only one whose
   data is real, and it establishes the "gaps are the declaration" rule in code.
5. **A keyless DEM for terrain**, then the cell renderer (§5).
6. **Export `orbit` to WASM + build a wasm package into `web/`**, then TLE ingestion, then the
   globe (§3). Longest chain, lowest urgency.
7. **Mapbox drawing for a farmer's boundary** → `Observation::Within` with a sigma from the
   region's size, `Source::Asserted`. ⭐ Note 31 asked for this and note 34 did not schedule
   it; it is the only item here that adds a *new observation source* rather than a view of an
   existing one.

⚠️ Dependencies to add, when their item is reached and not before: `three` (§3), `cesium`
and/or `react-three-map` (§5). Each is a real bundle cost and each should enter with the page
that justifies it, per note 34 §3's own closing rule.

---

## 8. The general form

⭐ **A rejection that names no alternative is not a decision, it is a deferral wearing a
decision's clothes.** §3's four objections were technically right and left the pages empty,
and empty pages read to the person using the system as "nothing was built" — which is the
same failure mode note 34 §8 recorded for outages: *"an outage that renders as an epistemic
limit is the most flattering possible lie about a deployment."* An unrendered page whose
absence is justified in a note the participant will never read is that lie in a different
layer.

⚠️ The rule going forward: **reject an implementation, name the replacement in the same
paragraph.** If no replacement can be named, then the objection is to the *idea*, and that
should be said plainly — as §6 does — rather than left to look like a pending task.

---

## 9. Measured: the tabs were preloading all along

**2026-08-20.** The report was *"for all the tabs on the dashboard, the information is supposed
to be preloaded… my position is supposed to be already on a map, that is already rendered, so is
my terrain, my traffic, the satellites around."* ⚠️ **The premise about preloading was already
satisfied, and the pages were still empty for two other reasons.** Recording the distinction
because acting on the stated diagnosis would have rebuilt a fetch layer that already works.

### 9.1 What was already there

- `RailPage` fetches its endpoint in a `useEffect` **on mount**. Nothing waits for a click.
- `PositionBootstrap` acquires position on dashboard entry and dispatches
  `olduvai:position-recorded`; `RailPage` listens and re-fetches on it.
- Every endpoint answers fast. Measured on the deployed server: `/api/position` 8 ms,
  `/api/feeds/terrain` 26 ms, `/api/feeds/weather` 35 ms, `/api/observe/gps` **5 ms**.

### 9.2 Fault one — four pages discarded the data they fetched

`RailPage` renders `{state.status === "ready" && children?.(state.data)}`. `gps.js`,
`satellites.js`, `flights.js` and `traffic.js` were each exactly `return <RailPage />;` — **no
render-prop child**, so `children?.()` had nothing to call.

⚠️ **GPS is the sharpest case and the one that proves the diagnosis:** it returned a real reading
in 5 ms and drew a declaration table and nothing else. A page that fetches successfully and
renders nothing is *indistinguishable to the reader* from a page that never fetched — which is
exactly why it was reported as a preloading failure. ⭐ The lesson generalises: a missing renderer
and a missing fetch look identical from the outside, so the visible symptom cannot identify
which one it is.

Fixed by `components/ReadingsList.js` (gps, satellites, flights — they share the `readings`
shape) and `components/TrafficList.js` (traffic returns incidents, a different shape).

### 9.3 Fault two — three sources had nothing to render

Renderers cannot invent data. Separately from §9.2:

| source | state | resolution |
|---|---|---|
| traffic | key present, **client unwritten** | ✅ `lib/api/tomtom.js`, this note |
| satellites | `readings: []`, no TLE ingestion | ⬜ open, see §9.5 |
| flights | `readings: []`, no provider | ⬜ open |

### 9.4 Traffic: the key was never the problem

Note 37's earlier entry records the `OLDUVAI_TRAFFIC_API_KEY` → `TOMTOM_API_KEY` rename, which
made the key *found* and moved the route to *"what is missing is the client that calls it."*
That client now exists.

⭐ **Probed before writing, not after.** `GET /traffic/services/5/incidentDetails` over a 0.2° box
around Harare with the deployed key: **HTTP 200 `{"incidents":[]}`**. So the key is accepted, and
**an empty array is a normal answer** — quiet roads, not an outage. `fetchIncidents` returns that
as `ok: true` with zero incidents, and `TrafficList` says *"roads clear"* naming the box it looked
in. ⚠️ Collapsing that into a blank panel would have made ordinary quiet roads look like the
failure this whole note is about.

⚠️ `bbox` is `minLon,minLat,maxLon,maxLat` — **longitude first**, unlike every other coordinate
in this codebase. Transposing it returns a well-formed 200 for a box in the wrong hemisphere,
which presents as "there is never any traffic here".

### 9.5 Satellites needs an engine change, not a renderer

`crates/olduvai-core/src/orbit.rs` already holds the whole computation: `Tle::parse`,
`propagate`, `look_angles`, `overpass_windows`, plus `MAX_USEFUL_AGE_DAYS = 14.0` and
`tle_epoch_age_days` on every result. ⭐ **Nothing mathematical is missing.**

What is missing is ingestion, and it belongs in the **engine**, not the BFF — the propagator is
Rust and the overpass depends on the participant's folded position, which only the engine holds.
Celestrak was probed and is viable: `gp.php?GROUP=resource&FORMAT=tle`, **keyless, HTTP 200,
1.3 s, 28 kB**, epoch current to the day.

⚠️ Per `routes.rs`: satellites submits **`within`**, not an overpass — *"an overpass is not an
observation of the participant at all — it is the window in which a sensor could have seen them."*
The ingestion must record the element set and the timestamp so the pass is recomputable.

### 9.6 Incidental: the server env file was CRLF-terminated

Seven values transferred by `scp` from Windows carried a trailing `\r`; the five written on the
server did not. ⚠️ **Next's dotenv parser strips it, so the runtime was never affected** — verified
by finding the inlined Mapbox token terminating cleanly in the built bundle. But `$(sed …)` in a
shell preserves it, and a `curl` probe of TomTom failed with `URL rejected: Malformed input`
before this was understood. Normalised on the server, backup kept as `.env.production.local.crlf.bak`.

⭐ Worth recording because the failure mode is *a credential that works in the application and
breaks in every shell probe of it* — which reads as a bad key and is not one.
