/**
 * Acquire a browser position and record it as an observation.
 *
 * # ⭐ Why this is a module and not a second copy of `LocationCapture`'s effect
 *
 * The submit body has four details that are each individually easy to get wrong and each fail
 * opaquely: `accuracy` is a 95% figure and the filter wants one sigma, `altitude` arrives in
 * metres where `Geodetic` wants kilometres, a missing altitude must be `0` rather than `null`
 * or the extractor rejects the whole body, and `taken_at` is a **Julian day** rather than an
 * ISO string. `LocationCapture` got all four right and was verified against the running engine.
 *
 * ⚠️ Writing them a second time for the automatic path would have meant two implementations of
 * a wire format, and the one that drifts is the one nobody watches. So the working version moved
 * here and both callers use it.
 *
 * # ⚠️ What this does not decide
 *
 * It records a fix. It does not decide *when* to ask — a page asking on mount and a button
 * asking on click are different consent situations, and that judgement stays with the caller.
 */

/** ⭐ 95% → one sigma, floored at the engine's `min_sigma_m`. The conversion that must not be skipped. */
export function sigmaFromAccuracy(accuracy) {
  return Math.max(1, (accuracy ?? 100) / 2);
}

/** The browser's three failure cases, kept distinct because the remedy differs entirely. */
export function describeGeolocationError(err) {
  if (err?.code === 1) {
    return "You declined the location request. Nothing was sent. Allow location for this site in your browser settings if you want to try again.";
  }
  if (err?.code === 2) {
    return "Your device could not determine a position. This is common indoors and on desktops without GPS.";
  }
  return "The location request timed out before your device answered.";
}

/**
 * Ask the browser for a position.
 *
 * ⚠️ Never rejects — resolves `{ok: false, detail}` instead, so a caller cannot forget a catch
 * and turn a declined permission into an unhandled rejection in the console.
 *
 * `timeout` is generous by default: a cold GPS fix outdoors regularly takes over 10 s.
 * `enableHighAccuracy` because the accuracy figure becomes a sigma the filter trusts, and a
 * coarse network fix submitted as though it were GPS would understate its own error.
 */
export function requestPosition({ timeout = 20000, highAccuracy = true } = {}) {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve({ ok: false, detail: "This browser does not expose a location API." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ ok: true, position: pos }),
      (err) => resolve({ ok: false, detail: describeGeolocationError(err), code: err?.code }),
      { enableHighAccuracy: highAccuracy, timeout, maximumAge: 0 }
    );
  });
}

/**
 * Post a browser position to the observation log as `Observation::Fix`.
 *
 * ⚠️ The wire shape is verified against `crates/olduvai-core/src/fusion.rs` and must not be
 * adjusted casually — the server answers a malformed body with an opaque rejection rather than
 * a field error.
 */
export async function recordFix(pos) {
  const { latitude, longitude, altitude, accuracy } = pos.coords;
  const sigma_m = sigmaFromAccuracy(accuracy);

  try {
    const r = await fetch("/api/observe/gps", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind: "fix",
        at: {
          latitude,
          longitude,
          // ⚠️ Metres → kilometres, and a missing altitude is 0 rather than null.
          altitude_km: typeof altitude === "number" ? altitude / 1000 : 0,
        },
        sigma_m,
        source: "instrument",
        // Julian day. `Utc` is `#[serde(transparent)]` over an f64 — not an ISO string.
        taken_at: pos.timestamp / 86400000 + 2440587.5,
      }),
    });

    const body = await r.json().catch(() => null);
    if (!r.ok || body?.ok === false) {
      // ⚠️ The server's own words when it wrote any: a generic failure would hide a units or
      // shape rejection that names exactly what is wrong.
      return {
        ok: false,
        detail: body?.detail ?? `The exchange refused the observation (HTTP ${r.status}).`,
      };
    }
    return { ok: true, latitude, longitude, sigma_m };
  } catch {
    return {
      ok: false,
      detail: "The request did not reach the application server. Nothing was recorded.",
    };
  }
}

/** Ask, then record. Resolves `{ok, ...}` and never rejects. */
export async function acquireAndRecord(options) {
  const got = await requestPosition(options);
  if (!got.ok) return got;
  return recordFix(got.position);
}
