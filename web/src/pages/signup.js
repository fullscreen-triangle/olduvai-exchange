import AuthLayout, { Field, SubmitButton } from "@/components/AuthLayout";
import TransitionEffect from "@/components/TransitionEffect";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

/**
 * ⚠️ Nothing is sent, and — unlike `signin.js` — that has **not** changed.
 *
 * ⭐ The asymmetry is the point, and it is not an oversight to be tidied up later. Sign-in now
 * opens a *local working session*: an opaque label that separates one browser's observations
 * from another's. Registration is a different act. It writes a **named participant into the
 * ledger**, and every field that participant later confirms is attributed to that name and
 * appended, never updated. There is no local, provisional, or reversible version of that.
 *
 * ⚠️ So opening a session here would be the worst available option: it would look like an
 * account was created, under a name nobody can be held to, in a record that does not exist.
 * The page refuses instead, and points at sign-in — which is honest about offering less.
 *
 * The display name is still collected rather than derived from the email local-part, for the
 * same reason it always was: deriving it would silently mint an identity nobody chose.
 */
export default function SignUp() {
  const [status, setStatus] = useState(null);
  const [password, setPassword] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setStatus(data.get("name") || data.get("email"));
  };

  return (
    <>
      <Head>
        <title>Sign up · Olduvai Exchange</title>
      </Head>
      <TransitionEffect />

      <AuthLayout
        title="Create an account"
        subtitle="Join the exchange as a named participant."
        footer={
          <>
            Already have one?{" "}
            <Link
              href="/signin"
              className="text-light underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              Sign in
            </Link>
          </>
        }
      >
        <form onSubmit={submit}>
          <Field
            id="name"
            label="Display name"
            autoComplete="name"
            placeholder="Amai Chikafu"
            hint="Confirmations you make are attributed to this name in the ledger."
          />
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
            autoComplete="new-password"
            minLength={12}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            hint="At least 12 characters. Length beats composition rules."
          />
          <SubmitButton disabled={password.length > 0 && password.length < 12}>
            Create account
          </SubmitButton>
        </form>

        {status && (
          <div
            className="mt-6 rounded-xl border border-border bg-surface/60 p-4"
            aria-live="polite"
          >
            <p className="mb-1 text-[11px] uppercase tracking-widest text-muted">
              No account service yet
            </p>
            <p className="text-sm leading-relaxed text-muted">
              Nothing was sent, and no account exists for{" "}
              <span className="text-light/90">{status}</span>. Registering a participant
              writes a named identity to the ledger, and that path is not built.
            </p>
            {/* ⭐ Sign-in offers strictly less than this page does — a working label rather
                than an identity — which is exactly why it can be offered and this cannot.
                Saying so is more useful than leaving someone at a dead end. */}
            <p className="mt-3 text-sm leading-relaxed text-muted">
              You can still use the dashboard against the local engine:{" "}
              <Link
                href="/signin"
                className="text-light underline underline-offset-4 transition-opacity hover:opacity-70"
              >
                open a local working session
              </Link>
              . It keeps your observations apart from another browser&apos;s on this server,
              and it is not an account.
            </p>
          </div>
        )}
      </AuthLayout>
    </>
  );
}
