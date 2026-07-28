import Composer from "@/components/Composer";
import TransitionEffect from "@/components/TransitionEffect";
import Head from "next/head";
import { useState } from "react";

/**
 * The composer page: one box, centred, and nothing else above the fold.
 *
 * ⚠️ `onSubmit` currently only echoes what was typed. It is deliberately not wired to a
 * backend: the query engine is behind the cohesion gate (`notes/30-programming-structure.md`
 * §7), so there is nothing correct to send it to yet. Making this call a plausible-looking
 * endpoint now would mean building UI against an answer we have not measured.
 */
export default function Home() {
  const [submitted, setSubmitted] = useState(null);

  return (
    <>
      <Head>
        <title>Olduvai Exchange</title>
      </Head>
      <TransitionEffect />

      <div className="flex min-h-screen w-full flex-col items-center justify-center px-6 py-24">
        <div className="w-full max-w-2xl animate-fade-in">
          <h1 className="mb-8 text-center text-2xl font-normal tracking-tight text-light sm:text-3xl">
            What are you bringing to market?
          </h1>

          <Composer onSubmit={(text) => setSubmitted(text)} />

          {submitted && (
            <div
              className="mt-6 rounded-xl border border-border bg-surface/60 p-4"
              aria-live="polite"
            >
              <p className="mb-1 text-[11px] uppercase tracking-widest text-muted">
                Not yet sent
              </p>
              <p className="text-sm leading-relaxed text-light/90">{submitted}</p>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                The query engine is behind the cohesion gate. Descriptions are held here
                rather than dispatched to an endpoint that does not exist.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
