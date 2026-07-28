# buhera-west — audit against what the design needs

Repo: `C:\Users\kunda\Documents\physics\buhera-west`
Described by the user as *"an agricultural/weather analysis tool."*

I read it against the three places the design was already depending on it
([[16-foreman-as-continuous-verification]], [[19-sealed-sensors]]): the satellite leg
of decoder-disjointness, the yield band, and weather risk on delivery windows.

**Finding: the agricultural capability does not exist, and the weather validation does
not survive scrutiny. One 156-line file is reusable.**

I'd rather state this plainly now than build the exchange's forward-contract argument
on it and discover it later.

---

## 1. What is actually there

**Rust: ~57,500 lines, of which essentially zero execute — the crate does not build.**
Two independent hard blockers:

1. `Cargo.toml` declares six workspace members under `crates/` — **there is no
   `crates/` directory.** `cargo metadata` fails outright.
2. `src/main.rs:22-27` declares `mod weather; mod agriculture; mod spatial;
   mod forecasting; mod api; mod database;` — **none of those six exist.**

So the module named `agriculture` — the one the package description is about —
**is not present at all.**

**Python: ~5,200 lines.** One script runs against real API data
(`publication/atmospheric-trajectory-completion/validation/validate_trajectory_completion.py`,
1,462 lines). The rest (`couloir/docs/*/experiments/`, 2,842 lines) opens with
`np.random.seed(42)` and labels its own outputs `"(synthetic)"`.

**Tests: 10 test attributes repo-wide**, all in `config.rs`, `error.rs`, and a vendored
third-party file. **Zero tests on any scientific claim.** Declared benchmarks don't
exist. `Makefile`, `LICENSE`, `clippy.toml` are all 0 bytes. 166 occurrences of
`TODO`/`placeholder`/`unimplemented!` in `src/`.

## 2. ⚠️⚠️ The agricultural capability is `rand::random()`

One agricultural file exists: `src/environmental_intelligence/agricultural_enhanced.rs`
(523 lines). It defines `YieldPrediction`, `SoilBiology`, `IrrigationOptimization`,
`PrecisionAgriculture` — and populates every one with random numbers:

```rust
let yield_prediction = YieldPrediction {
    predicted_yield: 8.5 + rand::random::<f32>() * 3.0,
    confidence_interval: (7.0, 12.0),
};
```

**⭐ Note what `confidence_interval: (7.0, 12.0)` is: a hardcoded literal.** It does not
vary with the "prediction." It does not derive from anything.

**This is the single most dangerous artefact in the repo for our purposes**, and it is
worth being precise about why. [[16-foreman-as-continuous-verification]] §2.4 makes the
band the product: *"forward contracts must be banded — 12–15 tonnes, not 13.4 tonnes —
with the band being β, published."* Here is an object with **exactly the shape of that
band and none of its content** — a fixed interval wrapped around a random draw.

⟹ **It must be deleted, not adapted.** A band that carries no information is worse than
no band, because the design treats band width as the honest KPI.

Also absent: phenology, growing-degree-days, NDVI ingestion, any growth model. The
three crops (`"maize"`, `"wheat"`, `"sorghum"`) are hardcoded strings never used in any
calculation.

## 3. ⚠️ Zimbabwe / southern Africa: no substantive content

Despite the name (Buhera is a Zimbabwean district), **all empirical work is in Munich,
Germany.** No Zimbabwean data, no African crop calendar, no smallholder model. The only
hits are a marketing line about "Southern Africa patterns" as an **API-key-absent
fallback**, an ambient-audio config listing savanna sounds, and two catalogued-but-never-
fetched URLs (`weathersa.co.za`, `arc.agric.za`).

## 4. ⚠️⚠️ The weather validation, and why it doesn't hold

There **is** real observed data here — that's genuine and worth crediting. Open-Meteo
ERA5-derived reanalysis, really fetched, really compared. **But three defects, any one
disqualifying:**

### 4.1 The model is tuned to the data it is tested against
```python
Se_night = Se - 0.02   # nighttime Se is slightly below initial (pre-dawn)
Se_peak  = Se + 0.04   # daytime peak about 6K above morning
```
plus `Sk_mean = 0.72  # typical Sk for Munich conditions`, and a cosine bell between
hardcoded `SUNRISE = 7.0` / `SUNSET = 18.5`.

**The amplitude and phase of the diurnal swing are supplied to the model.** A model told
"the peak is 6 K above the morning" reproduces a 6 K peak. **The reported 2.78 K RMSE is
a curve-fit residual, not a forecast score.**

### 4.2 ⭐ There is no baseline — zero hits for `persistence`, `climatology`, `skill_score`
No persistence forecast, no climatology, **no comparison against the ECMWF/GFS output
Open-Meteo itself serves for free.** Without a baseline 2.78 K is uninterpretable — a
naive climatological diurnal curve for mid-latitude October lands in the same band.

The README concedes parity-at-best ("comparable to operational NWP") while claiming to
have overturned the field.

### 4.3 The headline pressure result is a known bug reported as a finding
RMSE 10.98 hPa, MAE 10.93 hPa — **near-identical, so the error is a constant offset.**
The code hardcodes `P_sea = 101325.0` while observed MSL was 964.9 hPa. **Open-Meteo
returns `pressure_msl`; it is fetched in `fetch_weather.py` and simply not used.**
One-line fix, left in and rationalised in the README.

### 4.4 The "8 stations" are not 8 stations
The docstring claims DWD stations and a radiosonde. The code queries **Open-Meteo at 8
lat/lon pairs** — 8 samples of one interpolated reanalysis field. ⟹ The paper's
"spatial uniqueness of S-entropy signatures across 8 stations" is **a property of the
interpolator**, not an independent measurement.

**Agricultural validation: none whatsoever.** No observed yields, no field trials, no
crop-cuts, no FAO/national statistics. Not weak — absent.

## 5. ⚠️ The theory is not driving the code

Grepping `src/` for the framework's own vocabulary:

| Term | Rust files containing it |
|---|---|
| `S-entropy` / `SEntropy` / `s_entropy` | **0** |
| `triple equivalence` | **0** |
| `floors` | **0** |

The apparatus from [[20-s-entropy-dimensional-typing]] and [[01-foundation-contact-graphs]]
is present in prose and in one Python file, **and absent from the Rust entirely.**

And in that one Python file it is a renaming layer. `S_e` is a **linear rescaling of
temperature** between 180 K and 330 K, and reconstruction inverts it exactly:

```python
# Se = (T - T_min) / (T_max - T_min)
T = T_min + Se * (T_max - T_min)
```

**`T → S_e → T` is the identity map.** Pressure is the standard barometric formula plus
a `-500.0 * (Sk - 0.72)` fudge. Density is `PM/RT` — the ideal gas law. Strip the
vocabulary and the pipeline is: *normalize temperature, relax toward a sinusoid,
un-normalize.*

Similarly `[0,1]³` boundedness — the *bounded phase space* that [[12-irreducible-bounded-phase-space]]
treats as a derived structural result — is achieved here by `np.clip(..., 0.0, 1.0)`,
and the resulting "Lyapunov exponent → 0" is a consequence of clipping a bounded ODE.

## 6. ⚠️ Signal-based atmospheric sensing: specified, not implemented

`src/signal/` is **21,391 lines across 21 files** — `gps_differential.rs`,
`mimo_oscillatory_harvesting.rs`, `solar_reflectance_atmospheric.rs`. All stubs:

```rust
pub fn compute_comprehensive_differentials(&self, _measurements: &[GPSSignalMeasurement])
    -> SignalDifferentials { SignalDifferentials::default() }
```

Every argument underscore-prefixed, every return `Default::default()`. **No GNSS delay
processing, no reflectometry, no cellular sensing.** The GPS data actually used is
ordinary smartwatch lat/lon, used to compute how much air a jogger displaced.

## 7. Data sources: one wired, ~30 catalogued

**Wired and demonstrably used — exactly one:** Open-Meteo Historical Weather API
(`archive-api.open-meteo.com/v1/archive`), no API key, via `validation/fetch_weather.py`.
Fetches temperature_2m, RH, dewpoint, surface/MSL pressure, wind, precipitation,
cloudcover, shortwave/direct radiation.

**Catalogued as metadata strings, never fetched:** MODIS, Landsat C2, NASA CMR, LAADS
DAAC, PO.DAAC, Copernicus, GOES-16, NEXRAD, GHCN-Daily, FLUXNET2015, ICOS, ISMN, SAWS,
ARC-ISCW. `src/data_ingestion/sources/mod.rs` is a registry followed by ~20 empty
functions (`// Will implement FAO agricultural data`).

Declared format deps (`netcdf`, `hdf5`, `grib`, `bufr`) are **dependencies no code calls.**
The only working `reqwest` calls fetch **academic paper metadata** from arXiv/CrossRef.

## 8. ⭐ What is actually reusable

| Design need | Reusable? |
|---|---|
| **(a) Crop state through a season** | **Nothing.** No phenology, no GDD, no NDVI, no growth model. |
| **(b) Yield banding with honest uncertainty** | **Nothing — actively harmful.** `confidence_interval: (7.0, 12.0)` has the shape of the band and none of the content. Delete. |
| **(c) Weather risk on delivery windows** | **The data plumbing only.** `fetch_weather.py` (~30 useful lines) is a clean key-free Open-Meteo archive client for arbitrary coords/dates. Genuinely portable. **The model on top of it is not.** |
| **(d) Lower uncertainty on an unharvested crop** | **Nothing.** Requires validated skill against observed outcomes; no prediction here has ever been compared to any agricultural outcome. |

**Take:** `fetch_weather.py`'s Open-Meteo pattern; and the URL list in
`data_ingestion/sources/mod.rs` **as a bibliography** — a research shortlist of
candidate feeds (MODIS, Landsat, GHCN-Daily, ISMN soil moisture, SAWS/ARC-ISCW), every
one currently an unimplemented string.

**Do not take:** any Rust (does not compile); any S-entropy machinery (it is
normalize→denormalize); any claimed metric (no baseline); anything from
`agricultural_enhanced.rs`.

## 9. ⚠️⚠️ The structural warning — this is the important part

The failure mode is not laziness. **It is that the framework guarantees its own
results.** When `[0,1]³` boundedness is enforced by `np.clip()` and then reported as
"chaos eliminated by construction," **the conclusion was assumed by the
implementation.**

That is the same pattern I recorded across the corpus in [[11-synthesis]] and
[[04-corpus-map]] — *"all 45/45 at 1e-15 results verify closed forms against
themselves"* — but here it has crossed from a paper into code that would sit under a
financial promise.

**An exchange makes real financial claims about unharvested crops.** It needs held-out
data, a persistence/climatology baseline, and calibration checked against realised
yields. **This repo supplies the vocabulary of rigour without its mechanics, and
adopting its framing would import that failure mode into the exchange wholesale.**

## 10. Consequence for the design

[[16-foreman-as-continuous-verification]] §2.1 claimed the satellite leg gives genuine
decoder-disjointness, and §2.4 built the forward-contract argument on a narrowing band.
**Neither is currently supported by this repo.**

- **The satellite leg is not built.** NDVI/MODIS/Landsat are catalogued strings.
- **The band is not built.** No yield model exists to band.
- **The weather leg is real but thin** — a working Open-Meteo client, which is a genuine
  starting point and not nothing.

⟹ **The `τ(C) > S♭(E)` argument still stands as theory but has no empirical floor
underneath it yet.** The lowering of β on a farmer's crop state is currently an
aspiration, not a measured quantity. **That is the gap to close, and it is now the
critical path for the whole forward-contract layer.**

Links: [[00-framing]] · [[16-foreman-as-continuous-verification]] · [[19-sealed-sensors]] · [[20-s-entropy-dimensional-typing]] · [[11-synthesis]] · [[12-irreducible-bounded-phase-space]]
