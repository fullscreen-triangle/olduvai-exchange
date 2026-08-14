import Composer from "@/components/Composer";
import { GATES } from "@/lib/navigation";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

/**
 * The assistant, as it appears on any page.
 *
 * ⭐ One component for the centre composer and for all ten rail pages, because
 * `notes/31-dashboard-design.md` item 1 says every linked page is an *instance* of the home
 * page model rather than its own assistant. Two components would have been two behaviours
 * within a week. What varies per page is one prop — the pathname, which the server turns
 * into an agent instance — and nothing else here branches on it.
 *
 * # ⚠️ The trace is shown, not hidden behind a developer flag
 *
 * An answer that ran without its domain specialist is a different answer from one that did,
 * and which one arrived is not something a participant should have to infer from tone. The
 * exchange already refuses to present a value without its provenance; the same standard
 * applies to prose. It is collapsed by default because most people will not want it, and one
 * line stating the model that answered is visible without expanding anything.
 *
 * # ⭐ Progress is shown while it runs, and it is not the answer arriving early
 *
 * The pipeline is slow — six sequential model calls, 291s in one measured run on modest
 * hardware. This component reads the reply as a stream and names the stage currently running.
 *
 * ⚠️ That is a report on the machinery, not a preview of the output. `lib/ai/pipeline.js`
 * withholds the draft until its `check` stage has scored it, on the grounds that an answer
 * which has already been read cannot be unread, and nothing here weakens that: no prose
 * reaches this component before the terminal line, and the stage list carries none.
 */
export default function Assistant({ placeholder, className = "" }) {
  const router = useRouter();
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);

  // Ask what the assistant can do before anyone types. Ollama is a process the participant
  // starts, so "not running" is a normal state that deserves a sentence up front rather
  // than an error after they have written a paragraph.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/assistant/status?agent=${encodeURIComponent(router.pathname)}`)
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled) setStatus(body.ok ? body.data : null);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [router.pathname]);

  /**
   * ⭐ Ask, and read the reply as it arrives rather than all at once.
   *
   * ⚠️ The measured pipeline takes minutes on modest hardware — 291s in one live run. Awaiting
   * a single `r.json()` meant this component set `pending` once and then did nothing for the
   * whole of that, rendering the word "Thinking" and no other signal. A participant who
   * concludes from that that the page has hung is reading it correctly; the interface was
   * wrong, not their inference.
   *
   * ⚠️ What arrives here is progress, never a partial answer. `pages/api/assistant/ask.js`
   * sends stage records only, and the answer appears in one piece on the terminal line, after
   * the pipeline's own `check` stage has scored it.
   */
  const ask = async (message) => {
    setResult({ status: "pending", message, stages: [] });
    try {
      const r = await fetch("/api/assistant/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, agent: router.pathname }),
      });

      // ⚠️ A validation failure is still plain JSON, because it is decided before any model
      // runs. Content type is what distinguishes them — not the status, which is 200 for a
      // stream whatever the pipeline goes on to conclude.
      if (!r.headers.get("content-type")?.includes("ndjson")) {
        const body = await r.json();
        setResult({ status: "blocked", message, body });
        return;
      }

      await readStream(r, (event) => {
        if (event.kind === "stage") {
          // ⭐ Replace by id rather than append: a stage emits `running` and then `done`, and
          // appending both would show every stage twice, the second time as a duplicate that
          // contradicts the first.
          setResult((prev) =>
            prev?.status !== "pending"
              ? prev
              : { ...prev, stages: withStage(prev.stages, event) }
          );
        } else if (event.kind === "result") {
          setResult(
            event.body?.ok
              ? { status: "ready", message, data: event.body.data }
              : { status: "blocked", message, body: event.body }
          );
        }
      });

      // ⚠️ A stream that ends without a `result` line is a truncated response, not an answer.
      // Left alone the view would sit on the last stage it saw for ever, which looks exactly
      // like a slow stage and is the failure this whole change exists to make visible.
      setResult((prev) =>
        prev?.status === "pending" ? { status: "truncated", message } : prev
      );
    } catch {
      setResult({ status: "offline", message });
    }
  };

  const gate = result?.body?.blockedBy ? GATES[result.body.blockedBy] : null;

  return (
    <div className={className}>
      <Composer onSubmit={ask} placeholder={placeholder} />

      {/* ⚠️ Stated before the first message, not after a failure. Someone whose Ollama is
          stopped should learn it from a quiet line above the box, not by losing a question
          into it. */}
      {status && !status.ready && !result && (
        <p className="mt-3 text-center text-[11px] leading-relaxed text-muted/50">
          {status.base.remedy}
        </p>
      )}

      {result && (
        <div
          className="mt-6 rounded-xl border border-border bg-surface/60 p-5"
          aria-live="polite"
          aria-busy={result.status === "pending"}
        >
          <p className="mb-2 text-[11px] uppercase tracking-widest text-muted/70">
            {result.status === "pending" && "Working"}
            {result.status === "ready" && "Answer"}
            {result.status === "offline" && "Not reachable"}
            {result.status === "truncated" && "Interrupted"}
            {result.status === "blocked" && (gate?.title ?? "Unavailable")}
          </p>

          {result.status === "ready" ? (
            <>
              {/* `whitespace-pre-wrap` because the model writes paragraphs and lists, and
                  collapsing them into one block would misrepresent what it said. */}
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-light/90">
                {result.data.answer}
              </p>
              <Readings readings={result.data.readings} />
              <Trace trace={result.data.trace} />
            </>
          ) : (
            <p className="text-sm leading-relaxed text-light/90">{result.message}</p>
          )}

          {/* ⭐ The question stays on screen above this, so the two read together: what was
              asked, and how far the pipeline has got with it. */}
          {result.status === "pending" && (
            <Progress declared={status?.stages ?? []} stages={result.stages} />
          )}

          {result.status === "blocked" && (
            <>
              {gate && (
                <p className="mt-4 text-sm leading-relaxed text-muted">{gate.detail}</p>
              )}
              {result.body?.note && (
                <p className="mt-3 text-sm leading-relaxed text-muted/80">
                  {result.body.note}
                </p>
              )}
              {/* The remedy is a shell command, so it is set in mono and left alone. */}
              {result.body?.remedy && (
                <p className="mt-3 font-mono text-xs leading-relaxed text-light/70">
                  {result.body.remedy}
                </p>
              )}
              {gate && <p className="mt-4 text-[11px] text-muted/50">{gate.reference}</p>}
            </>
          )}

          {result.status === "offline" && (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              The application server did not respond, so this was not sent anywhere.
            </p>
          )}

          {/* ⚠️ Distinct from `offline`, and the distinction matters: this request *was* sent
              and the pipeline may well have been part-way through it. Saying "not reachable"
              here would tell someone their question never left the browser when it did. */}
          {result.status === "truncated" && (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              The connection ended before an answer arrived. The work may have been part-way
              through; nothing was recorded either way.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Read an NDJSON response, calling `onEvent` per line.
 *
 * ⚠️ Lines are reassembled across chunk boundaries rather than parsed per chunk. A network
 * chunk is not a line — a stage record can and does arrive split in two — and parsing chunks
 * directly works right up until a message is long enough to straddle the boundary, which is
 * the point at which it starts silently dropping progress.
 */
async function readStream(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // The last element is whatever came after the final newline: either an empty string or a
    // partial line. Either way it is not ready, so it stays in the buffer.
    buffer = lines.pop() ?? "";

    for (const raw of lines) {
      if (!raw.trim()) continue;
      try {
        onEvent(JSON.parse(raw));
      } catch {
        // ⚠️ A malformed line is skipped rather than thrown. Progress is a courtesy on this
        // side too, and taking down a request that is still producing an answer would be a
        // worse outcome than one missing step in the list.
      }
    }
  }
}

/**
 * Fold one stage event into the list, replacing any earlier record of the same stage.
 *
 * ⭐ Order is arrival order, and `refine` therefore lands at the end where it belongs — it is
 * not in the declared stage list at all, because it only runs when `check` failed.
 */
function withStage(stages, event) {
  const at = stages.findIndex((s) => s.id === event.id);
  if (at === -1) return [...stages, event];
  const next = [...stages];
  next[at] = event;
  return next;
}

/**
 * The pipeline, as it runs.
 *
 * ⭐ Renders the stages that have not started yet as well as the ones that have, which is why
 * it takes the declared list from `/api/assistant/status` rather than only the events seen so
 * far. A list that grows one line at a time says nothing about how much is left; the whole
 * point of showing progress on a five-minute request is that the participant can see the end
 * of it.
 *
 * ⚠️ Deliberately no percentage and no time estimate. The stages are not equal in length —
 * measured, they ran between 40s and 79s and one of them was skipped in 0ms — so any bar drawn
 * over them would be a made-up number presented with more confidence than the thing it
 * describes. Naming the stage that is running is the honest version of the same information.
 */
function Progress({ declared, stages }) {
  const seen = new Map(stages.map((s) => [s.id, s]));
  // Declared stages first, in pipeline order, then anything that ran but was not declared —
  // which today means `refine`, and which must never be silently dropped: it fires precisely
  // when the answer failed a check, so it is the least skippable minute of the whole run.
  const rows = [
    ...declared.map((d) => ({ ...d, event: seen.get(d.id) ?? null })),
    ...stages
      .filter((s) => !declared.some((d) => d.id === s.id))
      .map((s) => ({ id: s.id, label: s.id, event: s })),
  ];

  return (
    <ol className="mt-4 space-y-1.5">
      {rows.map(({ id, label, event }) => {
        const state = event?.state ?? "waiting";
        const skipped = event?.degraded && event.ms === 0;

        return (
          <li key={id} className="flex items-baseline justify-between gap-4 text-[11px]">
            <span
              className={
                state === "running"
                  ? "text-light/90"
                  : state === "done"
                    ? "text-muted/80"
                    : "text-muted/40"
              }
            >
              {/* ⚠️ Every class here is written out in full. Tailwind scans source
                  statically, so a class name built by interpolation is a class name that
                  does not exist in the stylesheet. */}
              {label}
              {skipped && <span className="text-muted/50"> — skipped</span>}
            </span>
            <span className="shrink-0 text-muted/50">
              {state === "running" && "running"}
              {state === "done" && event.ms > 0 && `${Math.round(event.ms / 100) / 10}s`}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * ⭐ The figures as their sources gave them, beside the answer rather than only inside it.
 *
 * # ⚠️ This exists because the prose is not enough to check the prose
 *
 * `readingsFor` in `lib/ai/pipeline.js` records the measurements. In short: handed a UN
 * Comtrade reading under a long prompt, the local model dropped every figure and recommended
 * eBay. Told in the prompt that the countries are explicitly not the world's largest importers,
 * it called them "major markets" regardless. It copies numbers faithfully and their caveats not
 * at all — and the caveat is the half a seller needs.
 *
 * ⭐ **Shown open, not behind a disclosure.** `Trace` hides its stage list because "how long
 * did `ground` take" is worth reading once. This is the opposite case: a reading's heading names
 * the good, the year, and what the sample is not, and a participant who never expands a panel is
 * the one who needs to see it. A seller prices against these numbers.
 *
 * ⚠️ Measured, this is the only reason a live answer about **black tea** to a question about
 * **chamomile** was caught: the prose was fluent, its figures were all correct, and only the
 * reading's own heading said which crop they belonged to.
 *
 * ⚠️ The lines are rendered exactly as `sources.js` produced them, ⚠️ caveats and all. They are
 * written so that the qualifier cannot be separated from the figure, and reformatting them here
 * — trimming the caveat, tabulating the countries — would be that separation happening in the
 * view instead of in the model. Whatever is wrong with them is wrong at the source.
 */
function Readings({ readings }) {
  const got = (readings ?? []).filter((r) => r.ok && r.lines?.length);
  // ⚠️ A source that was consulted and failed is named too. Rendering only what answered would
  // let an absent market read as an empty one — the same conflation the prompt guards against,
  // and the reason `ground` reports misses rather than dropping them.
  const missed = (readings ?? []).filter((r) => !r.ok);
  if (!got.length && !missed.length) return null;

  return (
    <div className="mt-4 border-t border-border/60 pt-3">
      <p className="mb-2 text-[11px] uppercase tracking-widest text-muted/70">
        What the sources said
      </p>

      {got.map((r) => (
        <div key={r.label} className="mb-3 last:mb-0">
          <p className="text-[11px] font-medium text-light/70">{r.label}</p>
          {/* `whitespace-pre-wrap` preserves the leading spaces `sources.js` uses to indent
              each country under its heading — that indentation is what makes the list
              readable, and collapsing it runs eight countries into one paragraph. */}
          <pre className="mt-1 whitespace-pre-wrap font-sans text-xs leading-relaxed text-light/80">
            {r.lines.join("\n")}
          </pre>
        </div>
      ))}

      {missed.map((r) => (
        <p key={r.label} className="text-[11px] leading-relaxed text-muted/60">
          {r.label}: {r.reason ?? "did not answer"}
        </p>
      ))}
    </div>
  );
}

/**
 * What actually ran.
 *
 * ⭐ The summary line is always visible and the stage list is not, because the two answer
 * different questions. "Which model said this, and did it have its specialist?" is worth a
 * glance every time. "How long did `ground` take?" is worth it once, when something looks
 * wrong.
 */
function Trace({ trace }) {
  const [open, setOpen] = useState(false);
  if (!trace) return null;

  const degraded = trace.stages.filter((s) => s.degraded);

  return (
    <div className="mt-4 border-t border-border/60 pt-3">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[11px] leading-relaxed text-muted/60">
          {trace.stages.find((s) => s.tier === "base")?.model ?? "base model"}
          {trace.specialist ? (
            <> with {trace.specialist}</>
          ) : (
            // ⚠️ Named rather than omitted. An answer produced without the domain model is
            // a weaker answer, and silence would present it as the full-strength one.
            <> — no domain model</>
          )}
          {" · "}
          {Math.round(trace.ms / 100) / 10}s
        </p>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="shrink-0 text-[11px] text-muted/60 underline-offset-2 transition hover:text-light hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-light/40"
        >
          {open ? "Hide stages" : "Stages"}
        </button>
      </div>

      {/* The reason a specialist was skipped, in full — it is usually "no token" or "no
          candidate identified", both of which are actionable and neither of which is
          guessable from the summary line. */}
      {!open && degraded.length > 0 && degraded[0].detail && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted/50">
          {degraded[0].detail}
        </p>
      )}

      {open && (
        <ol className="mt-2.5 space-y-1.5">
          {trace.stages.map((s) => (
            <li
              key={s.id}
              className="flex items-baseline justify-between gap-4 text-[11px]"
            >
              <span className={s.ok ? "text-muted/80" : "text-muted/50"}>
                {s.id}
                {s.degraded && <span className="text-muted/50"> — skipped</span>}
              </span>
              <span className="shrink-0 text-muted/50">
                {s.model ?? "—"}
                {s.ms > 0 && ` · ${Math.round(s.ms / 100) / 10}s`}
              </span>
            </li>
          ))}
          {trace.checks && (
            <li className="pt-1 text-[11px] text-muted/50">
              refined after: {trace.checks.join(", ")}
            </li>
          )}
        </ol>
      )}
    </div>
  );
}
