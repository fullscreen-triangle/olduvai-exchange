import RailPage from "@/components/RailPage";
import ReadingsList from "@/components/ReadingsList";

/**
 * Fixes recorded on a handset or receiver, each with its stated accuracy.
 *
 * ⚠️ The most ordinary-looking of the observation rails, and the one most likely to be
 * mistaken for the authoritative one. It is not: it is one more noisy source, weighted by the
 * accuracy the device claimed and floored at one metre (note 33 §7).
 */
export default function Page() {
  return <RailPage>{(data) => <ReadingsList data={data} label="GPS" />}</RailPage>;
}
