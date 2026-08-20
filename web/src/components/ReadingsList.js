import { CONSTRAINT_CAPTION, PROVENANCE_CAPTION } from "@/components/RailPage";

/**
 * The observations a source has actually recorded, drawn as rows.
 *
 * # ⚠️ The bug this exists to fix
 *
 * `gps.js`, `satellites.js`, `flights.js` and `traffic.js` each rendered `<RailPage />` with **no
 * render-prop child**. `RailPage` calls `children?.(state.data)` when a response is `ok`, so with
 * no child there is nothing to call: the fetch succeeded, the data arrived, and the page drew a
 * declaration table and stopped.
 *
 * ⭐ That produced the exact complaint — *"the information is supposed to be preloaded"* — for a
 * page that **was** preloading. `/api/observe/gps` answers in 5 ms with a real reading in it, and
 * the tab showed nothing. ⚠️ The failure is indistinguishable from a page that never fetched,
 * which is why it read as laziness rather than as a missing renderer.
 *
 * # ⚠️ Why an empty log is stated, not hidden
 *
 * A source with `readings: []` is `ok: true` — the engine answered, and the honest content of its
 * answer is *nothing has been recorded here*. That is different from a gate (nothing is built),
 * from an outage (nothing was asked), and from a refusal — and `RailPage` already renders those
 * three. This renders the fourth, and says which source is empty rather than leaving a blank
 * panel that could be any of the four.
 *
 * # ⚠️ A reading is not a place
 *
 * Each row leads with what its shape **constrains**, using `CONSTRAINT_CAPTION` — the same table
 * the declaration above it uses, imported rather than restated, because a second copy is how the
 * caption and the drawing drift apart. A `corridor` row says *distance from a line — not a place
 * along it*, so a flight track cannot be read as a position. Flattening every shape into a
 * lat/lng column would have fabricated exactly the along-track position the corridor withholds.
 */
export default function ReadingsList({ data, label }) {
  const readings = Array.isArray(data?.readings) ? data.readings : [];

  if (readings.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface/60 p-5" aria-live="polite">
        <p className="mb-2 text-[11px] uppercase tracking-widest text-muted/70">Nothing recorded</p>
        <p className="text-sm leading-relaxed text-muted">
          The exchange answered and holds no {label ? label.toLowerCase() : "such"} readings. ⚠️
          This is the state of your log, not a fault and not a gate — nothing has been submitted to
          this source yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface/30">
      <p className="border-b border-border/60 px-5 py-2.5 text-[11px] uppercase tracking-widest text-muted/70">
        {readings.length} reading{readings.length === 1 ? "" : "s"}
      </p>
      <ul className="divide-y divide-border/60">
        {readings.map((r, i) => (
          <Reading key={`${r.kind}-${r.taken_at ?? i}`} reading={r} />
        ))}
      </ul>
    </div>
  );
}

function Reading({ reading }) {
  const constraint = CONSTRAINT_CAPTION[reading.kind];
  const caption = PROVENANCE_CAPTION[reading.source];

  return (
    <li className="px-5 py-3.5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-light/90">{reading.kind}</span>
        <span className="text-[11px] text-muted/60">{formatTakenAt(reading.taken_at)}</span>
      </div>

      {/* ⚠️ Before the numbers, deliberately. A reader who meets the coordinate first has already
          formed "this is where I am"; the constraint line is what stops that for the shapes where
          it is false. */}
      {constraint && <p className="mt-1 text-[11px] text-muted/60">{constraint}</p>}

      <div className="mt-2 space-y-0.5 text-sm text-muted">
        {reading.at && (
          <p className="tabular-nums">
            {reading.at.latitude.toFixed(6)}, {reading.at.longitude.toFixed(6)}°
          </p>
        )}
        {/* ⚠️ A corridor is two endpoints and a width, and is printed as such. There is no
            midpoint here: computing one would be the along-track position this shape exists to
            withhold. */}
        {reading.from && reading.to && (
          <p className="tabular-nums">
            {reading.from.latitude.toFixed(4)}, {reading.from.longitude.toFixed(4)}° →{" "}
            {reading.to.latitude.toFixed(4)}, {reading.to.longitude.toFixed(4)}°
          </p>
        )}
        <p>
          {typeof reading.sigma_m === "number" && <>± {formatSigma(reading.sigma_m)} (one sigma)</>}
          {typeof reading.width_m === "number" && <> · {formatSigma(reading.width_m)} wide</>}
          {reading.source && (
            <>
              {" · "}
              <span className="text-light/80">{reading.source}</span>
              {caption && <span className="text-muted/60"> — {caption}</span>}
            </>
          )}
        </p>
      </div>
    </li>
  );
}

/** Metres below a kilometre, kilometres above it — matching `PositionMap`. */
function formatSigma(m) {
  if (typeof m !== "number") return "unknown";
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m.toFixed(0)} m`;
}

/**
 * ⚠️ `taken_at` is a **Julian day**, not epoch milliseconds — `olduvai-core` records it that way
 * so a propagation can be repeated exactly. Passing it to `new Date()` unconverted yields 1970
 * plus a few seconds, which renders as a plausible-looking timestamp and is wrong by 45 years.
 */
function formatTakenAt(julian) {
  if (typeof julian !== "number") return "";
  const ms = (julian - 2440587.5) * 86400000;
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}
