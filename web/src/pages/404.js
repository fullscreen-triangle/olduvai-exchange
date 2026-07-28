import TransitionEffect from "@/components/TransitionEffect";
import Head from "next/head";
import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <Head>
        <title>Not found · Olduvai Exchange</title>
      </Head>
      <TransitionEffect />

      <div className="flex min-h-screen w-full flex-col items-center justify-center px-6 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">404</p>
        <h1 className="mt-4 text-2xl font-normal tracking-tight text-light">
          There is nothing at this address.
        </h1>
        <Link
          href="/"
          className="mt-8 rounded-lg border border-border px-4 py-2 text-sm text-light transition-colors hover:bg-surfaceHover"
        >
          Back to the exchange
        </Link>
      </div>
    </>
  );
}
