import { acquireAndRecord } from "@/lib/geolocate";
import { useEffect, useRef, useState } from "react";

/**
 * Get a position into the log automatically, once, on entering the dashboard.
 *
 * # ⭐ Why this exists
 *
 * Every context page — weather, terrain — is centred on a folded position, and refuses to draw
 * anything when the log is empty. That refusal is correct: sampling a 90 m DEM around a 200 km
 * prior would show a precision nobody measured. But the *only* way to fill the log was a button
 * on one page in the left rail, so the ordinary experience was: open the dashboard, ask for the
 * weather, wait, and be told the system does not know where you are.
 *
 * ⚠️ **A gate whose remedy is undiscoverable is indistinguishable from a broken feature.** The
 * pages were honest and the product did not work. This closes that: the browser is asked on
 * arrival, and by the time anyone opens a context page the log usually has a fix in it.
 *
 * # ⚠️ What this does not change
 *
 * It does **not** relax any gate. A page still refuses to draw without a measured position, and
 * `rests_on_observation` is still the only thing separating a real fix from the prior. This adds
 * an observation; it does not lower the bar for what counts as one. If the browser declines, every
 * page still says so rather than inventing a coordinate.
 *
 * ⭐ And it records the browser's own accuracy as sigma, unchanged. A network-derived fix at 3 km
 * enters the log *as* 3 km, so terrain will correctly warn that the ground shown may not be the
 * ground underfoot. Automatic acquisition changes who presses the button, not what is claimed.
 *
 * # ⚠️ Consent, and why asking on arrival is defensible here
 *
 * The browser's own permission prompt is the consent step, and it is unavoidable and unbypassable
 * — this cannot acquire anything a person has not allowed. What this decides is only *when* the
 * prompt appears: on entering a dashboard whose left rail is entirely made of location-derived
 * views, rather than three clicks later. A refusal is remembered by the browser and is never
 * re-prompted here, because `attempted` blocks a second run for the tab's lifetime.
 */
export default function PositionBootstrap() {
  const attempted = useRef(false);
  const [outcome, setOutcome] = useState(null);

  useEffect(() => {
    // ⚠️ Guarded by a ref rather than a state flag: a state update re-runs the effect body's
    // closure and a second `getCurrentPosition` would show a second browser prompt.
    if (attempted.current) return undefined;
    attempted.current = true;

    let cancelled = false;

    (async () => {
      // ⭐ Asked first: if the log already holds a measured position there is nothing to do, and
      // prompting anyway would be a permission dialog with no purpose. This also makes the
      // component idempotent across navigations within a session.
      try {
        const r = await fetch("/api/position");
        const body = await r.json().catch(() => null);
        if (body?.data?.estimate?.rests_on_observation === true) return;

        /**
         * ⚠️ A 401 is not an empty log, and treating it as one is what made this component
         * lie for two sessions.
         *
         * `requireSession` answers 401 with `ok: false` to every signed-out caller. The guard
         * above tests only for `rests_on_observation === true`, which a 401 body also fails —
         * so acquisition proceeded, prompted the browser for a location, posted it to a route
         * that 401'd too, and reported *"we could not determine your position"*. ⭐ Every part
         * of that is wrong: the position was fine, the browser did its job, and the actual
         * state was *not signed in*. Worse, it burned the one-shot permission prompt
         * (`attempted.current`) on a request that could never succeed.
         */
        if (r.status === 401) {
          setOutcome({ kind: "unauthenticated" });
          return;
        }
      } catch {
        // A position route that did not answer is not a reason to skip acquisition — the fix
        // still needs recording, and the POST will report its own failure.
      }

      if (cancelled) return;

      let result = await acquireAndRecord();
      if (cancelled) return;

      /**
       * ⭐ The floor beneath the browser. If the browser answered nothing — declined, no radio,
       * timed out on both the precise and the coarse attempt — the log would otherwise stay empty
       * and every context page would refuse. This asks the server to derive a city-level position
       * from the network address instead.
       *
       * ⚠️ It is genuinely a **last** resort and is ordered as one: it runs only after both
       * browser attempts have failed, so anyone whose browser works never reaches it and never has
       * a 10 km circle in their log. And it is not silent — the banner below names it.
       */
      if (!result.ok) {
        const net = await fetch("/api/observe/network", { method: "POST" });
        const body = await net.json().catch(() => null);
        if (cancelled) return;
        // ⚠️ Checked before the success branch: the session can expire between the read above
        // and this POST, and reporting that as a failed acquisition would blame the browser
        // for a cookie.
        if (net.status === 401) {
          setOutcome({ kind: "unauthenticated" });
          return;
        }
        if (net.ok && body?.network) {
          result = {
            ok: true,
            sigma_m: body.network.sigma_m,
            coarse: true,
            label: body.network.label,
          };
        }
      }

      if (result.ok) {
        setOutcome({ kind: "done", sigma_m: result.sigma_m, coarse: result.coarse, label: result.label });
        // ⚠️ Pages read position during their own fetch on mount, so one already-rendered page
        // would keep showing "nothing observed yet" until navigation. This tells them.
        window.dispatchEvent(new CustomEvent("olduvai:position-recorded"));
      } else {
        setOutcome({ kind: "failed", detail: result.detail });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ⚠️ The success banner clears itself; the failure banner does not. A recorded fix is
  // confirmation and stops being useful after a few seconds, but a declined permission explains
  // every empty page in the left rail and should still be on screen when someone reaches one.
  useEffect(() => {
    // ⚠️ Only a precise fix self-clears — see the coarse branch below for why.
    if (outcome?.kind !== "done" || outcome.coarse) return undefined;
    const t = setTimeout(() => setOutcome(null), 6000);
    return () => clearTimeout(t);
  }, [outcome]);

  // ⭐ Success is announced briefly and then gets out of the way — it states the sigma, because
  // a 3 km fix and a 12 m fix support very different readings of every page in the left rail.
  if (outcome?.kind === "done") {
    /**
     * ⚠️ A network-derived position is announced differently, and the banner does **not** clear
     * itself for it. A 10 km circle around a city explains every subsequent page — why terrain is
     * warning, why weather is regional — and someone who never saw it stated would read those as
     * defects. It also names the city, which is the one claim a participant can immediately
     * check and reject.
     */
    if (outcome.coarse) {
      return (
        <Banner tone="warn">
          Your browser could not determine a position, so one was derived from your network
          address{outcome.label ? ` — ${outcome.label}` : ""}. ⚠️ It is recorded with a 10 km
          sigma, so pages will be centred roughly and will say so. Record a fix on the Position
          page and it will immediately take over.
        </Banner>
      );
    }
    return (
      <Banner tone="ok">
        Position recorded to about {Math.round(outcome.sigma_m)} m. Context pages are centred on it.
      </Banner>
    );
  }

  /**
   * ⚠️ Stated separately from `failed`, because it is not a failure of anything the participant
   * did and the remedy is completely different.
   *
   * ⭐ Silence here is what produced the standing complaint that nothing preloads: every rail
   * page fetched, every fetch 401'd, and each page rendered a gate about observations while
   * this component said nothing at all. Naming it once, at the top of every page, is what
   * turns twelve confusing empty tabs into one sentence.
   */
  if (outcome?.kind === "unauthenticated") {
    return (
      <Banner tone="warn">
        You are not signed in, so no position can be recorded and the context pages have nothing
        to centre on. ⚠️ This is not a fault in your browser or its location permission — sign
        in and these pages fill in on their own.
      </Banner>
    );
  }

  // ⚠️ A failure is stated rather than swallowed. Someone who declined the prompt needs to know
  // that is why the weather page is empty, otherwise the page reads as broken.
  if (outcome?.kind === "failed") {
    return (
      <Banner tone="warn">
        {outcome.detail} Context pages that need a position will stay empty until one is recorded —
        you can add one by hand on the Position page.
      </Banner>
    );
  }

  return null;
}

function Banner({ tone, children }) {
  return (
    <div
      className={`fixed bottom-4 left-1/2 z-40 max-w-lg -translate-x-1/2 rounded-lg border px-4 py-2 text-center text-xs leading-relaxed backdrop-blur ${
        tone === "ok"
          ? "border-border bg-surface/90 text-muted"
          : "border-amber-500/40 bg-surface/95 text-amber-200/90"
      }`}
    >
      {children}
    </div>
  );
}
