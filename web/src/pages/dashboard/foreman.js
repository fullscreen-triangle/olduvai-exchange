import RailPage from "@/components/RailPage";
import ForemanRecord from "@/components/ForemanRecord";

/**
 * A participant's own record of their own activity.
 *
 * ⭐ Advisory to one person, checked for coherence against itself, carrying no weight on the
 * exchange — *"If a farmer lies, they will get wrong results and thats it."* Platform
 * guarantees attach at sale, which is why this page needs no provenance guard.
 *
 * ⚠️ The render-prop child is what draws the record. Without it `RailPage` calls
 * `children?.(state.data)` on nothing and the page stops at its declaration table — the bug
 * `ReadingsList` documents, of which this was the last un-fixed instance.
 */
export default function Page() {
  return <RailPage>{(data) => <ForemanRecord data={data} />}</RailPage>;
}
