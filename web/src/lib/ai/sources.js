/**
 * The sources `ground` can actually reach.
 *
 * # ⚠️ What this file is fixing
 *
 * `stages.js` describes `ground` as *"Retrieve reference material that bears on the
 * question"*, and until now it retrieved nothing. There was no HTTP client anywhere under
 * `lib/ai/`, and a grep of every route in `pages/api` for an outbound `fetch` returned one
 * match — a comment about cookies. The stage ran a model call, asked it to *list what would
 * have to be true*, and passed that list to `compose` as though it were retrieved material.
 *
 * ⭐ So asked *"I have 3t of chamomile tea leaves, where can I sell them?"*, the pipeline had
 * the participant's coordinates and nothing else, and wrote about the coordinates. That is not
 * a prompt defect and no prompt fix reaches it. It is a retrieval stage with no retrieval.
 *
 * `notes/31-dashboard-design.md` line 4 asked for staged retrieval and lines 560–639 carry a
 * complete, working, **keyless** Open-Meteo implementation. The provider was chosen before I
 * started; the "which provider is a research decision" comment in `pages/api/feeds/[feed].js`
 * invented a question that had already been answered.
 *
 * # ⭐ Everything here is `asserted`, without exception
 *
 * `pages/api/feeds/[feed].js` states the rule and it survives intact: a third-party reading is
 * *something someone else says*, not something this exchange measured. Every record returned
 * from here carries `source: "asserted"`, set by `fetchSource` rather than by each source, so
 * a source cannot forget it. Nothing retrieved here may enter a participant's entry as
 * `Observed`, and nothing here is evidence in a coalition — it is context for a person reading
 * a sentence.
 *
 * ⚠️ **This retrieval never touches exchange records.** No trie, no other participant's entry,
 * no ranking of anyone. `stages.js` is explicit that a conventional RAG *is* a ranker and that
 * ranking is one of the three exclusions in `README.md`. These are public reference sources —
 * prices, trade volumes, weather, plant chemistry — and the engine addresses none of them.
 *
 * # ⚠️ Keyless first, and that is a design constraint rather than a convenience
 *
 * Every source below runs with no credential. A keyed source is one the participant cannot
 * reproduce and one that stops working when a key lapses, and a research tool whose evidence
 * evaporates on an expired token is worse than one with fewer sources. Keyed providers can be
 * added — `envKey` is honoured — but the keyless set must stay sufficient on its own.
 */

/**
 * ⭐ The commodity table and the M49 map moved to `lib/commodities.js`.
 *
 * ⚠️ Moved rather than copied. `lib/market.js` now answers the composer's consignment box from
 * the same Comtrade endpoint, and two copies of an HS table would eventually disagree — at which
 * point one word returns a real, sourced market for the wrong good, with nothing in the answer
 * saying which table was stale. The doc comments explaining why each is *declared* rather than
 * derived travelled with them.
 */
import { COMMODITY_TABLE as COMMODITIES, countryName, M49 } from "@/lib/commodities";

/** ⚠️ Short. `ground` runs inline in a request that is already slow; a hung source is worse
 *  than an absent one, and a source that misses this window is reported as missed. */
const TIMEOUT_MS = 6000;

/**
 * ⭐ A longer bound, for sources measured to need one.
 *
 * # ⚠️ Why this is not just a bigger `TIMEOUT_MS`
 *
 * 6 s was picked to keep a hung source from lengthening a request that is already slow, and for
 * Open-Meteo (176 ms), the World Bank (113 ms) and PubChem (~400 ms each) it is generous. UN
 * Comtrade is not like them. Timed three times in a row from this machine it returned in
 * **6594 ms, 4438 ms and 1644 ms** — straddling the bound, so the *same question* dropped its
 * only substantive source about half the time.
 *
 * ⚠️ That failure is worse than it looks in the trace. `ground` reported "UN Comtrade did not
 * answer (timed out)" and `compose` wrote a tea answer with no numbers in it — indistinguishable,
 * to the participant, from a commodity this exchange has no data for. A bound that converts a
 * slow-but-working source into an apparent absence is worse than waiting, because the participant
 * acts on the absence.
 *
 * ⭐ So the bound is per source rather than global. Raising the *global* value would give the
 * same slack to sources that have never needed it, which is how a hung host quietly becomes a
 * 15 s stall on a request whose whole budget is being argued over elsewhere in this codebase.
 *
 * ⚠️ **Raised 15 s → 25 s on 2026-08-18, because 15 s was measured too low.** Three timed calls
 * to this same endpoint: chamomile 9,461 ms, maize 12,375 ms, wheat **15,989 ms**. Wheat exceeded
 * the bound — meaning the *largest* commodities, the ones most likely to be asked about, were the
 * ones being converted into an apparent absence. That is precisely the failure the paragraph
 * above describes, and the constant chosen to prevent it was itself causing it.
 *
 * ⚠️ 25 s, not 30: this still has to fail eventually, and `fetchAll` runs the plan concurrently
 * so a slow Comtrade does not delay the other three. `lib/market.js` uses the same 25 s for the
 * same endpoint and records the same measurements.
 */
const SLOW_TIMEOUT_MS = 25000;

/**
 * ⭐ One fetch, bounded, never throwing.
 *
 * ⚠️ A source that fails must degrade to a *stated absence*, exactly as `specialise` does when
 * HuggingFace is unreachable. `facts.js` makes the same argument for the engine: silence lets
 * the model infer the thing was checked and found empty, and "we could not ask" is a different
 * claim from "there is nothing there".
 */
async function get(url, { headers, timeout = TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const r = await fetch(url, {
      headers: { accept: "application/json", ...headers },
      signal: controller.signal,
    });
    if (!r.ok) return { ok: false, reason: `HTTP ${r.status}` };
    return { ok: true, body: await r.json() };
  } catch (e) {
    return { ok: false, reason: e?.name === "AbortError" ? "timed out" : "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The registry.
 *
 * Each source declares:
 *   - `label`     — what a person calls it, used verbatim in the citation line.
 *   - `about`     — one line the planner reads when deciding whether this source is relevant.
 *   - `needs`     — parameter names the planner must supply. A missing one skips the source
 *                   with a reason rather than fetching a malformed URL.
 *   - `envKey`    — optional. Absent means keyless, which is the default and the point.
 *   - `fetch`     — returns `{ok, lines}` — **sentences**, not objects.
 *
 * ⭐ `fetch` returns prose because the consumer is a prompt. A JSON blob handed to a 3b model
 * gets summarised badly and half-transcribed; a sentence with its unit already in it survives
 * the trip. This is the same reasoning `facts.js` gives for rendering `Estimate` as sentences.
 */
export const SOURCES = {
  /**
   * ⭐ Open-Meteo. `notes/31` lines 560–639 already used this, keyless, at line 610.
   *
   * ⚠️ Not a substitute for the `weather` feed's grid. That note draws a 216-point field for a
   * map; this reads one point for a sentence. Both are the same provider and the same
   * provenance, and neither is an observation of the participant.
   */
  weather: {
    label: "Open-Meteo",
    about: "Current weather and 7-day forecast at a coordinate: temperature, rainfall, wind, humidity.",
    needs: ["latitude", "longitude"],
    async fetch({ latitude, longitude }) {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
        `&forecast_days=7&timezone=auto`;

      const r = await get(url);
      if (!r.ok) return { ok: false, reason: r.reason };

      const c = r.body?.current ?? {};
      const d = r.body?.daily ?? {};
      const lines = [];

      if (typeof c.temperature_2m === "number") {
        lines.push(
          `Current conditions at ${latitude}, ${longitude}: ${c.temperature_2m} degrees Celsius, ` +
            `${c.relative_humidity_2m ?? "unknown"}% relative humidity, ` +
            `${c.precipitation ?? 0} mm precipitation, wind ${c.wind_speed_10m ?? "unknown"} m/s.`
        );
      }

      // ⚠️ Summarised to a range and a total rather than transcribed day by day. Seven days of
      // three fields is 21 numbers, and a model handed 21 numbers under a token cap will
      // reproduce a subset of them and call it a forecast.
      if (Array.isArray(d.precipitation_sum) && d.precipitation_sum.length) {
        const total = d.precipitation_sum.reduce((a, b) => a + (b ?? 0), 0);
        const highs = (d.temperature_2m_max ?? []).filter((x) => typeof x === "number");
        const lows = (d.temperature_2m_min ?? []).filter((x) => typeof x === "number");
        lines.push(
          `Over the next 7 days: ${total.toFixed(1)} mm total precipitation` +
            (highs.length
              ? `, daily highs ${Math.min(...highs)} to ${Math.max(...highs)} degrees Celsius`
              : "") +
            (lows.length
              ? `, daily lows ${Math.min(...lows)} to ${Math.max(...lows)} degrees Celsius`
              : "") +
            "."
        );
      }

      return lines.length ? { ok: true, lines } : { ok: false, reason: "no readings returned" };
    },
  },

  /**
   * ⭐ UN Comtrade — who buys a commodity, in what volume, from whom.
   *
   * This is the source the tea question actually needed. The participant asked *where can I
   * sell 3 tonnes of chamomile*, and the honest shape of an answer is "here are the countries
   * that import this commodity in quantity, and here is how much they took last year".
   *
   * ⚠️ **HS codes are hardcoded and that is deliberate.** Letting the model emit a commodity
   * code would let it invent one — HS codes are six digits and a plausible wrong one returns a
   * confident answer about the wrong good. `COMMODITIES` below is a short table this exchange
   * declares, and a commodity that is not in it is reported as not covered rather than guessed.
   *
   * ⚠️ Comtrade's public endpoint is rate-limited and occasionally slow. A miss here is a
   * stated miss; it is not permitted to fail the request.
   */
  trade: {
    label: "UN Comtrade",
    about:
      "Which countries import a commodity, by weight and value, in the most recent reported year. Use for market and buyer questions.",
    needs: ["commodity"],
    async fetch({ commodity }) {
      const spec = COMMODITIES[commodity];
      if (!spec) {
        return {
          ok: false,
          reason: `no HS code declared for "${commodity}" (this exchange covers: ${Object.keys(COMMODITIES).join(", ")})`,
        };
      }

      // ⚠️ **`reporterCode` is omitted, and that is not a simplification.** The obvious spelling
      // is `reporterCode=all`, which is what I wrote first; the endpoint answers it with
      // `HTTP 400 {"ErrorMessage":"The field reporterCode is invalid"}`. Omitting the parameter
      // is how this API says "every reporter". Measured, not read from documentation.
      //
      // `flowCode=M` is the import side — the buyer side, which is what a seller is asking about.
      const url =
        `https://comtradeapi.un.org/public/v1/preview/C/A/HS` +
        `?period=${spec.year}&partnerCode=0&cmdCode=${spec.hs}&flowCode=M`;

      // ⚠️ The long bound. Measured at 6594/4438/1644 ms on three consecutive calls — see
      // `SLOW_TIMEOUT_MS`. This is the only source that has ever needed it, and it is the one
      // whose absence changes the answer most, since it carries every number a seller asked for.
      const r = await get(url, { timeout: SLOW_TIMEOUT_MS });
      if (!r.ok) return { ok: false, reason: r.reason };

      const rows = Array.isArray(r.body?.data) ? r.body.data : [];
      if (!rows.length) return { ok: false, reason: "no trade records returned" };

      // ⚠️ **The rows double-count, and summing them raw inflates every figure severalfold.**
      // A live payload for HS 121190 held 500 rows covering **21 countries**: each reporter
      // appears once per customs procedure (`C00` is the total, `C01`/`C04` are subsets *of*
      // that total) and once per classification revision (H6/H5/H3). Sorted naively, Brazil
      // occupied two of the top eight places with two different numbers.
      //
      // ⭐ So: keep the `C00` total only, keep mode-of-transport 0 (all modes), and collapse any
      // remainder to the largest row per reporter. Verified to take 500 rows → 20 reporters,
      // one row each.
      const totals = new Map();
      for (const x of rows) {
        if (x.customsCode !== "C00" || x.motCode !== 0 || x.partnerCode !== 0) continue;
        if (typeof x.netWgt !== "number" || x.netWgt <= 0) continue;
        const prev = totals.get(x.reporterCode);
        if (!prev || x.netWgt > prev.netWgt) totals.set(x.reporterCode, x);
      }

      // ⚠️ Sorted by weight, not by value. The participant has 3 tonnes — a physical quantity —
      // and a market ranked by dollars answers a different question than a market ranked by
      // tonnage. The two orderings differ substantially for agricultural goods.
      //
      // ⭐ This sorts *countries by import volume*, which is not a ranking of participants and
      // does not touch the trie. `README.md`'s ranking exclusion is about the address path and
      // about ordering people in the exchange; a published trade statistic is neither.
      // ⚠️ **A reporter whose M49 code is not in the table is dropped, not printed.**
      //
      // `countryName` falls back to `"reporter 48"`, and that fallback is honest in isolation —
      // it says plainly that the code was not resolved. Measured, it does not survive contact
      // with the model: given a reading containing `reporter 48: 523 tonnes`, `compose` wrote
      // *"you can sell to … reporter 48 (523 tonnes), reporter 70/72 (367/339 tonnes)"*, which
      // reads to a participant as the names of places. An unresolved code becomes a fabricated
      // country the moment it is restated, and the tonnage beside it makes it look researched.
      //
      // ⭐ Dropping is safe here in a way it would not be elsewhere: this reading is already
      // explicitly a partial sample of reporters, so removing a few more does not change what
      // the line claims. The count is reported below so the omission is visible rather than
      // silent — the caveat's honesty depends on the number matching what is printed.
      const named = [...totals.values()].filter((x) => M49[x.reporterCode]);
      const unnamed = totals.size - named.length;
      const top = named.sort((a, b) => b.netWgt - a.netWgt).slice(0, 8);

      if (!top.length) return { ok: false, reason: "records carried no net weight" };

      const lines = [
        // ⚠️ **"among the countries returned", not "the largest importers".** The public preview
        // endpoint truncates at 500 rows, which for this commodity was 21 countries out of
        // roughly 200 — and the truncation is by reporter code, so it is close to alphabetical
        // rather than a top slice. Calling this "the largest importing countries" would be a
        // fabricated ranking of the world dressed in real numbers, which is worse than no
        // answer. The caveat travels in the line itself so it cannot be dropped by a summariser.
        // ⚠️ The count is `named.length`, not `totals.size`. The dropped rows above are not
        // "countries returned" for the reader's purposes — they are codes this exchange could
        // not resolve to a country, and counting them here would inflate a number whose only
        // job is to tell the reader how partial the sample is.
        `${spec.label} (HS ${spec.hs}) — reported imports for ${spec.year}, from UN Comtrade's ` +
          `public preview. ⚠️ That preview returns a partial set of reporting countries ` +
          `(${named.length} named here${unnamed ? `, ${unnamed} more not identifiable` : ""}), ` +
          `so these are the largest among the countries returned, NOT the world's largest ` +
          `importers. Do not present them as a global ranking:`,
        ...top.map(
          (x) =>
            `  ${countryName(x.reporterCode)}: ${(x.netWgt / 1000).toFixed(0)} tonnes` +
            (typeof x.primaryValue === "number"
              ? `, ${(x.primaryValue / 1e6).toFixed(1)} million USD`
              : "")
        ),
      ];

      // ⚠️ Implied unit price is derived here rather than left to the model, because it is
      // division and a model doing arithmetic under a token cap gets it wrong silently. It is
      // labelled "implied" because it is a quotient of two reported aggregates and not a quote.
      // ⚠️ **Weight-weighted, not a mean of per-country ratios.** The mean was what stood here,
      // and its caveat said "total value divided by total weight" — describing a computation the
      // code did not perform. Mislabelling a real number is worse than omitting it, and the mean
      // is also the wrong statistic: a reporter importing 25 kg carries the same weight in it as
      // one importing 11,000 tonnes, so a single small oddly-priced consignment moves the figure
      // a seller would price against.
      const withValue = top.filter((x) => typeof x.primaryValue === "number" && x.netWgt > 0);
      if (withValue.length) {
        const value = withValue.reduce((a, x) => a + x.primaryValue, 0);
        const tonnes = withValue.reduce((a, x) => a + x.netWgt, 0) / 1000;
        lines.push(
          `Implied import price across those markets: about ${(value / tonnes).toFixed(0)} USD ` +
            `per tonne. ⚠️ This is their total reported value divided by their total reported ` +
            `weight — not a market quote. It mixes grades, contract terms and shipping, and the ` +
            `price a specific buyer offers for a specific lot may differ substantially.`
        );
      }

      return { ok: true, lines };
    },
  },

  /**
   * ⭐ World Bank commodity context — population and GDP per capita, for the per-capita half of
   * the question.
   *
   * `notes/31`'s framing asks for volume *and* per capita. Comtrade gives absolute volume; a
   * country that imports a lot because it is large is a different opportunity from one that
   * imports a lot per person. This supplies the denominator.
   *
   * ⚠️ Keyless, and the API is stable, but it answers one country at a time — so it is only
   * fetched when the planner names a country, never speculatively for the whole Comtrade list.
   */
  economy: {
    label: "World Bank",
    about:
      "Population and GDP per capita for a named country. Use to put a trade volume in per-capita terms.",
    needs: ["country"],
    async fetch({ country }) {
      const code = encodeURIComponent(country);
      const url =
        `https://api.worldbank.org/v2/country/${code}/indicator/SP.POP.TOTL;NY.GDP.PCAP.CD` +
        `?format=json&mrnev=1&source=2`;

      const r = await get(url);
      if (!r.ok) return { ok: false, reason: r.reason };

      // The World Bank returns `[meta, rows]`. A bad country code yields a message object in
      // slot 0 and no slot 1, which is why the shape is checked rather than assumed.
      const rows = Array.isArray(r.body) && Array.isArray(r.body[1]) ? r.body[1] : [];
      if (!rows.length) return { ok: false, reason: `no data for country code "${country}"` };

      const lines = rows
        .filter((x) => x?.value != null)
        .map((x) => {
          const name = x.country?.value ?? country;
          if (x.indicator?.id === "SP.POP.TOTL") {
            return `${name} population: ${(x.value / 1e6).toFixed(1)} million people (${x.date}).`;
          }
          return `${name} GDP per capita: ${Number(x.value).toFixed(0)} USD per person per year (${x.date}).`;
        });

      return lines.length ? { ok: true, lines } : { ok: false, reason: "no indicator values" };
    },
  },

  /**
   * ⭐ PubChem — the chemistry half of the question the participant actually asked.
   *
   * *"all the other precursors/chemical compounds that can be extracted and their uses"*. For
   * chamomile that is apigenin, bisabolol, chamazulene; for tea, theanine and catechins. A
   * seller holding 3 tonnes of leaf is holding a feedstock as well as a commodity, and the
   * second framing is the one that changes what the consignment is worth.
   *
   * ⚠️ PubChem is a compound database, not an agronomic one. It tells you a molecule's formula
   * and weight; it does not tell you the yield per tonne of leaf, and it must not be presented
   * as though it did. `EXTRACTS` below names the compounds this exchange associates with a
   * crop — a short declared table, for the same reason `COMMODITIES` is one.
   */
  chemistry: {
    label: "PubChem",
    about:
      "Named compounds extractable from a crop, with formula and molecular weight. Use for processing, extraction, or value-added questions.",
    needs: ["commodity"],
    async fetch({ commodity }) {
      const names = EXTRACTS[commodity];
      if (!names?.length) {
        return { ok: false, reason: `no extractable compounds are declared for "${commodity}"` };
      }

      // ⚠️ Concurrent. These are independent lookups against one host, and `TIMEOUT_MS` bounds
      // each one — run in sequence, three compounds put up to 18 s inside a stage that is
      // already the slow part of a slow request, for no gain. Unlike the Ollama stages, which
      // queue behind a single loaded model, these genuinely overlap.
      const settled = await Promise.all(
        names.map(async (name) => {
          const url =
            `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(name)}` +
            `/property/MolecularFormula,MolecularWeight/JSON`;
          const r = await get(url);
          const p = r.ok ? r.body?.PropertyTable?.Properties?.[0] : null;
          return p
            ? `${name}: ${p.MolecularFormula}, molecular weight ${p.MolecularWeight} g/mol (PubChem CID ${p.CID}).`
            : null;
        })
      );
      // ⚠️ Order preserved from `EXTRACTS` rather than by completion, so the same question
      // produces the same lines twice.
      const found = settled.filter(Boolean);

      if (!found.length) return { ok: false, reason: "no compounds resolved" };

      return {
        ok: true,
        lines: [
          `Compounds associated with ${commodity}:`,
          ...found.map((l) => `  ${l}`),
          // ⚠️ Stated with the data, not left for `compose` to remember. The gap between "this
          // molecule exists in the plant" and "you can sell it" is where an answer becomes
          // misleading, and the caveat has to travel with the fact.
          `⚠️ Presence in the plant is not a yield. This exchange holds no extraction yields, ` +
            `no purity grades, and no prices for these compounds — do not estimate any.`,
        ],
      };
    },
  },
};

/**
 * ⚠️ The commodity table and the M49 country map used to be declared here. They are now
 * imported at the top of this file from `lib/commodities.js`, because `lib/market.js` needs
 * the same two tables and a second copy would eventually disagree with this one.
 */



/**
 * Compounds this exchange associates with a crop.
 *
 * ⚠️ Declared, not inferred, and deliberately short. The failure mode of letting a model name
 * compounds is a plausible molecule that is not in the plant — and PubChem will happily return
 * a formula for it, which converts a fabrication into a cited fact.
 */
const EXTRACTS = {
  chamomile: ["apigenin", "alpha-bisabolol", "chamazulene"],
  tea: ["L-theanine", "epigallocatechin gallate", "caffeine"],
  "green tea": ["L-theanine", "epigallocatechin gallate", "caffeine"],
  coffee: ["caffeine", "chlorogenic acid", "trigonelline"],
  maize: ["zeaxanthin", "ferulic acid"],
  soybeans: ["genistein", "daidzein"],
  groundnuts: ["resveratrol"],
  sesame: ["sesamin", "sesamolin"],
};

/** Commodity names the planner may use. Exposed so the planner's prompt can list them. */
export const KNOWN_COMMODITIES = Object.keys(COMMODITIES);

/**
 * Run one planned lookup.
 *
 * ⭐ **The `asserted` stamp is applied here**, in one place, rather than by each source. A rule
 * enforced at the single point where data enters cannot be forgotten by the next source added
 * — which is the same argument `pages/api/feeds/[feed].js` makes for keeping four feeds in one
 * file. A source physically cannot return `observed` from here.
 *
 * Returns `{id, label, ok, lines, reason}`. Never throws; a failed source is a reported
 * absence, and the trace carries it.
 */
export async function fetchSource(id, params = {}) {
  const spec = SOURCES[id];
  if (!spec) return { id, label: id, ok: false, reason: "no such source" };

  const missing = (spec.needs ?? []).filter((k) => params[k] == null || params[k] === "");
  if (missing.length) {
    return {
      id,
      label: spec.label,
      ok: false,
      reason: `needs ${missing.join(", ")}, which the question did not supply`,
    };
  }

  if (spec.envKey && !process.env[spec.envKey]) {
    return { id, label: spec.label, ok: false, reason: `no ${spec.envKey} configured` };
  }

  let r;
  try {
    r = await spec.fetch(params);
  } catch (e) {
    r = { ok: false, reason: e?.message ?? "threw" };
  }

  return r.ok
    ? { id, label: spec.label, ok: true, source: "asserted", lines: r.lines }
    : { id, label: spec.label, ok: false, reason: r.reason ?? "failed" };
}

/**
 * Run several lookups at once.
 *
 * ⭐ Concurrent, and unlike the model stages that is correct here. `pipeline.js` explains at
 * length why its stages are sequential — Ollama serialises against a single loaded model, so
 * concurrency doubles the apparent latency of each call without reducing wall time. These are
 * independent HTTP requests to four different hosts, which is the case that argument does not
 * cover: they genuinely do overlap, and three sources cost roughly what the slowest one costs.
 */
export async function fetchAll(plan) {
  return await Promise.all(plan.map((p) => fetchSource(p.source, p.params ?? {})));
}
