/**
 * The two rails, declared once.
 *
 * # Why a manifest rather than JSX in each sidebar
 *
 * The rails, the pages they point at, and the API routes those pages call have to agree.
 * Written out three times they agree until someone edits one of them. Written once, a page
 * can look up its own entry and render its own title, its own gate, and its own blocked
 * reason from the same record the sidebar linked to.
 *
 * # ⭐ The split is not cosmetic
 *
 * **Left is context: what is true around a participant.** Their own entry, and the external
 * world — weather, roads, reference prices. Read, not acted on. Per `notes/27` §4 none of
 * it is observed by the exchange, so none of it carries evidential weight.
 *
 * **Right is process: what is happening to a consignment.** Transport, payment, monitoring,
 * and the graph the whole thing is addressed in. These are views onto coalitions and the
 * ledger — the exchange's own record.
 *
 * Someone reading the left rail is orienting. Someone reading the right rail is tracking
 * something already in motion. A single merged menu would have flattened that, and the two
 * carry different evidential weight, which is not a distinction to bury in a list.
 *
 * # ⭐ What note 31 items 2 and 3 changed, and what they did not
 *
 * The note lists a left rail of Terrain, Satellites, Shipping, Flights, GPS, Atmosphere,
 * Economics and Traffic, and a right rail of Knowledge Graph and Predictions. It supplies
 * globe.gl and d3 examples for four of them.
 *
 * ⭐ **Four of those eight left entries are the same thing: position observation sources.**
 * Satellites, Flights, GPS and Terrain are not four integrations. They are four shapes of
 * input to `olduvai_core::fusion` — a `Corridor` from an overflying aircraft, a `Fix` from a
 * handset, a `Reading` with a footprint from a terrain tile, an `Overpass` computed from a
 * TLE. Note 33 reached that conclusion from the data side; the rail reaches it from the
 * navigation side, and they have to agree or the rail is lying about what the pages are.
 *
 * So `kind: "observation"` is carried on those entries. It is not decoration: it is what
 * lets a page say *what its data would constrain* while it has none, and it is what stops
 * the four drifting into four unrelated map widgets.
 *
 * ⚠️ **Shipping did not survive.** The example is a submarine-cable map. This exchange moves
 * maize by road between inland holdings; a cable landing point constrains nothing about a
 * consignment. Freight *corridors* matter and are already Transport on the right rail, where
 * they belong, because a leg is process rather than context. Keeping "Shipping" would have
 * meant keeping a rail entry for the sake of the example that produced it.
 *
 * ⚠️ **Atmosphere folded into Weather rather than sitting beside it.** The note's own weather
 * example fetches eight parameters from one Open-Meteo call — temperature, humidity,
 * pressure, dew point, cloud, wind, precipitation. Those *are* the atmosphere. Two rail
 * entries over one provider call would have been two pages arguing about which owns pressure.
 */

/**
 * Where each rail's data comes from — see `lib/api/upstream.js`.
 *
 * `kind` is read by the assistant and by the page, and has three values:
 *
 *   - `"observation"` — would contribute to `fusion::Estimate` for this participant. The
 *     entry names the `Observation` variant it produces in `constrains`.
 *   - `"context"` — informs a person, never becomes a field. Always `Source::Asserted`.
 *   - `"process"` — a view onto the exchange's own record.
 */
export const LEFT_RAIL = [
  {
    href: "/dashboard/profile",
    label: "Profile",
    blurb: "Your entry, address, and per-field provenance",
    api: "/api/participants/me",
    kind: "process",
    blockedBy: "participant-identity",
  },
  {
    href: "/dashboard/position",
    label: "Position",
    blurb: "Every observation of where you are, and how well they agree",
    api: "/api/position",
    kind: "observation",
    constrains: "estimate",
    blockedBy: "no-observations",
  },
  /**
   * ⚠️ **`kind: "context"`, not `"observation"` — and the endpoint moved with it.**
   *
   * This entry read `/api/observe/terrain`, `kind: "observation"`, `constrains: "within"`. That
   * described a DEM tile *entering the observation log* as `Observation::Within`, saying **the
   * holding is somewhere in this region** — a real design, still unbuilt, and gated on an
   * `OLDUVAI_TERRAIN_API_KEY` that nothing sets.
   *
   * ⭐ What is now built answers the **inverse** question: *given a position already folded from
   * the log, what is the ground doing there.* It reads the DEM **at** a place; it cannot tell you
   * the place. So it is context, like weather, and it lives in `feeds/`.
   *
   * ⚠️ Leaving `constrains: "within"` while serving this feed would have been the worse half of
   * the change: the rail would have told a participant that a reading which cannot constrain
   * position does constrain it. `constrains` is dropped rather than softened — a context feed
   * constrains nothing, and a field claiming otherwise is what note 33 exists to prevent.
   */
  {
    href: "/dashboard/terrain",
    label: "Terrain",
    blurb: "Ground elevation under your holding, on the provider's own DEM",
    api: "/api/feeds/terrain",
    kind: "context",
    blockedBy: "no-observations",
  },
  {
    href: "/dashboard/satellites",
    label: "Satellites",
    blurb: "What passes overhead, propagated from published elements",
    api: "/api/observe/satellites",
    kind: "observation",
    // ⚠️ `within`, not `overpass`. An overpass is the window in which a sensor could have
    // seen the holding; the observation is the reading taken during it, and a reading covers
    // ground. `constrains` names an `Observation` variant that exists in `olduvai-core`, and
    // `overpass` is not one — the server would refuse it with `wrong_shape`.
    constrains: "within",
    blockedBy: "no-elements",
  },
  {
    href: "/dashboard/flights",
    label: "Flights",
    blurb: "Tracks crossing your area — a direction, not a place",
    api: "/api/observe/flights",
    kind: "observation",
    constrains: "corridor",
    blockedBy: "no-provider",
  },
  {
    href: "/dashboard/gps",
    label: "GPS",
    blurb: "Fixes you have recorded, with their stated accuracy",
    api: "/api/observe/gps",
    kind: "observation",
    constrains: "fix",
    blockedBy: "no-observations",
  },
  {
    href: "/dashboard/weather",
    label: "Weather",
    blurb: "Atmosphere over your holding, at the provider's grid resolution",
    api: "/api/feeds/weather",
    kind: "context",
    // ⭐ `no-observations`, not `no-provider`. Open-Meteo is wired and keyless, so a provider is
    // no longer the thing this page is waiting for — a *position to centre the grid on* is.
    // ⚠️ This value is only the fallback for when the BFF itself cannot be reached, but leaving
    // it as `no-provider` would have put "choosing a provider is a research decision" on a page
    // whose provider was chosen, which is the same self-contradiction note 37 §4.1 recorded
    // between this route and `lib/ai/sources.js`.
    blockedBy: "no-observations",
  },
  {
    href: "/dashboard/traffic",
    label: "Traffic",
    blurb: "Conditions on haulage corridors",
    api: "/api/feeds/traffic",
    kind: "context",
    blockedBy: "no-provider",
  },
  {
    href: "/dashboard/prices",
    label: "Economics",
    blurb: "External reference quotes — not exchange prices",
    api: "/api/feeds/prices",
    kind: "context",
    blockedBy: "no-provider",
  },
  {
    href: "/dashboard/advisories",
    label: "Advisories",
    blurb: "Agronomic and phytosanitary notices",
    api: "/api/feeds/advisories",
    kind: "context",
    blockedBy: "no-provider",
  },
];

export const RIGHT_RAIL = [
  {
    href: "/dashboard/foreman",
    label: "Foreman",
    blurb: "Your own record of your own activity, checked against itself",
    api: "/api/process/foreman",
    kind: "process",
    blockedBy: "no-participant-record",
  },
  {
    href: "/dashboard/transport",
    label: "Transport",
    blurb: "Haulage legs and their provenance",
    api: "/api/process/transport",
    kind: "process",
    blockedBy: "cohesion-gate",
  },
  {
    href: "/dashboard/payments",
    label: "Payments",
    blurb: "Settlement against the append-only ledger",
    api: "/api/process/payments",
    kind: "process",
    blockedBy: "gate-and-ledger",
  },
  {
    href: "/dashboard/monitoring",
    label: "Monitoring",
    blurb: "Growing and handling, as recorded at source",
    api: "/api/process/monitoring",
    kind: "process",
    blockedBy: "sealed-sensors",
  },
  {
    href: "/dashboard/graph",
    label: "Knowledge graph",
    blurb: "The occupied trie this is all addressed in",
    api: "/api/process/graph",
    kind: "process",
    blockedBy: "cohesion-gate",
  },
  {
    href: "/dashboard/predictions",
    label: "Predictions",
    blurb: "What is forecast, what it rests on, and what it is not",
    api: "/api/process/predictions",
    kind: "process",
    blockedBy: "no-forecast-method",
  },
  {
    href: "/dashboard/ledger",
    label: "Ledger",
    blurb: "Hash-chained assembly record",
    api: "/api/ledger",
    kind: "process",
    blockedBy: "gate-and-ledger",
  },
];

/**
 * Human-readable gates.
 *
 * ⭐ A blocked page says *which* gate blocks it and *why that gate exists*. "Coming soon"
 * would be a smaller lie than fake data but a lie all the same — it implies the only thing
 * missing is time. What is actually missing is a measurement that might come back negative
 * and change the design.
 */
export const GATES = {
  "cohesion-gate": {
    title: "Behind the cohesion gate",
    detail:
      "The engine is gated on the cohesion test: if the intrinsic triple does not cluster, everything built on it is built on sand. That test has not been run, and it is allowed to fail.",
    reference: "notes/30-programming-structure.md §7 step 3",
  },
  "gate-and-ledger": {
    title: "No assemblies recorded",
    detail:
      "The ledger is written per-leg at coalition assembly, because the assembly path is unrecoverable afterwards. Nothing has been assembled, so there is nothing to show.",
    reference: "notes/30-programming-structure.md §7 step 5",
  },
  "participant-identity": {
    title: "No participant service",
    detail:
      "A participant is a ledger identity rather than a user row — every field they confirm is attributed and appended. Registration is not built.",
    reference: "notes/30-programming-structure.md §5.1",
  },
  "sealed-sensors": {
    title: "No sealed readings",
    detail:
      "A process reading is only evidence if it is sealed at the source. An unsealed reading is an assertion by whoever entered it, and would carry no evidential weight.",
    reference: "notes/19-sealed-sensors.md",
  },
  /**
   * ⭐ The only gate here a participant can clear themselves.
   *
   * Every other gate in this table waits on a research result or an unbuilt service. This
   * one waits on a process on their own machine, so its `detail` names the remedy rather
   * than the reason — there is no point explaining the epistemics of a stopped daemon.
   */
  "no-model": {
    title: "No local model running",
    detail:
      "The assistant's base model runs locally through Ollama, so that what you describe about your consignment stays on your machine. Ollama is not running, or has no model installed.",
    reference: "notes/31-dashboard-design.md item 1",
  },
  /**
   * ⚠️ Separated from `no-model` after a live run reached it. The model was installed and
   * answering; one stage simply ran past 180 seconds.
   *
   * ⭐ Sharing `no-model` looked harmless and was not: it told someone whose machine is slow
   * to install a model they already have, which is a remedy that cannot work and gives no
   * clue why. A gate is read as a diagnosis, so a gate that names the wrong cause costs more
   * than a vague one.
   *
   * Measured cause on the machine that produced it: Ollama running on CPU with no GPU share,
   * at roughly six tokens per second. That is a fact about the deployment rather than about
   * this codebase, which is why the detail describes it instead of promising a fix here.
   */
  "model-too-slow": {
    title: "The model is too slow to finish",
    detail:
      "The assistant's base model is installed and answering, but one stage ran past the time a single request allows. This is a property of where the model is running rather than of what was asked — on a machine without GPU acceleration each stage takes minutes.",
    reference: "notes/31-dashboard-design.md item 1",
  },
  "no-provider": {
    title: "No provider configured",
    detail:
      "This feed needs an external provider, and choosing one is a research decision about what can be verified at what resolution — not a matter of picking an SDK.",
    reference: "notes/30-programming-structure.md §5.3",
  },
  /**
   * ⭐ Not a gate on unbuilt machinery. The machinery exists.
   *
   * `olduvai_core::fusion` is implemented and tested; `Positions` in the server folds a log
   * into an estimate and proves the fold. What is absent is *observations* — nobody has
   * recorded any. Saying "no provider" here would be wrong in a way that matters: it would
   * send someone to configure an API when what is needed is a first reading.
   *
   * ⚠️ **This no longer fires for an empty log on the position route, and that is the point.**
   * `/v1/observe/:source` and `/v1/position` now exist upstream, and an unobserved participant
   * gets `200` with the uninformed prior rather than a 503 — because "we do not know where you
   * are, to within 200 km" is an *answer*. The gate remains for the rails that have no
   * ingestion path at all, where there is genuinely nothing to ask for.
   */
  "no-observations": {
    title: "Nothing observed yet",
    detail:
      "Position is folded from an observation log, and this source has contributed nothing to it. The filter is built and answers regardless: with no observations the estimate is the uninformed prior — a 200 km sigma, which is a statement that we do not know where you are rather than a rough guess.",
    reference: "notes/33-position-fusion.md §5",
  },
  /**
   * ⚠️ Not a research gate, and the only entry here that is nobody's decision.
   *
   * Every other gate in this table describes something unbuilt or undecided. This one means
   * the machinery exists and did not answer — a stopped `olduvai-server`, a timeout, a 500.
   * It is kept distinct from `no-observations` because conflating them would report an
   * outage as an epistemic limit, which is the most flattering possible lie about a
   * deployment.
   */
  "upstream-unreachable": {
    title: "The exchange server did not answer",
    detail:
      "This view is computed by olduvai-server, which is unreachable, timed out, or returned an error. Nothing is wrong with the method — the numbers below are the uninformed prior's own values and not a cached estimate, so nothing shown here rests on a reading that was not taken.",
    reference: "web/src/lib/api/upstream.js",
  },
  /**
   * Distinct from `no-provider` on purpose: element sets are public and free, so this gate
   * is about ingestion rather than about a commercial decision.
   */
  "no-elements": {
    title: "No orbital elements loaded",
    detail:
      "An overpass here is a computation, not a lookup: the two-line element set and the timestamp go in the ledger so anyone can recompute the answer and get our bytes. No element set has been ingested, so there is nothing to propagate.",
    reference: "notes/30-programming-structure.md §5.3, olduvai-core::orbit",
  },
  "no-participant-record": {
    title: "No activity recorded",
    detail:
      "The foreman is your own append-only record of your own activity, checked for coherence against itself. It is advisory to you and carries no weight on the exchange — platform guarantees attach at sale. Nothing has been recorded yet.",
    reference: "notes/33-position-fusion.md §3, olduvai-core::foreman",
  },
  /**
   * ⚠️ The one gate in this table that may never lift, and the wording says so.
   *
   * Every other entry here waits on work. This one waits on a *decision that a forecast can
   * be made honestly at all*. A yield prediction that cannot state what it rests on is a
   * number that will be treated as evidence, and the exclusion of AI from synthesis exists
   * precisely because a plausible unrecomputable number is worse than no number.
   */
  "no-forecast-method": {
    title: "No forecast method chosen",
    detail:
      "A prediction shown here would have to be recomputable from the ledger years later by someone without the model that produced it. No method meeting that has been chosen, and it is an open question whether one exists at the resolution a single holding needs. Until then this page shows nothing rather than a number that would be read as evidence.",
    reference: "notes/30-programming-structure.md §7 step 4",
  },
};

/** Look up a rail entry by pathname, for a page to describe itself. */
export function findEntry(href) {
  return [...LEFT_RAIL, ...RIGHT_RAIL].find((e) => e.href === href) ?? null;
}
