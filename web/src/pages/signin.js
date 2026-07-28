import AuthLayout, { Field, SubmitButton } from "@/components/AuthLayout";
import TransitionEffect from "@/components/TransitionEffect";
import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

/**
 * ⚠️ There is no auth backend yet, and this form does not pretend otherwise.
 *
 * The alternative — POSTing to a plausible `/api/signin` that returns nothing — would be
 * worse than doing nothing, because it would look like it worked. The markup, labels,
 * autocomplete hints and validation are all real, so wiring a server in later is a change
 * to `submit` and nothing else.
 */
export default function SignIn() {
  const [status, setStatus] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setStatus(data.get("email"));
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
          <SubmitButton>Sign in</SubmitButton>
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
              Nothing was sent. Identity on the exchange is a ledger participant, not a
              user row, and that boundary is not built — so there is no server to
              authenticate <span className="text-light/90">{status}</span> against.
            </p>
          </div>
        )}
      </AuthLayout>
    </>
  );
}
