/**
 * The runner: executes the stages against one query and returns the answer with its trace.
 *
 * # ⭐ The trace is not a debugging feature
 *
 * Every stage records what tier ran it, which model, how long it took, and — when a
 * specialist was wanted but not reachable — that it degraded. That record goes back to the
 * client and is rendered.
 *
 * The reason is the same reason `Field` carries `{value, unit, source, precision}`: an
 * answer without its provenance is a claim without a basis. A participant reading a sentence
 * about their soil should be able to see whether it came from a specialist model or from a
 * general one running alone, in the same way they can see whether a value in their entry was
 * observed or asserted. `notes/27` §4 draws that line for data; there is no principled
 * reason the assistant's output should be exempt from it.
 *
 * # ⚠️ Why there is no streaming
 *
 * Streaming shows a draft before `check` has scored it. The check stage exists to catch an
 * answer that ranks participants or states a bare number, and an answer that has already
 * been read cannot be unread. When `check` can run incrementally this can change; until
 * then, the whole pipeline resolves and then speaks.
 */

import { CHECKS, STAGES, Tier } from "./stages";
import { systemPrompt } from "./agents";
import * as hf from "./huggingface";
import * as ollama from "./ollama";

/** ⚠️ One refinement, not a loop. See `refine` below. */
const MAX_REFINEMENTS = 1;

/**
 * Working memory for a single query.
 *
 * ⭐ Kept from four-sided-triangle, and kept *narrow*: it lives for one request and is
 * discarded. There is no cross-query memory and no per-participant history in this layer.
 *
 * That is a deliberate refusal rather than an unbuilt feature. An assistant that accumulated
 * what a participant told it would become a second store of facts about them — one that is
 * not the ledger, not append-only, not attributed, and not recomputable. The exchange has
 * exactly one record of what is true about a participant, and this is not it.
 */
function memory(query, agent) {
  return {
    query,
    agent,
    stages: [],
    /** What `ground` retrieved, for `compose` to cite and `check` to test against. */
    grounding: [],
    draft: null,
    proposals: [],
  };
}

/** One stage's record in the trace. */
function record(mem, id, { tier, model, ms, ok, degraded, detail }) {
  mem.stages.push({ id, tier, model, ms, ok, degraded, detail });
}

/**
 * Run the pipeline.
 *
 * Returns `{ ok, answer, proposals, trace, blocked }`. Never throws: a failure at any stage
 * becomes a reported outcome, because a 500 tells the participant nothing they can act on.
 */
export async function run({ query, agent, base }) {
  const mem = memory(query, agent);
  const started = Date.now();

  // ⚠️ Checked before any stage runs. Without a base model there is no pipeline at all —
  // the specialist tier answers one stage out of five and cannot stand in for the rest.
  if (!base?.running || !base.model) {
    return {
      ok: false,
      blocked: {
        reason: base?.running ? "no_model" : "ollama_not_running",
        detail: base?.running
          ? "Ollama is running but has no models installed."
          : "Ollama is not running.",
        remedy: base?.running
          ? "Install a model, for example: ollama pull llama3.2"
          : "Start it with: ollama serve",
        url: base?.url ?? null,
      },
      trace: { stages: [], ms: 0 },
    };
  }

  const system = systemPrompt(agent);
  const specialist = hf.resolve(agent.domain);

  for (const s of STAGES) {
    const t0 = Date.now();

    if (s.id === "specialise") {
      // ⭐ The one stage that leaves the machine — and the one that is allowed to be
      // skipped. Degrading is recorded, never silent.
      if (!specialist.usable) {
        record(mem, s.id, {
          tier: Tier.SPECIALIST,
          model: specialist.model,
          ms: 0,
          ok: false,
          degraded: true,
          detail: specialist.note,
        });
        continue;
      }

      const r = await hf.infer({
        model: specialist.model,
        prompt: `${system}\n\n${prompts.specialise(mem)}`,
      });
      record(mem, s.id, {
        tier: Tier.SPECIALIST,
        model: specialist.model,
        ms: Date.now() - t0,
        ok: r.ok,
        degraded: !r.ok,
        detail: r.ok ? null : `Specialist unreachable (${r.reason}); the base model answered alone.`,
      });
      if (r.ok) mem.specialist = r.text;
      continue;
    }

    const r = await ollama.generate({
      model: base.model,
      system,
      prompt: prompts[s.id](mem),
      // `check` scores rather than writes; determinism matters more there than anywhere.
      temperature: s.id === "check" ? 0 : 0.2,
    });

    record(mem, s.id, {
      tier: Tier.BASE,
      model: base.model,
      ms: Date.now() - t0,
      ok: r.ok,
      degraded: false,
      detail: r.ok ? null : r.reason,
    });

    if (!r.ok) {
      return {
        ok: false,
        blocked: {
          reason: r.reason,
          detail: `The pipeline stopped at "${s.label}".`,
          remedy: r.reason === "ollama_unreachable" ? "Start it with: ollama serve" : null,
        },
        trace: { stages: mem.stages, ms: Date.now() - started },
      };
    }

    absorb(mem, s.id, r.text);
  }

  // ⭐ Refinement is driven by the check, not by a retry count — four-sided-triangle's
  // process monitor, narrowed to one axis of action. One pass only: a model that failed
  // `bounded` twice is not going to pass on the third attempt, it is going to be talked
  // into producing something that superficially satisfies the checker.
  if (mem.checkFailed && MAX_REFINEMENTS > 0) {
    const t0 = Date.now();
    const r = await ollama.generate({
      model: base.model,
      system,
      prompt: prompts.refine(mem),
      temperature: 0.1,
    });
    record(mem, "refine", {
      tier: Tier.BASE,
      model: base.model,
      ms: Date.now() - t0,
      ok: r.ok,
      degraded: false,
      detail: `Refined once: ${mem.checkFailed.join(", ")}.`,
    });
    if (r.ok) mem.draft = r.text;
  }

  return {
    ok: true,
    answer: mem.draft ?? "",
    // ⚠️ Always empty for now. Extraction is not implemented, and returning a plausible
    // proposal that nothing on the Rust side would accept is worse than returning none.
    // See `notes/29` and `accept_proposal` in `crates/olduvai-wasm/src/lib.rs`.
    proposals: mem.proposals,
    trace: {
      stages: mem.stages,
      ms: Date.now() - started,
      agent: agent.id,
      domain: agent.domain,
      specialist: specialist.usable ? specialist.model : null,
      specialistNote: specialist.usable ? null : specialist.note,
      checks: mem.checkFailed ?? null,
    },
  };
}

/** Fold a stage's output into working memory. */
function absorb(mem, id, text) {
  if (id === "understand") mem.understanding = text.trim();
  else if (id === "ground") mem.grounding = [text.trim()].filter(Boolean);
  else if (id === "compose") mem.draft = text.trim();
  else if (id === "check") {
    // The checker is asked for bare keys, one per line. Parsing is deliberately forgiving:
    // a checker whose output cannot be parsed must not silently pass the draft, so an
    // unreadable verdict is treated as a failure of every axis it did not clearly pass.
    const failed = Object.keys(CHECKS).filter((k) =>
      new RegExp(`^\\s*${k}\\s*:\\s*fail`, "im").test(text)
    );
    mem.checkFailed = failed.length ? failed : null;
  }
}

/**
 * The prompts, one per stage.
 *
 * ⚠️ Kept in one object rather than beside each stage definition so that reading them
 * together is easy — the failure mode with staged prompting is two stages quietly asking
 * for contradictory things, and that is only visible when they are adjacent.
 */
const prompts = {
  understand: (m) =>
    [
      "Read the participant's message and state, briefly:",
      "1. What they are asking for.",
      "2. Any quantities, with their units, and anything left without a unit.",
      "3. Whether answering needs the matching engine (which you do not have access to).",
      "",
      "Message:",
      m.query,
    ].join("\n"),

  ground: (m) =>
    [
      "Given this reading of the question:",
      m.understanding ?? "(none)",
      "",
      "List what would have to be true, or known, to answer it well — and mark each item",
      "as either something you know, or something only the exchange's records could tell you.",
      "Do not answer the question yet.",
    ].join("\n"),

  specialise: (m) =>
    [
      "Answer this question in your domain of expertise.",
      "State units on every quantity.",
      "",
      m.query,
    ].join("\n"),

  compose: (m) =>
    [
      "Write the answer for the participant.",
      "",
      "Their question:",
      m.query,
      "",
      "Your reading of it:",
      m.understanding ?? "(none)",
      "",
      "What is known and unknown:",
      ...(m.grounding.length ? m.grounding : ["(nothing retrieved)"]),
      ...(m.specialist
        ? ["", "A domain model's answer, to use where it is more precise than yours:", m.specialist]
        : []),
      "",
      "Be direct and brief. Units on every quantity. Where the answer depends on records",
      "you do not have, say so plainly rather than hedging the whole answer.",
    ].join("\n"),

  check: (m) =>
    [
      "Score the draft below on each axis. Reply with exactly one line per axis, in the",
      "form `axis: pass` or `axis: fail`, and nothing else.",
      "",
      ...Object.entries(CHECKS).map(([k, v]) => `${k}: ${v.detail}`),
      "",
      "Draft:",
      m.draft ?? "",
    ].join("\n"),

  refine: (m) =>
    [
      `The draft failed these checks: ${(m.checkFailed ?? []).join(", ")}.`,
      ...(m.checkFailed ?? []).map((k) => `- ${k}: ${CHECKS[k].detail}`),
      "",
      "Rewrite it so it passes. Do not pad it, and do not add claims to compensate —",
      "if the fix is to say less, say less.",
      "",
      "Draft:",
      m.draft ?? "",
    ].join("\n"),
};
