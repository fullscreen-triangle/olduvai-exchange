import RailPage from "@/components/RailPage";
import WeatherGrid from "@/components/WeatherGrid";

/**
 * Renders from the manifest entry for this route (`src/lib/navigation.js`) and from
 * whatever its endpoint returns — which is now a live grid from Open-Meteo, or the gate
 * explaining what is missing. See `components/RailPage.js` for why the blocked state is
 * designed rather than defaulted.
 *
 * ⭐ The grid is a **render-prop child**, called by `RailPage` only when the response is
 * `ok` — so the renderer never has to handle a blocked or errored payload, and the gate
 * copy stays in one place. ⚠️ It is mounted *below* the declaration, deliberately: a reader
 * should have been told the resolution and the provenance before they look at cells drawn
 * at that resolution, or the drawing gets read as a measurement of their field.
 */
export default function Page() {
  return <RailPage>{(data) => <WeatherGrid data={data} />}</RailPage>;
}
