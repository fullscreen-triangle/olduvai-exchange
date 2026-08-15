/**
 * Open-Meteo, read as a grid rather than as a point.
 *
 * # ⭐ Why this file exists separately from `lib/ai/sources.js`
 *
 * `sources.js` already calls this provider, keylessly, and returns **sentences** for a model to
 * read. This returns **cells** for a renderer to draw. Same provider, same provenance, two
 * consumers that need different shapes — and note 37 §4 is explicit that the second is not a
 * substitute for the first:
 *
 * > *"That note draws a 216-point field for a map; this reads one point for a sentence."*
 *
 * ⚠️ They are not merged because merging them would force one shape on both, and the shape that
 * lost would be reconstructed badly at the call site.
 *
 * # ⭐ The grid is measured, not assumed
 *
 * The whole point of the weather page is to state the provider's resolution honestly, so the
 * resolution had to be established rather than guessed. Three probes against the live API,
 * around −17.9, 31.0:
 *
 * | Requested latitudes | Returned | Reading |
 * |---|---|---|
 * | −17.900, −17.895, −17.890 (~550 m apart) | **all → −17.891037** | three requests, one cell |
 * | −17.95, −17.90, −17.85, −17.80 | deltas 0.070299, 0.070299, 0.0 | spacing **0.070299°** |
 *
 * ⭐ **The provider snaps every request to its own grid and reports where it landed.** The
 * returned coordinate is not the requested one, and the offset between them *is* the snap
 * distance. That is the note 34 §3 objection to the `d3`/IDW example turned from an argument
 * into a measurement: three points half a kilometre apart are one reading, so a smooth surface
 * drawn through them would be interpolating between values that were never separately sampled.
 *
 * ⚠️ **So every cell is returned at its `returned` coordinate, never its requested one.** Drawing
 * at the requested coordinate would show my own request pretending to be a grid.
 *
 * # ⭐ The grid is not square, and not a fixed lattice
 *
 * A 5×5 probe stepped at 0.070299° in **both** axes returned 21 distinct cells, not 25 — four
 * requests landed in a cell another request had already claimed. Measuring the longitudes
 * actually returned, row by row, shows why:
 *
 * ```
 * lat -18.031635   lon deltas  0.087549  0.087547  0.087550
 * lat -17.961336   lon deltas  0.087464  0.087462  0.087464
 * lat -17.891037   lon deltas  0.087378  0.087379  0.087377
 * lat -17.820738   lon deltas  0.087293  0.087294  0.087294
 * lat -17.750440   lon deltas  0.087210  0.087209  0.087210
 * lat deltas       0.070299  0.070299  0.070299  0.070298
 * ```
 *
 * ⭐ Latitude steps by a constant. **Longitude does not** — the step *shrinks* monotonically as
 * the rows move toward the equator, by about 0.000085° per row. That is the signature of an
 * **equal-area** grid: cells cover constant ground area, so their angular width widens with
 * latitude. It is a reduced Gaussian grid (the octahedral/icosahedral kind these models run on),
 * not a lat/lon rectangle.
 *
 * ⚠️ **Two things follow, and both are why this is measured here rather than assumed:**
 *
 * 1. Stepping the *request* by the latitude resolution in both axes under-samples longitude by
 *    ~20%, which is exactly the four collisions above. `lonStepAt` below steps by the measured
 *    longitude spacing instead, so the requested points land in distinct cells.
 * 2. **A renderer must not draw these as squares.** A cell is ~7.8 km tall and ~9.2 km wide here,
 *    and the width is a function of latitude. Drawing a square would assert a footprint the
 *    provider does not have — the same class of error as interpolating between cells, in the
 *    other axis. Each cell therefore carries its own `height_deg` and `width_deg`.
 *
 * # ⚠️ What this does not do
 *
 * No interpolation, no smoothing, no nearest-cell substitution for a gap. A cell the provider
 * did not return is absent from the result, and the renderer leaves a hole. Note 37 §4: *"the
 * gap **is** the declaration"*.
 */

/**
 * ⭐ Measured, not documented — Open-Meteo publishes model resolutions in kilometres and which
 * model serves a coordinate varies. This is the observed latitude step at the participant's own
 * location, which is the number the page is entitled to state.
 *
 * ⚠️ If the provider changes model or serves a different region at a different step, this stops
 * matching and the cells will overlap or gap. It is reported in the payload so the discrepancy
 * is visible on the page rather than silent in the code.
 */
export const RESOLUTION_DEG = 0.070299;

/** ~7.8 km. Stated in metres because the declaration's units are metres. ⚠️ This is the cell's
 *  *height*; its width is wider and varies — see `lonStepAt`. */
export const RESOLUTION_M = 7800;

/**
 * ⭐ The measured longitude step, as a function of latitude.
 *
 * Fitted to the five rows in the module doc: 0.087378° at −17.891037°, changing by
 * −0.00121° per degree of latitude moved toward the equator. ⚠️ A **local** fit, not a
 * projection formula — it is accurate across the few rows this grid spans and is not claimed
 * beyond them, which is all the request stepping needs.
 *
 * ⚠️ Deliberately not `RESOLUTION_DEG / cos(lat)`. That is the formula for an equirectangular
 * grid and it gives 0.0739° here, against a measured 0.0874° — an 18% error that would put
 * requested points back inside their neighbours' cells. The measurement disagrees with the
 * textbook relation because this is a reduced Gaussian grid, and where they disagree the
 * measurement is the one describing the provider.
 */
export function lonStepAt(latitude) {
  return 0.087378 + (latitude - -17.891037) * -0.00121;
}

/**
 * ⚠️ 5×5 = 25 points, one request. Open-Meteo accepts comma-separated coordinate lists and its
 * free tier counts a multi-coordinate call as one call per coordinate, so this is 25 units of
 * quota — not 1, and not free of consequence at higher n. 7×7 was the alternative and was
 * dropped: at 0.070299° a 5×5 already spans ~39 km, which is well past the scale at which a
 * single holding's weather is a meaningful question.
 */
const SPAN = 2;

const TIMEOUT_MS = 8000;

/**
 * Fetch the grid cells surrounding a coordinate.
 *
 * Returns `{ok: true, cells, resolution_deg, generated_ms}` or `{ok: false, reason}`. ⚠️ Never
 * throws — the same contract `lib/ai/sources.js` states for its own `get`, and for the same
 * reason: a failed source must degrade to a stated absence, not to a stack trace.
 */
export async function fetchWeatherGrid({ latitude, longitude }) {
  const lats = [];
  const lons = [];

  for (let i = -SPAN; i <= SPAN; i++) {
    const rowLat = latitude + i * RESOLUTION_DEG;
    // ⚠️ The longitude step is taken **at this row's latitude**, not at the centre's. Stepping
    // every row by the same width is what produced four collisions in the 5×5 probe: the grid's
    // columns are not vertical, so a rectangle of requests does not map onto a rectangle of
    // cells.
    const step = lonStepAt(rowLat);
    for (let j = -SPAN; j <= SPAN; j++) {
      lats.push(rowLat.toFixed(6));
      lons.push((longitude + j * step).toFixed(6));
    }
  }

  // ⚠️ `current` only. The daily block would multiply the response by seven arrays per cell for
  // a view that draws one value per cell, and the forecast question is `sources.js`'s to answer
  // in prose.
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lats.join(",")}&longitude=${lons.join(",")}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m` +
    `&timezone=auto`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let body;
  try {
    const r = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!r.ok) return { ok: false, reason: `HTTP ${r.status}` };
    body = await r.json();
  } catch (e) {
    return { ok: false, reason: e?.name === "AbortError" ? "timed out" : "unreachable" };
  } finally {
    clearTimeout(timer);
  }

  // ⚠️ **A multi-coordinate response is a JSON array, not an object.** The single-coordinate
  // form returns an object, so code written against `sources.js`'s shape and pointed at this URL
  // reads `body.current` as `undefined` and reports "no readings" for a response that arrived
  // intact. Both forms are accepted here so that a one-cell request is not a special case.
  const entries = Array.isArray(body) ? body : [body];

  /**
   * ⭐ Deduplicated by the **returned** coordinate, which is the measurement that makes this
   * more than a stylistic choice. 25 requested points do not produce 25 cells — neighbouring
   * requests snap into the same cell and come back identical. Keying on the returned pair means
   * the count in the declaration is the number of *distinct readings the provider made*, not the
   * number of questions I asked.
   *
   * ⚠️ Keying on the requested pair would have reported 25 readings from a provider that made
   * perhaps 9, which is precisely the overclaim this page exists to avoid.
   */
  const seen = new Map();

  for (const e of entries) {
    const c = e?.current;
    if (!c || typeof e.latitude !== "number" || typeof e.longitude !== "number") continue;

    const key = `${e.latitude},${e.longitude}`;
    if (seen.has(key)) continue;

    seen.set(key, {
      // The provider's coordinate. See the module note: never the requested one.
      latitude: e.latitude,
      longitude: e.longitude,
      // ⭐ The cell's real angular extent, carried per cell rather than derived once by the
      // renderer. A drawing that uses a single width for the whole grid is asserting a square
      // lattice, and the measurement above says there isn't one.
      height_deg: RESOLUTION_DEG,
      width_deg: lonStepAt(e.latitude),
      // ⭐ Free per cell, and finer than the forecast field: probe 2 returned elevations of
      // 1421.0, 1422.0 and 1430.0 for three points whose temperature was identical. Carried
      // here because note 37 §5 needs a keyless DEM and this is one, already paid for.
      elevation_m: typeof e.elevation === "number" ? e.elevation : null,
      temperature_c: c.temperature_2m ?? null,
      humidity_pct: c.relative_humidity_2m ?? null,
      precipitation_mm: c.precipitation ?? null,
      wind_ms: c.wind_speed_10m ?? null,
    });
  }

  const cells = [...seen.values()];
  if (!cells.length) return { ok: false, reason: "no readings returned" };

  return {
    ok: true,
    cells,
    resolution_deg: RESOLUTION_DEG,
    resolution_m: RESOLUTION_M,
    requested: { latitude, longitude },
    generated_ms: entries[0]?.generationtime_ms ?? null,
  };
}
