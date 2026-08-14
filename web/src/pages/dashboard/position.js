import LocationCapture from "@/components/LocationCapture";
import PositionMap from "@/components/PositionMap";
import RailPage from "@/components/RailPage";
import { useState } from "react";

/**
 * The fused estimate — what the four observation rails combine into.
 *
 * ⭐ This page is not in note 31. The note lists Satellites, Flights, GPS and Terrain as four
 * separate map pages; it does not list the thing they combine into, and that is the page that
 * makes the other four cohere. See `pages/api/position.js`.
 *
 * ⚠️ **It is also the only page that can put a position *in*.** Until `LocationCapture` was
 * added, every rail downstream of a location was permanently uninformed on a real deployment,
 * because nothing in the app ever called `POST /v1/observe/gps` — the whole chain was reachable
 * only from `curl`. A page that reports an estimate and offers no way to inform it is a
 * read-only view of a number that will never change.
 */
export default function Page() {
  // ⭐ Bumped after a successful capture to re-mount `RailPage`, which refetches on mount. The
  // alternative — lifting the fetch out of `RailPage` so this page could refresh it — would
  // make every other rail page carry a parameter only this one uses.
  const [generation, setGeneration] = useState(0);

  return (
    <RailPage key={generation}>
      {(data) => <Estimate data={data} onRecorded={() => setGeneration((g) => g + 1)} />}
    </RailPage>
  );
}

function Estimate({ data, onRecorded }) {
  const e = data?.estimate ?? null;
  if (!e) return null;

  const measured = e.rests_on_observation === true;

  return (
    <div>
      {/* ⭐ The map is drawn above the numbers rather than below them. It is the same estimate
          either way, but the circle carries the magnitude of the uncertainty in a form that a
          figure like "200 km" does not — someone reading "12 m" and someone reading "200 km" are
          reading two similar-looking strings, and two very different pictures. */}
      <div className="mb-6">
        <PositionMap estimate={e} />
      </div>

      {/* ⚠️ The uninformed case is stated as "not known", not as a coordinate with a caveat.
          The engine holds a placeholder at the centroid of the country with a 200 km sigma;
          rendering that as a position with a footnote is how a reader ends up believing the
          system knows where they are. */}
      <div className="rounded-xl border border-border bg-surface/60 p-4">
        <p className="mb-1 text-[11px] uppercase tracking-widest text-muted">
          {measured ? "Position estimate" : "Position not known"}
        </p>

        {measured ? (
          <>
            <p className="text-sm leading-relaxed text-light/90">
              {e.at.latitude.toFixed(6)}, {e.at.longitude.toFixed(6)} degrees
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Uncertainty {formatSigma(e.sigma_m)} (one sigma), from{" "}
              {e.observation_count} observation{e.observation_count === 1 ? "" : "s"}
              {e.strongest_source ? `; strongest source ${e.strongest_source}` : ""}.
            </p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted">
            No position observations have been recorded, so the exchange does not know where
            you are. The coordinate it holds is a placeholder with an uncertainty of{" "}
            {formatSigma(e.sigma_m)} — it is not a measurement of you, and nothing that depends
            on your location can be answered until this is informed.
          </p>
        )}
      </div>

      <div className="mt-6">
        <LocationCapture onSubmitted={onRecorded} />
      </div>
    </div>
  );
}

/** Metres below a kilometre, kilometres above it. A "200000 m" sigma reads as precision. */
function formatSigma(m) {
  if (typeof m !== "number") return "unknown";
  return m >= 1000 ? `${(m / 1000).toFixed(0)} km` : `${m.toFixed(0)} m`;
}
