/**
 * What a market for a commodity looks like, from published trade statistics.
 *
 * # ⭐ Why this exists, and what it is not
 *
 * Asked *"where can I sell 3t of chamomile tea leaves"*, the composer returned the cohesion
 * gate and nothing else. The gate was correct — `/v1/query` matches participants against the
 * occupied trie, that path is gated on note 30 §7 step 3, and `crates/olduvai-server/src/main.rs`
 * is explicit that wiring it to placeholder logic would create the second implementation this
 * architecture exists to prevent. **That gate is not relaxed here and nothing below touches it.**
 *
 * ⚠️ But a participant asking that question was told the truth and given nothing, three times
 * over — chamomile, maize and wheat all returned the same sentence, because the commodity never
 * reached anything that could distinguish them. A refusal that is identical for every input is
 * indistinguishable from a broken feature, and it was reported as one.
 *
 * ⭐ So this answers the half of the question that does not need the trie: **not *which
 * participant will buy this*, which is matching, but *what does the market for this commodity
 * look like*, which is a published statistic.** UN Comtrade, keyless, the same endpoint and the
 * same parsing rules `lib/ai/sources.js` already uses and measured.
 *
 * # ⚠️ The three exclusions, checked one at a time
 *
 * `README.md` excludes AI from the address path, from ranking, and from deterministic synthesis.
 *
 *   - **Address path** — untouched. No coordinate enters this file, no `Address` is encoded,
 *     nothing is looked up by cell. The commodity is matched by name against a declared table.
 *   - **Ranking** — the exclusion is on ordering *participants*. This orders **countries by
 *     their own reported import tonnage**, which is a published figure sorted by itself.
 *     No participant appears in this file's output and none could.
 *   - **Synthesis** — there is no model in this file. The numbers are the provider's, the
 *     ordering is arithmetic, and the caveats are authored constants. It runs with Ollama
 *     stopped, which is the state the deployed server is actually in.
 *
 * # ⭐ Structured rows, where `sources.js` returns prose
 *
 * `SOURCES.trade` returns `lines` because its consumer is a prompt, and a sentence with its
 * unit already inside it survives a 3b model. This consumer is a table in a browser, so it gets
 * `{country, tonnes, usd}` and the page formats it. ⚠️ The duplicate-collapsing rules are
 * duplicated here rather than shared, and that is deliberate: they are *measurements of one
 * endpoint's quirks* (`customsCode`, `motCode`, `partnerCode`, revision duplicates), and the two
 * callers slice different fields out of the same rows. Extracting a shared parser would have
 * made one function serve a prompt and a table, and the caveats each needs are not the same.
 */

import { COMMODITY_TABLE, M49 } from "@/lib/commodities";

/**
 * ⚠️ **Longer than `sources.js`'s 15 s, and measured rather than guessed.**
 *
 * Three consecutive calls on 2026-08-16: chamomile 9,461 ms, maize 12,375 ms, wheat 15,989 ms.
 * Wheat exceeded the 15 s bound `SLOW_TIMEOUT_MS` sets, which means the largest commodities —
 * the ones most likely to be asked about — were the ones timing out.
 *
 * ⭐ 25 s is above the slowest measurement with room, and below the 30 s a browser fetch will
 * sit through before a person assumes the page is broken. ⚠️ It is still a bound and it can
 * still be hit; the caller reports a timeout as a timeout and does not fall back to a cache.
 */
const TIMEOUT_MS = 25000;

/** How many importing countries the survey reports. */
const TOP_N = 8;

/**
 * Resolve free text to a declared commodity.
 *
 * ⭐ **Declared table, longest-match, no model and no fuzzy distance.** A participant types
 * "3 tonnes of chamomile tea leaves"; the table holds `chamomile`. Substring containment finds
 * it. ⚠️ Longest match first matters: "green tea" and "tea" are both in the table, and a
 * shortest-first scan would resolve *"green tea"* to black tea's HS code and answer a question
 * about the wrong commodity with total confidence.
 *
 * ⚠️ Returns `null` rather than a nearest guess. An HS code is the whole answer — the wrong one
 * returns a real, sourced, entirely irrelevant market — so declining is the only safe miss.
 */
export function resolveCommodity(text) {
  if (typeof text !== "string") return null;
  const hay = text.toLowerCase();
  const names = Object.keys(COMMODITY_TABLE).sort((a, b) => b.length - a.length);
  for (const name of names) {
    if (hay.includes(name)) return { name, ...COMMODITY_TABLE[name] };
  }
  return null;
}

/**
 * Quantity in tonnes, if the participant stated one.
 *
 * ⭐ Read so the answer can say what *this* consignment is against the market, rather than
 * printing a market report that ignores what was typed. ⚠️ Absent is a normal outcome and not
 * an error — the survey stands on its own and simply omits the comparison.
 *
 * ⚠️ Only `t`/`tonne`/`tonnes`/`kg` are recognised, and `kg` is converted. No bags, no bushels,
 * no crates: those are commodity-specific conversions and a wrong one would silently misstate
 * the consignment by an order of magnitude.
 */
export function resolveQuantity(text) {
  if (typeof text !== "string") return null;
  const t = text.toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(t|tonnes?|tons?|kgs?|kilograms?)\b/);
  if (!t) return null;
  const n = Number(t[1].replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return t[2].startsWith("k") ? n / 1000 : n;
}

/**
 * Reported imports of one commodity, by country, for its pinned year.
 *
 * Returns `{ok: true, ...}` or `{ok: false, reason}`. ⚠️ Never throws — same contract as
 * `lib/api/elevation.js` and `lib/ai/sources.js`, for the same reason: a failed source is a
 * stated absence, not a stack trace in a route.
 */
export async function fetchMarket(commodity) {
  const url =
    `https://comtradeapi.un.org/public/v1/preview/C/A/HS` +
    `?period=${commodity.year}&partnerCode=0&cmdCode=${commodity.hs}&flowCode=M`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let body;
  try {
    const r = await fetch(url, { headers: { accept: "application/json" }, signal: controller.signal });
    if (!r.ok) return { ok: false, reason: `the trade statistics service answered HTTP ${r.status}` };
    body = await r.json();
  } catch (e) {
    return {
      ok: false,
      reason:
        e?.name === "AbortError"
          ? `the trade statistics service did not answer within ${TIMEOUT_MS / 1000} seconds`
          : "the trade statistics service could not be reached",
    };
  } finally {
    clearTimeout(timer);
  }

  const rows = Array.isArray(body?.data) ? body.data : [];
  if (!rows.length) return { ok: false, reason: "the trade statistics service returned no records" };

  /**
   * ⚠️ **The rows double-count, and summing them raw inflates every figure severalfold.**
   * Each reporter appears once per customs procedure (`C00` is the total; `C01`/`C04` are
   * subsets *of* it) and once per classification revision (H6/H5/H3). Measured on HS 121190:
   * 500 raw rows → 22 reporters after this filter, one row each.
   */
  const totals = new Map();
  for (const x of rows) {
    if (x.customsCode !== "C00" || x.motCode !== 0 || x.partnerCode !== 0) continue;
    if (typeof x.netWgt !== "number" || x.netWgt <= 0) continue;
    const prev = totals.get(x.reporterCode);
    if (!prev || x.netWgt > prev.netWgt) totals.set(x.reporterCode, x);
  }

  /**
   * ⚠️ **An unresolvable M49 code is dropped, not printed.**
   *
   * `sources.js` records why at length: `"reporter 48: 523 tonnes"` is honest in isolation, and
   * a model restating it wrote *"you can sell to reporter 48"* — a fabricated country with a real
   * tonnage beside it. There is no model on this path, but the same string in a table reads as a
   * place name to a person just as readily. The count of dropped rows is reported, so the
   * omission is visible rather than silent.
   */
  const named = [...totals.values()].filter((x) => M49[x.reporterCode]);
  const unnamed = totals.size - named.length;
  const top = named.sort((a, b) => b.netWgt - a.netWgt).slice(0, TOP_N);

  if (!top.length) return { ok: false, reason: "the records returned carried no net weight" };

  const importers = top.map((x) => ({
    country: M49[x.reporterCode],
    tonnes: Math.round(x.netWgt / 1000),
    usd: typeof x.primaryValue === "number" ? x.primaryValue : null,
  }));

  /**
   * ⚠️ **Weight-weighted, not a mean of per-country ratios**, and the label says "implied".
   *
   * A mean would give a reporter importing 25 kg the same influence as one importing 11,000
   * tonnes, so one small oddly-priced consignment would move the number a seller prices against.
   * It is a quotient of two reported aggregates, mixing grades, contract terms and freight —
   * not a quote, and the page must not print it as one.
   */
  const priced = top.filter((x) => typeof x.primaryValue === "number" && x.netWgt > 0);
  let impliedUsdPerTonne = null;
  if (priced.length) {
    const value = priced.reduce((a, x) => a + x.primaryValue, 0);
    const tonnes = priced.reduce((a, x) => a + x.netWgt, 0) / 1000;
    impliedUsdPerTonne = Math.round(value / tonnes);
  }

  return {
    ok: true,
    commodity: { name: commodity.name, hs: commodity.hs, label: commodity.label, year: commodity.year },
    importers,
    impliedUsdPerTonne,
    /**
     * ⚠️ Reported so the page can say how partial this is. The public preview truncates at 500
     * rows, and the truncation is close to alphabetical by reporter code rather than a top
     * slice — so these are the largest **among the countries returned**, never the world's
     * largest importers. That distinction travels with the numbers everywhere they are shown.
     */
    reportersReturned: named.length,
    reportersUnnamed: unnamed,
    source: "asserted",
    provider: "UN Comtrade public preview",
  };
}
