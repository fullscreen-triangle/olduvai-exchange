import { methodNotAllowed, fail, notImplemented } from "@/lib/api/upstream";

/**
 * External context feeds: weather, traffic, prices, advisories.
 *
 * # Why these are one route and not four
 *
 * They share the property that makes them different from every other route in this folder:
 * **the data does not come from `olduvai-server`.** It comes from third parties. That means
 * they share a single obligation, and putting them in one file makes it impossible to
 * satisfy it in three places and forget the fourth.
 *
 * # ⭐ The obligation: an external reading is `Asserted`, never `Observed`
 *
 * Note 30 §5.3 carries `source` on every value — the observed/asserted distinction from
 * note 27 §4. A third-party forecast is something *someone else says*, not something this
 * exchange measured. If a feed reading entered a participant's entry as `Observed`, it
 * would carry evidential weight the exchange never earned, and the gate would rank on it.
 *
 * So every feed here is declared `Asserted` at the boundary, in `FEEDS` below, and the
 * declaration sits next to the fetch rather than in the consumer — a rule enforced where
 * the data enters is a rule that cannot be forgotten downstream.
 *
 * ⚠️ **A feed reading is context for a human decision, not evidence in a coalition.** These
 * inform the person reading the dashboard. They must not silently become fields.
 *
 * # Why no provider is wired
 *
 * Each feed needs a provider key, and a provider decision is a research decision here:
 * which forecast, at what spatial resolution, is a question about what the exchange can
 * verify, not a question about which SDK is convenient. Wiring one now would answer it by
 * accident. Keys are read from the environment when that decision is made — never
 * committed, per the repository rule on `.env*.local`.
 */

/**
 * The declared feeds.
 *
 * `source` is fixed to `asserted` for all of them, deliberately and without exception —
 * see above. `unit` is stated up front because note 30 §2.1 makes the unit a compile-time
 * obligation in the core; a feed that arrives unitless cannot be reconciled with it later.
 */
const FEEDS = {
  weather: {
    label: "Weather",
    source: "asserted",
    units: { temperature: "degC", rainfall: "mm", wind: "m/s" },
    envKey: "OLDUVAI_WEATHER_API_KEY",
    note: "Forecast for the holding's stated location. Precision is bounded by the provider's grid resolution, which is coarser than a field.",
  },
  traffic: {
    label: "Traffic",
    source: "asserted",
    units: { delay: "s", distance: "m" },
    envKey: "OLDUVAI_TRAFFIC_API_KEY",
    note: "Route conditions on haulage corridors. Relevant to transport legs, but a leg's cost is settled by the ledger, not by a live estimate.",
  },
  prices: {
    label: "Grain prices",
    source: "asserted",
    units: { price: "USD/t" },
    envKey: "OLDUVAI_PRICES_API_KEY",
    note: "⚠️ Reference prices from external markets. These are NOT exchange prices. The exchange derives price from assembled coalitions (notes/05, 07); a reference quote is context, and treating it as a clearing price would import an outside market's structure.",
  },
  advisories: {
    label: "Advisories",
    source: "asserted",
    units: {},
    envKey: "OLDUVAI_ADVISORY_API_KEY",
    note: "Agronomic and phytosanitary notices. Asserted by the issuing body; the exchange does not verify them.",
  },
};

export default async function handler(req, res) {
  if (methodNotAllowed(req, res, "GET")) return;

  const { feed } = req.query;
  const spec = FEEDS[feed];

  if (!spec) {
    return fail(
      res,
      404,
      "unknown_feed",
      `No feed named "${feed}". Known feeds: ${Object.keys(FEEDS).join(", ")}.`
    );
  }

  // The provider key is absent, which is the expected state. Returning the feed's
  // declaration anyway lets the page render its real units, its real provenance, and the
  // reason it is empty — rather than a spinner that resolves to nothing.
  if (!process.env[spec.envKey]) {
    return notImplemented(res, {
      blockedBy: "no-provider",
      note: spec.note,
      // Shape-compatible with a live response, so the view renders one way, not two.
      declaration: {
        feed,
        label: spec.label,
        source: spec.source,
        units: spec.units,
        readings: [],
      },
    });
  }

  // ⚠️ When a provider is chosen, the fetch goes here — and whatever it returns must be
  // stamped `source: spec.source` on the way out. Do not let a provider's own confidence
  // field become `source`; the provider is asserting, whatever it calls itself.
  return notImplemented(res, {
    blockedBy: "no-provider",
    note: "A provider key is present but no provider client is implemented.",
  });
}
