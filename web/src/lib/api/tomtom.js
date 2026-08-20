/**
 * Road incidents around the holding, from TomTom's Traffic Incidents service.
 *
 * # ⭐ Why this exists, given the key was never the problem
 *
 * `pages/api/feeds/[feed].js` records that `traffic` read an `OLDUVAI_TRAFFIC_API_KEY` that no
 * file sets, while the credential sat in `.env.local` under the provider's own name. Renaming it
 * made the key *found* and moved the route to a truer refusal — *"a traffic credential is
 * present… what is missing is the client that calls it, which is unwritten."* This is that
 * client. ⚠️ Nothing here fixes a credential; the credential was already correct.
 *
 * # ⚠️ What was measured before this was written
 *
 * `GET /traffic/services/5/incidentDetails` with the deployed key over a 0.2° box around Harare
 * returned **HTTP 200 `{"incidents":[]}`** in well under a second. So: the key is accepted, the
 * response is an object with an `incidents` array, and **an empty array is a normal answer** —
 * quiet roads, not an outage. That distinction is the one thing this module must not lose, and it
 * is why `ok: true` with zero incidents is a success below rather than a `reason`.
 *
 * ⚠️ A shell probe of the same URL first failed with `URL rejected: Malformed input` because the
 * server's env file was CRLF-terminated and `$(sed …)` preserved the `\r`. Next's own dotenv
 * parser strips it, so the runtime was never affected — but the file has been normalised, because
 * a value that works in the app and breaks in a shell is a trap for whoever probes it next.
 *
 * # ⚠️ This is `asserted`, not an instrument reading
 *
 * The feed spec declares `source: "asserted"` and that is right. An incident is a third party's
 * claim that a road is obstructed; nobody here read a sensor. ⭐ It is also **not folded into the
 * participant's position** — unlike a cell tower fix, a traffic incident says nothing about where
 * the participant is, so it never becomes an `Observation` and never reaches `olduvai-core`.
 *
 * ⚠️ And per the feed's own note: *"a leg's cost is settled by the ledger, not by a live
 * estimate."* A delay in seconds here is context for a haulage decision, never an input to
 * settlement.
 */

const TIMEOUT_MS = 8000;

/**
 * ⭐ The half-width of the query box, in degrees.
 *
 * ⚠️ Chosen against what the page is *for*, not for coverage. Traffic matters to a consignment
 * over the roads it will actually leave on, so this is a district, not a region. 0.10° is about
 * 11 km north–south and, at Harare's latitude, ~10.6 km east–west — an hour's haulage radius on
 * rural roads.
 *
 * ⚠️ It is deliberately **not** scaled by the position's sigma. A 200 km prior would produce a
 * 200 km box of incidents that look like they surround the participant, and the route never
 * reaches here in that case anyway — `locate()` refuses first on `rests_on_observation`.
 */
const HALF_BOX_DEG = 0.1;

/**
 * The fields requested, in TomTom's brace syntax.
 *
 * ⚠️ Requesting fewer fields is not premature economy here — the default response includes full
 * incident geometry as coordinate arrays, which is tens of kilobytes of polyline this page does
 * not draw. `geometry` is omitted for that reason, and its absence is why a returned incident is
 * rendered as *a road and a description*, never as a line on a map.
 */
const FIELDS =
  "{incidents{properties{iconCategory,magnitudeOfDelay,delay,length,startTime,endTime,from,to,roadNumbers,events{description}}}}";

/**
 * ⭐ TomTom's `iconCategory` is an integer enum; these are the names it stands for.
 *
 * ⚠️ An unmapped code is reported as `"incident"` rather than as the number. A bare `14` in a
 * sentence about a road reads as a quantity — the same failure `lib/market.js` documents for
 * unresolved M49 reporter codes, where `"reporter 48"` read as a place.
 */
const CATEGORY = {
  0: "unknown",
  1: "accident",
  2: "fog",
  3: "dangerous conditions",
  4: "rain",
  5: "ice",
  6: "jam",
  7: "lane closed",
  8: "road closed",
  9: "road works",
  10: "wind",
  11: "flooding",
  14: "broken-down vehicle",
};

/**
 * ⭐ `magnitudeOfDelay` is TomTom's own severity, and it is kept *alongside* the delay in
 * seconds rather than replacing it. The number is the fact; the word is the provider's judgement
 * about the number, and labelling it as theirs costs nothing.
 */
const MAGNITUDE = {
  0: "unknown",
  1: "minor",
  2: "moderate",
  3: "major",
  4: "undefined",
};

/**
 * Fetch incidents in a box around a point.
 *
 * Returns `{ok: true, incidents: [...], box}` or `{ok: false, reason}`.
 * ⚠️ Never throws — the same contract as `elevation.js`, `openmeteo.js` and `opencellid.js`, so a
 * failed provider is a stated absence in the response rather than a 500 from the route.
 */
export async function fetchIncidents({ latitude, longitude }) {
  const key = process.env.TOMTOM_API_KEY;
  if (!key) return { ok: false, reason: "no TOMTOM_API_KEY configured" };

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, reason: "a position is needed to bound the query" };
  }

  // ⚠️ TomTom's `bbox` is `minLon,minLat,maxLon,maxLat` — longitude first, unlike the
  // `latitude,longitude` order used everywhere else in this codebase. Transposing it returns a
  // well-formed 200 for a box in the wrong hemisphere, which is the failure that looks like
  // "there is never any traffic here".
  const box = {
    minLon: longitude - HALF_BOX_DEG,
    minLat: latitude - HALF_BOX_DEG,
    maxLon: longitude + HALF_BOX_DEG,
    maxLat: latitude + HALF_BOX_DEG,
  };

  const url =
    `https://api.tomtom.com/traffic/services/5/incidentDetails?key=${encodeURIComponent(key)}` +
    `&bbox=${box.minLon},${box.minLat},${box.maxLon},${box.maxLat}` +
    `&fields=${encodeURIComponent(FIELDS)}&language=en-GB`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let body;
  try {
    const r = await fetch(url, { headers: { accept: "application/json" }, signal: controller.signal });
    if (!r.ok) {
      // ⚠️ 403 is named as the key being rejected, because that is the one failure a participant
      // could act on and it is otherwise indistinguishable from a generic outage.
      return {
        ok: false,
        reason:
          r.status === 403
            ? "the traffic provider rejected the credential (HTTP 403)"
            : `the traffic provider answered HTTP ${r.status}`,
      };
    }
    body = await r.json();
  } catch (e) {
    return {
      ok: false,
      reason:
        e?.name === "AbortError"
          ? "the traffic provider did not answer in time"
          : "the traffic provider could not be reached",
    };
  } finally {
    clearTimeout(timer);
  }

  const raw = Array.isArray(body?.incidents) ? body.incidents : [];

  // ⭐ An empty array is `ok`. Measured live: a quiet box returns `200 {"incidents":[]}`. Treating
  // that as a failure would report an outage every time the roads were clear, and would teach a
  // reader to distrust the one state this page most often has to show honestly.
  return { ok: true, incidents: raw.map(normalise).filter(Boolean), box };
}

/**
 * One incident, flattened to what the page prints.
 *
 * ⚠️ `delay` and `length` are passed through **unrounded and unconverted**. The feed declares
 * `units: {delay: "s", distance: "m"}`, and a client that silently rendered minutes would put the
 * page's drawing and its declared units in disagreement — the precise drift the shared caption
 * tables in `RailPage` exist to prevent elsewhere.
 */
function normalise(incident) {
  const p = incident?.properties;
  if (!p) return null;

  const events = Array.isArray(p.events)
    ? p.events.map((e) => e?.description).filter((d) => typeof d === "string" && d)
    : [];

  return {
    category: CATEGORY[p.iconCategory] ?? "incident",
    magnitude: MAGNITUDE[p.magnitudeOfDelay] ?? null,
    delay_s: typeof p.delay === "number" ? p.delay : null,
    length_m: typeof p.length === "number" ? p.length : null,
    from: typeof p.from === "string" ? p.from : null,
    to: typeof p.to === "string" ? p.to : null,
    // ⚠️ TomTom returns `roadNumbers` as an array and it is frequently empty on rural roads. An
    // empty array becomes `null` rather than `""`, so the page tests one thing.
    roads: Array.isArray(p.roadNumbers) && p.roadNumbers.length ? p.roadNumbers : null,
    description: events.length ? events.join("; ") : null,
    startTime: typeof p.startTime === "string" ? p.startTime : null,
    endTime: typeof p.endTime === "string" ? p.endTime : null,
  };
}
