import AuthLayout, { Field, SubmitButton } from "@/components/AuthLayout";
import TransitionEffect from "@/components/TransitionEffect";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
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
  const router = useRouter();

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

            {/* ⚠️ An explicit, labelled way through rather than an automatic redirect.
                Silently landing someone on the dashboard would look like the sign-in
                succeeded; the dashboard is reachable because nothing guards it yet, and
                that is a fact worth stating rather than papering over. */}
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="mt-4 rounded-lg border border-border px-3 py-2 text-xs text-light transition-colors hover:bg-surfaceHover"
            >
              Continue to the dashboard unauthenticated
            </button>
          </div>
        )}
      </AuthLayout>
    </>
  );
}
