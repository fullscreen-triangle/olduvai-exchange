/**
 * Road incidents around the holding, drawn as rows.
 *
 * # ⭐ Why clear roads are a stated result rather than a blank panel
 *
 * Measured against the live provider, a quiet box returns `200 {"incidents":[]}` — and around a
 * rural holding that is the usual answer, not an edge case. ⚠️ An empty panel cannot be told
 * apart from a page that failed to load, so a participant who sees nothing learns nothing and
 * distrusts the tab. This says *no incidents were reported*, and names the box it looked in, so
 * the absence is a claim with a scope attached to it.
 *
 * ⭐ The distinction is load-bearing rather than cosmetic: `lib/api/tomtom.js` returns an outage
 * as `ok: false`, which `RailPage` renders as `upstream-unreachable`. Clear roads and an
 * unreachable provider therefore reach the reader as different sentences, which is the whole
 * point of not collapsing them into one empty div.
 *
 * # ⚠️ Seconds and metres, as declared
 *
 * The feed declares `units: {delay: "s", distance: "m"}` and the client passes both through
 * unconverted. A delay is printed here in minutes **only when it exceeds a minute**, with the
 * seconds figure kept for anything shorter — a conversion done in the view, where it is visible,
 * rather than in the client, where it would silently contradict the declaration.
 *
 * # ⚠️ This is context, not settlement
 *
 * The feed's own note: *"a leg's cost is settled by the ledger, not by a live estimate."* Nothing
 * here is totalled, costed, or offered as an input to a transport quote.
 */

/** ⚠️ Minutes above a minute, seconds below — see the module doc on why this lives in the view. */
function delay(seconds) {
  if (typeof seconds !== "number") return null;
  if (seconds < 60) return `${seconds} s`;
  return `${Math.round(seconds / 60)} min`;
}

function length(metres) {
  if (typeof metres !== "number") return null;
  return metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`;
}

export default function TrafficList({ data }) {
  const incidents = Array.isArray(data?.incidents) ? data.incidents : [];
  const box = data?.box;

  const extent =
    box && typeof box.minLat === "number"
      ? `${Math.abs(box.maxLat - box.minLat).toFixed(2)}° box`
      : "the queried area";

  if (incidents.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface/60 p-5" aria-live="polite">
        <p className="mb-2 text-[11px] uppercase tracking-widest text-muted/70">Roads clear</p>
        <p className="text-sm leading-relaxed text-muted">
          The provider answered and reported no incidents in the {extent} around your position.
          ⚠️ That is a statement about reported incidents only — an unreported obstruction is
          indistinguishable from none.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface/30">
      <p className="border-b border-border/60 px-5 py-2.5 text-[11px] uppercase tracking-widest text-muted/70">
        {incidents.length} incident{incidents.length === 1 ? "" : "s"} · {extent}
      </p>
      <ul className="divide-y divide-border/60">
        {incidents.map((inc, i) => (
          <li key={`${inc.category}-${inc.from ?? i}`} className="px-5 py-3.5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-light/90">{inc.category}</span>
              {/* ⭐ Labelled as the provider's judgement, not as a fact of the road. The seconds
                  below are the fact; this is TomTom's word about them. */}
              {inc.magnitude && inc.magnitude !== "unknown" && inc.magnitude !== "undefined" && (
                <span className="text-[11px] text-muted/60">{inc.magnitude}, per TomTom</span>
              )}
            </div>

            {(inc.from || inc.to) && (
              <p className="mt-1 text-sm text-muted">
                {inc.from ?? "—"}
                {inc.to && <> → {inc.to}</>}
                {inc.roads && <span className="text-muted/60"> · {inc.roads.join(", ")}</span>}
              </p>
            )}

            {inc.description && (
              <p className="mt-1 text-[11px] leading-relaxed text-muted/60">{inc.description}</p>
            )}

            {(inc.delay_s !== null || inc.length_m !== null) && (
              <p className="mt-1.5 text-sm tabular-nums text-muted">
                {inc.delay_s !== null && <>{delay(inc.delay_s)} delay</>}
                {inc.delay_s !== null && inc.length_m !== null && " · "}
                {inc.length_m !== null && <>{length(inc.length_m)} affected</>}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
