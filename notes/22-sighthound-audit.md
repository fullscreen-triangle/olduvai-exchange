# sighthound — audit against what the design needs

Repo: `C:\Users\kunda\Documents\physics\sighthound`
Described by the user as *"a tool for geolocation."*

Read against the places the design depends on it: **route audit** (the bridge theorem's
necessary-and-sufficient control, [[16-foreman-as-continuous-verification]]),
**mode-change checkpoints** ([[19-sealed-sensors]]), farm location/area, and transport
optimisation ([[14-what-it-actually-is]]).

**Finding: there is a real, conventional GPS-track-cleaning library here — roughly
2,000 usable lines of Rust plus a working parser set. The headline accuracy claim is a
lookup table returning its own input. Zero tests, zero ground truth.**

Same structural pattern as [[21-buhera-west-audit]], arrived at independently.

---

## 1. What it actually does

**GPS track post-processing**, not positioning. It ingests **already-computed lat/lon
fixes** from consumer fitness devices and cleans them: Kalman smoothing, cell-tower
triangulation, fuzzy quality scoring, Dubins interpolation, multi-device fusion.

**It is not positioning from raw GNSS.** No PVT solve, nothing upstream of the device's
own fix. Grepping the whole repo for
`rinex|ephemeris|pseudorange|carrier.phase|ionospher|tropospher|zenith.*delay` returns
**no hits in any positioning code.**

- **In:** GPX, TCX, FIT, KML, GeoJSON tracks; optional cell-tower records with RSSI.
- **Out:** smoothed trajectories, per-point confidence, JSON/CSV/GeoJSON.

## 2. ⭐ What is genuinely good here

Worth crediting before the criticism, because unlike [[21-buhera-west-audit]] there is
real competent work in this repo:

- **`sighthound-triangulation` (609 L) — the best code in either repo.** Conventional
  cell-tower multilateration done properly: log-distance path-loss RSSI→range, weighted
  centroid seed, **Gauss-Newton least squares, GDOP, RANSAC outlier rejection.** No
  S-entropy anywhere in it. This is ordinary, correct engineering.
- **`sighthound-core` (381 L)** — `GpsPoint`, haversine, bearing, R-tree index,
  Douglas-Peucker. Solid and unremarkable.
- **The parser set** — GPX/TCX/FIT/KML all work. FIT does the semicircle conversion
  correctly (`× 180 / 2**31`). **The most trustworthy code in the repository.**
- **`sighthound-filtering`** — the constant-velocity Kalman filter is real.

⚠️ Caveats within that: `ExtendedKalmanFilter` is a stub delegating to the plain KF
(*"In practice, this would implement the non-linear prediction/update steps"*), and
`ParticleFilter` uses `rng.gen::<f64>() * 0.001` — **uniform, not Gaussian, and
non-zero-mean, so it injects directional drift.** That is a bug, not a simplification.

## 3. ⚠️⚠️ The 0.22 m claim is a tautology

README: *"achieves 0.22 m positioning accuracy"* with **"Infrastructure Required: None
(virtual satellites)."**

Traced to source. In `cynegeticus/src/weather/circular_validation.py`,
`_derive_gps_from_s_entropy()` builds a lookup table pairing each S-entropy triple with
**the original GPS coordinates**:

```python
lookup_table.append({
    'S_k': state['S_k'], 'S_t': state['S_t'], 'S_e': state['S_e'],
    'lat': orig['lat'], 'lon': orig['lon'],   # ← the answer, stored
```

then "reconstructs" by nearest-neighbour over that same table:

```python
reconstructed_lat = best_match['lat']
reconstructed_lon = best_match['lon']
```

**The query set and the lookup set are the same 141 points.** Every point's nearest
neighbour is itself at distance 0, so it returns its own latitude.

⟹ **The residual 0.22 m is not positioning error — it is collision error** where two
distinct points produced near-identical S-entropy values. **Adding more GPS noise would
drive the number lower.**

Weather never enters this path. The code comment concedes it: `CRITICAL FIX: For true
circular closure, use the S-entropy DIRECTLY`. The actual atmosphere→position function
`backward_path.py` **is never called by the validation**, and hardcodes its destination
anyway (`lat = self.reference_lat`, plus a canonical 400 m ellipse).

**Separately broken:** `weather_apis.py` fetches *current conditions and a 7-day forward
forecast at run time* and compares them against a *predicted* Oct 2025 period.
Historical retrieval is disabled — *"Warning: Historical data requires subscription.
Using current weather as approximation."* **The "actual weather" is not the weather that
occurred.**

And *"trans-Planckian resolution δt = 7.51×10⁻⁵⁰ s"* is metadata copied from a GeoJSON
header. **Two consumer smartwatches sampling at ~1 Hz.**

## 4. ⚠️ No validation against ground truth, and no tests at all

**No test files exist anywhere in the repository.** No `test_*.py`, no `tests/`, no
`#[test]` or `#[cfg(test)]` in any Rust file. `pytest` is declared in dev-extras with
nothing to run.

**The Rust workspace does not build.** `Cargo.toml` lists nine members; three —
`sighthound-geometry`, `sighthound-optimization`, `sighthound-fusion` — **do not exist
on disk.** `cargo build` fails at manifest parse. *(Identical failure mode to
[[21-buhera-west-audit]] §1.)*

`validation_experiments.py` (595 lines) is **entirely synthetic** — every test operates
on `random.random()`. Two examples of self-fulfilling construction:

- **"Mean Recovery Constraint"** algebraically solves for the last component
  (`final_component = n_components * physical_state - total`) then confirms the mean
  equals the target. **It cannot fail.**
- **"Cross-Domain Coherence"** *hardcodes* the decay it claims to discover:
  ```python
  decay_rate = math.exp(-separation / 2.0)
  coherence = decay_rate * random.random()  # Bounded by decay
  ```
  then reports `monotone_decay: PASS`.

**One legitimate result:** `test_composition_inflation_formula` genuinely checks
`Γ(n,d) = d(1+d)ⁿ⁻¹` against enumeration. A valid combinatorial identity **with no
bearing on positioning.**

⚠️ **Every `__main__` in `cynegeticus/src/` hardcodes
`c:/Users/kundai/Documents/geosciences/...`** — a path that does not exist on this
machine (`kundai` vs `kunda`, `geosciences` vs `physics`). **None of those entry points
can execute as committed.** The eight 300-DPI publication panels and
`validation_summary.csv` (`GPS Closure RMSE, 0.22398883152816212, m`) are rendered from
the tautological lookup in §3. Six `.tex` files in `docs/publication/` are **0 bytes**.

## 5. ⚠️ No signal-based atmospheric sensing — and the causality is inverted

`atmospheric/` contains two files, neither about signal propagation:
- `aerodynamics.py` — OpenWeatherMap client + sklearn `RandomForestRegressor` for drag
  effects on **running performance.**
- `oxygen_uptake_rate.py` — VO₂ physiology.

**No GNSS-signal-delay sensing: not implemented, not aspirational, not designed.**

And the data flow runs **opposite** to what the exchange would need. Weather is *fetched
from an API* and used to model athlete aerodynamics. `_derive_S_k` reads **velocity
variance from a running watch** and calls the result air density:
`S_k = 0.55 + 0.15*np.tanh(cv*2.0)`, with fixed "Munich October" constants.

⟹ Relabelled, `S_k`/`S_t`/`S_e` are **three heuristics over velocity variance, velocity
magnitude, and turn angle.** They are trajectory features. Nothing downstream requires
the atmospheric interpretation — **the theory is separable from the code without loss**,
which is the same tell as [[21-buhera-west-audit]] §5.

**Dead code worth noting:** `sighthound-autobahn` (1,039 L) is an **RPC client to an
external binary not in this repo and never invoked by any pipeline**, serialising fields
like `metabolic_mode`, `atp_budget`, `consciousness_threshold`,
`fire_circle_communication`.

## 6. ⭐ What is reusable for the exchange

| Design need | Reusable? |
|---|---|
| **(a) Verify shipment route + mode changes** | **Partial — the best fit here.** Parsers + Kalman give a working ingest-and-clean path for carrier GPS traces. Mode-change detection isn't implemented, but speed/heading/stop features fall out of existing structures. **A starting skeleton, not a component.** |
| **(b) Farm location and area** | **No.** Nothing computes polygon area or boundaries. `haversine_distance` + R-tree are the only primitives — a few lines you'd rather write against a maintained library. ⚠️ Field boundaries need RTK/PPK survey data, which this repo has no path to consume. |
| **(c) Detect a journey that did not happen** | **No — and be careful.** Fuzzy plausibility scoring is inference over *already-trusted* inputs: it detects **poor GPS quality, not fabrication.** Anti-spoofing needs raw GNSS observables or a hardware root of trust, both absent per §5. |
| **(d) Transport optimisation over road networks** | **No.** `dubins_path.py` computes minimum-radius curves in **free space** — the aircraft/robot primitive, no road graph. The "SEBD Shortest Path (Graph-Free)" test is greedy nearest-neighbour over random 3-vectors; it does not find shortest paths and reports `WARN` when it fails to reach the goal. **Use OSRM/Valhalla/GraphHopper.** |
| **(e) Tamper-evident location attestation** | **No.** No cryptography, no signing, no hashing, no append-only structures, no key management anywhere. |

**Take:** the parser set, and read `sighthound-triangulation/src/lib.rs` before writing
your own — competent conventional work. Both small enough to reimplement in days **with
tests**, which you need regardless since none exist.

**⚠️ Do not carry any accuracy figure from this repo into a design document.** The
number is an artefact of a lookup table returning its own input and will not survive
review.

**⚠️ And specifically avoid `backward_path.py` near fraud detection** — it *synthesises
realistic-looking tracks from partition state.* A track-generator adjacent to a
route-verification system is a hazard, not an asset.

## 7. ⚠️⚠️ Consequence for the fraud architecture — this is the serious part

[[19-sealed-sensors]] and [[18-accomplice-fraud-and-the-container]] rest on **route
audit**: the bridge theorem says endpoint audit is provably insufficient and route audit
is **necessary and sufficient**. Mode-change checkpoints are the mechanism.

**Every one of those checkpoints is a claim about where something was, and when.** The
audit's strength is exactly the strength of that location evidence.

⟹ **Two things the design assumed and this repo does not provide:**

1. **Tamper-evidence.** §6(e): no cryptography of any kind. A GPS trace the transporter
   supplies, unsigned, is **an assertion, not a measurement.** [[18-accomplice-fraud-and-the-container]]
   §5 already flagged *"the seal is a bearer token"*; **the location record has the same
   problem and I had not flagged it.** ⚠️ **Correction to my own note:** I treated
   mode-change checkpoints as independent measurement lines. They are only independent
   if the location attestation is. Right now nothing makes it so.

2. **Spoofing detection.** §6(c): fuzzy scoring detects *poor GPS quality*, not
   *fabrication*. Consumer GNSS is trivially spoofable. **A fabricated journey is
   precisely the bridge structure the whole architecture exists to catch**, and this is
   the tool that was supposed to catch it.

**Neither is a framework problem. Both are conventional engineering** — signed
telemetry, hardware attestation, multi-constellation cross-checks, carrier-side
corroboration. **They belong on the build list, and they were not on it.**

## 8. Net

**Better than [[21-buhera-west-audit]]:** real algorithms exist here (multilateration,
Kalman, parsers), and they're worth reading. **Same failure at the top:** the headline
result is guaranteed by its own construction, there are no tests, the workspace doesn't
build, and the theoretical vocabulary is separable from the code without loss.

**For the exchange:** take the parsers and the triangulation as reference; write the
route layer fresh against OSRM/Valhalla with signed telemetry; and treat **location
attestation as an open problem the corpus does not address** — alongside the mechanism-
design gap it now sits next to.

Links: [[00-framing]] · [[21-buhera-west-audit]] · [[19-sealed-sensors]] · [[18-accomplice-fraud-and-the-container]] · [[16-foreman-as-continuous-verification]] · [[14-what-it-actually-is]] · [[20-s-entropy-dimensional-typing]]
