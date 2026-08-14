/**
 * Turning a question into lookups.
 *
 * # ⭐ This is the part `notes/31` asked for and I did not build
 *
 * *"The models are expected to formulate a search query, to different apis, to get results."*
 * That sentence describes a planner: the model reads the question, decides which sources bear
 * on it, and emits the parameters each one needs. `ground` then executes those lookups and the
 * results — real numbers from real sources — are what `compose` writes from.
 *
 * Without it, `ground` asked a model to *speculate about what would need to be true* and passed
 * the speculation to `compose` as retrieved material. That is why the tea answer was about
 * coordinates: the coordinates were the only concrete thing in the prompt.
 *
 * # ⚠️ The model chooses *which* sources, never *what they return*
 *
 * The planner picks from a closed set declared in `sources.js` and fills a small, typed
 * parameter list. It cannot invent a source, cannot supply a URL, and cannot supply an HS code
 * or a compound name — those come from declared tables, for the reason `sources.js` gives:
 * a fabricated six-digit code returns a confident answer about the wrong good.
 *
 * ⭐ So the model's discretion is *routing*, and the facts are the sources'. That split is what
 * keeps this from becoming the deterministic-synthesis violation `README.md` excludes — nothing
 * the model emits here becomes a value; it becomes a decision about which public API to call.
 *
 * # ⚠️ Why a deterministic pass runs first
 *
 * A model call costs 40–80s on the hardware this runs on. Most questions name their commodity
 * in plain words, and matching "chamomile" against a twelve-entry table is free and exact.
 * So `plan` extracts what it can by matching, and only asks the model when the match is empty
 * *and* the question looks like it wants external context. On the measured machine that is the
 * difference between one added stage and two.
 */

import { KNOWN_COMMODITIES, SOURCES } from "./sources";
import * as ollama from "./ollama";

/** ⚠️ Notes for a machine, not prose. Same reasoning as `TOKEN_CAP` in `pipeline.js`. */
const PLAN_TOKEN_CAP = 150;

/**
 * ⚠️ Words that mean the question is about a market rather than about the participant.
 *
 * Crude on purpose. The alternative is a model call to classify intent, which costs a stage to
 * save a regex — the same trade `facts.js` makes for its elevation gate, and for the same
 * reason.
 */
const MARKET_WORDS =
  /\b(sell|sold|selling|sale|buyer|buyers|market|markets|export|exports|exporting|import|imports|price|prices|pricing|worth|demand|trade|volume|per capita)\b/i;

const CHEMISTRY_WORDS =
  /\b(compound|compounds|chemical|chemicals|extract|extraction|precursor|precursors|oil|essential oil|active|process|processing|value.?add)\b/i;

const WEATHER_WORDS =
  /\b(weather|rain|rainfall|forecast|temperature|dry|drought|wet|humid|humidity|wind|season|planting|harvest)\b/i;

/**
 * ⭐ Find a declared commodity in the question by plain substring match.
 *
 * ⚠️ Longest first. "green tea" and "tea" both match a question about green tea, and matching
 * "tea" would look up HS 090240 — black tea in bulk — and return a confidently wrong market.
 *
 * Returns `{ commodity, nearMiss }`. `nearMiss` is a commodity the question probably meant but
 * did not spell exactly; when it is set, `commodity` is not to be used.
 *
 * # ⚠️ Why longest-first was not enough, measured
 *
 * The participant's own question read *"I have 3t of chamomille tea leaves, where can I sell
 * them?"* — chamomile with a doubled L. `"chamomile"` is not a substring of `"chamomille"`, so
 * that entry never matched, `"tea"` did, and the exchange answered with **black tea import
 * markets** — Chile, Sri Lanka, tonnages, an implied price per tonne. Every figure was copied
 * from UN Comtrade correctly. They were figures for the wrong crop.
 *
 * ⭐ That is worse than answering nothing, and it is the exact failure the comment above was
 * written to prevent, reached by a route it did not cover. The whole reason `sources.js` keeps
 * HS codes in a declared table is that *"a wrong HS code returns a confident, well-formed answer
 * about a different good"* — and a typo walked straight past the table into the same outcome.
 */
function commodityIn(text) {
  const t = (text ?? "").toLowerCase();
  const byLength = [...KNOWN_COMMODITIES].sort((a, b) => b.length - a.length);
  const matched = byLength.find((c) => t.includes(c)) ?? null;

  // ⚠️ **A near miss is checked even when something matched, and especially then.** The
  // dangerous case is not "nothing matched" — that already declines honestly. It is a *shorter*
  // commodity matching while a longer one sits one letter away in the same sentence, because
  // that produces an answer rather than a refusal.
  const words = t.match(/[a-z]+/g) ?? [];
  const near = byLength.find(
    (c) =>
      c !== matched &&
      // Only single-word entries. "green tea" cannot be compared against one word, and the
      // compound entries are already reached by exact match when they are spelled at all.
      !c.includes(" ") &&
      // ⚠️ Not a substring of the text — if it were, it would have matched above and be the
      // answer. This looks only at words the exact pass rejected.
      !t.includes(c) &&
      words.some((w) => isNearMiss(w, c))
  );

  // ⭐ A near miss that is *longer* than what matched overrules it: "chamomille" beats "tea".
  // A near miss when nothing matched is reported too, so the participant is told which crop the
  // exchange thought they meant instead of being told it knows no crop by that name.
  if (near && (!matched || near.length > matched.length)) {
    return { commodity: null, nearMiss: near };
  }
  return { commodity: matched, nearMiss: null };
}

/**
 * ⚠️ One edit away from `target`, and no closer than that.
 *
 * # ⭐ Why this is not, and must not become, fuzzy commodity matching
 *
 * This function never *selects* a commodity. Its only caller uses it to **withhold** one — to
 * turn a confident answer about the wrong crop into a question. Widening it costs nothing when
 * it is wrong, because being wrong here means asking rather than asserting.
 *
 * ⚠️ Selecting on a near miss would be the opposite trade, and is the reason the threshold is
 * one edit rather than a ratio: `sesame` and `sugar` differ by three, `maize` and `wheat` by
 * four, and a looser rule would silently route a question about one to the HS code of another.
 * At distance one no two entries in the table collide — checked against the twelve.
 *
 * ⚠️ Short words are excluded outright. Every four-letter string is one edit from several
 * others, and "team", "teas", "sell" would each start proposing crops.
 */
function isNearMiss(word, target) {
  if (word.length < 5 || target.length < 5) return false;
  if (Math.abs(word.length - target.length) > 1) return false;
  return editDistanceWithin1(word, target);
}

/**
 * True when `a` and `b` differ by at most one insertion, deletion, or substitution.
 *
 * ⭐ Written out rather than a full Levenshtein matrix because only the bound matters here, and
 * a bound of one is a single pass: find the first difference, then require the remainders to be
 * equal under exactly one of the three edits.
 */
function editDistanceWithin1(a, b) {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (long.length - short.length > 1) return false;

  let i = 0;
  while (i < short.length && short[i] === long[i]) i += 1;

  return short.length === long.length
    ? // Substitution: the tails after the differing character must match.
      short.slice(i + 1) === long.slice(i + 1)
    : // Insertion in `long`: skip that one character and the rest must match.
      short.slice(i) === long.slice(i + 1);
}

/**
 * Build the lookup plan for one question.
 *
 * Returns `{ plan, via, note }` — `plan` is an array of `{source, params}`, `via` is
 * `"matched"` or `"model"` or `"none"` for the trace, and `note` explains an empty plan.
 *
 * ⚠️ `position` is the participant's own estimate, passed in rather than read here. Weather
 * needs a coordinate, and the only honest coordinate is the fused one — but it is supplied
 * **only when it rests on an observation**. `facts.js` is explicit that the uninformed prior
 * "must NOT be used to derive anything about their location — not weather, not distance".
 * Fetching a forecast for the centroid of the country would be exactly that.
 */
export async function plan({ query, understanding, base, position }) {
  const text = `${query ?? ""}\n${understanding ?? ""}`;
  const { commodity, nearMiss } = commodityIn(text);
  const wantsMarket = MARKET_WORDS.test(text);
  const wantsChem = CHEMISTRY_WORDS.test(text);
  const wantsWeather = WEATHER_WORDS.test(text);

  const measured = position?.rests_on_observation === true;
  const at = position?.at ?? null;

  // ⚠️ **Asks, rather than guessing either way.** The question spelled something one letter
  // from a crop this exchange holds. Looking up `nearMiss` would be the model-fabricates-an-HS-
  // code failure with a spellchecker in place of the model; looking up whatever *did* match is
  // what returned black-tea markets for a chamomile question. Neither is defensible, and the
  // participant can settle it in four words.
  //
  // ⭐ This runs before the plan is built, so no source is consulted at all — a wrong lookup is
  // not merely unreported here, it does not happen.
  // ⭐ `via: "spelling"` rather than `"none"`, and the distinction is load-bearing rather than
  // cosmetic. Both return an empty plan, but they are different *kinds* of empty: "the question
  // did not ask for external context" leaves the model with a question it can still answer, while
  // this one leaves it with a question it must not answer — the note is not context for a reply,
  // it **is** the reply. `pipeline.js` reads this value to decide that, so it must not be
  // collapsed back into `"none"` for tidiness.
  if (nearMiss) {
    return {
      plan: [],
      via: "spelling",
      note:
        `This exchange holds trade data for "${nearMiss}" but the question does not spell it ` +
        `exactly, so no lookup was made — an approximate match would return figures for a ` +
        `different crop. Ask again spelling it "${nearMiss}" if that is the one meant. ` +
        `The full list: ${KNOWN_COMMODITIES.join(", ")}.`,
    };
  }

  const out = [];

  // ⭐ The commodity path. A named commodity plus a market question is the tea case exactly,
  // and it resolves with no model call at all.
  if (commodity && (wantsMarket || !wantsChem)) {
    out.push({ source: "trade", params: { commodity } });
  }
  if (commodity && wantsChem) {
    out.push({ source: "chemistry", params: { commodity } });
  }

  if (wantsWeather && measured && at) {
    out.push({
      source: "weather",
      params: { latitude: at.latitude.toFixed(4), longitude: at.longitude.toFixed(4) },
    });
  }

  if (out.length) return { plan: out, via: "matched", note: null };

  // ⚠️ Nothing matched. Only now is a model call worth its 40–80s, and only when the question
  // looks like it wants external context at all — a question about how the exchange works, or
  // about the participant's own position, has no source here and must not spend a stage
  // discovering that.
  if (!wantsMarket && !wantsChem && !wantsWeather) {
    return {
      plan: [],
      via: "none",
      note: "The question does not ask for external market, chemical, or weather context.",
    };
  }

  const asked = await ask({ query, understanding, base });

  if (!asked.length) {
    return {
      plan: [],
      via: "model",
      note: commodity
        ? null
        : `No source could be selected. This exchange looks up trade data only for: ${KNOWN_COMMODITIES.join(", ")}.`,
    };
  }

  return { plan: asked, via: "model", note: null };
}

/**
 * Ask the base model to route.
 *
 * ⚠️ **Constrained output, parsed forgivingly.** A 3b model asked for JSON produces JSON with a
 * preamble, or with a trailing comma, or wrapped in a fence. So the format is one line per
 * lookup — `source: parameter` — which survives all three, and anything unparseable is dropped
 * rather than failing the stage. An unroutable question gets no sources, which is a correct
 * outcome, not an error.
 */
async function ask({ query, understanding, base }) {
  const catalogue = Object.entries(SOURCES).map(
    ([id, s]) => `- ${id}: ${s.about} Needs: ${(s.needs ?? []).join(", ") || "nothing"}.`
  );

  const prompt = [
    "Choose which reference sources would help answer the question below. Reply with one line",
    "per source, in the form `source: value`, and nothing else. Choose none if none apply.",
    "",
    "Available sources:",
    ...catalogue,
    "",
    // ⚠️ The closed list is given explicitly. Told only "a commodity", the model supplies
    // whatever the question names — "herbs", "leaves", "produce" — none of which have an HS
    // code here, and each of which spends a lookup to learn that.
    `For \`trade\` and \`chemistry\`, the value must be exactly one of: ${KNOWN_COMMODITIES.join(", ")}.`,
    "For `economy`, the value is a country name or ISO code.",
    "Do not choose `weather` — it is selected automatically when a position is known.",
    "",
    "Question:",
    query ?? "",
    ...(understanding ? ["", "A reading of it:", understanding] : []),
  ].join("\n");

  const r = await ollama.generate({
    model: base.model,
    prompt,
    // ⭐ Zero. This is routing, and the same question should route the same way twice.
    temperature: 0,
    maxTokens: PLAN_TOKEN_CAP,
  });

  if (!r.ok) return [];

  const out = [];
  for (const raw of (r.text ?? "").split("\n")) {
    const m = /^\s*[-*]?\s*(\w+)\s*:\s*(.+?)\s*$/.exec(raw);
    if (!m) continue;

    const source = m[1].toLowerCase();
    const value = m[2].replace(/[`"'.]/g, "").trim().toLowerCase();
    if (!SOURCES[source] || source === "weather") continue;

    if (source === "trade" || source === "chemistry") {
      // ⚠️ Verified against the table rather than trusted. This is the line that stops a
      // hallucinated commodity from reaching a fetch.
      if (!KNOWN_COMMODITIES.includes(value)) continue;
      out.push({ source, params: { commodity: value } });
    } else if (source === "economy") {
      out.push({ source, params: { country: value } });
    }
  }

  // Deduplicated — a model listing `trade: tea` twice should cost one lookup.
  const seen = new Set();
  return out.filter((p) => {
    const k = `${p.source}:${Object.values(p.params).join(",")}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
