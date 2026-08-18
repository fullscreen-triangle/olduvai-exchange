import Assistant from "@/components/Assistant";
import Composer from "@/components/Composer";
import MarketSurvey from "@/components/MarketSurvey";
import DashboardLayout from "@/components/DashboardLayout";
import { GATES } from "@/lib/navigation";
import { useState } from "react";

/**
 * The dashboard: one box in the middle, a rail at each edge.
 *
 * ⭐ Unlike the rail pages, this one *does* post — to `/api/query`, which is the real
 * endpoint the composer will always have used. It comes back blocked on the cohesion gate,
 * and that is the correct result rather than a stub: the request path is finished, and the
 * day the gate passes this page starts returning matches with no change here.
 *
 * # ⚠️ Two boxes, and the separation between them is the architecture
 *
 * The upper box submits **constraints to the matching engine**. The lower one **asks the
 * assistant**. They look similar and they are not the same act, so they are not merged into
 * one box with a mode toggle — a toggle would make it possible to ask the engine a question
 * or to submit a consignment to a language model by mistake.
 *
 * `notes/28-matching-is-search.md`: *matching IS search — there is no second system*. The
 * assistant is not a second matcher. It explains, and it drafts things the participant then
 * confirms; it never returns a coalition and never orders participants. Keeping the two
 * inputs visibly distinct is what stops that boundary from eroding in the interface even
 * while it holds in the code.
 */
export default function Dashboard() {
  const [result, setResult] = useState(null);

  const submit = async (constraints) => {
    setResult({ status: "pending", constraints });
    try {
      const r = await fetch("/api/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ constraints }),
      });
      const body = await r.json();
      setResult(
        body.ok
          ? { status: "ready", constraints, data: body.data }
          : { status: "blocked", constraints, body }
      );
    } catch {
      setResult({ status: "offline", constraints });
    }
  };

  const gate = result?.body?.blockedBy ? GATES[result.body.blockedBy] : null;

  return (
    <DashboardLayout>
      <div className="flex min-h-screen w-full flex-col items-center justify-center px-8 py-24">
        <div className="w-full max-w-2xl animate-fade-in">
          <h1 className="mb-8 text-center text-2xl font-normal tracking-tight text-light sm:text-3xl">
            What are you bringing to market?
          </h1>

          {/* ⚠️ An explicit placeholder, overriding `Composer`'s default of *"Describe what you
              have, or what you need"*. That default invited a question — "what you need" is how
              a person phrases one — into the box that submits to the matching engine, and a
              real question about where to sell chamomile came back as the cohesion gate. The
              box was doing its job; its label was describing a different box. */}
          <Composer
            onSubmit={submit}
            placeholder="Describe a consignment: what you have, how much, and where it is"
          />

          {result && (
            <div
              className="mt-6 rounded-xl border border-border bg-surface/60 p-5"
              aria-live="polite"
            >
              <p className="mb-2 text-[11px] uppercase tracking-widest text-muted/70">
                {result.status === "pending" && "Querying"}
                {result.status === "ready" && "Results"}
                {result.status === "offline" && "Not reachable"}
                {result.status === "blocked" && (gate?.title ?? "Unavailable")}
              </p>

              <p className="text-sm leading-relaxed text-light/90">
                {result.constraints}
              </p>

              {result.status === "blocked" && gate && (
                <>
                  <p className="mt-4 text-sm leading-relaxed text-muted">
                    {gate.detail}
                  </p>
                  {result.body?.note && (
                    <p className="mt-3 text-sm leading-relaxed text-muted/80">
                      {result.body.note}
                    </p>
                  )}

                  {/* ⭐ The market survey, mounted where a handoff sentence used to be.
                      That sentence pointed at the assistant below — *"it reads live trade
                      volumes"* — which was true of the code and false of the deployment: no
                      model runs on the server, so the suggested fallback returned nothing
                      either. Referring a participant to a second empty box is worse than
                      saying nothing, because it spends their time to arrive at the same place.

                      ⚠️ This is not the matching result and does not soften the gate. It is a
                      published customs statistic, computed with no model, arriving beside a
                      refusal that still says nobody was matched. `MarketSurvey` states that
                      above its own table rather than relying on this paragraph. */}
                  {result.body?.market && (
                    <MarketSurvey read={result.body.read} market={result.body.market} />
                  )}

                  <p className="mt-4 text-[11px] text-muted/50">{gate.reference}</p>
                </>
              )}

              {result.status === "offline" && (
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  The application server did not respond, so this was not sent anywhere.
                </p>
              )}
            </div>
          )}

          {/* The assistant, below and visibly separate. The rule and the label are doing
              real work: they mark where "submit this to the exchange" ends and "ask a
              question about it" begins. */}
          <div className="mt-14 border-t border-border/60 pt-10">
            <h2 className="mb-4 text-center text-[11px] uppercase tracking-widest text-muted/70">
              Or ask
            </h2>
            <Assistant placeholder="Ask about units, grades, seasons, or what a term means" />
            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted/50">
              The assistant explains and drafts. It does not match, rank, or record —
              anything it suggests is yours to confirm before it becomes an entry.
            </p>
          </div>

          <p className="mt-10 text-center text-[11px] leading-relaxed text-muted/50">
            Context at the left edge, process at the right — hover, or press{" "}
            <kbd className="rounded border border-border px-1 py-0.5 font-sans">[</kbd>{" "}
            and{" "}
            <kbd className="rounded border border-border px-1 py-0.5 font-sans">]</kbd>.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
