# yokozuna — six ideas extracted, and how each lands here

Source: `C:\Users\kunda\Documents\physics\buhera-west\frontend\yokozuna\src`

[[21-buhera-west-audit]] read the Rust and Python of the same repo and found essentially
nothing reusable. **This note reads the frontend, and the result is different in kind
rather than in degree.** The Rust did not compile; the frontend runs. What it computes
is mostly invented, but the *questions* it poses are the rails of
[[31-dashboard-design]] items 2 and 3, laid out in full before we wrote them down.

The user's framing, and it is the correct one:

> *"I knew the code was useless, and that is the whole reason I decided to have this
> framework here. I wanted you to extract ideas that we can implement here."*

⟹ **This is an extraction note, not an audit.** The measurement is recorded in §1 only
so the boundary is legible; §§2–7 are the six ideas and their landing sites.

---

## 1. The measurement, stated once

**72 of 189 source files call `Math.random()`.** Not for jitter, not for keys — for the
values themselves. That is the defining property of the codebase and the reason none of
it ports directly.

`wasm/agriculture_engine.js` opens with `// Mock WASM Agricultural Engine`. It is not
WASM, and there is no Rust behind it:

```js
yield_prediction: baseYield * (0.8 + Math.random() * 0.4),
pest_pressure:    Math.random() * 100,
getSoilQuality:   () => ({ ph: 6.0 + Math.random() * 2.0, nitrogen: 20 + Math.random() * 40 }),
```

This is the same artefact [[21-buhera-west-audit]] §2 found in
`agricultural_enhanced.rs` — `predicted_yield: 8.5 + rand::random::<f32>() * 3.0` — now
reimplemented in JavaScript. **The same shape twice, in two languages, is worth noting:
it is the part of the design that was hardest to fill and so got filled with noise
twice.**

⚠️ **Why this bites harder here than it would elsewhere.** `README.md` requires that a
recorded value be recomputable from the ledger years later by someone without the
model. `Math.random()` is the exact inverse: a value that cannot be recomputed *one
second later, on the same machine*. These are not wrong numbers awaiting correction.
They are the category the exchange exists to exclude.

**⭐ But the useful thing is accidental.** Real inputs and invented ones sit adjacent,
line by line:

```js
satrec: satellite.twoline2satrec(...tle),   // real — SGP4 orbital elements
swathWidth: 50 + Math.random() * 200,       // invented
```

**The boundary of the real data is visible in the source.** That is what §3 makes
permanent and deliberate.

---

## 2. ⭐ Idea 1 — A satellite position is a computation, not a lookup

**Extracted from:** `components/satellites/PathReconstruction.jsx`,
`components/satellites/StripImage.jsx`.

Under the invented metadata, the orbital mechanics is real and correct:
`satellite.twoline2satrec` → `propagate` → `gstime` → `eciToGeodetic`, producing
lat/lng/alt. That is SGP4, and it is **deterministic**: same TLE, same timestamp, same
answer, on any machine, in ten years.

**This is the only idea in the repo that clears the bar in `README.md`, and it does so
by a route the rest of the satellite rail cannot take.** A third party's soil-moisture
retrieval is `Asserted` — we take it on faith and it carries evidential weight `0.0`
per [[27-miracles-are-for-missing-information]] §4. A propagated position is different:
we record the TLE (138 bytes, with its epoch) and the timestamp, and **anyone can
recompute the position from what is in the ledger.**

This is also the direct answer to the correction the user made after the satellite
discussion:

> *"I was expecting the mixed use of public data and our own calculations..."*

**Public feed in — the TLE. Our computation out — the position.** The feed is not the
datum; the feed is the *input* to a datum we derive and can defend. That is the pattern,
and it generalises past satellites.

### How it lands

⚠️ **In Rust, not JavaScript.** buhera-west propagates in a `useEffect` and draws the
result — that is a visualisation. If a position is to be admissible it must be
byte-reproducible, which puts it in `olduvai-core`, not in the browser. The frontend
renders what the core computed.

**What it is actually for: overpass windows.** *"The next Sentinel-2 pass over your
address is in 4 days, 06:14–06:17 UTC"* is a real, checkable, unit-bearing fact that
requires no provider, no API key, and no trust in anyone. It is the first thing the
satellite rail can honestly say.

**Two defects not to carry over:**
- The TLE source is `cdn.jsdelivr.net/npm/globe.gl/example/datasets/space-track-leo.txt`
  — **a frozen example dataset vendored inside an npm package.** TLE accuracy decays
  within days. The real sources are CelesTrak and Space-Track.
- `id: Math.random().toString(36)` discards the NORAD catalog number that `satrec`
  already carries. The satellite has an identity; it should not be given a new one.

## 3. ⭐ Idea 2 — A placeholder is a state a value can be in

**Extracted from:** the adjacency in §1, generalised.

We already carry `{value, unit, source, precision}` ([[30-programming-structure]] §5.3).
Missing from that tuple is the ability to say **"someone authored this number and it is
standing in for a measurement."**

The distinction is not pedantic:

| State | Means |
|---|---|
| absent | We do not have it. |
| **placeholder** | **A person chose this number so the system would run. It has not been measured.** |
| present | Measured or derived, with provenance. |

We have at least two placeholders in the codebase right now with no way to say so in the
data: `foreman::UNKNOWN_PRECISION_BETA = 0.20` and `min_separation = 1.0` in
`analysis/cohesion.py`. Every constant taken from §4 would be a third, fourth, fifth.

⚠️ **Without this, §4 is not safely importable.** An authored scoring constant presented
as though it measured something is precisely the failure mode
[[21-buhera-west-audit]] §9 warns about — *the framework guaranteeing its own results*
— and precisely what the `bounded` check in `web/src/lib/ai/stages.js` was written to
reject in prose. It should be equally rejectable in data.

### How it lands

A variant on `Source` in `olduvai-core`, so that a placeholder is **structurally
incapable of being mistaken for evidence** — it fails the same guards `Asserted`
already fails, and additionally announces itself wherever it is displayed. The
frontend already has the vocabulary for this: `RailPage`'s `Declaration` component
says *"context, not evidence"* on an empty feed. A placeholder says *"authored, not
measured."*

## 4. Idea 3 — Classification as a pure function with named thresholds

**Extracted from:** `components/terrain/Classifier.js`.

`SoilClassifier.classifySoilType` and `analyzeErosionRisk` are the only substantive
non-random computation in the repo:

```js
riskScore += Math.min(slope * 2.5, 100);
riskScore += (1 - vegetationCover) * 30;
const soilRiskFactors = { sand: 20, silt: 35, clay: 15, loam: 10 };
```

No randomness, no model, no hidden state — inputs to score, auditable by reading it.
**That is the right form for anything this exchange computes about terrain**, and it is
the same form as `olduvai-core`'s deterministic synthesis: recomputable, parameterless
in the learned sense, inspectable.

`CropSuitabilityAnalyzer.cropDatabase` is similar and slightly better founded — maize
18–35 °C / 400–800 mm, wheat 12–25 °C / 300–600 mm. Those are approximately right and
traceable to standard references.

### How it lands

⚠️ **The shape is taken; the constants are not.** `2.5`, `30`, `{sand: 20, silt: 35}`
have no provenance whatever. Imported as-is they are invented thresholds wearing the
costume of a measurement.

⟹ **Every constant arrives as a placeholder (§3) or with a citation.** RUSLE and the
USDA drainage classes are published; someone has to go and read them and write the
reference next to the number. Until that happens the function still runs — it just
announces that its output rests on authored constants, which is honest and is a thing
the participant can weigh.

## 5. Idea 4 — Domain routing, arrived at twice

**Extracted from:** `services/backgroundDistillation.js`.

It splits the world into meteorology / agriculture / geology / oceanography /
environmental-integration. `web/src/lib/ai/agents.js` splits it into agronomy /
logistics / economics / scientific / general. Two projects, converging cuts.

That is **weak evidence the taxonomy tracks something real rather than being
arbitrary** — worth recording, not worth acting on.

⚠️ **Its concrete value is the mistake.** Every domain declares
`teachers: ['anthropic', 'openai']`: it ships the participant's queries to two
commercial APIs in order to train a local model. That is exactly the design the
Ollama-first base tier refuses, implemented in full. `web/src/lib/ai/ollama.js` states
the reason — *a participant describing a consignment is describing a commercial
position*. **Here is what it looks like when that reason is not observed.** Keep it as
a marker of where the line is.

## 6. Idea 5 — Idle time is when the expensive deterministic work belongs

**Extracted from:** the activity monitor in `services/backgroundDistillation.js` —
30 s of no input triggers background work.

The mechanism is in the wrong place and pointed at the wrong task, but the observation
holds: **there is a large class of work here that is expensive, deterministic, and
wasted if computed while someone waits.** Orbital propagation over a seven-day horizon.
χ enumeration over restricted growth strings. Overpass windows for every registered
address.

⚠️ Distillation is out (§5). And the home is almost certainly the Rust side on a
schedule, not a browser `setInterval` watching for mouse movement — a participant's
laptop is not a compute cluster and a page that heats their machine when they stop
typing is a bad neighbour. **Recorded as a question, not a feature.**

## 7. ⭐ Idea 6 — A reading carries its footprint the way a value carries its unit

**Extracted from:** `components/satellites/StripImage.jsx`, which invents
`swathWidth: 50 + Math.random() * 200` — and in inventing it, names the thing that
matters.

**A swath has a width.** A CYGNSS footprint is ~25 km. And a reading whose footprint is
larger than a farm **is not a fact about that farm** — it is a fact about a region
containing hundreds of participants.

This is the third of the three collisions from the satellite discussion, and it is the
one that is fixable in the type system rather than in prose. A 25 km reading is **by
construction not a distinguishing attribute**: it cannot separate two participants
inside the same footprint, so it cannot legitimately affect an address or a coalition.

### How it lands

**Every third-party reading carries a footprint as a required field**, in the same way
every value carries a unit. The parallel is exact:

- A bare number about a consignment is a defect because **it cannot be recorded**
  ([[30-programming-structure]] §5.3).
- A bare number about a location is a defect because **it cannot be attributed.**

With the field present, "this reading is too coarse to say anything about you
specifically" becomes a check the code performs, rather than a caveat I write in a
sentence that gets skimmed past.

---

## 8. What is deliberately not taken

| Area | Files | Why not |
|---|---|---|
| `components/pathtracing/`, `camera/`, `glb/`, `particles/`, `solar/`, `ocean/`, `Grass*` | ~40 | Three.js rendering. Accomplished, irrelevant. |
| `services/spotifyService.js`, `youtubeService.js` | 2 | A different project. |
| `services/weatherService.js` | 1 | Working OpenWeatherMap client, but a six-way env-var guess ending in `'your_api_key_here'`, and it `console.log`s API-key prefixes on every construction. If used, rewritten. ⟹ [[21-buhera-west-audit]] §8 already selected the better client: Open-Meteo, key-free. |
| `components/acquisition/` — `CellTower`, `MIMO`, `Lidar`, `Satellite` | 8 | Closest to the CML/GNSS-R discussion, and **every one is in the `Math.random()` set.** The idea of signal-based sensing, rendered rather than performed. Same finding as [[21-buhera-west-audit]] §6 for `src/signal/`. |
| `wasm/*.js` | 4 | Named WASM, is mock JavaScript. §1. |

## 9. Order of work

**⭐ Idea 1 first**, because it is the only one that produces admissible evidence rather
than context, and because it answers the user's correction directly: public feed in, our
computation out, verifiable by anyone holding the same TLE.

**Idea 6 alongside it**, because it is a field plus a check, and because it is what
stops the satellite rail quietly becoming a fiction generator once real feeds arrive.

**Idea 3 requires Idea 2** — the constants cannot be honestly imported until a
placeholder is a state a value can be in. Ideas 4 and 5 are recorded, not scheduled.

## 10. ⚠️ Unrelated, and urgent — a committed credential

`frontend/yokozuna/src/client_secret_1026084035716-….apps.googleusercontent.com.json`
is a **Google OAuth client secret**. It is tracked in git, not gitignored, added in
commit `063ba42`, and present on `origin/main` at
`github.com/fullscreen-triangle/buhera-west` — a public remote.

The file was not opened. **Treat the credential as compromised**: deleting or
gitignoring it now changes nothing, because the blob is in public history. Revoke the
OAuth client in Google Cloud Console (delete, not reset), issue a new one into
`.env.local`, and add `client_secret_*.json` to `.gitignore`. History rewriting is
optional and only meaningful after revocation.

Per `README.md`, the service is named and the value is redacted.

Links: [[21-buhera-west-audit]] · [[31-dashboard-design]] · [[30-programming-structure]] · [[27-miracles-are-for-missing-information]] · [[19-sealed-sensors]] · [[16-foreman-as-continuous-verification]]
