import DashboardLayout from "@/components/DashboardLayout";
import { GATES, findEntry } from "@/lib/navigation";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

/**
 * A rail page: fetches its own endpoint and renders whatever comes back — including,
 * usually, the reason nothing did.
 *
 * # ⭐ Why the blocked state is designed rather than defaulted
 *
 * Every one of these pages is currently blocked, so the empty state *is* the page. The
 * temptation is a spinner or a "coming soon" card. Both are worse than the truth:
 *
 *   - a spinner implies the data is on its way, and it is not;
 *   - "coming soon" implies the only missing ingredient is time, when what is actually
 *     missing is a measurement that is allowed to come back negative and change the design.
 *
 * So a blocked page names its gate, explains why that gate exists, and cites the note. That
 * is a page someone can act on: they know whether to wait, to run the cohesion test, or to
 * go and choose a weather provider.
 *
 * # It really does fetch
 *
 * It would be simpler to render `GATES[entry.blockedBy]` statically and skip the request.
 * But then the day an endpoint starts answering, every page would still show its gate and
 * nobody would notice for a week. Fetching means these pages light up on their own.
 */
export default function RailPage({ children }) {
  const router = useRouter();
  const entry = findEntry(router.pathname);
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    if (!entry) return;
    let cancelled = false;

    fetch(entry.api)
      .then(async (r) => ({ status: r.status, body: await r.json() }))
      .then(({ body }) => {
        if (cancelled) return;
        setState(
          body.ok
            ? { status: "ready", data: body.data }
            : { status: "blocked", body }
        );
      })
      .catch(() => {
        // The BFF itself is unreachable — dev server down, or offline.
        if (!cancelled) setState({ status: "offline" });
      });

    return () => {
      cancelled = true;
    };
  }, [entry]);

  if (!entry) return null;

  // Prefer the gate the server named: it knows which of several gates actually bit. The
  // manifest's `blockedBy` is the fallback for when the BFF cannot be reached at all.
  const gateKey = state.body?.blockedBy ?? entry.blockedBy;
  const gate = GATES[gateKey];

  return (
    <DashboardLayout title={entry.label}>
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-8 py-24">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-normal tracking-tight text-light">
            {entry.label}
          </h1>
          <p className="mt-1.5 text-sm text-muted">{entry.blurb}</p>

          <div className="mt-8">
            {state.status === "loading" && (
              <p className="text-sm text-muted/60" aria-live="polite">
                Checking…
              </p>
            )}

            {state.status === "offline" && (
              <Panel label="Not reachable">
                <p className="text-sm leading-relaxed text-muted">
                  The application server did not respond. Nothing is wrong with the
                  exchange; this page could not ask it anything.
                </p>
              </Panel>
            )}

            {state.status === "blocked" && gate && (
              <Panel label={gate.title}>
                <p className="text-sm leading-relaxed text-muted">{gate.detail}</p>
                {state.body?.note && (
                  <p className="mt-3 text-sm leading-relaxed text-muted/80">
                    {state.body.note}
                  </p>
                )}
                <p className="mt-4 text-[11px] text-muted/50">{gate.reference}</p>
              </Panel>
            )}

            {/* A blocked feed still knows its own units and provenance, and stating them is
                not filler — `source: asserted` is the fact that this reading would never
                carry evidential weight, whoever ends up providing it. */}
            {state.status === "blocked" && state.body?.declaration && (
              <Declaration declaration={state.body.declaration} />
            )}

            {state.status === "blocked" && !gate && (
              <Panel label="Unavailable">
                <p className="text-sm leading-relaxed text-muted">
                  {state.body?.detail ?? "This view returned no data."}
                </p>
              </Panel>
            )}

            {state.status === "ready" && children?.(state.data)}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/**
 * What a feed would carry, stated before it carries anything.
 *
 * ⭐ `source: asserted` is the load-bearing line. Note 27 §4 splits observed from asserted,
 * and a third-party reading is always the latter — so a value from this feed can inform a
 * person but can never become evidence in a coalition. Saying so on the empty page means
 * whoever wires the provider later reads the constraint before they write the fetch.
 */
function Declaration({ declaration }) {
  const units = Object.entries(declaration.units ?? {});

  return (
    <dl className="mt-4 divide-y divide-border/60 rounded-xl border border-border bg-surface/30 px-5 py-1 text-sm">
      <Row term="Provenance">
        <span className="text-light/90">{declaration.source}</span>
        <span className="text-muted/60"> — context, not evidence</span>
      </Row>
      {units.length > 0 && (
        <Row term="Units">
          {units.map(([k, v]) => `${k} (${v})`).join(", ")}
        </Row>
      )}
      <Row term="Readings">
        {declaration.readings?.length
          ? `${declaration.readings.length}`
          : "none"}
      </Row>
    </dl>
  );
}

function Row({ term, children }) {
  return (
    <div className="flex justify-between gap-6 py-2.5">
      <dt className="text-muted/70">{term}</dt>
      <dd className="text-right text-muted">{children}</dd>
    </div>
  );
}

function Panel({ label, children }) {
  return (
    <div
      className="rounded-xl border border-border bg-surface/60 p-5"
      aria-live="polite"
    >
      <p className="mb-2 text-[11px] uppercase tracking-widest text-muted/70">
        {label}
      </p>
      {children}
    </div>
  );
}
