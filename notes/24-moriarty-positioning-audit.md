# moriarty: FWDC, positioning papers, and the validation-integrity finding

Location: `physics/sighthound/moriarty/docs/` + `moriarty/validation/`
Read: `fuzzy-weighted-deterministic-closure`, `coordinate-field-generator`,
`dual-domain-execution-model`, `bounded-topology-discrete-channels`,
`topological-positioning-script`, and the top-level `validation/` suite.

Companion to [[23-rail-yield-and-phase-locked-finance]], which covers the two on-topic
papers from the same collection.

**Finding: no validation in this subtree tests anything against real measured data.
Grep across every validation script for `requests|urllib|read_csv|pandas|noaa|osm|era5`
returns nothing — zero network calls, zero file reads. And in four separate cases the
committed results contradict the papers that cite them.**

---

## 0. ✅ Credentials — checked, not exposed

`validation/.env.local` holds four service keys (`NEXT_PUBLIC_CESIUM_TOKEN`,
`NEXT_PUBLIC_MAPBOX_TOKEN`, `OPENWEATHERMAP_API_KEY`, `TOMTOM_API_KEY`).

**Verified: `.gitignore:29` covers `.env*.local`, and git confirms the file was never
tracked.** No exposure. Mapbox and TomTom are billable, so rotation is cheap insurance
if the file has ever been shared by other means — but there is no leak.

⚠️ Worth noting for the design: **four live geodata services are configured and none of
them is read by any validation script.** The plumbing for real data exists and is
unused.

---

## 1. What FWDC is

`validation/fwdc_algorithm.py`. Nodes carry 2-D coordinates; every edge weight is
**synthesised on demand** as an interval around Euclidean distance:

```python
d = u.euclidean_distance(v)
weight = FuzzyInterval(max(0, d - self.beta0), d + self.beta0)
```

Separation cost `σ(v)` = cost of the best `s→t` path **avoiding** `v`, computed twice
(all-lower-bounds, all-upper-bounds). A node is ruled out when its σ-interval is
β₀-separated from the worst node's. Loop until nothing separates.

**Operationally: Dijkstra run |V| times inside a loop, with interval bookkeeping.**
O(|V|³ log|V|); 64 seconds for a 400-node grid.

### 1.1 ⭐ Why it cannot work as specified — a structural point

**β₀ is simultaneously the width of every synthesised interval AND the separation
threshold.** Rule-out requires `σ_min(u) > σ_max(v) + β₀` — but every σ is a *sum* of
intervals each ±β₀ wide, so on any path longer than one hop **the σ intervals are wider
than β₀ by construction.**

⟹ **Separation almost never fires.** That is not a tuning problem; it follows from the
definitions.

⚠️ **And this is the interesting part given [[23-rail-yield-and-phase-locked-finance]]
§1.6.** The rail paper's Prop 6.5 says the three-way equivalence holds *only when* the
physical floor, algorithmic threshold, and price lot are the **same** β₀. FWDC collapses
them into one number and **breaks** — because when the measurement floor and the
decision threshold are the same quantity, the decision can never resolve anything the
measurement cannot.

**⟹ Correction to how I stated the β₀-coincidence rule.** In
[[23-rail-yield-and-phase-locked-finance]] I wrote that the sensor resolution, dispute
threshold, and minimum lot "must be the same number." **That is the rail paper's
hypothesis, and FWDC is a worked example of the failure mode when you take it
naively.** The safe statement is: *the price lot must not be finer than the measurement
floor, and the decision threshold must be strictly coarser than the measurement floor,
or nothing is ever decidable.* Equality is the boundary case, not the target.

## 2. ⚠️⚠️ The committed results contradict the papers

Four cases, all checkable in the JSON:

| Claim | Where claimed | What the committed data says |
|---|---|---|
| "Lower β₀ → more nodes ruled out … validates negation proof theory" | `README_FWDC.md:103`, `VALIDATION_SUMMARY.md:34` | β₀ = 0.05, 0.1, 0.2, 0.5 give **identical** 7 nodes / 8 iterations. **Flat, not monotone.** |
| "Nodes ruled out via deterministic separation ✓" | `VALIDATION_SUMMARY.md:59` | `fwdc_validation_analysis.json:25`: **`"total_nodes_ruled_out": 0`** — the core mechanism never fires in 5 of 6 experiments. |
| 15×15 gap = 135.60, `gap ≈ 0.27·|V|^1.8`, R²=0.998 | paper `.tex:419` | JSON says **0.7999**. The value 135.60 **appears in no result file** — it is hardcoded into `generate_panels.py:115`. |
| "78.1% synthesis ratio (21.9% storage reduction)" | `README_FWDC.md` | Same analysis file, line 30: **`"synthesis_ratio": "1602.87%"`** — 161,137 edges synthesised from 10,053 possible. |

**⭐ The last one is the cleanest tell.** On-demand synthesis — the paper's central
efficiency claim — **measurably increases work by ~100× in the committed data**, and the
summary reports the inverse. The headline number comes from a code path
(`fwdc_analysis.py:150`) guarded by `all(r <= 1.0)`, **which silently drops the
contradicting experiment.** Experiment 6 synthesised 151,221 edges from a graph with
1,520.

**Credit where due:** the paper admits at `.tex:842` that continental-scale claims are
*"not empirically verified on real transportation networks."* **The abstract carries no
such caveat.**

## 3. ⚠️ The four failure modes, all present

**(b)/(c) Parameter hardcoded to the answer** — `validation_experiments.py:131-151`.
Claim: optical transfer-matrix rank = min(N,K).
```python
expected_rank = min(n_layers, k_wavelengths)
U = np.random.randn(k_wavelengths, expected_rank)   # built WITH that rank
actual_rank = np.sum(s > 1e-10)                     # "measured" by SVD
```
**A rank-r matrix is constructed, then SVD confirms rank r.**

**(d) "Discovered" relationship hardcoded one line above** — same file, `:37-42`:
```python
# Empirically, cycle rank scales as roughly C ≈ 0.1 * n^1.9
base_rank = 0.12 * (self.n_modes ** 1.85)
```
**The comment claims empiricism; the next line is the assumption.** Theorem I "confirmed
by numerical validation" is confirming a literal.

**(c) Clipped to the claim** — `:158-175`: `estimate_mutual_information_simple` ends
`return np.clip(mi_bits, 0, 0.01)`. **The Observation Invisibility Theorem claims MI ≈ 0;
the estimator is clipped to ≤ 0.01 before comparison.**

**(a) Reconstruction returning its own input** — `celestial_positioning_experiments.py`.
`generate_measurement_matrix` builds rank **independent of position**; `triangulate_position`
then searches for the grid point whose rank best matches. Rank is constant everywhere, so
`np.argmin` returns index 0 every time. ⟹ **`position_error_m` is exactly 200.0 for all
four configurations** — the distance from grid edge to origin. **Reported as successful
triangulation.**

This is the **same failure mode as the sighthound 0.22 m lookup table**
([[22-sighthound-audit]] §3), independently instantiated.

**Coordinate field generator** — abstract reports **"9.88% error"**;
`validation_experiments.py:97` is `error_percent = np.random.normal(0, 12)`. **The
reported accuracy is the standard deviation typed into the noise model**
(`E|N(0,12)| ≈ 9.6`). No image is ever analysed — `extract_spectral_metric` receives
`img` and never reads it, and the docstring admits it: *"In real implementation, this
would do FFT analysis."*

**PoSL** — abstract claims *"validation on real-world atmospheric measurement networks."*
The script is 13 `np.random` calls and no data input. `ReplayAttackExperiment` sets
`prob_same_position = np.exp(-delta/5.0)` then draws detection from it — **the
"detection rate" curve is the assumed decay constant.**

**Two papers have no validation code at all:** `dual-domain-execution-model` and
`bounded-topology-discrete-channels` contain no `.py`; the latter's numbers come from
the hardcoded-rank script above.

**⭐ One genuine result, again:** `CompositionInflationExperiment` enumerates
compositions and checks `Γ(n,d) = d(1+d)^(n-1)`. **Real, and it passes.** Same result
independently confirmed in [[22-sighthound-audit]] §4. It is combinatorics, not
positioning — but it is true.

**Baseline grep across all five papers: no hits.** FWDC is **never compared against
Dijkstra or A*** despite being a shortest-path algorithm with both trivially available;
`README_FWDC.md:171` lists that comparison as *future work*.

## 4. ⭐ What to take — and it is mostly method, not code

### 4.1 The one idea worth keeping from FWDC
**Carry transport costs as intervals rather than point estimates, and refuse to rank two
routes whose intervals overlap by less than the measurement floor.**

That is sound procurement discipline for quoting delivery windows under traffic
uncertainty, and it is the honest version of "don't adjudicate sub-floor differences"
from [[19-sealed-sensors]] §4.1. **But it is ~10 lines over any router**, and the
interval width should be driven by **observed variance on your actual lanes**, not a
global β₀. You do not need this paper to implement it.

### 4.2 ⭐⭐ The rail paper's METHODOLOGY is the transferable asset
Confirmed independently by this reader as the only sound artifact in the collection:

> **Build the engine small enough to brute-force, verify the optimiser against
> exhaustive enumeration, and only then scale up.**

⟹ **Import that discipline into the exchange's matching and clearing tests.** Given
[[20-s-entropy-dimensional-typing]] §3 says backward matching is `log₃N` versus `Θ(N)`
forward, **a brute-forceable test instance is exactly how you check that claim honestly**
rather than accepting it from a paper.

### 4.3 What to build conventionally instead

| Need | Verdict |
|---|---|
| **Shortest path / transport** | **FWDC unusable.** Use OSRM, Valhalla, or pgRouting on OSM extracts — mature, benchmarked, and they handle turn restrictions and time-dependent costs FWDC has no representation for. Confirms [[22-sighthound-audit]] §6(d). |
| **Verifying a journey occurred** | **Nothing here.** Signed GNSS traces map-matched to the road network, plus weighbridge tickets, gate scans, carrier telematics. ⚠️ *"The threat model you actually face — a driver spoofing GPS, or a load swapped mid-route — is not addressed anywhere in these papers."* |
| **Tamper-evident attestation** | **PoSL's replay result is circular.** Take the standard construction instead: signed attestations with monotonic nonces, **hash-chained per-consignment custody logs** so retroactive edits are detectable. ⭐ Note this is the append-only requirement from [[15-marketplace-not-certifier]] §3.4 and T6 — **the corpus derives the requirement; cryptography supplies the mechanism.** |
| **Coordination without a central clock** | **Avoid the constraint.** SEBD is described, never implemented. A matching engine *wants* a total order — use a single logical sequencer, vector clocks/CRDTs for concurrent merge, Lamport timestamps plus idempotent handlers. **"No central clock" is a problem to sidestep, not engineer around.** |

## 5. Net

**Take from this subtree: the interval-ranking discipline (10 lines), and the rail
paper's brute-force-verification methodology. Nothing else.**

The wider significance is for [[00-framing]]. Across [[21-buhera-west-audit]],
[[22-sighthound-audit]], and now this, the same pattern recurs in independent
codebases: **the claimed result is produced by the construction that is supposed to test
it.** Four distinct instantiations — a lookup table returning its own input, a rank
built then measured, a noise σ reported as accuracy, a decay constant reported as a
detection rate.

⚠️ **And here it goes further than in the other two repos: the committed data
contradicts the published claim in four separate places, including one where the
efficiency result is inverted.**

**For the exchange this is the governing lesson, and it is a methodological one:** every
number that will sit under a financial promise needs a test that **could have come out
otherwise.** The rail paper is the one document here that meets that bar, and it meets it
by being small enough to check exhaustively.

Links: [[00-framing]] · [[23-rail-yield-and-phase-locked-finance]] · [[22-sighthound-audit]] · [[21-buhera-west-audit]] · [[19-sealed-sensors]] · [[20-s-entropy-dimensional-typing]] · [[15-marketplace-not-certifier]] · [[11-synthesis]]
