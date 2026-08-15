import { authHeaders, requireSession } from "@/lib/api/session";
import { forward, methodNotAllowed, notImplemented } from "@/lib/api/upstream";

/**
 * The fused position estimate: what every observation source combines into.
 *
 * # ⭐ Why this is its own route and not one more entry in `observe/[source]`
 *
 * `observe/[source]` is a table of *inputs*. This is the *fold*. They are different kinds of
 * thing, and the difference is the entire point of note 33:
 *
 * > *"A combination of noisy sensors plus kalman filtering produces more precise data."*
 *
 * The sources are individually weak by assumption. None of them is a check on any other, and
 * none of them is intended to be good enough alone. The estimate is where the weakness stops
 * being a defect and starts being the mechanism — and a participant looking at their position
 * should be looking at the combination, not at four separate pages each of which is
 * individually unimpressive.
 *
 * ⚠️ Note 31's left rail does not have this entry. It lists Satellites, Flights, GPS and
 * Terrain as four separate map pages. Four sources with no page showing what they combine
 * into would have been four rendering demos.
 *
 * # ⚠️ Emptiness here is a *result*, not a failure
 *
 * When there are no observations, `olduvai_core::fusion::Estimate::uninformed` still returns
 * an estimate: the participant's seed position with a 200 km sigma. That is not a placeholder
 * and it is not a rough guess — it is the encoding of *we do not know where you are*, chosen
 * wide enough that the first real observation overwrites it almost entirely (note 33 §7).
 *
 * ⭐ So this route's blocked response carries `sigma_m` and `rests_on_observation: false`
 * rather than nulls. A page that renders "200 km, stated rather than measured" is telling the
 * truth; a page that renders a spinner is not.
 *
 * # ⚠️ The fold does not happen here
 *
 * `Estimate::update` in `olduvai-core` is the only implementation. If this route ever
 * multiplies a sigma, a second implementation has been born — the same mechanical test
 * `positions.rs` applies to itself.
 *
 * ⚠️ This paragraph also claimed the update was "reached natively by the server and through
 * WASM by the browser". The browser half was false; see the same correction in
 * `pages/api/observe/[source].js`. `olduvai-wasm` exports no `fusion` type and `web/` contains
 * no built wasm package, so every fold happens in the server process today.
 */

export default async function handler(req, res) {
  if (methodNotAllowed(req, res, "GET")) return;
  if (requireSession(req, res)) return;

  const result = await forward("/v1/position", { headers: authHeaders(req) });

  // ⚠️ Reached only when upstream is unreachable or erroring — *not* when the log is empty.
  // The server answers an unobserved participant with `200` and the uninformed prior, because
  // "we do not know where you are, to within 200 km" is a result. Gating on emptiness here
  // would replace that honest number with a 503 and make the two indistinguishable.
  if (!result.ok) {
    // ⚠️ `upstream_error` lands here too — a live server answering 500 is not the same as one
    // that is down, and both are reported under this gate because from a participant's side the
    // consequence is identical: the fold did not run. `upstream` carries which it was, so the
    // distinction survives for whoever is reading logs rather than the page.
    return notImplemented(res, {
      blockedBy: "upstream-unreachable",
      upstream: result.reason,
      note: "Position is folded from an observation log by olduvai-core::fusion. The filter is built and tested, and the fold runs upstream — which did not answer. The numbers below are the prior's own values, not a cached estimate.",
      // ⭐ Shape-compatible with a live estimate, and honest while empty. The numbers below
      // are the uninformed prior's own values, quoted from the core's authored constants —
      // not defaults chosen here. See notes/33 §7.
      declaration: {
        source: "asserted",
        label: "Position estimate",
        constrains: "estimate",
        sigma: "200 km — the uninformed prior, wide enough that any real observation dominates it",
        units: { latitude: "deg", longitude: "deg", sigma: "m" },
        rests_on_observation: false,
        readings: [],
      },
      // The four rails that would populate this, named so a blocked page can point at them
      // rather than leaving someone to guess what "an observation" would come from.
      contributors: [
        { href: "/dashboard/gps", label: "GPS", constrains: "fix" },
        { href: "/dashboard/flights", label: "Flights", constrains: "corridor" },
        { href: "/dashboard/terrain", label: "Terrain", constrains: "within" },
        // ⚠️ `within`, not `overpass`: an overpass is the window, and the observation is the
        // reading taken during it, which covers ground. Enforced upstream in routes.rs.
        { href: "/dashboard/satellites", label: "Satellites", constrains: "within" },
      ],
    });
  }

  return res.status(200).json({ ok: true, data: result.data });
}
