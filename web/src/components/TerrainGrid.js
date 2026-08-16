import { useEffect, useRef, useState } from "react";
import { PROVENANCE_CAPTION } from "@/components/RailPage";
import { SAMPLE_DEG } from "@/lib/api/elevation";

/**
 * The DEM under a holding, drawn one mark per sample.
 *
 * # ⭐ Why this is not `WeatherGrid` with a different colour ramp
 *
 * It follows the same rule — *one mark per sample, nothing between them* — and arrives at a
 * visibly different drawing, because the data underneath is different in a way that matters.
 *
 * | | Weather | Terrain |
 * |---|---|---|
 * | provider cell | 0.070299° (~7.8 km) | 0.00106° (~90 m) |
 * | samples drawn | ~21 | 81 |
 * | span | ~39 km | ~2.7 km |
 *
 * ⚠️ **The gap argument does not transfer, and pretending it did would be its own overclaim.**
 * `WeatherGrid`'s inset exists because three requested points 550 m apart return *one* reading —
 * the provider genuinely made no claim between its cells, and the visible seam says so. Here the
 * sampling step (0.003°) is under three times the DEM step (0.00106°), so neighbouring samples are
 * near-adjacent ground rather than isolated readings. Insetting them by 12% would manufacture a
 * sparseness the data does not have, which is the same class of error as interpolating, pointed
 * the other way.
 *
 * ⚠️ It is still a *sample*, not a mosaic: at 0.003° roughly two of every three DEM cells between
 * two samples go unread. The caption states both steps so a reader can see that, and the drawing
 * does not pretend the unread cells were read.
 *
 * ⭐ So cells are drawn at nearly their full extent and the honest statement moves into the
 * caption, which names the sampling step and the DEM step **separately**. A reader can then see
 * that this is a dense sample of a fine raster, rather than inferring sparseness from a seam that
 * was a rendering choice.
 *
 * # ⚠️ No slope, no aspect, no hillshade
 *
 * All three difference neighbouring cells, and a slope across two 90 m cells is a claim about
 * 180 m of ground — wider than most holdings and much wider than any field boundary a participant
 * would recognise. Note 37 §4: draw the uncertainty first, draw the value only if it was measured.
 * Elevation was measured. Slope would be a derived number wearing a measured number's clothes.
 *
 * # ⭐ The uncertainty is drawn before the values, and can suppress them
 *
 * A 90 m DEM under a 4 km position fix describes ground the participant is probably not standing
 * on. `sigma_exceeds_sample` arrives from the route already computed, and when it is true this
 * says so **above** the map rather than letting a crisp hillside imply a precision the position
 * never had.
 */

/**
 * ⭐ A terrain ramp: low ground dark and cool, high ground pale and warm.
 *
 * Sequential and perceptually ordered, same requirement as `WeatherGrid` — a reader must rank two
 * cells by colour without a legend. Seven stops rather than five, because 81 samples resolving
 * ~28 distinct heights can carry more than a five-stop ramp without implying precision the DEM
 * lacks — measured at −17.8252, 31.0335: 28 heights over 29 m of relief.
 *
 * ⚠️ Endpoints come from the samples present, never fixed. A holding with 3 m of relief and one
 * with 300 m should both use the full ramp, or the drawing goes flat exactly where the variation
 * is the interesting part.
 */
const RAMP = [
  "#15304a",
  "#1f4f63",
  "#2f7370",
  "#57946a",
  "#93b070",
  "#c8c288",
  "#efe0b4",
];

function colourFor(value, min, max) {
  if (typeof value !== "number") return "#334155";
  // ⚠️ A degenerate range is a real case — a flat holding returns one height for every sample.
  // Dividing by zero would paint everything the top colour and imply a gradient that is not
  // there; the midpoint says "no relief" honestly.
  if (!(max > min)) return RAMP[Math.floor(RAMP.length / 2)];
  const t = (value - min) / (max - min);
  return RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))];
}

/**
 * A sample as a closed geographic ring at its sampling extent.
 *
 * ⚠️ Drawn as a **polygon in degrees**, never as a styled circle. Mapbox sizes `circle` in screen
 * pixels, so a dot keeps its size as you zoom and encodes nothing about ground extent — the same
 * rule `PositionMap` and `WeatherGrid` both state. A sample here covers ~180 m; that has to scale
 * with the map or the drawing is decoration.
 *
 * ⭐ `inset` is 0.98, not `WeatherGrid`'s 0.88. See the module doc: these samples genuinely are
 * near-adjacent, and a wide seam would assert a sparseness the DEM does not have. The 2% is
 * enough to keep individual samples countable at high zoom without reading as gaps.
 */
function samplePolygon(point, stepDeg, colour) {
  const d = (stepDeg * 0.98) / 2;
  const { latitude: la, longitude: lo } = point;
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [lo - d, la - d],
          [lo + d, la - d],
          [lo + d, la + d],
          [lo - d, la + d],
          [lo - d, la - d],
        ],
      ],
    },
    properties: { colour, elevation: point.elevation_m },
  };
}

export default function TerrainGrid({ data }) {
  const holder = useRef(null);
  const [failed, setFailed] = useState(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? null;

  const points = Array.isArray(data?.points) ? data.points : [];
  const centre = data?.declaration?.centre ?? null;
  const provenance = data?.declaration?.source ?? "asserted";
  // ⚠️ Falls back to the client's own constant rather than a literal, so the two cannot drift.
  // The route always sends `sample_deg`; this only covers a malformed payload.
  const step = data?.sample_deg ?? SAMPLE_DEG;
  const coarse = data?.declaration?.sigma_exceeds_sample === true;

  const min = typeof data?.min_m === "number" ? data.min_m : 0;
  const max = typeof data?.max_m === "number" ? data.max_m : 0;

  // ⚠️ Serialised into the dependency list rather than passing `points` directly: a new array
  // identity on every render would tear down and rebuild the map on each parent update.
  // ⭐ Length and endpoints rather than every coordinate — 81 samples would make a ~3 kB string
  // recomputed on each render, and the tuple below changes whenever the fetch does.
  const key = `${points.length}:${min}:${max}:${step}`;

  useEffect(() => {
    if (!token || !points.length || !holder.current) return undefined;

    let cancelled = false;
    let instance = null;

    // ⚠️ Dynamic import, same reason as `PositionMap` and `WeatherGrid`: `mapbox-gl` touches
    // `window` at import time, so a static import crashes the SSR pass of a Pages Router build.
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

      if (!mapboxgl.supported?.()) {
        setFailed("This browser does not support WebGL, so the terrain cannot be drawn.");
        return;
      }

      mapboxgl.accessToken = token;

      const lats = points.map((p) => p.latitude);
      const lons = points.map((p) => p.longitude);
      // ⚠️ A tighter margin than `WeatherGrid`'s 0.05°, which would be 15× this sample's whole
      // extent — the grid would sit as a speck in the middle of an empty map.
      const m = step * 2;
      const bounds = [
        [Math.min(...lons) - m, Math.min(...lats) - m],
        [Math.max(...lons) + m, Math.max(...lats) + m],
      ];

      try {
        instance = new mapboxgl.Map({
          container: holder.current,
          // ⭐ `satellite-streets`, not the dark basemap the weather grid uses. At 3.3 km across,
          // what is underneath a terrain sample — a river, a ridge, a field pattern — is context a
          // reader can check the DEM against. At the weather grid's 39 km it would be noise.
          style: "mapbox://styles/mapbox/satellite-streets-v12",
          bounds,
          fitBoundsOptions: { padding: 24 },
          // ⚠️ Mercator, not globe — the globe projection re-projects polygons while the camera
          // settles, so cells visibly change shape on load.
          projection: "mercator",
          attributionControl: true,
        });
      } catch {
        if (!cancelled) setFailed("The map could not be initialised.");
        return;
      }

      instance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      instance.on("error", (e) => {
        if (!cancelled) setFailed(e?.error?.message ?? "The map service returned an error.");
      });

      instance.on("load", () => {
        if (cancelled) return;

        const features = points.map((p) =>
          samplePolygon(p, step, colourFor(p.elevation_m, min, max))
        );

        instance.addSource("dem", {
          type: "geojson",
          data: { type: "FeatureCollection", features },
        });

        instance.addLayer({
          id: "dem-fill",
          type: "fill",
          source: "dem",
          paint: {
            "fill-color": ["get", "colour"],
            // ⚠️ Translucent so the satellite imagery stays legible underneath. A reader who can
            // see the ridge in the photograph and the ramp on top of it can judge whether the DEM
            // agrees with the ground — which is the only check available without a second source.
            "fill-opacity": 0.6,
          },
        });

        // ⭐ The participant's position, drawn with the rule `PositionMap` states: the uncertainty
        // is the mark. ⚠️ Only reachable because the route refuses to serve a sample for an
        // unmeasured position, so a fix exists — but its sigma may still dwarf this window, which
        // is what `coarse` says above the map.
        if (typeof centre?.latitude === "number" && typeof centre?.longitude === "number") {
          instance.addSource("centre", {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: { type: "Point", coordinates: [centre.longitude, centre.latitude] },
            },
          });
          instance.addLayer({
            id: "centre-dot",
            type: "circle",
            source: "centre",
            paint: {
              "circle-radius": 4,
              "circle-color": "#f8fafc",
              "circle-stroke-width": 1.5,
              "circle-stroke-color": "#0b1220",
            },
          });
        }

        // ⚠️ The popup names the sample's own coordinate, so a reader can see the height is
        // attached to a grid point and not to wherever their cursor happens to be.
        const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });
        instance.on("mousemove", "dem-fill", (e) => {
          const p = e.features?.[0]?.properties;
          if (!p) return;
          instance.getCanvas().style.cursor = "pointer";
          popup
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-size:11px;line-height:1.5;color:#0b1220">` +
                `<strong>${p.elevation ?? "—"} m</strong>` +
                `</div>`
            )
            .addTo(instance);
        });
        instance.on("mouseleave", "dem-fill", () => {
          instance.getCanvas().style.cursor = "";
          popup.remove();
        });
      });
    })();

    return () => {
      cancelled = true;
      instance?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, key, centre?.latitude, centre?.longitude]);

  if (!token) {
    return (
      <Frame>
        <p className="text-sm leading-relaxed text-muted">
          No map token is configured for this deployment, so the terrain is not drawn. Set{" "}
          <code className="text-light/80">NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
          <code className="text-light/80">web/.env.local</code>. The readings above are unaffected.
        </p>
      </Frame>
    );
  }

  if (!points.length) {
    return (
      <Frame>
        <p className="text-sm leading-relaxed text-muted">
          The provider returned no elevations for this location.
        </p>
      </Frame>
    );
  }

  return (
    <div className="mt-4">
      {/* ⭐ Above the map, deliberately. If the position's uncertainty is wider than the window
          being drawn, that fact governs how everything below it should be read, and a reader who
          meets it after studying the hillside has already been misled. */}
      {coarse && (
        <p className="mb-3 border-l-2 border-border pl-3 text-sm leading-relaxed text-muted">
          ⚠️ Your position is uncertain by more than the width of this sample, so the ground shown
          here may not be the ground you are standing on. The heights are the provider&rsquo;s and
          are not in doubt — where they sit relative to you is. A closer fix narrows this.
        </p>
      )}

      <div className="relative overflow-hidden rounded-xl border border-border">
        <div ref={holder} className="h-[360px] w-full bg-surface/60" />
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/90 p-6">
            <p className="text-center text-sm leading-relaxed text-muted">{failed}</p>
          </div>
        )}
      </div>

      {/* ⚠️ Sampling step and DEM step are named separately, because they are different numbers
          and the drawing cannot show which is which. ⭐ `distinct` is here for the same reason:
          81 samples returning 28 heights is a holding with real but small relief, and 81 returning
          3 would be flat ground drawn as if surveyed — only the count distinguishes them.
          Provenance comes from
          `PROVENANCE_CAPTION` — a local copy of these strings is how a caption and a drawing
          drift apart. */}
      <p className="mt-2 text-[11px] leading-relaxed text-muted/60">
        {points.length} samples at {(data.sample_deg * 111.32).toFixed(0)} m spacing, reading a
        DEM whose own cells are about {data.dem_step_m} m across —{" "}
        {PROVENANCE_CAPTION[provenance] ?? provenance}. {data.distinct} distinct heights over{" "}
        {data.relief_m} m of relief. Nothing is drawn between samples, and no slope is computed:
        a gradient across two cells would describe {data.dem_step_m * 2} m of ground. The dot is
        your position.
      </p>
    </div>
  );
}

function Frame({ children }) {
  return (
    <div className="mt-4 flex h-[360px] w-full items-center justify-center rounded-xl border border-border bg-surface/60 p-6">
      {children}
    </div>
  );
}
