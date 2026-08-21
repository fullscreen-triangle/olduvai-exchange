/**
 * A participant's own record of their own activity, drawn as cycles and their closure.
 *
 * # ⚠️ The bug this exists to fix — the last instance of it
 *
 * `ReadingsList`'s module doc records that four pages rendered `<RailPage />` with no
 * render-prop child, so a successful fetch drew a declaration table and stopped. Those four
 * were fixed; `foreman` was not, and it is the only remaining tab whose API answers
 * `ok: true` **with a body** and whose page draws nothing from it. Measured live against the
 * deployed server: `/api/process/foreman` → `{"ok":true,"data":{"cycles":[],…}}`.
 *
 * ⚠️ That is why this tab looked identical to the five that are genuinely gated. It was not
 * gated and it was not empty-by-refusal — it was unrendered.
 *
 * # ⭐ Closure is reported as a class, never as a score
 *
 * `olduvai-core`'s `Closure` enum has five variants and this component prints the one it was
 * given rather than reducing them to good/bad. Two of them are routinely mistaken for each
 * other and the distinction is the whole value of the check:
 *
 * - `Contested` — the legs disagree, but fewer than two distinct sources. ⚠️ *"the claims
 *   disagree with each other, which is not the same as reality disagreeing with a claim."*
 * - `SubFloor` — the discrepancy is below β. ⭐ **Not "coherent" — unresolvable.** Below the
 *   measurement floor, fraud and noise are provably indistinguishable, so the honest output
 *   is that the question cannot be answered, not that the answer is "fine".
 *
 * ⭐ This is `notes/38-direction.md` §5.1 in the one place the engine already implements it:
 * *"a decline must carry the classes. 'I could not determine this' is a worse answer than
 * 'this splits two ways, and here they are.'"*
 *
 * # ⚠️ Coherence is not truth
 *
 * The engine's own declaration says so and it is repeated on screen rather than paraphrased:
 * *"a self-consistent record of things that did not happen passes every check here."* A green
 * row means the arithmetic closes, nothing more. Note 33 §3 — the foreman is advisory to one
 * person and carries no weight on the exchange, which is why there is no provenance guard.
 *
 * # ⚠️ The band is printed as a band
 *
 * `band` is `[min, max]` widened to at least β. Note 16 §2.4 requires forward contracts to be
 * written against a band and never a point; collapsing it to a midpoint here would be
 * claiming the residual had gone to zero, which `Coherence`'s own doc says it never does.
 */

/**
 * ⭐ Each class carries the sentence that distinguishes it from its neighbour, because the
 * word alone does not. "Contested" and "incoherent" are near-synonyms in English and are
 * emphatically not synonyms here.
 */
const CLOSURE = {
  coherent: {
    tone: "text-emerald-300/90",
    caption: "the loop closes within the measurement floor",
  },
  incoherent: {
    tone: "text-red-300/90",
    caption: "the loop does not close, and the gap exceeds the floor β",
  },
  contested: {
    tone: "text-amber-300/90",
    caption:
      "the legs disagree, but fewer than two distinct sources — these claims disagree with each other, which is not reality disagreeing with a claim",
  },
  sub_floor: {
    tone: "text-muted",
    caption:
      "below the floor β, where fraud and measurement noise are indistinguishable — the question cannot be answered, which is not the same as the answer being fine",
  },
  degenerate: {
    tone: "text-muted",
    caption: "fewer than two legs — nothing to close",
  },
};

function number(v, digits = 2) {
  return typeof v === "number" && Number.isFinite(v) ? v.toFixed(digits) : null;
}

export default function ForemanRecord({ data }) {
  const cycles = Array.isArray(data?.cycles) ? data.cycles : [];

  if (cycles.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface/60 p-5" aria-live="polite">
        <p className="mb-2 text-[11px] uppercase tracking-widest text-muted/70">Nothing recorded</p>
        <p className="text-sm leading-relaxed text-muted">
          The exchange answered and your record holds no cycles. ⚠️ This is the state of your
          own log, not a fault and not a gate — the record is append-only and you have not
          appended to it yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface/30">
      <p className="border-b border-border/60 px-5 py-2.5 text-[11px] uppercase tracking-widest text-muted/70">
        {cycles.length} cycle{cycles.length === 1 ? "" : "s"} · checked against itself
      </p>
      <ul className="divide-y divide-border/60">
        {cycles.map((c, i) => (
          <Cycle key={`${c.cycle ?? "cycle"}-${i}`} cycle={c} />
        ))}
      </ul>
    </div>
  );
}

function Cycle({ cycle }) {
  const klass = CLOSURE[cycle?.closure] ?? null;
  const band = Array.isArray(cycle?.band) ? cycle.band : null;

  return (
    <li className="px-5 py-3.5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-sm text-light/90">{cycle?.cycle ?? "unnamed cycle"}</span>
        <span className={`text-[11px] ${klass?.tone ?? "text-muted/60"}`}>
          {cycle?.closure ?? "unknown"}
        </span>
      </div>

      {/* ⚠️ Before the numbers, deliberately — the same ordering ReadingsList uses, and for
          the same reason: a reader who meets the discrepancy first has already decided what
          it means, and for `sub_floor` and `contested` what it means is the opposite of the
          obvious reading. */}
      {klass && <p className="mt-1 text-[11px] leading-relaxed text-muted/60">{klass.caption}</p>}

      <div className="mt-2 space-y-0.5 text-sm text-muted">
        {band && (
          <p className="tabular-nums">
            band {number(band[0])} – {number(band[1])}
            <span className="text-muted/60"> · a band, not a point — the residual never reaches zero</span>
          </p>
        )}
        <p className="tabular-nums">
          {number(cycle?.discrepancy) !== null && <>discrepancy {number(cycle.discrepancy)}</>}
          {number(cycle?.beta) !== null && <> · floor β {number(cycle.beta)}</>}
          {typeof cycle?.disjoint_sources === "number" && (
            <>
              {" · "}
              {cycle.disjoint_sources} distinct source{cycle.disjoint_sources === 1 ? "" : "s"}
            </>
          )}
        </p>
      </div>
    </li>
  );
}
