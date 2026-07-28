import Composer from "@/components/Composer";
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

          <Composer onSubmit={submit} />

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

          <p className="mt-8 text-center text-[11px] leading-relaxed text-muted/50">
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
