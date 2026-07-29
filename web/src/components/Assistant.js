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

  const ask = async (message) => {
    setResult({ status: "pending", message });
    try {
      const r = await fetch("/api/assistant/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, agent: router.pathname }),
      });
      const body = await r.json();
      setResult(
        body.ok
          ? { status: "ready", message, data: body.data }
          : { status: "blocked", message, body }
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
            {result.status === "pending" && "Thinking"}
            {result.status === "ready" && "Answer"}
            {result.status === "offline" && "Not reachable"}
            {result.status === "blocked" && (gate?.title ?? "Unavailable")}
          </p>

          {result.status === "ready" ? (
            <>
              {/* `whitespace-pre-wrap` because the model writes paragraphs and lists, and
                  collapsing them into one block would misrepresent what it said. */}
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-light/90">
                {result.data.answer}
              </p>
              <Trace trace={result.data.trace} />
            </>
          ) : (
            <p className="text-sm leading-relaxed text-light/90">{result.message}</p>
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
        </div>
      )}
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
