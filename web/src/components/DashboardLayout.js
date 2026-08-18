import EdgeSidebar from "@/components/EdgeSidebar";
import PositionBootstrap from "@/components/PositionBootstrap";
import TransitionEffect from "@/components/TransitionEffect";
import { LEFT_RAIL, RIGHT_RAIL } from "@/lib/navigation";
import Head from "next/head";
import Link from "next/link";

/**
 * The frame every signed-in page sits in: both rails, and nothing else chrome-like.
 *
 * ⚠️ Mounted per-page rather than in `_app`, deliberately. The landing page is the model
 * and nothing else, and the auth pages are for people with no rails to show — putting this
 * in `_app` would have put two edge triggers on all of them.
 */
export default function DashboardLayout({ title, children }) {
  return (
    <>
      <Head>
        <title>{title ? `${title} · Olduvai Exchange` : "Olduvai Exchange"}</title>
      </Head>
      <TransitionEffect />

      <EdgeSidebar
        side="left"
        title="Context"
        hotkey="["
        items={LEFT_RAIL}
        footer={
          <Link
            href="/dashboard"
            className="block rounded-lg px-3 py-2 text-xs text-muted transition-colors hover:bg-surfaceHover hover:text-light"
          >
            ← Composer
          </Link>
        }
      />

      <EdgeSidebar
        side="right"
        title="Process"
        hotkey="]"
        items={RIGHT_RAIL}
        footer={
          <p className="px-3 text-[11px] leading-relaxed text-muted/60">
            Process views read the exchange&apos;s own record. Context does not.
          </p>
        }
      />

      {/* ⭐ Mounted in the frame rather than on a page, because it must run once per session and
          not once per page. Every left-rail view is centred on a folded position, so acquiring
          one is a property of being in the dashboard at all — not of having navigated to the one
          page that happened to carry the button. */}
      <PositionBootstrap />

      {children}
    </>
  );
}
