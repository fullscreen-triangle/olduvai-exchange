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
    const form = new FormData(e.currentTarget);
    const email = form.get("email");
    setBusy(true);
    try {
      // ⚠️ The email goes and `/api/session` drops it after checking its shape.
      //
      // ⭐ The second field is an **invite phrase**, not a password, and the distinction is the
      // whole reason it is safe to send. A password is a claim about who you are, and posting
      // one to a route with nothing to verify it against is the theatre this page has always
      // refused. A shared phrase is a claim about nothing — it identifies nobody and grants no
      // standing; it only decides whether this deployment will open a working session at all.
      // On a deployment with no phrase configured it is ignored entirely.
      //
      // ⚠️ So the habit this page was protecting still holds: no credential is sent, because
      // this is not a credential. If a real identity service lands, the phrase does not become
      // its password — it disappears, and this field goes with it.
      const r = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, invite: form.get("invite") || undefined }),
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
          {/* ⚠️ Labelled "Invite phrase", never "Password", and the hint says it plainly. A
              field that looks like a password teaches that this is a login, and the entire
              rest of this screen exists to say it is not. Left blank on a deployment that
              requires none — the route ignores it there. */}
          {/* ⚠️ `required={false}` matters: a local run configures no phrase, and a required
              field would block the form on the one deployment that needs nothing. */}
          <Field
            id="invite"
            label="Invite phrase"
            type="password"
            autoComplete="off"
            required={false}
            placeholder="Leave blank if you were not given one"
            hint="Not a password. It identifies nobody — it only decides whether this deployment opens a working session."
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
