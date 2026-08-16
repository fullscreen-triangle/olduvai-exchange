/**
 * Elevation, from Open-Meteo's dedicated DEM endpoint.
 *
 * # ⭐ Why this is a separate file from `openmeteo.js`
 *
 * Same provider, different endpoint, and — the part that matters — **a different resolution by
 * two orders of magnitude**. `openmeteo.js` reads `/v1/forecast`, whose cells are 0.070299° tall.
 * This reads `/v1/elevation`, whose cells are ~0.00106°. Sharing a module would invite a reader
 * to assume one `RESOLUTION_DEG` governs both, and a terrain drawing at the weather grid's step
 * would be 73× too coarse while looking exactly as confident.
 *
 * ⚠️ The forecast endpoint *also* returns `elevation` per cell, and `openmeteo.js:204` carries it.
 * That field is the DEM averaged over a 7.8 km forecast cell, not the DEM. Both are honest; they
 * answer different questions, and this is the one the terrain page asks.
 *
 * # ⭐ The resolution is measured, not read off a documentation page
 *
 * Walking a single row of 40 points at 0.0005° spacing, around −17.891037, 31.0335:
 *
 * ```
 * 1458 1458 1456 1454 1454 1454 1454 1454 1456 1456 1455 1455 1455 1452 1452 1451 ...
 * change indices  2 3 8 10 13 15 17 18 20 22 23 25 27 28 30 33 37 38
 * gaps            1 5 2  3  2  2  1  2  2  1  2  2  1  2  3  4  1
 * ```
 *
 * Mean gap 2.1 samples × 0.0005° = **0.00106°**, about 90 m at this latitude. That is the
 * signature of a 3-arc-second DEM — SRTM or Copernicus GLO-90, which is what Open-Meteo
 * documents as its source. The measurement agrees with the documentation here, unlike the
 * forecast grid where it did not.
 *
 * ⚠️ **The gaps are not constant, and that is expected rather than noise.** A DEM cell boundary
 * falls where it falls relative to my sampling; runs of 1 and runs of 5 identical values are what
 * sampling a 90 m raster at 55 m looks like. The mean is the estimate; no single gap is.
 *
 * # ⭐ Why a separate probe was worth running
 *
 * A 7×7 probe at ~1 km spacing through the *forecast* endpoint returned **3 distinct forecast
 * cells and 31 distinct elevations**, spanning 1420→1479 m. The elevation field was already the
 * finest thing that endpoint returned. Finding a dedicated endpoint for it — same provider, same
 * keyless terms, separate quota, no forecast payload to discard — made the terrain page cheaper
 * and finer at once.
 *
 * # ⚠️ What this is not
 *
 * **It is not an observation of the participant.** Note 33 and `pages/api/observe/[source].js`
 * are explicit that a terrain reading constrains position only as a *region* — it says the
 * holding is somewhere within a tile. This client answers the inverse question: *given a position
 * already folded from the log, what is the ground doing there.* It reads the DEM **at** a place;
 * it cannot tell you the place. Nothing here may enter the observation log.
 *
 * No interpolation, no smoothing, no hillshade synthesised from a fitted surface. A point the
 * provider did not answer for is absent, and the renderer leaves the hole — note 37 §4, the same
 * rule the weather grid follows.
 */

/**
 * ⭐ Measured: mean 0.00106° between DEM value changes. See the module doc.
 *
 * ⚠️ Stated as the *provider's* cell, not as this page's sampling step. They are deliberately
 * different — see `SAMPLE_DEG` — and conflating them is how a drawing ends up claiming a
 * resolution nobody measured.
 */
export const DEM_STEP_DEG = 0.00106;

/** ~90 m at −17.9°. The characteristic width of one DEM cell. */
export const DEM_STEP_M = 90;

/**
 * ⭐ The sampling step, and it is deliberately **coarser** than one DEM cell rather than finer.
 *
 * Sampling at 0.00106° would return one value per DEM cell — the maximum honest detail. Under the
 * provider's 100-coordinate cap that buys a 9×9 grid spanning **0.85 km**, which is smaller than
 * many holdings. At 0.003° the same 81 points span ~2.7 km, reading roughly every third DEM cell,
 * which is the scale at which "what is the ground doing under this farm" is a real question.
 *
 * ⚠️ **That is a genuine trade, not a free improvement.** Two of every three cells between samples
 * go unread, and the drawing must not imply otherwise — which is why the caption names this step
 * and `DEM_STEP_DEG` separately rather than quoting the finer of the two.
 *
 * ⚠️ **Sampling below the DEM step would be the error in the other direction** — it returns
 * duplicate values from one cell and reports them as independent readings, which is exactly the
 * overclaim `openmeteo.js` deduplicates against. The floor below enforces that.
 */
export const SAMPLE_DEG = 0.003;

/**
 * ⚠️ **The provider caps a request at 100 coordinates, and says so:**
 *
 * ```
 * 101 → 400  "Parameter 'latitude' and 'longitude' must not exceed 100 coordinates."
 * 100 → 200
 * ```
 *
 * ⭐ Measured by bisection after a 15×15 = 225-point grid returned a bare `HTTP 400`. Recorded
 * here rather than left as a magic `SPAN`, because the failure it causes is silent in the worst
 * way: the request is well formed, the coordinates are valid, and the only symptom is a status
 * code with no clue which parameter was at fault.
 *
 * ⚠️ `/v1/forecast` has no such cap — `openmeteo.js` sends 25 coordinates and could send far more.
 * The two endpoints do not share limits, so a reader must not carry this number across.
 */
export const MAX_COORDINATES = 100;

/**
 * 9×9 = 81 points, one request, spanning ~2.7 km at `SAMPLE_DEG`.
 *
 * ⭐ Chosen against the cap above, not for roundness: 9 is the largest odd span whose square fits
 * in 100. **Odd matters** — an even grid has no centre point, so the participant's own position
 * would fall on a corner between four samples and the drawing would have no sample at the place
 * the page is about.
 *
 * ⚠️ `SAMPLE_DEG` rose from 0.002 to 0.003 at the same time. Holding it at 0.002 with the smaller
 * span would have shrunk the window to 1.8 km — narrower than many holdings — so the step widened
 * to keep the ground covered. That is a real loss of detail forced by the provider's cap, and it
 * is reported: the caption states the sampling step, so a reader sees 334 m and not an implied 90.
 */
const SPAN = 4;

const TIMEOUT_MS = 8000;

/**
 * Fetch a DEM sample grid around a coordinate.
 *
 * Returns `{ok: true, points, ...}` or `{ok: false, reason}`. ⚠️ Never throws — same contract as
 * `fetchWeatherGrid` and `lib/ai/sources.js`, for the same reason: a failed source degrades to a
 * stated absence, not a stack trace.
 */
export async function fetchElevationGrid({ latitude, longitude, step = SAMPLE_DEG }) {
  // ⚠️ Floored at the provider's own cell. A caller asking for 10 m spacing would get 9 identical
  // values per cell and a drawing 9× more detailed than the data. The floor is applied silently
  // but reported in the payload as `sample_deg`, so the page states what was actually done.
  const effective = Math.max(step, DEM_STEP_DEG);

  const lats = [];
  const lons = [];
  for (let i = -SPAN; i <= SPAN; i++) {
    for (let j = -SPAN; j <= SPAN; j++) {
      lats.push((latitude + i * effective).toFixed(6));
      lons.push((longitude + j * effective).toFixed(6));
    }
  }

  // ⚠️ Checked rather than trusted. `SPAN` and `MAX_COORDINATES` are two constants in one file
  // and nothing else ties them together — raising the span to 5 gives 121 points and a bare
  // `HTTP 400` that names no parameter. This turns that into a sentence naming both numbers.
  if (lats.length > MAX_COORDINATES) {
    return {
      ok: false,
      reason: `${lats.length} coordinates requested, but the provider accepts at most ${MAX_COORDINATES}`,
    };
  }

  const url =
    `https://api.open-meteo.com/v1/elevation` +
    `?latitude=${lats.join(",")}&longitude=${lons.join(",")}`;

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

  /**
   * ⚠️ **This endpoint returns a bare `{elevation: [...]}`, positionally aligned to the request.**
   * Unlike `/v1/forecast`, it does **not** echo the coordinates back, so there is no way to learn
   * where the provider snapped to — the response cannot tell me which DEM cell each value came
   * from.
   *
   * ⭐ That absence is why `effective` is floored at the DEM step. With `/v1/forecast` I could
   * deduplicate by the returned coordinate and count distinct readings honestly. Here I cannot,
   * so the only defence against reporting duplicates as independent samples is to not request
   * them. The floor is that defence, and it is load-bearing rather than tidy.
   */
  const values = body?.elevation;
  if (!Array.isArray(values) || values.length !== lats.length) {
    return { ok: false, reason: "unexpected response shape" };
  }

  const points = [];
  for (let k = 0; k < values.length; k++) {
    const v = values[k];
    // A point the provider had no data for is dropped, not zero-filled. Sea level and "no data"
    // are the same number otherwise, and one of them is a fact.
    if (typeof v !== "number") continue;
    points.push({
      latitude: Number(lats[k]),
      longitude: Number(lons[k]),
      elevation_m: v,
    });
  }

  if (!points.length) return { ok: false, reason: "no elevations returned" };

  const heights = points.map((p) => p.elevation_m);
  const min = Math.min(...heights);
  const max = Math.max(...heights);

  /**
   * ⭐ `distinct` is reported because it is the honest measure of how much the provider actually
   * resolved here. 81 points returning 28 distinct heights is real relief; 81 returning 3 is flat
   * ground drawn with the same seven-stop ramp and the same confident colours. Only the count
   * separates them, so the page carries it.
   */
  return {
    ok: true,
    points,
    distinct: new Set(heights).size,
    min_m: min,
    max_m: max,
    relief_m: max - min,
    sample_deg: effective,
    dem_step_deg: DEM_STEP_DEG,
    dem_step_m: DEM_STEP_M,
    requested: { latitude, longitude },
  };
}
