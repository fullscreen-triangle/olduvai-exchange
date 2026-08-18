/**
 * The market for a commodity, drawn as a table of reported imports.
 *
 * # ⭐ What this is, and the sentence it must never let a reader form
 *
 * These are **countries that reported importing this good**, from UN Comtrade. They are not
 * buyers on this exchange, they have made no offer, and no one here has been matched to them.
 * The composer returns this *alongside* a refusal, not instead of one — see `api/query.js` —
 * and the heading below repeats that in the participant's line of sight rather than leaving it
 * three paragraphs up where a person reading a table will not look.
 *
 * ⚠️ A table of country names beside tonnages reads as a shortlist. That is the misreading this
 * component is arranged against: the caveat sits above the rows, not under them.
 *
 * # ⚠️ Why the row count is printed even though it is unflattering
 *
 * The public preview truncates at 500 rows, and the truncation is near-alphabetical by reporter
 * code rather than a top slice. So these are the largest importers **among the countries that
 * came back**, which is not the same as the largest importers. `reportersReturned` is the only
 * thing on the page that lets a reader see that, so it is stated plainly and not tucked into a
 * tooltip.
 *
 * ⭐ `reportersUnnamed` is shown for the same reason. `market.js` drops reporters whose M49 code
 * this exchange cannot resolve, because `"reporter 48: 523 tonnes"` reads as a place to a person
 * exactly as it did to a model. Dropping them silently would understate the market by an unknown
 * amount; saying how many were dropped costs one clause.
 */

/**
 * ⚠️ Thousands separators only — no unit scaling, no "6.3M t".
 *
 * An abbreviated figure is read as approximate, and these are the provider's reported values to
 * the tonne. A reader comparing their own three tonnes against a market needs to see the digits.
 */
function tonnes(n) {
  return typeof n === "number" ? n.toLocaleString("en-US") : "—";
}

export default function MarketSurvey({ read, market }) {
  /**
   * ⚠️ The unrecognised-commodity case, which is a normal outcome rather than an error.
   *
   * `resolveCommodity` declines instead of guessing a nearest match, because a wrong HS code
   * returns a real, sourced, entirely irrelevant market. ⭐ Listing the table tells a participant
   * who typed "sorghum" that the gap is this exchange's declarations and not their phrasing —
   * which the single identical sentence they used to get could not distinguish.
   */
  if (!market?.ok) {
    return (
      <div className="mt-5 border-t border-border/60 pt-4">
        <p className="text-sm leading-relaxed text-muted">
          {market?.reason ?? "No market statistics were retrieved."}
        </p>
        {Array.isArray(market?.known) && market.known.length > 0 && (
          <p className="mt-2 text-[11px] leading-relaxed text-muted/60">
            Declared here: {market.known.join(", ")}.
          </p>
        )}
      </div>
    );
  }

  const { commodity, importers, impliedUsdPerTonne, reportersReturned, reportersUnnamed } = market;

  return (
    <div className="mt-5 border-t border-border/60 pt-4">
      <p className="mb-1 text-[11px] uppercase tracking-widest text-muted/70">
        Reported imports · {commodity.year}
      </p>

      {/* ⭐ Above the table, deliberately. A reader who meets this after studying eight country
          names has already formed the wrong sentence, and a caveat cannot un-form it. */}
      <p className="mb-3 text-sm leading-relaxed text-muted">
        Countries that reported importing {commodity.label} (HS {commodity.hs}). ⚠️ These are
        published customs statistics, not buyers on this exchange — nobody below has made an
        offer, and you have not been matched to any of them.
      </p>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-widest text-muted/60">
            <th className="pb-1 text-left font-normal">Reporter</th>
            <th className="pb-1 text-right font-normal">Tonnes</th>
          </tr>
        </thead>
        <tbody>
          {importers.map((row) => (
            <tr key={row.country} className="border-t border-border/40">
              <td className="py-1.5 text-light/90">{row.country}</td>
              <td className="py-1.5 text-right tabular-nums text-light/90">
                {tonnes(row.tonnes)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ⚠️ Labelled "implied" every time it is shown, and never "price". It is one aggregate
          divided by another — mixing grades, contract terms and freight across a whole year —
          so it cannot be quoted to a counterparty. `market.js` records why it is weight-weighted
          rather than a mean of per-country ratios. */}
      {typeof impliedUsdPerTonne === "number" && (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Implied unit value across those reporters:{" "}
          <span className="tabular-nums text-light/90">
            ${impliedUsdPerTonne.toLocaleString("en-US")}
          </span>{" "}
          per tonne. ⚠️ A quotient of reported value and weight, not a price — it mixes grades,
          contract terms and freight, and no one is offering it.
          {typeof read?.tonnes === "number" && (
            <>
              {" "}
              Against the {read.tonnes} t you described, that is on the order of{" "}
              <span className="tabular-nums text-light/90">
                ${Math.round(impliedUsdPerTonne * read.tonnes).toLocaleString("en-US")}
              </span>
              , before grade, freight or any buyer.
            </>
          )}
        </p>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-muted/50">
        {reportersReturned} reporters returned by the {market.provider}, which truncates its
        response — so these are the largest among the countries returned, not the largest
        importers.
        {reportersUnnamed > 0 &&
          ` ${reportersUnnamed} further reporter${reportersUnnamed === 1 ? "" : "s"} came back ` +
            `under a country code this exchange does not resolve, and ${
              reportersUnnamed === 1 ? "was" : "were"
            } left out rather than printed as a number.`}
      </p>
    </div>
  );
}
