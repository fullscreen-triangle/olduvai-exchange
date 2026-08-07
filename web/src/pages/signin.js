import AuthLayout, { Field, SubmitButton } from "@/components/AuthLayout";
import TransitionEffect from "@/components/TransitionEffect";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

/**
 * ⚠️ There is no auth backend yet, and this form does not pretend otherwise.
 *
 * ⭐ What changed: `submit` now opens a **local working session** against `/api/session` —
 * which is exactly the change this file's earlier note predicted would be the whole of it.
 *
 * ⚠️ The distinction this page has to carry, and does: opening a session separates this
 * browser's observations from another browser's on the local server. It signs nobody in. A
 * ledger participant is an identity that every confirmed field is attributed to, and that
 * service is not built — so the confirmation below states what was opened in those terms
 * rather than saying "welcome back", which is the small lie that makes the large one easy.
 *
 * ⚠️ The password is collected and never sent. Posting a credential to a route with nothing
 * to check it against would be theatre, and worse, it would teach the habit of sending one.
 */
export default function SignIn() {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email");
    setBusy(true);
    try {
      // ⚠️ Only the email goes, and `/api/session` drops it after checking its shape. The
      // password field is never read here — sending a credential to a route that cannot
      // verify it would teach the habit of sending it, which is the habit that matters.
      const r = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await r.json().catch(() => null);
      setStatus(
        r.ok
          ? { open: true, email, note: body?.data?.note ?? null }
          : {
              open: false,
              email,
              note:
                body?.detail ??
                "No session service. Identity on the exchange is a ledger participant, and that service is not built.",
            }
      );
    } catch {
      // ⚠️ A failed fetch is reported as a failed fetch. Falling through to "session opened"
      // would put someone on a dashboard that 401s on every panel with no clue why.
      setStatus({
        open: false,
        email,
        note: "The request did not reach the app's own server. Nothing was opened.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Head>
        <title>Sign in · Olduvai Exchange</title>
      </Head>
      <TransitionEffect />

      <AuthLayout
        title="Sign in"
        subtitle="Continue to the exchange."
        footer={
          <>
            No account yet?{" "}
            <Link
              href="/signup"
              className="text-light underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              Create one
            </Link>
          </>
        }
      >
        <form onSubmit={submit} noValidate={false}>
          <Field
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Field
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
          />
          <SubmitButton disabled={busy}>
            {busy ? "Opening session…" : "Sign in"}
          </SubmitButton>
        </form>

        {status && (
          <div
            className="mt-6 rounded-xl border border-border bg-surface/60 p-4"
            aria-live="polite"
          >
            {/* ⚠️ The heading says what was opened, never "signed in". A working session and
                an authenticated participant are different things, and this is the one screen
                where conflating them would be most natural and most costly. */}
            <p className="mb-1 text-[11px] uppercase tracking-widest text-muted">
              {status.open ? "Local working session" : "No session opened"}
            </p>
            <p className="text-sm leading-relaxed text-muted">
              {status.open ? (
                <>
                  Your observations are now kept under an opaque label on this server, so the
                  dashboard can reach the engine. You are{" "}
                  <span className="text-light/90">not</span> signed in as{" "}
                  <span className="text-light/90">{status.email}</span> — identity on the
                  exchange is a ledger participant, not a user row, and that service is not
                  built. Nothing recorded in this session carries standing on the exchange.
                </>
              ) : (
                status.note
              )}
            </p>

            {/* ⚠️ Still explicit rather than an automatic redirect, and the label still says
                what is true: a session is open, nobody is authenticated. */}
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="mt-4 rounded-lg border border-border px-3 py-2 text-xs text-light transition-colors hover:bg-surfaceHover"
            >
              {status.open
                ? "Continue to the dashboard"
                : "Continue to the dashboard unauthenticated"}
            </button>
          </div>
        )}
      </AuthLayout>
    </>
  );
}
