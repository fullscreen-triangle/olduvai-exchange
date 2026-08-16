import RailPage from "@/components/RailPage";
import TerrainGrid from "@/components/TerrainGrid";

/**
 * Ground elevation under a holding.
 *
 * # ⭐ What replaced the objection
 *
 * This page previously said, in full: *"Note 31 item 2 points at `three-geo` for this. No 3D
 * renderer is mounted here, and that is a decision rather than an omission... What a participant
 * needs from terrain is the soil/elevation relation at their location and the resolution it was
 * measured at; a rotatable mesh is a different product."*
 *
 * ⚠️ The objection was right and the page was still empty, which is the failure the user named:
 * *"if you do not like some idea, then you should provide an alternative."* A rejection that
 * ships nothing is not a decision, it is a blank page with a footnote.
 *
 * ⭐ So the alternative is built, and it is what that paragraph asked for: **the elevation
 * relation at their location, and the resolution it was measured at.** Open-Meteo's dedicated
 * `/v1/elevation` endpoint, keyless, at a DEM step measured at ~90 m rather than read off a
 * documentation page — see `lib/api/elevation.js` for the row walk that established it.
 *
 * # ⚠️ Still no rotatable mesh, and now for a testable reason
 *
 * Measured at −17.8252, 31.0335: 81 samples spanning 2.7 km returned 28 distinct heights across
 * **29 m of relief**. Rendered to scale that is a plane tilted by about half a degree. The
 * vertical exaggeration needed to make it *look* like terrain — 20×, 50× — is a number chosen to
 * produce an impression, which is exactly what the original objection was against. The 2D drawing
 * states the same 28 heights and invents neither a viewing angle nor a scale factor.
 *
 * ⚠️ 29 m is this holding, not a general claim. Somewhere with a real escarpment inside 2.7 km
 * would return relief that survives a to-scale mesh, and the argument above would not apply there.
 * The colour ramp already stretches to whatever range the samples carry, so both cases are drawn
 * honestly by the same renderer.
 *
 * ⭐ The grid is a **render-prop child**, called by `RailPage` only when the response is `ok`, so
 * the renderer never handles a blocked payload. ⚠️ Mounted *below* the declaration deliberately:
 * a reader should be told the sampling step, the DEM step and the provenance before they look at
 * a coloured hillside, or the drawing gets read as a survey of their field.
 */
export default function Page() {
  return <RailPage>{(data) => <TerrainGrid data={data} />}</RailPage>;
}
