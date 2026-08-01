import RailPage from "@/components/RailPage";

/**
 * Elevation and slope under a holding.
 *
 * ⚠️ Note 31 item 2 points at `three-geo` for this. No 3D renderer is mounted here, and that
 * is a decision rather than an omission — see `components/EarthViewer.js` for the same
 * argument made once already. What a participant needs from terrain is the soil/elevation
 * relation at their location and the resolution it was measured at; a rotatable mesh is a
 * different product. If a renderer earns its place later it goes *inside* this page, below a
 * statement of what the reading constrains.
 */
export default function Page() {
  return <RailPage />;
}
