import RailPage from "@/components/RailPage";

/**
 * The fused estimate — what the four observation rails combine into.
 *
 * ⭐ This page is not in note 31. The note lists Satellites, Flights, GPS and Terrain as four
 * separate map pages; it does not list the thing they combine into, and that is the page that
 * makes the other four cohere. See `pages/api/position.js`.
 */
export default function Page() {
  return <RailPage />;
}
