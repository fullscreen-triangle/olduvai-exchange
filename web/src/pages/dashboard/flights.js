import RailPage from "@/components/RailPage";
import ReadingsList from "@/components/ReadingsList";

/**
 * Tracks crossing the area.
 *
 * ⭐ *"Aircrafts are not a positioning check, but another gps instrument... the fact that the
 * aeroplane has flown above a point, means that, we now have a gps track in that direction,
 * thats all."* This page shows a direction, not a place, and the declaration says so.
 */
export default function Page() {
  return <RailPage>{(data) => <ReadingsList data={data} label="track" />}</RailPage>;
}
