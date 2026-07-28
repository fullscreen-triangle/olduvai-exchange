/**
 * The two rails, declared once.
 *
 * # Why a manifest rather than JSX in each sidebar
 *
 * The rails, the pages they point at, and the API routes those pages call have to agree.
 * Written out three times they agree until someone edits one of them. Written once, a page
 * can look up its own entry and render its own title, its own gate, and its own blocked
 * reason from the same record the sidebar linked to.
 *
 * # ⭐ The split is not cosmetic
 *
 * **Left is context: what is true around a participant.** Their own entry, and the external
 * world — weather, roads, reference prices. Read, not acted on. Per `notes/27` §4 none of
 * it is observed by the exchange, so none of it carries evidential weight.
 *
 * **Right is process: what is happening to a consignment.** Transport, payment, monitoring,
 * and the graph the whole thing is addressed in. These are views onto coalitions and the
 * ledger — the exchange's own record.
 *
 * Someone reading the left rail is orienting. Someone reading the right rail is tracking
 * something already in motion. A single merged menu would have flattened that, and the two
 * carry different evidential weight, which is not a distinction to bury in a list.
 */

/** Where each rail's data comes from — see `pages/api/_upstream.js`. */
export const LEFT_RAIL = [
  {
    href: "/dashboard/profile",
    label: "Profile",
    blurb: "Your entry, address, and per-field provenance",
    api: "/api/participants/me",
    blockedBy: "participant-identity",
  },
  {
    href: "/dashboard/weather",
    label: "Weather",
    blurb: "Forecast for your stated location",
    api: "/api/feeds/weather",
    blockedBy: "no-provider",
  },
  {
    href: "/dashboard/traffic",
    label: "Traffic",
    blurb: "Conditions on haulage corridors",
    api: "/api/feeds/traffic",
    blockedBy: "no-provider",
  },
  {
    href: "/dashboard/prices",
    label: "Grain prices",
    blurb: "External reference quotes — not exchange prices",
    api: "/api/feeds/prices",
    blockedBy: "no-provider",
  },
  {
    href: "/dashboard/advisories",
    label: "Advisories",
    blurb: "Agronomic and phytosanitary notices",
    api: "/api/feeds/advisories",
    blockedBy: "no-provider",
  },
];

export const RIGHT_RAIL = [
  {
    href: "/dashboard/transport",
    label: "Transport",
    blurb: "Haulage legs and their provenance",
    api: "/api/process/transport",
    blockedBy: "cohesion-gate",
  },
  {
    href: "/dashboard/payments",
    label: "Payments",
    blurb: "Settlement against the append-only ledger",
    api: "/api/process/payments",
    blockedBy: "gate-and-ledger",
  },
  {
    href: "/dashboard/monitoring",
    label: "Monitoring",
    blurb: "Growing and handling, as recorded at source",
    api: "/api/process/monitoring",
    blockedBy: "sealed-sensors",
  },
  {
    href: "/dashboard/graph",
    label: "Knowledge graph",
    blurb: "The occupied trie this is all addressed in",
    api: "/api/process/graph",
    blockedBy: "cohesion-gate",
  },
  {
    href: "/dashboard/ledger",
    label: "Ledger",
    blurb: "Hash-chained assembly record",
    api: "/api/ledger",
    blockedBy: "gate-and-ledger",
  },
];

/**
 * Human-readable gates.
 *
 * ⭐ A blocked page says *which* gate blocks it and *why that gate exists*. "Coming soon"
 * would be a smaller lie than fake data but a lie all the same — it implies the only thing
 * missing is time. What is actually missing is a measurement that might come back negative
 * and change the design.
 */
export const GATES = {
  "cohesion-gate": {
    title: "Behind the cohesion gate",
    detail:
      "The engine is gated on the cohesion test: if the intrinsic triple does not cluster, everything built on it is built on sand. That test has not been run, and it is allowed to fail.",
    reference: "notes/30-programming-structure.md §7 step 3",
  },
  "gate-and-ledger": {
    title: "No assemblies recorded",
    detail:
      "The ledger is written per-leg at coalition assembly, because the assembly path is unrecoverable afterwards. Nothing has been assembled, so there is nothing to show.",
    reference: "notes/30-programming-structure.md §7 step 5",
  },
  "participant-identity": {
    title: "No participant service",
    detail:
      "A participant is a ledger identity rather than a user row — every field they confirm is attributed and appended. Registration is not built.",
    reference: "notes/30-programming-structure.md §5.1",
  },
  "sealed-sensors": {
    title: "No sealed readings",
    detail:
      "A process reading is only evidence if it is sealed at the source. An unsealed reading is an assertion by whoever entered it, and would carry no evidential weight.",
    reference: "notes/19-sealed-sensors.md",
  },
  "no-provider": {
    title: "No provider configured",
    detail:
      "This feed needs an external provider, and choosing one is a research decision about what can be verified at what resolution — not a matter of picking an SDK.",
    reference: "notes/30-programming-structure.md §5.3",
  },
};

/** Look up a rail entry by pathname, for a page to describe itself. */
export function findEntry(href) {
  return [...LEFT_RAIL, ...RIGHT_RAIL].find((e) => e.href === href) ?? null;
}
