import RailPage from "@/components/RailPage";
import ReadingsList from "@/components/ReadingsList";

/**
 * What passes overhead, propagated from published elements.
 *
 * ⭐ The propagation is `olduvai-core::orbit`, not `satellite.js` in the browser as note 31
 * item 2 suggests. That is the "public feed in, our computation out" rule: the element set
 * and the timestamp go in the ledger, so the overpass is recomputable by anyone. A figure
 * lifted from a third party's globe widget would not be.
 */
export default function Page() {
  return <RailPage>{(data) => <ReadingsList data={data} label="overpass" />}</RailPage>;
}
