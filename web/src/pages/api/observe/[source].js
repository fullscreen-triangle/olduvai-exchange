import { methodNotAllowed, fail, notImplemented, forward, Reason } from "@/lib/api/upstream";
import { requireSession, authHeaders } from "@/lib/api/session";

/**
 * Position observation sources: terrain, satellites, flights, gps.
 *
 * # Why these are one route and not four
 *
 * `notes/31-dashboard-design.md` item 2 lists them as four rail entries with four unrelated
 * examples — a three-geo terrain renderer, a satellite.js globe, an OpenFlights arc map, and
 * nothing at all for GPS. Implemented as four routes they would become four integrations
 * that happen to draw maps.
 *
 * ⭐ They are one route because they are one *input*. Note 33: a farmer's drawn boundary, an
 * aerodrome reference point and an overflying aircraft are not three integrations but three
 * shapes of the same thing. Each of these sources produces an `olduvai_core::fusion::
 * Observation`, and the fusion layer combines them. The route that receives them should make
 * that visible rather than hide it behind four files.
 *
 * # ⭐ The obligation: an observation declares what it constrains, not what it knows
 *
 * The single most important thing in note 33:
 *
 * > *"Aircrafts are not a positioning check, but another gps instrument. We do not check any
 * > gps against another gps... the fact that the aeroplane has flown above a point, means
 * > that, we now have a gps track in that direction, thats all."*
 *
 * ⚠️ So `constrains` below is not documentation. It is the shape of the `Observation` this
 * source may produce, and it is the thing that stops a flight track being flattened into a
 * point. A `corridor` says the participant is near a line and says **nothing** about where
 * along it. Anyone wiring a provider here who returns a lat/lng for a flight has discarded
 * the only honest part of the reading.
 *
 * # ⚠️ No source here is a check on any other
 *
 * There is no reference source in this table and there is not going to be one. Every entry
 * carries a `sigma` — its admitted noise — and the filter weights by that. A route that
 * compared two of these and picked a winner would be implementing verification, which is a
 * category error here, and it would also be admissibility logic in the BFF, which
 * `lib/api/upstream.js` forbids outright.
 *
 * # Where the arithmetic lives
 *
 * Not here. `olduvai_core::fusion::Estimate::update` is the only implementation of the
 * update step. This route forwards; it does not fold.
 *
 * ⚠️ **This paragraph used to claim the update was "reached natively by the server and through
 * WASM by this browser", and the second half was false.** `crates/olduvai-wasm` exports eleven
 * functions — `encode`, `decode`, `agent_check`, `water_fill`, `accept_proposal` and friends —
 * and **none of them comes from `fusion` or `orbit`**. There is also no built wasm package
 * anywhere under `web/`: no `pkg/`, no `.wasm`, no `wasm-pack` step in `package.json`. The
 * browser folds nothing today; every fold happens in the server process.
 *
 * ⭐ Recorded rather than quietly deleted because of how the sentence came to be written: it
 * described the intended design, in the present tense, at a time when the design was the only
 * thing that existed. That is the failure mode note 34 §5 named in a different layer — a
 * sentence nothing type-checks — and here it would have sent a reader hunting for a WASM call
 * that is not there. If `fusion` is ever exported and a package is built into `web/`, the
 * original sentence becomes true and this warning comes out.
 */

/**
 * The declared observation sources.
 *
 * ⭐ `constrains` matches an `Observation` variant in `olduvai-core` — `fix`, `corridor` or
 * `within` — with no exceptions. It used to carry `overpass` for the satellite source, which
 * was a category error hiding in a table: an overpass is a *computation about a window*, not
 * an observation of the participant, and `crates/olduvai-server/src/routes.rs` refuses it. The
 * distinction survives in the source's `note`, where it belongs, rather than in a field the
 * server validates against.
 *
 * `sigma` is the source's honest one-sigma error in metres, or a range where it depends on
 * the reading. ⚠️ Stated here as prose rather than as a number the code uses: the real value
 * arrives per-reading from the provider, and a constant in the BFF would be a threshold in
 * the BFF.
 */
const SOURCES = {
  terrain: {
    label: "Terrain",
    constrains: "within",
    source: "asserted",
    units: { elevation: "m", slope: "deg", resolution: "m" },
    envKey: "OLDUVAI_TERRAIN_API_KEY",
    sigma: "half the tile's characteristic width, treated as one sigma",
    note:
      "Elevation and slope under the holding. ⚠️ A terrain tile constrains position only as a region — it says the holding is somewhere within the tile, at the tile's own resolution. A 30 m DEM cell and a 90 m one are different observations, and the resolution must arrive with the reading rather than be assumed. Whether a tile is fine enough to distinguish two neighbouring holdings is decided by footprint::Reading::is_distinguishing_for, not here.",
  },
  satellites: {
    label: "Satellites",
    // ⚠️ `within`, not `overpass` — corrected once the upstream route existed to disagree
    // with. An overpass is not an observation of the participant at all; it is the window in
    // which a sensor could have seen them. What enters the log is the *reading taken during*
    // that window, and a reading covers ground, so it is a region. `crates/olduvai-server/
    // src/routes.rs` enforces this, and while it stood as `overpass` here this route was
    // telling anyone wiring a provider to send a shape that would be refused with 422.
    constrains: "within",
    // ⭐ Not `asserted`. This is the one entry in the table that produces evidence, and the
    // reason is the whole "public feed in, our computation out" argument: the element set and
    // the timestamp go in the ledger, the arithmetic is published, so anyone can redo it and
    // get our bytes. A third party's *retrieval* from the same satellite would be `asserted`.
    source: "instrument",
    units: { elevation: "deg", azimuth: "deg", range: "km" },
    envKey: null,
    sigma: "propagation error grows with age of the element set",
    note:
      "What passes overhead, propagated from published two-line elements by olduvai-core::orbit. ⚠️ An overpass is not itself a position observation of the participant — it is the window in which a sensor could have seen them. It becomes an observation only when a reading is taken during that window, and that reading carries its own footprint.",
  },
  flights: {
    label: "Flights",
    constrains: "corridor",
    source: "instrument",
    units: { track: "deg", altitude: "m", separation: "m" },
    envKey: "OLDUVAI_ADSB_API_KEY",
    sigma: "across-track only; along-track is unconstrained by construction",
    note:
      "⭐ A track crossing the area is a direction, not a place. The observation says the holding lies near the line and says nothing about where along it — the two reported points are a sample of a flight path, not its extent, so the constraint extends beyond both ends. This is one more noisy instrument that happened to pass overhead, not a check on anything.",
  },
  gps: {
    label: "GPS",
    constrains: "fix",
    source: "instrument",
    units: { latitude: "deg", longitude: "deg", accuracy: "m" },
    envKey: null,
    sigma: "as reported by the receiver, floored at 1 m",
    note:
      "Fixes recorded on a handset or receiver, each with the accuracy the device reported. ⚠️ A receiver claiming centimetre accuracy over a farm is floored at one metre before use: such a claim takes the filter's gain to 1.0 and erases every other observation, and a source claiming it is more likely misconfigured than exceptional.",
  },
};

export default async function handler(req, res) {
  // ⚠️ `POST` is accepted now that `/v1/observe/:source` exists upstream. The two verbs are
  // the write and the read of one resource, which is why they share a path here as they do
  // there — a separate `/submit` route would suggest two resources and invite the two to
  // drift apart on which source may produce which shape.
  if (methodNotAllowed(req, res, "GET", "POST")) return;

  const { source } = req.query;
  const spec = SOURCES[source];

  if (!spec) {
    return fail(
      res,
      404,
      "unknown_source",
      `No observation source named "${source}". Known sources: ${Object.keys(SOURCES).join(", ")}.`
    );
  }

  if (requireSession(req, res)) return;

  const result = await forward(`/v1/observe/${source}`, {
    method: req.method,
    body: req.method === "POST" ? req.body : undefined,
    headers: authHeaders(req),
  });

  if (result.ok) {
    // ⭐ The upstream body passes through with the declared facts about the source attached.
    // Those facts are prose and units — what a reader needs to interpret a reading — and they
    // are the only thing this route adds. It does not touch `estimate`, `readings`, or any
    // number the server computed.
    return res.status(result.status).json({
      ...result.data,
      declaration: {
        source: spec.source,
        label: spec.label,
        constrains: spec.constrains,
        sigma: spec.sigma,
        units: spec.units,
        ...(result.data?.declaration ?? {}),
      },
    });
  }

  // ⚠️ A rejection the server *authored* is forwarded verbatim rather than being flattened
  // into a gate. `wrong_shape` and `incoherent_observation` are answers, and turning them into
  // "not implemented yet" would tell a provider being wired up that the feature is missing
  // when in fact their reading was refused for a stated reason.
  if (result.status >= 400 && result.status < 500 && result.data?.reason) {
    return res.status(result.status).json(result.data);
  }

  // ⚠️ An outage is reported as an outage, and never as a fact about the data.
  //
  // Reaching here with `upstream_unreachable` and reporting `no-observations` would render the
  // headline "Nothing observed yet" — a claim about the log — when the truth is that nothing
  // was asked. A participant with a hundred readings would be told they had none, and the
  // failure would look like an honest epistemic limit, which is the most flattering possible
  // lie about a deployment. The provider gates below describe things genuinely not built; a
  // stopped server is not one of them.
  const unreachable =
    result.reason === Reason.UPSTREAM_UNREACHABLE || result.reason === Reason.UPSTREAM_TIMEOUT;

  // Sources with no `envKey` need no provider — they are blocked on ingestion instead, and
  // saying "no provider" for them would send someone to configure an API that does not exist.
  const gate = unreachable
    ? "upstream-unreachable"
    : spec.envKey
      ? process.env[spec.envKey]
        ? null
        : "no-provider"
      : source === "satellites"
        ? "no-elements"
        : "no-observations";

  return notImplemented(res, {
    blockedBy: gate ?? "no-observations",
    // ⚠️ The source's own note explains why *this source* is hard, which is the wrong thing to
    // say about an outage — it would read as the reason nothing is shown when the reason is
    // that nothing was asked. The note is still worth having under a real gate, where it does
    // explain the block.
    note: unreachable
      ? `${spec.label} readings are folded by olduvai-server, which did not answer. This is an outage, not a statement about what has been observed.`
      : spec.note,
    // ⚠️ The gate is the *fallback*, reached when upstream is unreachable or erroring — not
    // the default path any more. Keeping it means a dead server degrades to an honest "not
    // available" instead of a stack trace, which is the same promise the page already makes.
    upstream: result.reason,
    // Shape-compatible with a live response, so the view renders one way rather than two.
    // ⭐ `constrains` is carried even when empty: it is the fact about this source that does
    // not depend on there being any readings.
    declaration: {
      source: spec.source,
      label: spec.label,
      constrains: spec.constrains,
      sigma: spec.sigma,
      units: spec.units,
      readings: [],
    },
  });
}
