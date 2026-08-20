import RailPage from "@/components/RailPage";
import TrafficList from "@/components/TrafficList";

/**
 * Renders from the manifest entry for this route (`src/lib/navigation.js`) and from
 * whatever its endpoint returns — which today is the gate blocking it. See
 * `components/RailPage.js` for why the blocked state is designed rather than defaulted.
 */
export default function Page() {
  return <RailPage>{(data) => <TrafficList data={data} />}</RailPage>;
}
