import { recordFix, requestPosition, sigmaFromAccuracy } from "@/lib/geolocate";
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

  const capture = useCallback(async () => {
    setState({ phase: "locating" });

    // ⭐ The ask and the record both live in `lib/geolocate.js`, shared with
    // `PositionBootstrap`. The wire body has four details that each fail opaquely — sigma from a
    // 95% accuracy figure, metres to kilometres, a `0` rather than `null` altitude, and a Julian
    // day rather than an ISO string — and two copies of that is one copy that drifts.
    const got = await requestPosition();
    if (!got.ok) {
      setState({ phase: "failed", detail: got.detail });
      return;
    }

    const { latitude, longitude, accuracy } = got.position.coords;
    setState({ phase: "submitting", latitude, longitude, sigma_m: sigmaFromAccuracy(accuracy) });

    const saved = await recordFix(got.position);
    if (!saved.ok) {
      setState({ phase: "failed", detail: saved.detail });
      return;
    }

    setState({
      phase: "done",
      latitude: saved.latitude,
      longitude: saved.longitude,
      sigma_m: saved.sigma_m,
    });
    // ⚠️ Same event `PositionBootstrap` fires, so any rail page already open refetches. Recording
    // a fix here and leaving the weather page reporting "nothing observed yet" would be the same
    // defect from the manual direction.
    window.dispatchEvent(new CustomEvent("olduvai:position-recorded"));
    onSubmitted?.();
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
