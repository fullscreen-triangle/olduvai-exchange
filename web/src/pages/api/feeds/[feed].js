import { methodNotAllowed, fail, notImplemented, forward } from "@/lib/api/upstream";
import { authHeaders, readSession } from "@/lib/api/session";
import { fetchWeatherGrid, RESOLUTION_DEG, RESOLUTION_M } from "@/lib/api/openmeteo";
import { fetchElevationGrid, DEM_STEP_DEG, DEM_STEP_M } from "@/lib/api/elevation";

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
  /**
   * ⭐ The second keyless feed, and the second one whose provider was already chosen.
   *
   * Terrain is declared here rather than in `pages/api/observe/[source].js` — where a `terrain`
   * entry also exists — and the split is the note 33 distinction, not a duplication:
   *
   * - `observe/terrain` would be a DEM tile entering the log as `Observation::Within`, saying
   *   *the holding is somewhere in this region*. That is an observation **of the participant**,
   *   it constrains position, and it is still unbuilt.
   * - This is the inverse question: *given a position already folded from the log, what is the
   *   ground doing there.* It reads the DEM **at** a place. It cannot tell you the place.
   *
   * ⚠️ **Nothing this feed returns may enter the observation log.** Feeding a DEM sample back in
   * as evidence for the position it was queried with would close a loop — the estimate would
   * gain confidence from a reading that only exists because of the estimate. That is the reason
   * every feed in this table is `asserted` and none of them is an `Observation`.
   */
  terrain: {
    label: "Terrain",
    source: "asserted",
    units: { elevation: "m", relief: "m", sample: "deg", resolution: "m" },
    envKey: null,
    // ⚠️ 90 m is measured, not read off the provider's documentation — see `lib/api/elevation.js`
    // for the row walk that established it. It agrees with the documented SRTM/GLO-90 source
    // here, unlike the forecast grid, where measurement and documentation disagreed.
    note: `Ground elevation under and around the holding, on the provider's own DEM. ⚠️ Cells are about ${DEM_STEP_M} m across — ${DEM_STEP_DEG}° — and nothing is drawn between samples. A slope computed across two cells is a claim about ${DEM_STEP_M * 2} m of ground, not about a field boundary.`,
  },
  /**
   * ⚠️ `TOMTOM_API_KEY`, not `OLDUVAI_TRAFFIC_API_KEY`.
   *
   * ⭐ The old name was set by nothing. A key for this feed has been present in `web/.env.local`
   * throughout — under the provider's name, which is how every other credential in that file is
   * named (`OPENWEATHERMAP_API_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`). The route read an
   * `OLDUVAI_`-prefixed name that no file sets, found nothing, and reported *"no provider
   * configured — choosing one is a research decision"* on a page whose provider was chosen and
   * paid for.
   *
   * ⚠️ Exactly the failure the weather feed carried and this file already documents above: a
   * gate that cannot be satisfied by doing what it asks. The remedy it named — configure a
   * provider — had been done, and doing it again could not have cleared the gate.
   *
   * ⚠️ Renaming this makes the key *found*, not the feed *implemented*. There is no TomTom client
   * yet, so this now falls to the "key present, no client" branch below, which says so. That is a
   * different and truer statement than the one it replaces.
   */
  traffic: {
    label: "Traffic",
    source: "asserted",
    units: { delay: "s", distance: "m" },
    envKey: "TOMTOM_API_KEY",
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
    // ⭐ A table rather than a chain of `feed !== "..."` checks. There are two keyless feeds now
    // and the previous form — an inverted test naming the single implemented one — would have
    // needed rewriting to add each. The `notImplemented` fallback below stays, and stays
    // *reachable*: a feed declared keyless with no client says exactly that, instead of falling
    // through to the key check and blaming a credential that was never required.
    const client = { weather, terrain }[feed];
    if (!client) {
      return notImplemented(res, {
        blockedBy: "no-provider",
        note: `${spec.label} is declared keyless but no client is implemented for it.`,
      });
    }
    return client(req, res, spec, feed);
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
  //
  // ⭐ Reached by `traffic` now that its `envKey` names the key that is actually set. The note
  // says which half is missing, because "no provider configured" would send someone to buy a
  // credential they already hold — and the declaration goes out too, so the page renders its
  // real units and provenance rather than an empty card.
  return notImplemented(res, {
    blockedBy: "no-provider",
    note: `A ${spec.label.toLowerCase()} credential is present, so the provider question is settled — what is missing is the client that calls it, which is unwritten. Nothing is wrong with the key.`,
    declaration: {
      feed,
      label: spec.label,
      source: spec.source,
      units: spec.units,
      readings: [],
    },
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
/**
 * Resolve the participant's folded position, or the reason there isn't one.
 *
 * Returns `{ok: true, at, estimate}` or `{ok: false, response}` where `response` is the already
 * formed refusal — the caller returns it unchanged.
 *
 * ⭐ Extracted when `terrain` became the second feed centred on the participant's position, and
 * needed *the same four checks in the same order*. Duplicating them would have been four chances
 * for the two pages to drift apart on what counts as a known location — and the check that
 * matters most, `rests_on_observation`, is precisely the one a second implementation would be
 * likeliest to omit, because the code works without it and only lies.
 *
 * ⚠️ `blockedBy` values are unchanged from the weather implementation, because `RailPage` and
 * `GATES` already render them.
 */
async function locate(req, declaration, { centredOn }) {
  // ⚠️ Checked here rather than by `requireSession`, which would 401. A signed-out visitor
  // looking at the page should be told what the page needs, not rejected by it — and
  // `blockedBy` is the vocabulary `RailPage` already renders.
  if (!readSession(req)) {
    return {
      ok: false,
      response: {
        blockedBy: "no-observations",
        note: `${centredOn} is drawn around the participant's folded position, and there is no session to fold one for.`,
        declaration,
      },
    };
  }

  const position = await forward("/v1/position", { headers: authHeaders(req) });

  if (!position.ok) {
    return {
      ok: false,
      response: {
        blockedBy: "upstream-unreachable",
        upstream: position.reason,
        note: `The provider is reachable, but the position ${centredOn.toLowerCase()} would be centred on is folded by olduvai-server, which did not answer. This is an outage, not a statement about the ground or the weather.`,
        declaration,
      },
    };
  }

  // ⚠️ `estimate` is the wrapper the server actually sends — `routes.rs:137` returns
  // `{estimate, declaration, log_length, cache_consistent}` and every field below lives inside
  // it. Written first as `data.at ?? data.estimate.at`, which resolved correctly by accident and
  // implied a top-level shape upstream never sends; a reader would have believed the wrong
  // contract from code that worked.
  const estimate = position.data?.estimate;
  const at = estimate?.at;
  // ⭐ The check that stops anything being drawn around the prior. `/v1/position` answers 200
  // even with an empty log, returning the seed coordinate at a 200 km sigma — the honest
  // encoding of *we do not know where you are* (note 33 §7). A page must not read it as an
  // answer, and this field is what distinguishes them.
  const measured = estimate?.rests_on_observation === true;

  if (!measured || typeof at?.latitude !== "number" || typeof at?.longitude !== "number") {
    return {
      ok: false,
      response: {
        blockedBy: "no-observations",
        note: "No position has been observed yet, so there is nothing to centre on. The engine's uninformed prior is 200 km wide — far wider than anything this page draws — and sampling around it would show a precision nobody measured. Submit a GPS fix and this fills in.",
        declaration,
      },
    };
  }

  return { ok: true, at, estimate };
}

async function weather(req, res, spec, feed) {
  const declaration = {
    feed,
    label: spec.label,
    source: spec.source,
    units: spec.units,
    resolution_deg: RESOLUTION_DEG,
    readings: [],
  };

  const located = await locate(req, declaration, { centredOn: "The grid" });
  if (!located.ok) return notImplemented(res, located.response);
  const { at, estimate } = located;

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

/**
 * The terrain feed: the DEM under and around the participant's folded position.
 *
 * # ⚠️ Why the sigma travels with the sample, and is not decoration
 *
 * The DEM step is ~90 m. A participant's fix might be good to 40 m or to 4 km, and **the same
 * drawing serves both** unless the uncertainty is carried. At 4 km sigma the participant could
 * be in any of ~2,000 of these cells, and a relief figure quoted from the sampled window would
 * be a statement about somewhere they probably are not.
 *
 * ⭐ So `centre.sigma_m` goes out, and `sigma_exceeds_sample` is computed here rather than left
 * for the renderer to notice. It is the single fact that decides whether the numbers below it
 * mean anything, and a renderer that forgot to derive it would draw a confident hillside.
 *
 * # ⚠️ What is deliberately not computed
 *
 * No slope, no aspect, no hillshade. All three require differencing neighbouring cells, and a
 * slope across two 90 m cells is a claim about 180 m of ground — which is larger than most
 * holdings and much larger than any field boundary a participant would recognise. Note 37 §4:
 * draw the uncertainty first, draw the value only if it was measured. Slope here would be a
 * derived value dressed as a measured one.
 */
async function terrain(req, res, spec, feed) {
  const declaration = {
    feed,
    label: spec.label,
    source: spec.source,
    units: spec.units,
    dem_step_deg: DEM_STEP_DEG,
    dem_step_m: DEM_STEP_M,
    readings: [],
  };

  const located = await locate(req, declaration, { centredOn: "The elevation sample" });
  if (!located.ok) return notImplemented(res, located.response);
  const { at, estimate } = located;

  const dem = await fetchElevationGrid({ latitude: at.latitude, longitude: at.longitude });

  if (!dem.ok) {
    return notImplemented(res, {
      blockedBy: "upstream-unreachable",
      upstream: dem.reason,
      // ⚠️ Named as the provider's outage, not as "no terrain". "We could not ask" is a different
      // claim from "there is nothing there", and only one of them is something to act on.
      note: `Open-Meteo's elevation service did not answer (${dem.reason}). Nothing is known to be wrong with the terrain data; this page could not retrieve it.`,
      declaration,
    });
  }

  const sigma_m = estimate.sigma_m ?? null;

  return res.status(200).json({
    ok: true,
    data: {
      ...dem,
      declaration: {
        ...declaration,
        // ⭐ Stamped from `spec`, never from anything the provider said about itself. The rule at
        // the top of this file: the provider is asserting, whatever it calls itself.
        source: spec.source,
        readings: dem.points,
        centre: {
          latitude: at.latitude,
          longitude: at.longitude,
          sigma_m,
        },
        // ⭐ The fact that governs how the rest should be read. See the doc above.
        sigma_exceeds_sample:
          typeof sigma_m === "number" ? sigma_m > dem.sample_deg * 111_320 : null,
      },
    },
  });
}
