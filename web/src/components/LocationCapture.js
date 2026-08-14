import { useCallback, useEffect, useState } from "react";

/**
 * Ask the browser where the participant is, and submit it as a GPS observation.
 *
 * # ⚠️ Why this had to exist before any map did
 *
 * A live deployment was used for the first time and every location-dependent question failed.
 * Asked for their elevation, a participant got 56 seconds of prose ending in *"it's unknown
 * whether the participant's geographic location can be associated with an elevation value"*.
 * The engine's own answer was much shorter: `observation_count: 0`, `sigma_m: 200000`, and a
 * placeholder coordinate at the centroid of the country.
 *
 * ⭐ **Nothing in the app could set a position.** `POST /v1/observe/gps` existed and was tested,
 * `Estimate::update` folded correctly, `/v1/position` reported honestly — and no screen ever
 * called any of it. The whole observation chain was reachable only by `curl`. So every rail
 * downstream of a location was permanently uninformed, which is indistinguishable from broken
 * to the person using it.
 *
 * # ⭐ The browser's fix is an observation like any other
 *
 * `navigator.geolocation` returns `coords.accuracy` in metres at **95% confidence**, which is
 * roughly two sigma. It is converted to one sigma here (`/2`) rather than passed through, because
 * `Observation::sigma_m` is one sigma everywhere else in this system, and a value that means
 * something different depending on which screen submitted it would corrupt the fold silently —
 * the filter would trust browser fixes about twice as much as it should.
 *
 * ⚠️ `source: "instrument"` is honest: this is a device sensor reading, not something the
 * participant typed. `notes/27` §4's observed/asserted split is the whole reason the field
 * exists, and mislabelling here would let an asserted value earn evidential weight.
 *
 * # ⚠️ What this is not
 *
 * It is not a map. A map that shows where you are is a different and larger piece of work —
 * no map library is installed in this project at all. This is the input the map would have
 * needed anyway, built first because it is what unblocks the engine.
 */
export default function LocationCapture({ onSubmitted }) {
  const [state, setState] = useState({ phase: "idle" });
  const [supported, setSupported] = useState(true);

  // ⚠️ Checked in an effect, not at render. `navigator` does not exist during SSR, and reading
  // it at module or render scope crashes the build rather than degrading.
  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && "geolocation" in navigator);
  }, []);

  const capture = useCallback(() => {
    setState({ phase: "locating" });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, altitude, accuracy } = pos.coords;

        // ⭐ 95% → one sigma. See the module doc; this is the one conversion that must not be
        // skipped. Floored at 1 m to match the engine's `min_sigma_m` bound — a browser
        // claiming better than metre accuracy is claiming more than it can know.
        const sigma_m = Math.max(1, (accuracy ?? 100) / 2);

        setState({ phase: "submitting", latitude, longitude, sigma_m });

        try {
          const r = await fetch("/api/observe/gps", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              kind: "fix",
              at: {
                latitude,
                longitude,
                // ⚠️ `Geodetic` requires `altitude_km`, and the browser reports altitude in
                // **metres** or not at all. Converting is not optional and neither is the
                // fallback: a missing altitude is 0 km, not `null`, because the extractor
                // rejects the whole body otherwise and the rejection surfaces as an opaque
                // `not_implemented` rather than a field error.
                altitude_km: typeof altitude === "number" ? altitude / 1000 : 0,
              },
              sigma_m,
              source: "instrument",
              // Julian day. `Utc` is `#[serde(transparent)]` over an f64, so this is the wire
              // shape the server expects — not an ISO string.
              taken_at: pos.timestamp / 86400000 + 2440587.5,
            }),
          });

          const body = await r.json().catch(() => null);

          if (!r.ok || body?.ok === false) {
            // ⚠️ The server's own words, when it wrote any. A generic "could not save" would
            // hide a units or shape rejection that names exactly what is wrong.
            setState({
              phase: "failed",
              detail:
                body?.detail ??
                `The exchange refused the observation (HTTP ${r.status}).`,
            });
            return;
          }

          setState({ phase: "done", latitude, longitude, sigma_m });
          onSubmitted?.();
        } catch {
          setState({
            phase: "failed",
            detail: "The request did not reach the application server. Nothing was recorded.",
          });
        }
      },
      (err) => {
        // ⚠️ The three cases are distinguished because the remedy differs entirely: a denied
        // permission is undone in browser settings, a timeout is retried, and an unavailable
        // sensor is neither. One message for all three would send people to the wrong fix.
        const detail =
          err.code === err.PERMISSION_DENIED
            ? "You declined the location request. Nothing was sent. Allow location for this site in your browser settings if you want to try again."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Your device could not determine a position. This is common indoors and on desktops without GPS."
              : "The location request timed out before your device answered.";
        setState({ phase: "failed", detail });
      },
      // ⭐ `enableHighAccuracy` because the accuracy figure becomes a sigma the filter trusts —
      // a coarse network fix submitted as though it were GPS would understate its own error.
      // 20 s is generous on purpose: a cold GPS fix outdoors regularly takes over 10 s.
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, [onSubmitted]);

  if (!supported) {
    return (
      <p className="text-sm leading-relaxed text-muted">
        This browser does not expose a location API, so a position cannot be captured here.
      </p>
    );
  }

  return (
    <div>
      {(state.phase === "idle" || state.phase === "failed") && (
        <button
          type="button"
          onClick={capture}
          className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-light transition-colors hover:border-muted/60"
        >
          {state.phase === "failed" ? "Try again" : "Use my current location"}
        </button>
      )}

      {(state.phase === "locating" || state.phase === "submitting") && (
        <p className="text-sm text-muted/70" aria-live="polite">
          {state.phase === "locating"
            ? "Asking your device…"
            : "Recording the observation…"}
        </p>
      )}

      {state.phase === "done" && (
        <p className="text-sm leading-relaxed text-muted" aria-live="polite">
          Recorded {state.latitude.toFixed(6)}, {state.longitude.toFixed(6)} degrees at{" "}
          {state.sigma_m.toFixed(0)} m (one sigma). The estimate below now rests on it.
        </p>
      )}

      {state.phase === "failed" && (
        <p className="mt-3 text-sm leading-relaxed text-muted/80" aria-live="polite">
          {state.detail}
        </p>
      )}

      {/* ⚠️ Stated before the button is pressed, not after. The coordinate is submitted to this
          deployment's own server and folded into an estimate; someone is entitled to know that
          before they share where they are, not in a confirmation they read afterwards. */}
      {state.phase === "idle" && (
        <p className="mt-3 text-[11px] leading-relaxed text-muted/50">
          Your browser asks you first. The coordinate is sent to this exchange&apos;s server and
          recorded as an observation. It is not sent anywhere else.
        </p>
      )}
    </div>
  );
}
