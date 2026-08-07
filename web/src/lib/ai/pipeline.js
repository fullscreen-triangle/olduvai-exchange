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
 * # ⚠️ Why the *answer* is not streamed, though *progress* is
 *
 * Streaming shows a draft before `check` has scored it. The check stage exists to catch an
 * answer that ranks participants or states a bare number, and an answer that has already
 * been read cannot be unread. When `check` can run incrementally this can change; until
 * then, the whole pipeline resolves and then speaks.
 *
 * ⭐ That rule is about the *draft*, and it was read too broadly once. `onStage` below emits
 * each stage's record the moment it completes, and a measured run on modest hardware is why:
 * six sequential calls at ~6 tokens/second took 291s, during which the client rendered the
 * single word "Thinking" and nothing else. There is no way to tell a working pipeline from a
 * hung one by looking at that, and a participant who correctly concludes it has hung is
 * being misled by the interface rather than by the model.
 *
 * ⚠️ What crosses this callback is deliberately **only what the trace already carried** — a
 * stage id, its tier, its model, its duration. No `mem.draft`, no `mem.understanding`, no
 * text of any kind. Progress is a fact about the machinery; the draft is the thing being
 * withheld, and widening this to carry partial prose would defeat `check` by the back door.
 */

import { CHECKS, STAGES, Tier } from "./stages";
import { systemPrompt } from "./agents";
import * as hf from "./huggingface";
import * as ollama from "./ollama";

/** ⚠️ One refinement, not a loop. See `refine` below. */
const MAX_REFINEMENTS = 1;

/**
 * ⭐ Below this throughput, the staged pipeline is abandoned for a single call.
 *
 * # ⚠️ The failure this fixes: the assistant could not finish at all
 *
 * Measured on the machine that prompted this: Ollama on CPU at roughly six tokens a second,
 * the model evicted between calls despite `keep_alive`, five sequential stages, 291s in total
 * — and `understand` alone eventually ran 180787ms against a 180s ceiling and failed the whole
 * request. The pipeline was not slow. It was **unable to return anything**, and a participant
 * on that machine had no way to ask a question and get an answer.
 *
 * ⚠️ The tempting fix is to raise the timeout. That converts an outright failure into a
 * five-minute wait, which is the same defect wearing a longer coat.
 *
 * ⚠️ The second tempting fix is to *measure* before choosing, and that was tried and removed.
 * A probe against a cold model spent 20s and then 94s without returning a figure, because the
 * cost being measured was the model load and no probe can avoid paying that once. The rate is
 * now read off the previous real call — see `ollama.throughput` — so the first question of a
 * process takes this path unmeasured and every later one is decided on observed fact.
 *
 * ⭐ 12 tokens/second, not a round number picked for looks. The four capped stages request
 * 200 + 200 + 60 + 500 = 960 tokens, plus `compose` uncapped at a few hundred more — call it
 * ~1300 tokens for a full pass. At 12 tok/s that is ~110s, which fits inside one request with
 * room for a cold load; at 6 tok/s it is ~220s and does not. The threshold is therefore
 * derived from the token budget this file already declares, and if `TOKEN_CAP` changes this
 * number should be rederived rather than left standing.
 *
 * # ⚠️ What the direct path is NOT allowed to be
 *
 * It is one `compose` call, and it keeps `compose`'s prompt — including the clause forbidding
 * invented grades and categories, which was added after a live run produced a fabricated
 * "Grade A / B / C" scheme. ⭐ Dropping `check` is a real loss and is reported as one: the
 * trace says the draft was not scored, so nobody reads an unchecked answer believing it was
 * checked. `stages.js` calls `check` the process monitor, and a monitor that is silently
 * skipped is worse than one that is absent.
 */
const STAGED_MIN_TOK_PER_SEC = 12;

/**
 * ⭐ Output cap per stage — the latency lever that actually worked.
 *
 * Measured on llama3.2:3b, an uncapped run took 239s across five stages. Three of those
 * stages write for another stage rather than for a person, and uncapped they produced
 * several hundred tokens each that nobody would ever read.
 *
 * `compose` is deliberately absent: it is the only stage whose output a person sees, and
 * truncating an answer mid-sentence to save a few seconds would be a bad trade. It runs on
 * the model's own default.
 *
 * ⚠️ That trade inverts on a slow enough machine, and `DIRECT_COMPOSE_CAP` below is where it
 * is made explicitly rather than by leaving `compose` uncapped everywhere.
 */
const TOKEN_CAP = {
  /** Intent, quantities, and whether the engine is needed. Notes, not prose. */
  understand: 200,
  /** A list of what is known and unknown. */
  ground: 200,
  /** One `axis: pass|fail` line per axis. Anything more is the model explaining to nobody. */
  check: 60,
  /** A rewrite of `compose`'s draft, so it is bounded by roughly the same size. */
  refine: 500,
};

/**
 * ⭐ The one case where `compose` *is* capped: the direct path on a machine observed too slow
 * to finish an uncapped answer inside `TIMEOUT_MS`.
 *
 * ⚠️ This contradicts `TOKEN_CAP`'s rule above, and the contradiction is the point. That rule
 * reasons about "a whole answer versus an answer truncated to save a few seconds", and there
 * truncating is plainly the worse trade. Below `DIRECT_CAP_BELOW_TOK_PER_SEC` the alternatives
 * are different ones: a measured run at 4.9 tok/s spent the entire 180s ceiling and returned
 * *nothing* — the participant waited three minutes and was handed a remedy instead of an
 * answer. So the real choice is a bounded answer against no answer, and 500 tokens of correct
 * prose beats a timeout.
 *
 * 500 matches `refine`'s cap, which exists to bound a rewrite of a `compose` draft — so it is
 * already this project's estimate of how long a person-facing answer runs. At 5 tok/s it is
 * ~100s of generation, inside the ceiling with room for the load.
 *
 * ⭐ The threshold is separate from `STAGED_MIN_TOK_PER_SEC` because it answers a different
 * question. That one asks whether five stages fit; this asks whether one uncapped stage fits.
 * A machine between the two runs `direct` uncapped, which is the correct middle behaviour.
 * 8 tok/s ≈ 160s for an 800-token answer at the outside — the last rate where not capping is
 * defensible.
 *
 * ⚠️ A machine with *no* observed rate is capped as well, and `direct` explains why: an
 * uncapped first question that times out teaches nothing, because a failed call reports no
 * token count. See the note on `capped` there.
 */
const DIRECT_COMPOSE_CAP = 500;
const DIRECT_CAP_BELOW_TOK_PER_SEC = 8;

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
function memory(query, agent, onStage) {
  return {
    query,
    agent,
    /** ⚠️ Not memory. An observer, held here only so `record` can reach it. */
    onStage,
    stages: [],
    /** What `ground` retrieved, for `compose` to cite and `check` to test against. */
    grounding: [],
    draft: null,
    proposals: [],
  };
}

/**
 * One stage's record in the trace.
 *
 * ⭐ Also the single place a stage becomes visible to the caller, which is why `onStage` is
 * invoked from here rather than from the six call sites: a stage that is recorded but not
 * announced would be a stage the progress view silently skips, and that divergence would
 * only ever be noticed as a UI that stalls on the second-to-last step.
 */
function record(mem, id, { tier, model, ms, ok, degraded, detail }) {
  const entry = { id, tier, model, ms, ok, degraded, detail };
  mem.stages.push(entry);
  announce(mem, { ...entry, state: "done" });
}

/**
 * ⭐ Announce that a stage has *started*, before it has produced anything.
 *
 * ⚠️ Emitting only on completion looks sufficient and is not. The measured stages here run
 * 40–80s each, so a client told only about finished stages sits on "understand — done" for
 * the entire 79s that `check` is running, and the last stage of all is never announced as
 * running at all. The interesting moment for someone watching is the one where nothing has
 * come back yet, which is precisely the moment a completion-only feed says nothing about.
 */
function begin(mem, id, { tier, model }) {
  announce(mem, { id, tier, model, state: "running" });
}

/**
 * ⚠️ A throwing or slow observer must not take the pipeline down with it. The answer is the
 * product; progress is a courtesy, and a courtesy does not get to fail the request.
 */
function announce(mem, event) {
  try {
    mem.onStage?.(event);
  } catch {
    /* a broken observer is not the model's problem */
  }
}

/**
 * Run the pipeline.
 *
 * Returns `{ ok, answer, proposals, trace, blocked }`. Never throws: a failure at any stage
 * becomes a reported outcome, because a 500 tells the participant nothing they can act on.
 *
 * `onStage` is optional and receives `{id, tier, model, state, ...}` as each stage starts and
 * finishes. Omitting it is the non-streaming path and changes nothing else.
 */
export async function run({ query, agent, base, onStage }) {
  const mem = memory(query, agent, onStage);
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

  // ⭐ A lookup, not a stage: `ollama.throughput` reads back the rate a previous call was
  // observed to achieve and does no work of its own.
  //
  // ⚠️ It was a stage, briefly, and that was the mistake. Probing cost 20s and then 94s
  // against a cold model without returning a usable figure, so the participant waited through
  // a measurement in order to be told the machine was too slow to keep them waiting. Now the
  // first question of a process runs `direct` with no measurement at all, `generate` records
  // what it achieved on the way past, and every question after that is decided on an observed
  // rate. Nothing is announced here because nothing happens here.
  const speed = ollama.throughput({ model: base.model });
  const staged = speed.ok && speed.tokensPerSecond >= STAGED_MIN_TOK_PER_SEC;

  if (!staged) {
    return await direct({ mem, system, base, speed, specialist, started });
  }

  /**
   * ⚠️ **Sequential, and not for want of trying.**
   *
   * `understand`, `ground`, and `specialise` all read only the participant's message, so on
   * paper they are independent and should run at once. Measured, that made things worse:
   * both concurrent calls hit the 120s timeout and the whole request failed, where the
   * sequential version had completed in 239s.
   *
   * The reason is that Ollama serialises requests against a single loaded model. Issuing two
   * concurrently does not halve the latency — it queues the second behind the first while
   * *both* clocks run, so the wall time is unchanged and each individual call now appears to
   * take twice as long. Every request-level timeout then fires at once.
   *
   * ⭐ So the latency budget is spent on token caps instead, which is where it actually
   * was: `understand` and `ground` write notes for `compose` to read, not prose for a
   * person, and uncapped they were producing several hundred tokens each that nobody sees.
   * Concurrency would be the right tool against a server that batches. This one does not.
   */
  for (const s of STAGES) {
    const t0 = Date.now();

    if (s.id === "specialise") {
      // ⭐ The one stage that leaves the machine — and the one that is allowed to be
      // skipped. Degrading is recorded, never silent.
      if (!specialist.usable) {
        // ⚠️ Deliberately not announced as `running` first. This stage is being skipped, and
        // showing it start and instantly finish would flash a step that never ran.
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

      begin(mem, s.id, { tier: Tier.SPECIALIST, model: specialist.model });
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
        detail: r.ok
          ? null
          : `Specialist unreachable (${r.reason}); the base model answered alone.`,
      });
      if (r.ok) mem.specialist = r.text;
      continue;
    }

    begin(mem, s.id, { tier: Tier.BASE, model: base.model });
    const r = await ollama.generate({
      model: base.model,
      system,
      prompt: prompts[s.id](mem),
      // `check` scores rather than writes; determinism matters more there than anywhere.
      temperature: s.id === "check" ? 0 : 0.2,
      maxTokens: TOKEN_CAP[s.id],
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
          // ⚠️ Names the stage *and* what happened to it. A timeout here is not the same
          // event as an unreachable server, and a participant reading "the pipeline stopped"
          // with no cause has been told only that something went wrong.
          detail:
            r.reason === "ollama_timeout"
              ? `"${s.label}" ran for over 180 seconds without finishing. The model is installed and answering, just slower than the request allows.`
              : `The pipeline stopped at "${s.label}".`,
          remedy:
            r.reason === "ollama_unreachable"
              ? "Start it with: ollama serve"
              : r.reason === "ollama_timeout"
                ? // ⭐ The measured cause on this machine, and it is not something prompt
                  // tuning reaches: `/api/ps` reported `size_vram: 0`, so the model is running
                  // on CPU at roughly six tokens a second. Naming that is more useful than
                  // suggesting a smaller model, which would trade the answer for the latency.
                  "The model is running on CPU. Check `ollama ps` — a `SIZE` with no GPU share means every stage runs at a few tokens per second."
                : null,
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
    // ⚠️ `refine` is not in `STAGES`, so a progress view built from that list has no slot for
    // it and would appear to finish at `check` and then hang for the ~60s this takes. It is
    // announced like any other stage precisely because it is the one that is *not* expected.
    begin(mem, "refine", { tier: Tier.BASE, model: base.model });
    const r = await ollama.generate({
      model: base.model,
      system,
      prompt: prompts.refine(mem),
      temperature: 0.1,
      maxTokens: TOKEN_CAP.refine,
    });
    record(mem, "refine", {
      tier: Tier.BASE,
      model: base.model,
      ms: Date.now() - t0,
      ok: r.ok,
      degraded: false,
      detail: `Refined once: ${mem.checkFailed.join(", ")}.`,
    });
    if (r.ok) mem.draft = stripPreamble(r.text);
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
      // ⭐ Stated rather than inferred from the absence of the field. `direct` sets
      // `checks: null` too — for the opposite reason, that no check ran — so a reader with
      // only `checks` cannot tell "nothing failed" from "nothing was tested".
      shape: "staged",
      tokensPerSecond: speed.ok ? speed.tokensPerSecond : null,
      specialist: specialist.usable ? specialist.model : null,
      specialistNote: specialist.usable ? null : specialist.note,
      checks: mem.checkFailed ?? null,
    },
  };
}

/**
 * ⭐ One call, for a machine that cannot afford five.
 *
 * # ⚠️ This is a degradation, and it is reported as one
 *
 * `stages.js` sets out why the staged shape exists — a query is understood, then answered by
 * whatever is most specialised, then **checked**, and the check can send `compose` back once.
 * This path has none of that. It composes and returns.
 *
 * ⭐ So the trace carries `shape: "direct"`, `checks: null`, and a `degraded` stage record
 * saying in words that the draft was not scored. That is the same obligation the specialist
 * tier already meets: `stages.js` requires that degrading "should cost quality, not
 * availability — but the degradation is *reported*, because an answer produced without the
 * specialist is a different answer and the participant is entitled to know which one they
 * got." An unchecked answer is a different answer by exactly that argument.
 *
 * ⚠️ **The prompt is `compose`'s own, not a new one.** It is reached through `prompts.compose`
 * against a memory whose `understanding` and `grounding` are simply absent, so the clause
 * forbidding invented grades, categories and thresholds — added after a live run fabricated a
 * "Grade A / B / C" scheme — still governs. A second prompt written for this path would be a
 * second place for that rule to be forgotten, and it would be forgotten in the path that has
 * no checker to catch it.
 *
 * ⭐ **`specialise` is kept, and that is not an inconsistency.** The measurement this path
 * branches on is *local* tokens per second, and `specialise` is the one stage that leaves the
 * machine — it is an `hf.infer` call whose cost is a network round trip. Dropping it here
 * would give up the most domain-competent part of the answer to save time it does not spend.
 * The slower the local model is, the *more* worth having a remote specialist is.
 */
async function direct({ mem, system, base, speed, specialist, started }) {
  // ⭐ See `DIRECT_COMPOSE_CAP`. On a machine seen generating too slowly to finish, an uncapped
  // answer is not a longer answer — it is a timeout.
  //
  // ⚠️ **An unmeasured machine is capped too, and getting that wrong once is what proved it.**
  // The obvious rule is "only cap what you have observed", on the reasoning that the first
  // question is no place to assume the worst about unseen hardware. Measured: the first
  // question ran uncapped, spent the full 180s ceiling, and returned nothing — and because a
  // failed call reports no `eval_count`, nothing was learned from it either. That is a trap
  // with no exit: every question is the first question, so every question times out and no
  // rate is ever remembered. Capping the unmeasured case makes the first answer bounded but
  // *arriving*, and arriving is what teaches the rate that decides everything after it.
  const capped = !speed.ok || speed.tokensPerSecond < DIRECT_CAP_BELOW_TOK_PER_SEC;

  // ⭐ Remote, so cheap on the axis that is scarce here. Skipped exactly as the staged path
  // skips it — recorded, never silent — when there is no usable specialist.
  if (specialist.usable) {
    const ts = Date.now();
    begin(mem, "specialise", { tier: Tier.SPECIALIST, model: specialist.model });
    const rs = await hf.infer({
      model: specialist.model,
      prompt: `${system}\n\n${prompts.specialise(mem)}`,
    });
    record(mem, "specialise", {
      tier: Tier.SPECIALIST,
      model: specialist.model,
      ms: Date.now() - ts,
      ok: rs.ok,
      degraded: !rs.ok,
      detail: rs.ok
        ? null
        : `Specialist unreachable (${rs.reason}); the base model answered alone.`,
    });
    if (rs.ok) mem.specialist = rs.text;
  } else {
    record(mem, "specialise", {
      tier: Tier.SPECIALIST,
      model: specialist.model,
      ms: 0,
      ok: false,
      degraded: true,
      detail: specialist.note,
    });
  }

  const t0 = Date.now();
  begin(mem, "compose", { tier: Tier.BASE, model: base.model });

  const r = await ollama.generate({
    model: base.model,
    system,
    // `mem.understanding` and `mem.grounding` are unset, and `prompts.compose` already renders
    // that as "(none)" and "(nothing retrieved)" — the honest rendering, and one the staged
    // path can reach too when a stage returns nothing.
    prompt: prompts.compose(mem),
    temperature: 0.2,
    ...(capped ? { maxTokens: DIRECT_COMPOSE_CAP } : {}),
  });

  record(mem, "compose", {
    tier: Tier.BASE,
    model: base.model,
    ms: Date.now() - t0,
    ok: r.ok,
    // ⚠️ `degraded` marks a stage that ran and produced less than it should have. A stage that
    // did not run at all is a failure, not a degradation, and the staged path draws the same
    // line — it sets `degraded: false` when `ollama.generate` fails. Marking a failed call
    // degraded would put the throughput explanation in `Assistant.js`'s "what was lost" list
    // in place of the reason nothing came back.
    degraded: r.ok,
    detail: r.ok
      ? // ⚠️ The cap is named whenever it applied — in both branches, which is why it is
        // appended here rather than written into each. A bounded answer presented as a whole
        // one is the silent degradation this file rejects everywhere else, and it is the kind
        // a reader cannot catch for themselves: prose that stops early still reads as prose.
        (speed.ok
          ? `This machine was last observed at ${speed.tokensPerSecond.toFixed(1)} tokens/second, below the ${STAGED_MIN_TOK_PER_SEC}/s the staged pipeline needs. Composed in one call; the draft was not scored.`
          : // ⚠️ Not "unmeasurable". Nothing is probed, so the first question after a restart
            // has no rate to consult and takes the safe path. Saying the machine could not be
            // measured would report a fault where there is only an absence of history.
            `First question since this server started, so the model's speed here is not yet known and the staged pipeline was not risked. Composed in one call; the draft was not scored.`) +
        (capped
          ? ` The answer was capped at ${DIRECT_COMPOSE_CAP} tokens, because an uncapped one is not certain to finish inside the ${Math.round(ollama.TIMEOUT_MS / 1000)}s limit here — it may stop before it is done.`
          : "")
      : r.reason,
  });

  if (!r.ok) {
    return {
      ok: false,
      blocked: {
        reason: r.reason,
        detail:
          r.reason === "ollama_timeout"
            ? // ⚠️ Reaching here means even one call did not finish. Saying "try the fast
              // path" would be useless advice, because this *is* the fast path.
              "A single composition ran for over 180 seconds without finishing. This is already the shortest path the assistant has."
            : `The assistant stopped while composing.`,
        remedy:
          r.reason === "ollama_unreachable"
            ? "Start it with: ollama serve"
            : r.reason === "ollama_timeout"
              ? "The model is too large for this machine. A smaller one — for example `ollama pull llama3.2:1b` — will finish where this one cannot."
              : null,
      },
      trace: { stages: mem.stages, ms: Date.now() - started, shape: "direct" },
    };
  }

  mem.draft = stripPreamble(r.text);

  return {
    ok: true,
    answer: mem.draft ?? "",
    proposals: mem.proposals,
    trace: {
      stages: mem.stages,
      ms: Date.now() - started,
      agent: mem.agent.id,
      domain: mem.agent.domain,
      // ⭐ Read by the view to say which shape ran. Without it the two paths are
      // indistinguishable in the trace, and the missing check would look like a check that
      // passed.
      shape: "direct",
      tokensPerSecond: speed.ok ? speed.tokensPerSecond : null,
      specialist: specialist.usable ? specialist.model : null,
      specialistNote: specialist.usable ? null : specialist.note,
      // ⚠️ `null` here means "not run", and the view must not render it as "nothing failed".
      // The `degraded` stage record above is what says so in words.
      checks: null,
    },
  };
}

/**
 * Drop a leading line in which the model announces what it is about to do.
 *
 * ⚠️ Belt and braces alongside the instruction in `prompts.refine`. A live run opened with
 * *"Here's a rewritten version of the draft:"* — the participant never saw a draft and does
 * not know a checker ran, so that sentence is pipeline scaffolding showing through the
 * product. Prompting alone does not reliably suppress it; a small deterministic strip does.
 *
 * Kept deliberately narrow: it only fires on a *first* line that both ends in a colon and
 * matches a known announcement, so an answer that legitimately begins with a short
 * colon-terminated heading survives.
 */
function stripPreamble(text) {
  const trimmed = text.trim();
  const [first, ...rest] = trimmed.split("\n");

  const announces =
    /^(here('s| is)|below is|this is)\b.*\b(rewrit|revis|updat|correct|version|draft)\b.*:$/i;

  return announces.test(first.trim()) ? rest.join("\n").trim() : trimmed;
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
      "",
      // ⚠️ Added after a live run produced a bulleted "Grade A / B / C" scheme this exchange
      // has never defined, wrapped in a disclaimer. The disclaimer is the part a reader
      // drops; the list is the part they keep. Stopping is a better answer than illustrating.
      "⚠️ Do not illustrate with made-up examples. If you do not know this exchange's grades,",
      "categories, thresholds, or codes, say that they are defined by the exchange and stop —",
      "do not invent a plausible set to show what one might look like, even labelled as an",
      "example. An invented list is remembered after the caveat around it is forgotten.",
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
      // ⚠️ Added after a live run began its answer with "Here's a rewritten version of the
      // draft:". The participant never saw a draft and does not know a check ran; a stage
      // narrating its own place in the pipeline is scaffolding that leaked into the product.
      "Reply with the rewritten answer and nothing else. No preamble, and no reference to",
      "this being a rewrite — the person reading it never saw the earlier version.",
      "",
      "Draft:",
      m.draft ?? "",
    ].join("\n"),
};
