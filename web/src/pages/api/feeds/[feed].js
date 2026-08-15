import { methodNotAllowed, fail, notImplemented, forward } from "@/lib/api/upstream";
import { authHeaders, readSession } from "@/lib/api/session";
import { fetchWeatherGrid, RESOLUTION_DEG, RESOLUTION_M } from "@/lib/api/openmeteo";

/**
 * External context feeds: weather, traffic, prices, advisories.
 *
 * # Why these are one route and not four
 *
 * They share the property that makes them different from every other route in this folder:
 * **the data does not come from `olduvai-server`.** It comes from third parties. That means
 * they share a single obligation, and putting them in one file makes it impossible to
 * satisfy it in three places and forget the fourth.
 *
 * # ⭐ The obligation: an external reading is `Asserted`, never `Observed`
 *
 * Note 30 §5.3 carries `source` on every value — the observed/asserted distinction from
 * note 27 §4. A third-party forecast is something *someone else says*, not something this
 * exchange measured. If a feed reading entered a participant's entry as `Observed`, it
 * would carry evidential weight the exchange never earned, and the gate would rank on it.
 *
 * So every feed here is declared `Asserted` at the boundary, in `FEEDS` below, and the
 * declaration sits next to the fetch rather than in the consumer — a rule enforced where
 * the data enters is a rule that cannot be forgotten downstream.
 *
 * ⚠️ **A feed reading is context for a human decision, not evidence in a coalition.** These
 * inform the person reading the dashboard. They must not silently become fields.
 *
 * # ⚠️ Why most providers are still unwired — and why weather no longer is
 *
 * Each remaining feed needs a provider key, and a provider decision is a research decision
 * here: which forecast, at what spatial resolution, is a question about what the exchange can
 * verify, not a question about which SDK is convenient. Keys are read from the environment
 * when that decision is made — never committed, per the repository rule on `.env*.local`.
 *
 * ⭐ **Weather was the exception and this file was the last place to notice.** `lib/ai/sources.js`
 * has been calling Open-Meteo keylessly on every grounded question for some time, and its own
 * doc-comment says so: the provider was chosen before the "which provider is a research
 * decision" sentence above was written, and note 31 lines 560–639 carried a working keyless
 * implementation. So the assistant answered weather questions from a live feed while the
 * weather *page* told the participant the provider question was open. That is a system
 * disagreeing with itself about what it knows, which is worse than either answer alone.
 *
 * ⚠️ It also gated on `OLDUVAI_WEATHER_API_KEY` and then returned `no-provider` **even when the
 * key was set**, because no client existed behind the check. Setting the key made the page fail
 * differently rather than work — a gate that cannot be satisfied by doing what it asks.
 */

/**
 * The declared feeds.
 *
 * `source` is fixed to `asserted` for all of them, deliberately and without exception —
 * see above. `unit` is stated up front because note 30 §2.1 makes the unit a compile-time
 * obligation in the core; a feed that arrives unitless cannot be reconciled with it later.
 */
const FEEDS = {
  /**
   * ⭐ The one wired feed. `envKey` is `null` — not "a key we have not set", but *this provider
   * needs none*, which is the keyless-first constraint `lib/ai/sources.js:35-41` already applies
   * to every source the assistant reads. A source whose evidence evaporates on an expired token
   * is worse than one fewer source.
   */
  weather: {
    label: "Weather",
    source: "asserted",
    // ⭐ `elevation` is here because the provider returns it per cell at no extra cost, and
    // finer than it resolves temperature — see `lib/api/openmeteo.js`. Declaring it means the
    // page cannot show it without having said what it is.
    units: { temperature: "degC", rainfall: "mm", wind: "m/s", elevation: "m", resolution: "deg" },
    envKey: null,
    // ⚠️ The old note said the resolution was "coarser than a field" — true, and vague enough
    // to be unfalsifiable. It is 0.070299°, measured against the live API rather than read off
    // a documentation page, and the measurement is what makes the grid renderer's refusal to
    // interpolate a statement rather than a style.
    note: `Current conditions on the provider's own grid around the holding. ⚠️ The grid step is ${RESOLUTION_DEG}° of latitude — about ${(RESOLUTION_M / 1000).toFixed(1)} km — and every cell is reported at the coordinate the provider snapped to, not the one requested. Points closer together than one cell are one reading, so nothing is drawn between cells.`,
  },
  traffic: {
    label: "Traffic",
    source: "asserted",
    units: { delay: "s", distance: "m" },
    envKey: "OLDUVAI_TRAFFIC_API_KEY",
    note: "Route conditions on haulage corridors. Relevant to transport legs, but a leg's cost is settled by the ledger, not by a live estimate.",
  },
  prices: {
    label: "Grain prices",
    source: "asserted",
    units: { price: "USD/t" },
    envKey: "OLDUVAI_PRICES_API_KEY",
    note: "⚠️ Reference prices from external markets. These are NOT exchange prices. The exchange derives price from assembled coalitions (notes/05, 07); a reference quote is context, and treating it as a clearing price would import an outside market's structure.",
  },
  advisories: {
    label: "Advisories",
    source: "asserted",
    units: {},
    envKey: "OLDUVAI_ADVISORY_API_KEY",
    note: "Agronomic and phytosanitary notices. Asserted by the issuing body; the exchange does not verify them.",
  },
};

export default async function handler(req, res) {
  if (methodNotAllowed(req, res, "GET")) return;

  const { feed } = req.query;
  const spec = FEEDS[feed];

  if (!spec) {
    return fail(
      res,
      404,
      "unknown_feed",
      `No feed named "${feed}". Known feeds: ${Object.keys(FEEDS).join(", ")}.`
    );
  }

  // ⭐ The keyless branch, and it must come before the key check. `spec.envKey` is `null` for a
  // provider that needs no credential, and `process.env[null]` is `undefined` — so the gate
  // below would report `no-provider` for a feed that has one and works. Same class of bug as the
  // one this file already carried: a check whose failure mode is indistinguishable from the
  // condition it is testing for.
  if (spec.envKey === null) {
    if (feed !== "weather") {
      // ⚠️ Defensive rather than reachable: `weather` is the only keyless entry today. If a
      // second one is declared without a client, this says so instead of falling through to the
      // key check and blaming a missing key that was never required.
      return notImplemented(res, {
        blockedBy: "no-provider",
        note: `${spec.label} is declared keyless but no client is implemented for it.`,
      });
    }
    return weather(req, res, spec, feed);
  }

  // The provider key is absent, which is the expected state. Returning the feed's
  // declaration anyway lets the page render its real units, its real provenance, and the
  // reason it is empty — rather than a spinner that resolves to nothing.
  if (!process.env[spec.envKey]) {
    return notImplemented(res, {
      blockedBy: "no-provider",
      note: spec.note,
      // Shape-compatible with a live response, so the view renders one way, not two.
      declaration: {
        feed,
        label: spec.label,
        source: spec.source,
        units: spec.units,
        readings: [],
      },
    });
  }

  // ⚠️ When a provider is chosen, the fetch goes here — and whatever it returns must be
  // stamped `source: spec.source` on the way out. Do not let a provider's own confidence
  // field become `source`; the provider is asserting, whatever it calls itself.
  return notImplemented(res, {
    blockedBy: "no-provider",
    note: "A provider key is present but no provider client is implemented.",
  });
}

/**
 * The weather feed: the provider's grid around wherever the participant actually is.
 *
 * # ⭐ Why this asks the engine for a position instead of taking one from the query string
 *
 * A `?lat=&lon=` parameter would have made this route testable in one curl and would have been
 * wrong. The weather page is a view **of the participant's holding**, and the participant's
 * location is the fold of their observation log — `Estimate`, computed by
 * `olduvai_core::fusion`, carrying a sigma. Accepting a coordinate from the client would let the
 * page draw a grid around a place nobody observed, with no sigma attached to it, and the drawing
 * would look exactly the same as one drawn around a measured position.
 *
 * ⚠️ So an unlocated participant gets `no-observations`, not a grid around a guess.
 *
 * # ⚠️ The uninformed prior is not a location
 *
 * `/v1/position` answers `200` even with an empty log, returning the seed coordinate at a 200 km
 * sigma — that is the honest encoding of *we do not know where you are* (note 33 §7), and this
 * route must not read it as an answer. **A 7.8 km grid centred on a 200 km uncertainty is
 * meaningless**: the cells would span a fortieth of the region the participant might be in, drawn
 * with the same confident squares a real fix produces. `rests_on_observation` is the field that
 * distinguishes them and it is checked below.
 */
async function weather(req, res, spec, feed) {
  const declaration = {
    feed,
    label: spec.label,
    source: spec.source,
    units: spec.units,
    resolution_deg: RESOLUTION_DEG,
    readings: [],
  };

  // ⚠️ Checked here rather than by `requireSession`, which would 401. A signed-out visitor
  // looking at the weather page should be told what the page needs, not rejected by it — and
  // `blockedBy` is the vocabulary `RailPage` already renders.
  if (!readSession(req)) {
    return notImplemented(res, {
      blockedBy: "no-observations",
      note: "The grid is drawn around the participant's folded position, and there is no session to fold one for.",
      declaration,
    });
  }

  const position = await forward("/v1/position", { headers: authHeaders(req) });

  if (!position.ok) {
    return notImplemented(res, {
      blockedBy: "upstream-unreachable",
      upstream: position.reason,
      note: "The provider is reachable, but the position this grid would be centred on is folded by olduvai-server, which did not answer. This is an outage, not a statement about the weather.",
      declaration,
    });
  }

  // ⚠️ `estimate` is the wrapper the server actually sends — `routes.rs:137` returns
  // `{estimate, declaration, log_length, cache_consistent}` and every field below lives inside
  // it. Written first as `data.at ?? data.estimate.at`, which resolved correctly by accident and
  // implied a top-level shape upstream never sends; a reader would have believed the wrong
  // contract from code that worked.
  const estimate = position.data?.estimate;
  const at = estimate?.at;
  // ⭐ The check that stops a grid being drawn around the prior. See the doc above.
  const measured = estimate?.rests_on_observation === true;

  if (!measured || typeof at?.latitude !== "number" || typeof at?.longitude !== "number") {
    return notImplemented(res, {
      blockedBy: "no-observations",
      note: "No position has been observed yet, so there is no cell to centre on. The engine's uninformed prior is 200 km wide — forty times this grid's whole extent — and drawing cells around it would show a precision nobody measured. Submit a GPS fix and this fills in.",
      declaration,
    });
  }

  const grid = await fetchWeatherGrid({ latitude: at.latitude, longitude: at.longitude });

  if (!grid.ok) {
    return notImplemented(res, {
      blockedBy: "upstream-unreachable",
      upstream: grid.reason,
      // ⚠️ Named as the provider's outage, not as "no weather". `lib/ai/sources.js` makes the
      // same distinction: "we could not ask" is a different claim from "there is nothing there",
      // and only one of them is something a participant should act on.
      note: `Open-Meteo did not answer (${grid.reason}). Nothing is known to be wrong with the forecast; this page could not retrieve it.`,
      declaration,
    });
  }

  return res.status(200).json({
    ok: true,
    data: {
      ...grid,
      declaration: {
        ...declaration,
        // ⭐ Stamped here, from `spec`, never from anything the provider said about itself. The
        // rule at the top of this file: the provider is asserting, whatever it calls itself.
        source: spec.source,
        readings: grid.cells,
        // ⚠️ The centre is carried so the renderer can outline the participant's own cell — and
        // its sigma travels with it, so a 40 m fix and a 4 km one do not draw the same mark.
        centre: {
          latitude: at.latitude,
          longitude: at.longitude,
          sigma_m: estimate.sigma_m ?? null,
        },
      },
    },
  });
}
