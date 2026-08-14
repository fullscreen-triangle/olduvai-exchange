import { useEffect, useRef, useState } from "react";

/**
 * The fused estimate, drawn.
 *
 * # ⚠️ What a map of an uncertain position must not do
 *
 * The obvious implementation puts a pin at `estimate.at` and is wrong, because a pin is a claim
 * of exactness that this system never makes. `Estimate` carries a coordinate *and* a sigma, and
 * the sigma is frequently the larger fact: on a participant who has recorded nothing it is
 * 200 km, and the coordinate underneath it is a placeholder at the centroid of the country. A
 * pin dropped there is a lie that renders identically to the truth.
 *
 * ⭐ So the uncertainty is the primary mark. A filled circle of radius sigma is drawn first,
 * and the centre dot is drawn only when `rests_on_observation` is true. Uninformed, there is a
 * 200 km disc and no dot — which reads, correctly, as "somewhere in here, we have not measured".
 *
 * # ⚠️ Why the circle is a GeoJSON polygon and not a `circle-radius`
 *
 * Mapbox's `circle` layer sizes in **screen pixels**, so a styled circle keeps its size as you
 * zoom and therefore encodes nothing about ground distance. The uncertainty here is metres on
 * the ground; it has to scale with the map or it is decoration. `discAround` builds the polygon
 * in geographic coordinates, so zooming in on a 12 m sigma shows a 12 m disc.
 *
 * # ⚠️ On the token
 *
 * `NEXT_PUBLIC_MAPBOX_TOKEN` is inlined into the client bundle by Next at build time and is
 * readable by anyone who loads the page. That is inherent to browser-side map rendering, not a
 * mistake — but it means the token must be one that is scoped by URL referrer at Mapbox. An
 * absent token is reported as a plain sentence rather than a broken canvas, because "the
 * deployment was not configured" and "the map is broken" are different claims.
 */

/** Metres per degree of latitude. Close enough for drawing a disc; this is not a geodesy crate. */
const M_PER_DEG_LAT = 111_320;

/**
 * A closed ring approximating a circle of `radiusM` metres around a point.
 *
 * ⚠️ The longitude step is divided by `cos(latitude)` because a degree of longitude shrinks
 * toward the poles. Omitting it draws a circle that is correct at the equator and increasingly
 * squashed everywhere else — at Harare's -17.8° the error is ~5%, which is invisible and
 * therefore worse than an obvious break.
 */
function discAround([lng, lat], radiusM, steps = 72) {
  const dLat = radiusM / M_PER_DEG_LAT;
  const dLng = radiusM / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  const ring = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * 2 * Math.PI;
    ring.push([lng + dLng * Math.cos(t), lat + dLat * Math.sin(t)]);
  }
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [ring] },
    properties: {},
  };
}

/**
 * ⭐ A zoom at which a disc of `sigma` metres fills a useful part of the frame.
 *
 * Without this, a 12 m sigma renders as an invisible speck at world zoom and a 200 km sigma
 * overflows the canvas — the same code producing two useless extremes. Derived from the Web
 * Mercator relation that zoom z spans ~360/2^z degrees of longitude.
 */
function zoomFor(sigmaM, lat) {
  const spanDeg = (6 * sigmaM) / (M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  const z = Math.log2(360 / Math.max(spanDeg, 1e-6));
  return Math.min(17, Math.max(2, z));
}

export default function PositionMap({ estimate }) {
  const holder = useRef(null);
  const map = useRef(null);
  const [failed, setFailed] = useState(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? null;

  const at = estimate?.at ?? null;
  const lng = typeof at?.longitude === "number" ? at.longitude : null;
  const lat = typeof at?.latitude === "number" ? at.latitude : null;
  const sigma = typeof estimate?.sigma_m === "number" ? estimate.sigma_m : null;
  const measured = estimate?.rests_on_observation === true;

  useEffect(() => {
    if (!token || lng === null || lat === null || !holder.current) return undefined;

    let cancelled = false;
    let instance = null;

    // ⚠️ Imported dynamically rather than at module scope. `mapbox-gl` touches `window` on
    // import, so a static import crashes the SSR pass of a Pages Router build — the page fails
    // to render at all, rather than rendering without a map.
    (async () => {
      let mapboxgl;
      try {
        mapboxgl = (await import("mapbox-gl")).default;
        await import("mapbox-gl/dist/mapbox-gl.css");
      } catch {
        if (!cancelled) setFailed("The map library did not load.");
        return;
      }

      if (cancelled || !holder.current) return;

      // ⚠️ WebGL is absent in some browsers and in most headless environments. Unsupported is
      // a fact to state, not an exception to let escape into a blank grey box.
      if (!mapboxgl.supported?.()) {
        setFailed("This browser does not support WebGL, so the map cannot be drawn.");
        return;
      }

      mapboxgl.accessToken = token;

      try {
        instance = new mapboxgl.Map({
          container: holder.current,
          // Dark, to sit inside the surrounding surface rather than glare out of it.
          style: "mapbox://styles/mapbox/dark-v11",
          center: [lng, lat],
          zoom: zoomFor(sigma ?? 200_000, lat),
          // ⚠️ Off. The globe projection animates on load and re-projects the disc polygon at
          // low zoom, so a 200 km uncertainty visibly changes shape while the camera settles.
          projection: "mercator",
          attributionControl: true,
        });
      } catch {
        if (!cancelled) setFailed("The map could not be initialised.");
        return;
      }

      map.current = instance;
      instance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      instance.on("error", (e) => {
        // Mapbox reports an invalid or over-quota token through this channel, not by throwing.
        if (!cancelled) setFailed(e?.error?.message ?? "The map service returned an error.");
      });

      instance.on("load", () => {
        if (cancelled) return;

        instance.addSource("uncertainty", {
          type: "geojson",
          data: discAround([lng, lat], sigma ?? 200_000),
        });

        // ⭐ Drawn whether or not the estimate rests on an observation — it is the honest mark
        // in both cases. Only its meaning differs, and the caption below carries that.
        instance.addLayer({
          id: "uncertainty-fill",
          type: "fill",
          source: "uncertainty",
          paint: {
            "fill-color": measured ? "#38bdf8" : "#94a3b8",
            "fill-opacity": measured ? 0.18 : 0.1,
          },
        });
        instance.addLayer({
          id: "uncertainty-line",
          type: "line",
          source: "uncertainty",
          paint: {
            "line-color": measured ? "#38bdf8" : "#94a3b8",
            "line-width": 1,
            // Dashed when unmeasured. A solid boundary reads as a surveyed extent; this one is
            // a prior, and the dashes say so without a legend.
            ...(measured ? {} : { "line-dasharray": [2, 2] }),
          },
        });

        // ⚠️ The centre dot exists ONLY when something was measured. See the module doc — this
        // is the single most important line in the file.
        if (measured) {
          instance.addSource("fix", {
            type: "geojson",
            data: { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] } },
          });
          instance.addLayer({
            id: "fix-dot",
            type: "circle",
            source: "fix",
            paint: {
              "circle-radius": 4,
              "circle-color": "#38bdf8",
              "circle-stroke-width": 1.5,
              "circle-stroke-color": "#0b1220",
            },
          });
        }
      });
    })();

    return () => {
      cancelled = true;
      instance?.remove();
      map.current = null;
    };
  }, [token, lng, lat, sigma, measured]);

  if (!token) {
    return (
      <Frame>
        <p className="text-sm leading-relaxed text-muted">
          No map token is configured for this deployment, so the map is not drawn. Set{" "}
          <code className="text-light/80">NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
          <code className="text-light/80">web/.env.local</code>.
        </p>
      </Frame>
    );
  }

  if (lng === null || lat === null) {
    return (
      <Frame>
        <p className="text-sm leading-relaxed text-muted">
          The exchange holds no coordinate for this participant, so there is nothing to draw.
        </p>
      </Frame>
    );
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border border-border">
        <div ref={holder} className="h-[320px] w-full bg-surface/60" />
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/90 p-6">
            <p className="text-center text-sm leading-relaxed text-muted">{failed}</p>
          </div>
        )}
      </div>

      {/* ⚠️ The caption is not decoration. The same two shapes mean different things depending
          on `rests_on_observation`, and a reader cannot tell which they are looking at from the
          drawing alone — the dashes are a hint, not a statement. */}
      <p className="mt-2 text-[11px] leading-relaxed text-muted/60">
        {measured
          ? `The shaded circle is the one-sigma uncertainty (${formatSigma(sigma)}); the dot is the fused estimate.`
          : `The dashed circle is the uninformed prior (${formatSigma(sigma)}) — not a measurement of you. There is no dot because nothing has been observed.`}
      </p>
    </div>
  );
}

function Frame({ children }) {
  return (
    <div className="flex h-[320px] w-full items-center justify-center rounded-xl border border-border bg-surface/60 p-6">
      {children}
    </div>
  );
}

function formatSigma(m) {
  if (typeof m !== "number") return "unknown";
  return m >= 1000 ? `${(m / 1000).toFixed(0)} km` : `${m.toFixed(0)} m`;
}
