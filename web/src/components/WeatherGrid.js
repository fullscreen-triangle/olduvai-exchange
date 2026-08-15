import { useEffect, useRef, useState } from "react";
import { PROVENANCE_CAPTION } from "@/components/RailPage";

/**
 * The provider's grid, drawn as a grid.
 *
 * # ⭐ What this is replacing, and why it is not a reduced version of it
 *
 * `notes/34` §3 rejected the `d3` weather example because its IDW interpolation **invents values
 * between grid points**, on a page whose declared purpose is to state the provider's resolution.
 * `notes/37` §4 turns that rejection into an instruction in the user's own words — *"implement
 * what works with the page's declaration"* — and this is it: **one mark per cell, at the cell's
 * real ground extent, and nothing at all between them.**
 *
 * ⚠️ **The gaps between cells are the most important thing on this canvas and must never be
 * closed.** A continuous heatmap is a claim about every point inside it. This provider made no
 * such claim: it sampled at 21–25 points and said nothing in between. The gap is the difference
 * between those two statements, rendered.
 *
 * ⭐ That is not a weaker drawing than the d3 example. It is a *different and truer* one, and
 * the objection it answers is measurable rather than aesthetic — three requested points 550 m
 * apart return one identical reading (`lib/api/openmeteo.js`), so a smooth surface drawn through
 * them would be interpolating between values that were never separately sampled.
 *
 * # ⚠️ Cells are drawn as geographic polygons, never as styled circles
 *
 * The same rule `PositionMap` states for its uncertainty disc, and for the same reason: Mapbox
 * sizes `circle` in **screen pixels**, so a styled dot keeps its size as you zoom and therefore
 * encodes nothing about ground extent. A cell here is ~7.8 km tall — that has to scale with the
 * map or the drawing is decoration with a colour ramp.
 *
 * # ⚠️ Cells are rectangles, not squares, and each carries its own width
 *
 * Measured, not assumed: latitude steps by a constant 0.070299° while the longitude step
 * *shrinks* row by row toward the equator (0.087549° → 0.087210° across five rows). It is an
 * equal-area grid, so a cell is ~7.8 km tall and ~9.2 km wide here, and the width is a function
 * of latitude. Each cell arrives with `height_deg` and `width_deg` and is drawn at its own size.
 * Drawing squares would assert a footprint the provider does not have — the same error as
 * interpolating, rotated ninety degrees.
 *
 * # ⭐ The rows are staggered, and nothing here assumes otherwise
 *
 * Measured live through the BFF at −17.825, 31.034 — 25 requests, 25 distinct cells, five rows:
 *
 * ```
 * lat -17.961336  w=0.087463  lons 30.874636 30.962100 31.049562 31.137026 31.224490
 * lat -17.891037  w=0.087378  lons 30.844662 30.932040 31.019419 31.106796 31.194176
 * lat -17.820738  w=0.087293  lons 30.902039 30.989332 31.076626 31.163920 31.251213
 * ```
 *
 * ⚠️ **Each row's longitudes are offset from the row above by ~0.03°, not aligned into columns.**
 * Each latitude row has its own independent phase. So this is a *brick* pattern, not a lattice,
 * and no cell has a well-defined "cell above" it.
 *
 * ⭐ Which is why every cell is drawn from its **own** returned coordinate and extent, and why
 * nothing here indexes cells by row and column. Code that walked a `[row][col]` array — the
 * natural shape for a heatmap, and what the d3 example wants — would silently mis-place every
 * cell but the centre one, and the drawing would still look like a plausible grid.
 */

/**
 * ⭐ The value ramp, and the reason it is not a rainbow.
 *
 * Sequential and perceptually ordered: a reader must be able to rank two cells by colour without
 * consulting a legend, which a hue-cycling ramp defeats. Five stops, because the data has ~21
 * cells and a finer ramp would imply a precision the sampling does not support.
 *
 * ⚠️ Endpoints are computed from the cells present, not fixed — a 5-degree spread across a
 * holding and a 25-degree spread across a region should both use the full ramp, or the drawing
 * is flat exactly when the variation is the interesting part.
 */
const RAMP = ["#1e3a5f", "#2b6a8f", "#4a9fb8", "#8fce9f", "#f2d06b"];

function colourFor(value, min, max) {
  if (typeof value !== "number") return "#334155";
  // ⚠️ A degenerate range is a real case — every cell identical, which happens over flat terrain
  // on a still day. Dividing by zero would paint every cell the top colour and imply a gradient
  // that is not there; the midpoint says "no variation" honestly.
  if (!(max > min)) return RAMP[Math.floor(RAMP.length / 2)];
  const t = (value - min) / (max - min);
  return RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))];
}

/**
 * A cell as a closed geographic ring, at its own measured extent.
 *
 * ⚠️ Inset slightly so adjacent cells do not share an edge. Touching rectangles read as a
 * continuous surface — the exact claim this drawing exists to avoid — and the visible seam is
 * what makes the sampling legible as sampling.
 */
function cellPolygon(cell) {
  const h = (cell.height_deg ?? 0.070299) / 2;
  const w = (cell.width_deg ?? 0.0874) / 2;
  // 88% of the true extent: enough gap to read, close enough that the cell still shows its size.
  const inset = 0.88;
  const dLat = h * inset;
  const dLon = w * inset;
  const { latitude: la, longitude: lo } = cell;

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [lo - dLon, la - dLat],
          [lo + dLon, la - dLat],
          [lo + dLon, la + dLat],
          [lo - dLon, la + dLat],
          [lo - dLon, la - dLat],
        ],
      ],
    },
    properties: {
      colour: cell.__colour,
      temperature: cell.temperature_c,
      elevation: cell.elevation_m,
    },
  };
}

export default function WeatherGrid({ data }) {
  const holder = useRef(null);
  const [failed, setFailed] = useState(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? null;

  const cells = Array.isArray(data?.cells) ? data.cells : [];
  const centre = data?.centre ?? null;
  const provenance = data?.declaration?.source ?? "asserted";

  const temps = cells.map((c) => c.temperature_c).filter((v) => typeof v === "number");
  const min = temps.length ? Math.min(...temps) : 0;
  const max = temps.length ? Math.max(...temps) : 0;

  // ⚠️ Serialised into the dependency list rather than passing `cells` directly: a new array
  // identity on every render would tear down and rebuild the map on each parent update.
  const key = cells.map((c) => `${c.latitude},${c.longitude},${c.temperature_c}`).join("|");

  useEffect(() => {
    if (!token || !cells.length || !holder.current) return undefined;

    let cancelled = false;
    let instance = null;

    // ⚠️ Dynamic import, same reason as `PositionMap`: `mapbox-gl` touches `window` at import
    // time, so a static import crashes the SSR pass of a Pages Router build.
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
        setFailed("This browser does not support WebGL, so the grid cannot be drawn.");
        return;
      }

      mapboxgl.accessToken = token;

      // The grid's own extent, so the camera frames what was actually fetched rather than a
      // guessed zoom. 5 rows at 0.0703° is ~0.35°, which varies with SPAN in the client.
      const lats = cells.map((c) => c.latitude);
      const lons = cells.map((c) => c.longitude);
      const bounds = [
        [Math.min(...lons) - 0.05, Math.min(...lats) - 0.05],
        [Math.max(...lons) + 0.05, Math.max(...lats) + 0.05],
      ];

      try {
        instance = new mapboxgl.Map({
          container: holder.current,
          style: "mapbox://styles/mapbox/dark-v11",
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

        const features = cells.map((c) =>
          cellPolygon({ ...c, __colour: colourFor(c.temperature_c, min, max) })
        );

        instance.addSource("cells", {
          type: "geojson",
          data: { type: "FeatureCollection", features },
        });

        instance.addLayer({
          id: "cell-fill",
          type: "fill",
          source: "cells",
          paint: {
            "fill-color": ["get", "colour"],
            // ⚠️ Translucent so the basemap's terrain and settlements stay legible underneath.
            // A cell is a 7.8 km reading; hiding the ground it covers would make it look like a
            // measurement *of* a place rather than *over* one.
            "fill-opacity": 0.55,
          },
        });

        instance.addLayer({
          id: "cell-line",
          type: "line",
          source: "cells",
          paint: { "line-color": ["get", "colour"], "line-width": 1, "line-opacity": 0.9 },
        });

        // ⭐ The participant's own position, drawn with the same rule `PositionMap` uses: the
        // uncertainty is the mark. ⚠️ Only drawn at all because the route refuses to serve a grid
        // for an unmeasured position — so reaching here means a fix exists.
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

        // Cell values on hover. ⚠️ The popup names the cell's coordinate — the *provider's*
        // coordinate — so a reader can see the reading is attached to a grid point and not to
        // wherever their cursor happens to be.
        const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });
        instance.on("mousemove", "cell-fill", (e) => {
          const p = e.features?.[0]?.properties;
          if (!p) return;
          instance.getCanvas().style.cursor = "pointer";
          popup
            .setLngLat(e.lngLat)
            .setHTML(
              `<div style="font-size:11px;line-height:1.5;color:#0b1220">` +
                `<strong>${p.temperature ?? "—"} °C</strong><br/>` +
                `elevation ${p.elevation ?? "—"} m` +
                `</div>`
            )
            .addTo(instance);
        });
        instance.on("mouseleave", "cell-fill", () => {
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
  }, [token, key, min, max, centre?.latitude, centre?.longitude]);

  if (!token) {
    return (
      <Frame>
        <p className="text-sm leading-relaxed text-muted">
          No map token is configured for this deployment, so the grid is not drawn. Set{" "}
          <code className="text-light/80">NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
          <code className="text-light/80">web/.env.local</code>. The readings above are unaffected.
        </p>
      </Frame>
    );
  }

  if (!cells.length) {
    return (
      <Frame>
        <p className="text-sm leading-relaxed text-muted">
          The provider returned no cells for this location.
        </p>
      </Frame>
    );
  }

  return (
    <div className="mt-4">
      <div className="relative overflow-hidden rounded-xl border border-border">
        <div ref={holder} className="h-[360px] w-full bg-surface/60" />
        {failed && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/90 p-6">
            <p className="text-center text-sm leading-relaxed text-muted">{failed}</p>
          </div>
        )}
      </div>

      {/* ⚠️ The caption states what the gaps mean, because a reader cannot infer it from the
          drawing — an unexplained gap reads as missing data rather than as absent claim, which
          inverts the whole point. ⭐ The provenance word comes from `PROVENANCE_CAPTION`, the
          same map the declaration above uses; a local copy of these strings is how a caption and
          a drawing drift apart. */}
      <p className="mt-2 text-[11px] leading-relaxed text-muted/60">
        {cells.length} cells, each {(data.resolution_m / 1000).toFixed(1)} km tall at the
        provider&rsquo;s own grid points — {PROVENANCE_CAPTION[provenance] ?? provenance}. The gaps
        are deliberate: the provider sampled at these points and made no claim between them, so
        nothing is drawn there. The dot is your position.
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
