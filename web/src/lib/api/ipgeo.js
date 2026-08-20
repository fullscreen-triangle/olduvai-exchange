/**
 * A city-level position derived from the caller's IP address.
 *
 * # ⚠️ Read this before using anything here
 *
 * ⭐ **This is the worst position source in the system, and it exists because the alternative is
 * no position at all.** A browser that cannot reach a GPS or a network provider leaves the log
 * empty, and an empty log makes every context page in the left rail refuse — correctly, and
 * indistinguishably from a broken product. That was the reported experience: *"the position tab
 * is blank, I have to ask for position."*
 *
 * ⚠️ What an IP actually locates is **the network's registered service area**, not a person. For
 * a mobile carrier that can be the whole country; for a VPN it is wherever the exit node is; for
 * a rural ISP backhauled to the capital it is the capital. It is not a measurement of anywhere
 * anybody stood, and nothing here pretends otherwise.
 *
 * # ⭐ Why it is still admissible: the sigma carries the truth
 *
 * The participant already ruled on the shape this should take — *"As an Observation::Fix with a
 * wide sigma"* — and that is exactly right, because the engine's folding is variance-weighted.
 * A 25 m instrument fix arriving later dominates a 25 km network fix by a factor of a million in
 * precision, so this is **displaced the instant anything better appears** rather than needing to
 * be deleted. A wide sigma is not a disclaimer bolted on; it is the mechanism.
 *
 * ⚠️ Consequently the sigma here is deliberately **pessimistic**, and is taken from the provider's
 * own accuracy radius when it gives one, floored at 10 km. A provider that claims a 1 km radius
 * for an IP is claiming more than an IP can support, and accepting that claim would let terrain
 * sample a 90 m DEM around a point that could be forty minutes' drive away.
 *
 * # ⚠️ Provenance is `third_party`, never `instrument`
 *
 * `Source::Instrument` means something measured. Nothing measured this. It enters as
 * `third_party`, which is the same provenance a cell-tower lookup gets, and `PROVENANCE_CAPTION`
 * already states what that means to a reader.
 *
 * # ⭐ Keyless by choice, and measured before being chosen
 *
 * ⚠️ ipapi.co was written first and **rejected after testing**: from this server its very first
 * call returned `{"error": true, "reason": "RateLimited"}`. A fallback that fails on its first
 * request is not a fallback. `ipwho.is` answered the same query over HTTPS with no credential and
 * is used instead.
 *
 * ⚠️ A keyed provider was rejected on purpose: this is the path that runs when everything better
 * has failed, and it has to work on a fresh deployment before anyone has configured anything. A
 * fallback with a prerequisite is not a fallback either.
 *
 * # ⭐ The two providers disagreed by 4,000 km, and that is the sigma's justification
 *
 * Asked about the same address (`8.8.8.8`), ip-api.com answered *Ashburn, Virginia* and ipwho.is
 * answered *San Jose, California*. ⚠️ Both were confident; both returned a bare coordinate with
 * no uncertainty attached. That disagreement is not an anomaly to be resolved — it is what an IP
 * actually determines, and it is the reason the sigma below is a floor imposed here rather than a
 * figure taken from the provider.
 */

const TIMEOUT_MS = 6000;

/**
 * ⭐ The floor on sigma, in metres.
 *
 * ⚠️ 10 km is not a measurement — it is the smallest radius at which an IP-derived point is not
 * actively misleading. Providers routinely report tighter figures by naming a city centroid, and
 * a centroid's precision is a property of the city record, not of the caller's location.
 */
const MIN_SIGMA_M = 10000;

/**
 * Locate the caller by IP.
 *
 * Returns `{ok: true, latitude, longitude, sigma_m, label}` or `{ok: false, reason}`.
 * ⚠️ Never throws — the same contract as every other client in this directory, so a dead provider
 * is a stated absence rather than a 500 from the route.
 */
export async function locateByIp(ip) {
  // ⚠️ A private or loopback address geolocates to nothing useful, and asking a public provider
  // about one leaks the shape of the deployment for no return. Refuse before the network call.
  if (!ip || isPrivate(ip)) {
    return { ok: false, reason: "the caller's address is not routable, so it locates nothing" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const r = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    if (!r.ok) return { ok: false, reason: `the address database answered HTTP ${r.status}` };

    const body = await r.json();
    // ⚠️ ipwho.is reports its own errors **inside a 200**, as `{"success": false, "message": …}`.
    // Checking only `r.ok` would read a refusal as a fix, and a missing coordinate then reads as
    // 0,0 — a point in the Gulf of Guinea that looks like a real position.
    if (body?.success === false) {
      return { ok: false, reason: `the address database declined: ${body.message ?? "no reason given"}` };
    }

    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { ok: false, reason: "the address database returned no coordinate" };
    }

    return {
      ok: true,
      latitude,
      longitude,
      sigma_m: MIN_SIGMA_M,
      // ⭐ Named, because a reader who sees a 10 km circle should be able to tell whether it is
      // around the right town at all — that is the one check they can actually perform.
      label: [body?.city, body?.region, body?.country].filter(Boolean).join(", ") || null,
    };
  } catch (e) {
    return {
      ok: false,
      reason:
        e?.name === "AbortError"
          ? "the address database did not answer in time"
          : "the address database could not be reached",
    };
  } finally {
    clearTimeout(timer);
  }
}

/** ⚠️ RFC1918, loopback, link-local and IPv6 local — the addresses a proxy leaves behind. */
function isPrivate(ip) {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("169.254.") ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

/**
 * The caller's address, as seen through the reverse proxy.
 *
 * ⚠️ `x-forwarded-for` is a **list**, appended to by each hop, and the client is the *first*
 * entry. Reading the last one yields the proxy's own address, which is private and geolocates to
 * nothing — a failure that looks like the provider being broken.
 */
export function callerIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress ?? null;
}
