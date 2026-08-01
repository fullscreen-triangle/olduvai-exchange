/**
 * Agent instances.
 *
 * # ⭐ The sentence this file implements
 *
 * `notes/31-dashboard-design.md` item 1: *"Every linked page in the sidebars is an agent
 * instance of the main home page model."*
 *
 * Read strictly, that rules out the obvious implementation. The tempting design is a set of
 * per-page assistants — a weather bot, a transport bot — each with its own prompt, its own
 * retrieval, and eventually its own idea of what a consignment is. That is not an instance
 * of one model; that is five models that will drift.
 *
 * So an instance here is **the same pipeline, the same stages, the same checks, and one
 * substitution**: what the agent is looking at, and which specialist that subject warrants.
 * `run()` in `pipeline.js` does not branch on which agent it is running. If it ever needs
 * to, the abstraction has failed and the drift has already started.
 *
 * # What an instance actually consists of
 *
 *   - a **domain**, which selects a specialist from `huggingface.js`;
 *   - a **subject line**, which tells the base model what the participant is looking at;
 *   - the **gate** the page is behind, so the agent knows what it *cannot* see and says so
 *     rather than inventing it.
 *
 * ⚠️ That last one is the part that is easy to leave out and expensive to leave out. Every
 * rail page is currently blocked. An agent on the weather page with no weather data will
 * happily produce a forecast if nothing tells it that it has none. Telling it — in the
 * system prompt, from the same manifest the page renders its gate from — is what makes
 * "I have no readings for your location" the answer instead.
 */

import { GATES, LEFT_RAIL, RIGHT_RAIL, findEntry } from "@/lib/navigation";

/**
 * Domain per rail entry.
 *
 * ⚠️ Kept here rather than added to `navigation.js` on purpose. That manifest is about
 * navigation, and `notes/31` items 2 and 3 are going to rewrite both rails wholesale. A
 * domain that is missing from this table degrades to `general`, so that rewrite will not
 * break the assistant — it will just run those pages on the base model until someone
 * assigns them a specialist.
 */
const DOMAINS = {
  "/dashboard/profile": "general",
  // ⭐ The five position rails all take `scientific`, and deliberately not five domains. What
  // a participant asks on any of them is the same question — what does this reading actually
  // pin down, and how much does it move the estimate. Splitting them would give four
  // specialists each of which knew about one instrument and none of which knew about the
  // fold, which is the one thing the question is about.
  "/dashboard/position": "scientific",
  "/dashboard/terrain": "scientific",
  "/dashboard/satellites": "scientific",
  "/dashboard/flights": "scientific",
  "/dashboard/gps": "scientific",
  "/dashboard/weather": "agronomy",
  "/dashboard/traffic": "logistics",
  "/dashboard/prices": "economics",
  "/dashboard/advisories": "agronomy",
  "/dashboard/foreman": "agronomy",
  "/dashboard/transport": "logistics",
  "/dashboard/payments": "economics",
  "/dashboard/monitoring": "scientific",
  "/dashboard/graph": "scientific",
  // ⚠️ `general`, not `agronomy`, and that is the point of the page. A yield specialist here
  // would be a model with an opinion about the forecast on the one page whose whole content
  // is that no forecast method has been chosen.
  "/dashboard/predictions": "general",
  "/dashboard/ledger": "general",
};

/**
 * What each observation shape constrains, told to the agent verbatim.
 *
 * ⚠️ Without this an agent on the flights page, asked "so where am I", has every incentive to
 * answer with a point — the blurb says "tracks crossing your area" and a track has
 * coordinates. It is the *along-track* silence that is the honest content of the reading, and
 * silence is exactly what a model will fill in unless told not to.
 *
 * Kept in the prompt rather than left to the domain specialist because it is a fact about
 * this system's data model, not about geodesy.
 */
const CONSTRAINT_NOTE = {
  fix: "a point, isotropically, at the accuracy the receiver reported",
  corridor:
    "perpendicular distance from a line only. It says nothing whatever about where along " +
    "that line the participant is, and you must not answer as though it did",
  within: "a region, with an uncertainty set by that region's own size",
  overpass:
    "a time window in which a sensor could have taken a reading — not a position of the " +
    "participant at all",
  estimate:
    "the combination of every observation so far, each weighted by the noise it admitted to",
};

/** The centre composer: the home page model itself, of which the others are instances. */
export const HOME = {
  id: "home",
  label: "Composer",
  domain: "general",
  subject:
    "The participant is at the centre composer, describing what they are bringing to market. " +
    "They have not yet named a page or a subject.",
  blockedBy: null,
};

/**
 * Build the agent instance for a page.
 *
 * `href` is a dashboard pathname. `/dashboard` itself is `HOME`; an unknown path is also
 * `HOME`, because an agent that does not know where it is should behave like the general
 * one rather than guess a specialism.
 */
export function agentFor(href) {
  if (!href || href === "/dashboard") return HOME;

  const entry = findEntry(href);
  if (!entry) return HOME;

  return {
    id: entry.href.replace("/dashboard/", ""),
    label: entry.label,
    domain: DOMAINS[entry.href] ?? "general",
    subject: `The participant is on the "${entry.label}" page: ${entry.blurb}.`,
    blockedBy: entry.blockedBy,
    // `undefined` for every non-observation page, which is correct: only those pages have a
    // shape of constraint to state.
    constrains: entry.constrains,
  };
}

/** Every instance, for a trace view or a health check. */
export function allAgents() {
  return [HOME, ...[...LEFT_RAIL, ...RIGHT_RAIL].map((e) => agentFor(e.href))];
}

/**
 * The system prompt.
 *
 * ⭐ This is the single place the three exclusions are stated to a model, and it is written
 * as *what is true of this system* rather than as a list of prohibitions. A model told "do
 * not rank" will still rank when it seems helpful. A model told that ranking here is
 * longest-common-prefix with no parameters, and that its own opinion about who should match
 * whom is not admissible, has been given a reason.
 *
 * ⚠️ The instructions below are not a security boundary. A model can be talked out of any
 * of them. They are here so the *ordinary* case is right; the boundary that actually holds
 * is structural — `accept_proposal` in `crates/olduvai-wasm/src/lib.rs` is the only way a
 * model's output becomes a `Field`, it requires a named participant's confirmation, and it
 * writes `Source::Asserted` with weight `0.0` regardless of what the model claimed.
 */
export function systemPrompt(agent) {
  const gate = agent.blockedBy ? GATES[agent.blockedBy] : null;
  const constraint = agent.constrains
    ? CONSTRAINT_NOTE[agent.constrains]
    : null;

  return [
    "You are an assistant on Olduvai Exchange, an agricultural produce exchange.",
    "",
    agent.subject,
    ...(constraint
      ? [
          "",
          `A reading on this page constrains ${constraint}.`,
          "No source here is a check on any other. Every source is weak on its own and states",
          "how weak; they are combined by a filter, weighted by that admitted noise. Do not",
          "describe one source as verifying or confirming another, and do not present any",
          "single one as authoritative.",
        ]
      : []),
    "",
    "How this exchange works, and what that means for you:",
    "",
    "- Matching a participant to a coalition is longest-common-prefix over an address trie.",
    "  It has no parameters and no learned weights. Your opinion about who should match whom",
    "  is not admissible, and stating one would misrepresent how a match is actually made.",
    "- Addresses are computed by a fixed coordinate function. You never assert one.",
    "- Entry values are recorded by a deterministic synthesis that must be recomputable from",
    "  the ledger years from now by someone who does not have you. You never produce one.",
    "",
    "What you do instead:",
    "",
    "- Explain, in plain language, what something means and what it depends on.",
    // ⚠️ "from what they have told you" is load-bearing. Without it a live run read
    // "propose values" as licence to invent a grading scheme and offer it as a suggestion.
    // A proposal here is a *reading* of the participant's own words — the delivery note they
    // pasted, the tonnage they typed — never a value the model supplied from its own store.
    "- Read what the participant gives you and propose values for their entry FROM WHAT THEY",
    "  HAVE TOLD YOU. A proposal is a reading of their words, not a value you supply: they",
    "  confirm it, and it is then attributed to them as their own assertion, carrying no",
    "  evidential weight beyond that. Never propose a value they did not give you.",
    "- Say when you do not know. The engine behind most of this exchange is gated on an",
    "  unrun experiment, and saying so is a correct answer.",
    "",
    "Every quantity you state carries a unit. A bare number about a consignment is a defect:",
    "it is a value that cannot be recorded.",
    ...(gate
      ? [
          "",
          `⚠️ This page has no data. ${gate.detail}`,
          "Do not invent readings, forecasts, prices, or records for it. If asked for them,",
          "say what is missing and why.",
        ]
      : []),
  ].join("\n");
}
