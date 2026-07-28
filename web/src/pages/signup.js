import AuthLayout, { Field, SubmitButton } from "@/components/AuthLayout";
import TransitionEffect from "@/components/TransitionEffect";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

/**
 * ⚠️ As with sign-in, nothing is sent. See `signin.js` for why.
 *
 * The one field worth noting is the display name. On the exchange a participant is named in
 * the ledger — every field they confirm is attributed to that name — so it is collected here
 * rather than derived from the email local-part, which would silently mint an identity
 * nobody chose.
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
              writes to the ledger, and that path is not built.
            </p>
          </div>
        )}
      </AuthLayout>
    </>
  );
}
