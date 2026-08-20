import { authHeaders, requireSession } from "@/lib/api/session";
import { fail, forward, methodNotAllowed } from "@/lib/api/upstream";
import { callerIp, locateByIp } from "@/lib/api/ipgeo";

/**
 * Record a city-level position derived from the caller's network address.
 *
 * # ⭐ Why this route exists at all
 *
 * The reported failure was: *"the position tab is blank, I have to ask for position, or for
 * weather or for any of the items."* The diagnosis was not a broken page. A fresh session holds
 * **zero observations**, so `/api/position` reports `rests_on_observation: false` and every
 * context feed refuses with `blockedBy: "no-observations"` — each of them correctly. The product
 * was honest and empty at the same time.
 *
 * ⭐ Automatic acquisition already existed in the browser, and now retries coarsely
 * (`lib/geolocate.js`). ⚠️ But a browser can still answer *nothing at all* — permission declined,
 * no radio, no network provider — and in that case there was no path to a first observation
 * except a form on one page in the left rail. This is the floor beneath that: the last source
 * that can still say something when every better one has failed.
 *
 * # ⚠️ It is the same construction as `cell.js`, and for the same reason
 *
 * The browser cannot do this lookup itself — it does not know its own public address, and asking
 * a third party from the page would tell that third party who is browsing. So the route
 * *constructs* the observation rather than forwarding one, exactly as the cell route does, and
 * for the identical structural reason.
 *
 * # ⭐ What keeps this from poisoning the estimate
 *
 * A 10 km sigma, and variance-weighted folding. `olduvai-core` weights by 1/σ², so a later 25 m
 * instrument fix outweighs this by ~160,000 to one — it is **displaced automatically** rather
 * than needing to be removed. That is why entering it as a wide `Fix` is safe and why narrowing
 * the sigma to flatter the provider would not be.
 *
 * ⚠️ And it is `third_party`, not `instrument`. Nothing measured this.
 *
 * # ⚠️ What this route refuses to do
 *
 * It does not run automatically on every request, and it does not overwrite. `PositionBootstrap`
 * calls it **only** after both browser attempts have failed, and only when the log is still
 * empty. A participant whose browser works never touches this path, and never has a 10 km circle
 * folded into a fix they measured themselves.
 */
export default async function handler(req, res) {
  if (methodNotAllowed(req, res, "POST")) return;
  if (requireSession(req, res)) return;

  const ip = callerIp(req);
  const located = await locateByIp(ip);

  /**
   * ⚠️ **502, not 400.** As in `cell.js`: the request was well formed and the lookup failed. A
   * private address — the usual case behind a misconfigured proxy — is reported in the provider's
   * own words rather than as a fault of the caller, who supplied nothing and could fix nothing.
   */
  if (!located.ok) {
    return fail(res, 502, "source_unavailable", located.reason);
  }

  const observation = {
    kind: "fix",
    at: { latitude: located.latitude, longitude: located.longitude, altitude_km: 0 },
    sigma_m: located.sigma_m,
    source: "third_party",
    // ⚠️ Julian day — `Utc` is `#[serde(transparent)]` over an f64, not an ISO string. Passing a
    // timestamp in milliseconds here dates the reading to the year 6.7 million.
    taken_at: Date.now() / 86400000 + 2440587.5,
  };

  const result = await forward("/v1/observe/gps", {
    method: "POST",
    body: observation,
    headers: authHeaders(req),
  });

  if (!result.ok) {
    // ⚠️ Forwarded verbatim, per `cell.js` — a refusal the engine authored is its statement.
    return res.status(result.status).json(result.data ?? { ok: false, reason: "upstream_error" });
  }

  return res.status(result.status).json({
    ...result.data,
    /**
     * ⭐ Echoed so a reader can perform the one check available to them: is this even the right
     * town? A bare coordinate with a 10 km sigma looks like a bad GPS reading. The same
     * coordinate labelled *"Harare, Zimbabwe, from your network address"* is self-evidently a
     * different kind of claim, and one a participant can immediately reject if it names a city
     * they have never been to.
     */
    network: {
      latitude: located.latitude,
      longitude: located.longitude,
      sigma_m: located.sigma_m,
      label: located.label,
      note:
        "⚠️ This is where your network registers, not where you are. It is recorded with a 10 km " +
        "sigma so that any position you measure yourself will immediately outweigh it.",
      provider: "ipwho.is",
      source: "third_party",
    },
  });
}
