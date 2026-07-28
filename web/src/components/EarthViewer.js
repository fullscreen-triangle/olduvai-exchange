import { useEffect, useRef, useState } from "react";

/**
 * The animated earth-and-moon model, and the whole of the landing page's content.
 *
 * # Why `<model-viewer>` and not react-three-fiber
 *
 * The asset is a 16 MB animated GLB that needs to do exactly one thing: play its own
 * animation and let someone spin it. `<model-viewer>` is a web component that does that
 * declaratively. The r3f route (`three` + `@react-three/fiber` + `@react-three/drei`) is
 * roughly half a megabyte of JavaScript and a React reconciler for a scene graph we never
 * touch from React — all cost, no benefit, at this scope.
 *
 * # Why the import is inside an effect
 *
 * The package registers a custom element and reads `window` at module scope. A top-level
 * `import` would therefore run during SSR and crash the build. Loading it in an effect
 * means the server renders the placeholder and the browser upgrades it — which also gives
 * us somewhere honest to show load progress for a 16 MB download.
 */
export default function EarthViewer({ className = "" }) {
  const ref = useRef(null);
  const [status, setStatus] = useState("loading"); // loading | ready | failed
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;

    import("@google/model-viewer")
      .then(() => {
        if (!cancelled) setStatus((s) => (s === "failed" ? s : "loading"));
      })
      .catch(() => {
        // A failed viewer must not take the page down with it. The landing page degrades
        // to its background and the nav still works.
        if (!cancelled) setStatus("failed");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onProgress = (e) => setProgress(e.detail?.totalProgress ?? 0);
    const onLoad = () => setStatus("ready");
    const onError = () => setStatus("failed");

    el.addEventListener("progress", onProgress);
    el.addEventListener("load", onLoad);
    el.addEventListener("error", onError);
    return () => {
      el.removeEventListener("progress", onProgress);
      el.removeEventListener("load", onLoad);
      el.removeEventListener("error", onError);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* React passes unknown props on a custom element straight through as attributes,
          which is exactly what model-viewer wants. `suppressHydrationWarning` because the
          element upgrades itself after mount and rewrites its own shadow DOM. */}
      <model-viewer
        ref={ref}
        src="/earth_and_moonanimated.glb"
        alt="An animated model of the Earth and the Moon"
        autoplay
        animation-name="*"
        camera-controls
        touch-action="pan-y"
        auto-rotate
        auto-rotate-delay="0"
        rotation-per-second="12deg"
        interaction-prompt="none"
        shadow-intensity="0"
        exposure="1.1"
        environment-image="neutral"
        disable-tap
        suppressHydrationWarning
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "transparent",
          "--poster-color": "transparent",
        }}
      />

      {status === "loading" && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 text-xs tracking-widest text-muted">
            <span className="h-px w-24 overflow-hidden bg-border">
              <span
                className="block h-px bg-primary transition-[width] duration-300 ease-out"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </span>
            <span className="tabular-nums">{Math.round(progress * 100)}%</span>
          </div>
        </div>
      )}

      {status === "failed" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted">The model could not be loaded.</p>
        </div>
      )}
    </div>
  );
}
