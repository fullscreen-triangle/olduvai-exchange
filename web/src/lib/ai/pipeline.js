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
import { plan as buildPlan } from "./plan";
import { fetchAll } from "./sources";
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
function memory(query, agent, onStage, facts = [], position = null) {
  return {
    query,
    agent,
    /**
     * ⭐ The participant's `Estimate` in structured form — the same read `facts` was rendered
     * from, carried through for `lib/ai/plan.js`.
     *
     * ⚠️ **Never composed into a prompt.** `facts` is the model's view of the position and this
     * is the planner's; duplicating the position into the prompt in two shapes would give a
     * stage two sources for one number. The only field read from it is `rests_on_observation`,
     * which decides whether a coordinate may be sent to a weather service at all — and that is
     * a routing decision, not something to state.
     *
     * ⚠️ `null` when the engine could not be reached. The planner treats that as "not measured",
     * which is the safe direction: it declines the lookup rather than guessing a coordinate.
     */
    position,
    /** ⚠️ Not memory. An observer, held here only so `record` can reach it. */
    onStage,
    stages: [],
    /**
     * ⭐ What the engine actually knows, read before any stage ran. See `lib/ai/facts.js`.
     *
     * ⚠️ Distinct from `grounding`, and the distinction is the whole point. `grounding` is a
     * *model's guess* at what would need to be true; this is measured state from
     * `olduvai-core`. Merging them would let a stage that invented a requirement sit beside a
     * computed sigma with equal standing, and `check` could no longer tell which was which.
     */
    facts,
    /** What `ground` retrieved, for `compose` to cite and `check` to test against. */
    grounding: [],
    /**
     * ⭐ What the *sources* returned — real readings from `lib/ai/sources.js`, distinct from
     * `grounding` above.
     *
     * ⚠️ The distinction is the same one `facts` draws against `grounding`, one layer out.
     * `grounding` is a model's notes about the question; this is material fetched from a named
     * third party and stamped `asserted`. Merging them would let a sentence the model wrote sit
     * beside a Comtrade tonnage with equal standing, and `compose` could no longer attribute
     * either. Each entry is `{id, label, ok, lines, reason}`.
     */
    retrieved: [],
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
export async function run({ query, agent, base, onStage, facts = [], position = null }) {
  const mem = memory(query, agent, onStage, facts, position);
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

  /**
   * ⭐ **The one answer no model composes.**
   *
   * When the planner declines because the question spelled a commodity one letter away from one
   * this exchange holds, its note *is* the answer: it names the spelling that works and the list
   * that exists. Both facts come from `sources.js`'s own table. Nothing in the reply is a claim
   * about a market, a price, or a buyer — so there is nothing here for a model to add, and,
   * measured, a great deal for it to subtract.
   *
   * # ⚠️ The measurement, because "the model garbles it" is too vague to act on
   *
   * Three consecutive live runs of the participant's own question — *"I have 3t of chamomille tea
   * leaves, where can I sell them ?"* — with the note in the compose prompt, on this machine:
   *
   *   1. **7.8 s** — never mentions the spelling at all. The participant learns nothing.
   *   2. **11.0 s** — correct: names "chamomile", asks them to ask again.
   *   3. **9.1 s** — *"we have a known quantity of 3 tonnes of chamomile tea leaves available"*,
   *      converting the participant's own claim into an inventory record this exchange holds.
   *
   * An earlier run inverted the note outright, writing *"The exchange does not hold trade data
   * for 'chamomile'"* — the opposite of what it was handed.
   *
   * ⚠️ **Wording will not fix this, and two rounds of A/B testing establish that rather than
   * assume it.** The same note scored 3/3 in an isolated prompt and 1/3 live; a terser wording
   * inverted once and invented *"local herbal suppliers or health food stores"*. The variable is
   * not the sentence, it is the prompt around it — the same prompt-size effect measured twice
   * before on other payloads, where this model reproduces the *shape* of what it is handed and
   * its qualifiers not at all.
   *
   * ⭐ So this is not a shortcut for latency, though it is also that. It is the same rule the
   * rest of the file follows: a figure a participant will act on does not pass through the model.
   * "Spell it 'chamomile'" is such a figure. Routing deterministic text through a stage measured
   * to corrupt it two times in three buys nothing and costs the answer.
   *
   * ⚠️ Placed before the shape is chosen, because a spelling mismatch is answerable at any
   * throughput — the staged path would compose it just as unreliably, and gating on speed here
   * would make the answer depend on how fast the machine happened to be.
   *
   * ⚠️ The degradation is reported, not hidden: `ground` is recorded as the stage that ran, the
   * trace says `shape: "planner"`, and `compose` appears nowhere — so the view cannot present
   * this as an answer a model wrote and checked.
   */
  const declined = await buildPlan({
    query: mem.query,
    // ⚠️ `null` deliberately. On the staged path `ground` passes `understand`'s output here, but
    // that stage has not run yet and this check must not wait for it — the near-miss is decided
    // from the participant's own words, which are complete before any model reads them. A
    // spelling this planner can see now does not become visible later.
    understanding: null,
    base,
    position: mem.position,
  });
  if (declined.via === "spelling") {
    mem.planNote = declined.note;
    mem.planVia = declined.via;
    mem.retrieved = [];
    record(mem, "ground", {
      tier: Tier.BASE,
      // ⚠️ `null` — no model ran. Naming one against a stage it did not run is the fabricated
      // trace entry this file rejects on the `direct` path for the same reason.
      model: null,
      ms: 0,
      ok: true,
      // ⚠️ `degraded`, because sources were available and none was consulted. That is exactly
      // what happened, and the participant is entitled to see it said plainly rather than infer
      // it from an answer that mentions no figures.
      degraded: true,
      detail: declined.note,
    });
    return {
      ok: true,
      answer: declined.note,
      readings: readingsFor(mem),
      proposals: mem.proposals,
      trace: {
        stages: mem.stages,
        ms: Date.now() - started,
        agent: mem.agent.id,
        domain: mem.agent.domain,
        // ⭐ A third shape, named rather than folded into `direct`. The two existing shapes both
        // end in a model call; this one does not, and a view that could not tell them apart would
        // show "composed in one call" over prose no call composed.
        shape: "planner",
        tokensPerSecond: speed.ok ? speed.tokensPerSecond : null,
        specialist: null,
        specialistNote: "No model was called: the answer is the planner's own, verbatim.",
        checks: null,
      },
    };
  }

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

    // ⭐ **Retrieval, before the model call that summarises it.**
    //
    // `stages.js` has always described this stage as *"Retrieve reference material that bears
    // on the question"* and it retrieved nothing — so the model was asked to *speculate* about
    // what would need to be true, and `compose` received the speculation as though it were
    // material. Asked where to sell 3 tonnes of chamomile, the only concrete thing in the
    // prompt was the participant's coordinates, so the answer was about the coordinates.
    //
    // ⚠️ The stage is *completed*, not replaced. It keeps its place in `STAGES`, its tier, its
    // token cap, and its own prompt; what changes is that the prompt now has real readings in
    // it. `notes/31` line 4 asked for this and lines 560–639 supplied a working keyless
    // provider — nothing here is a new architecture.
    if (s.id === "ground") await retrieve(mem, base);

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
      // ⚠️ A ground stage that retrieved nothing is `degraded`, in the same sense a missing
      // specialist is: it ran and produced less than it should have. Before this, "retrieved
      // nothing" and "retrieved four sources" rendered identically, so a participant could not
      // tell an answer resting on Comtrade from one resting on the model's own recollection.
      degraded: s.id === "ground" && r.ok ? !mem.retrieved.some((x) => x.ok) : false,
      detail: r.ok ? (s.id === "ground" ? retrievalDetail(mem) : null) : r.reason,
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
    // ⭐ The figures as the sources gave them. See `readingsFor` — the model's prose is not a
    // trustworthy carrier of numbers on this hardware, so the numbers travel beside it.
    readings: readingsFor(mem),
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
 * ⭐ It is called with `{ lean: true }`, and that does not weaken the paragraph above. `lean`
 * is an option on the *same* prompt: every rule is emitted on both shapes, stated in one line
 * here instead of three. Nothing is conditional on the path except how much prose each rule
 * gets. Measurement forced it — the full prompt is ~1005 tokens against ~240 of data, and at
 * that size this machine's model returned an answer containing none of the retrieved figures
 * and an invented marketplace. See `prompts.compose` for the numbers.
 *
 * ⭐ **`specialise` is kept, and that is not an inconsistency.** The measurement this path
 * branches on is *local* tokens per second, and `specialise` is the one stage that leaves the
 * machine — it is an `hf.infer` call whose cost is a network round trip. Dropping it here
 * would give up the most domain-competent part of the answer to save time it does not spend.
 * The slower the local model is, the *more* worth having a remote specialist is.
 */
async function direct({ mem, system, base, speed, specialist, started }) {
  // ⭐ **Retrieval runs here too, and that is not a contradiction of what this path is for.**
  //
  // ⚠️ This path exists to spend fewer *model* calls on a machine measured too slow to afford
  // five. Retrieval is not a model call: `lib/ai/plan.js` resolves a named commodity by table
  // lookup, and `fetchAll` issues concurrent HTTP requests to four different hosts, bounded at
  // 6 s each. None of it queues behind the single loaded Ollama model, so it does not lengthen
  // the thing this path is shortening.
  //
  // ⚠️ Leaving it out was the alternative and it fails plainly: **the first question after any
  // server restart takes this path**, so the participant's first question would be the one
  // answered with no sources at all — and they have no way to tell it apart from a question
  // that had none to find. Withholding retrieval to save time it does not cost would make the
  // most likely answer the worst one.
  //
  // ⚠️ The planner may still call the model when nothing matches. That is the one case where
  // this does spend a call — bounded at `PLAN_TOKEN_CAP`, and only for a question that asked
  // for external context and named nothing recognisable.
  const tg = Date.now();
  begin(mem, "ground", { tier: Tier.BASE, model: null });
  await retrieve(mem, base);
  record(mem, "ground", {
    tier: Tier.BASE,
    // ⚠️ `null`, not `base.model`. On this path no model summarised the readings — they go to
    // `compose` verbatim. Naming a model against a stage it did not run would put a fabricated
    // step in the trace, and the trace is the only place the two shapes can be told apart.
    model: null,
    ms: Date.now() - tg,
    ok: true,
    // ⚠️ `degraded` on this path means "sources were consulted and none answered", the same
    // sense as in the staged loop. It does NOT mark the missing summarisation step — that is
    // what `shape: "direct"` and the `compose` record already say, and saying it twice would
    // put the fast path's normal behaviour in the view's "what was lost" list.
    degraded: !mem.retrieved.some((x) => x.ok),
    detail: retrievalDetail(mem),
  });

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
    // ⭐ `lean` — the same rules, stated once each. See `prompts.compose`.
    //
    // ⚠️ `mem.understanding` and `mem.grounding` are unset on this path, and the full prompt
    // renders that as the headings "Your reading of it: (none)" and "What is known and unknown:
    // (nothing retrieved)". That is honest, and on the staged path those headings carry real
    // content — but here they are four lines asserting that nothing is known, printed directly
    // above the retrieved figures. Measured, the full prompt on this machine dropped every
    // figure and invented a marketplace in their place; the lean one kept six of eight.
    prompt: prompts.compose(mem, { lean: true }),
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
    // ⭐ **Most load-bearing on this path**, which is the only one this machine reaches. There
    // is no `check` here to score the draft, so the readings beside the prose are the
    // participant's only way to see what the sources actually said — and, measured, the only
    // reason a live wrong-commodity answer was caught at all. See `readingsFor`.
    readings: readingsFor(mem),
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

/**
 * ⭐ **Plan the lookups and run them.** Writes `retrieved`, `planNote` and `planVia` onto memory.
 *
 * ⚠️ One function, called from both shapes. The staged path calls it inside `ground`; `direct`
 * calls it before composing. Inlining it twice would let the two paths retrieve differently, and
 * the difference would surface as "the first question after a restart answers differently from
 * every question after it" — which is the hardest kind of divergence to attribute, because both
 * answers are individually plausible.
 *
 * ⚠️ Never throws. `fetchSource` already converts a failed source into `{ok: false, reason}`,
 * and a planner that cannot reach the model returns an empty plan. A source that did not answer
 * is reported to `compose` as a source that did not answer; it does not fail the stage.
 */
async function retrieve(mem, base) {
  const p = await buildPlan({
    query: mem.query,
    understanding: mem.understanding,
    base,
    position: mem.position,
  });
  mem.retrieved = p.plan.length ? await fetchAll(p.plan) : [];
  mem.planNote = p.note;
  mem.planVia = p.via;
}

/**
 * The retrieved readings, flattened and attributed, for a prompt.
 *
 * ⚠️ Each block is prefixed with its source name. Without that, four sources' lines run
 * together into one undifferentiated list and `compose` — instructed to name its source —
 * attributes a Comtrade tonnage to PubChem, which is a fabricated citation wearing a real
 * number.
 */
function retrievedLines(m) {
  const out = [];
  for (const r of m.retrieved ?? []) {
    if (!r.ok) continue;
    out.push(`From ${r.label}:`);
    for (const l of r.lines) out.push(`  ${l}`);
  }
  return out;
}

/**
 * ⭐ The readings as retrieved, for the participant to read beside the answer.
 *
 * # ⚠️ Why the figures must reach the reader without passing through a model
 *
 * Measured failures of the prose as a carrier, on this hardware:
 *
 *   - Under the full prompt it dropped **every** figure and wrote *"marketplaces such as
 *     eBay"* — a seller invented outright, in place of the eight countries it was handed.
 *   - Told in the prompt, in the line itself, that the countries are "NOT the world's largest
 *     importers", it wrote *"major markets"* anyway — the exact phrase the rule forbids.
 *   - Under the lean prompt it kept the tonnages but dropped that qualifier, so a partial
 *     sample of reporting countries read as a ranking.
 *
 * ⭐ The pattern is that a 3b model at ~6 tokens/second reproduces the *shape* of a reading
 * reliably and its caveats not at all. Adding a tenth rule made this worse, not better, which
 * is what ended the prompt-engineering approach.
 *
 * ⚠️ **It does not resample the numbers, and an earlier version of this comment said it did.**
 * That claim came from comparing a live answer against a reading fetched under a *different* HS
 * code, and it was wrong: in the run that produced these readings every figure was copied
 * exactly. The correction matters because it moves the fault — the numbers were right and the
 * *commodity* was wrong, which is a planner defect (see `commodityIn` in `plan.js`) that no
 * amount of care in this file would have caught. It is also why these lines earn their place:
 * they are what made the real defect visible.
 *
 * ⚠️ So the answer prose is no longer the only carrier. These lines are returned verbatim
 * beside it, exactly as the source produced them, qualifiers included — which is the one form
 * of the numbers nothing can reword. `README.md` excludes AI from deterministic synthesis; a
 * figure that a participant will price against belongs on the deterministic side of that line,
 * and routing it through a language model is what put it on the wrong side.
 *
 * ⭐ This does not remove the readings from the prompt. The model still sees them and still
 * writes the prose, because the prose is what answers the question — but its numbers can now
 * be checked against the source by the person reading them, rather than taken on trust.
 */
function readingsFor(mem) {
  const out = (mem.retrieved ?? []).map((r) => ({
    label: r.label,
    ok: r.ok,
    // ⚠️ Verbatim. Not summarised, not reformatted, not truncated — the caveats are embedded
    // in these strings by `sources.js` precisely so that they cannot be separated from the
    // figures they qualify, and any processing here would be the separation happening one
    // layer further out.
    lines: r.ok ? r.lines : [],
    reason: r.ok ? null : (r.reason ?? null),
  }));

  // ⭐ **A refusal to look anything up is a reading.** It is the shortest one this file can
  // return and the most easily lost: `compose` is now told to state the planner's reason, but
  // "told to" is precisely the guarantee the rest of this function exists to replace. If the
  // model drops it, the participant is left with an answer about a crop nobody looked up and
  // no way to see that nobody looked.
  //
  // ⚠️ `ok: false` rather than `ok: true` with lines, so the view renders it under "did not
  // answer" — which is what happened. Presenting a non-lookup in the same shape as a Comtrade
  // reading would be the more misleading of the two.
  if (mem.planNote && !out.length) {
    out.push({ label: "No source consulted", ok: false, lines: [], reason: mem.planNote });
  }
  return out;
}

/**
 * What `ground` retrieved, in one sentence for the trace.
 *
 * ⭐ Names the sources that answered *and* the ones that did not, with their reason. A source
 * that timed out and a source that had no data for the commodity are different facts, and a
 * participant reading an answer that omits a market is entitled to know which one happened.
 */
function retrievalDetail(mem) {
  const got = mem.retrieved.filter((x) => x.ok);
  const missed = mem.retrieved.filter((x) => !x.ok);

  if (!mem.retrieved.length) {
    return mem.planNote ?? "No external source was consulted for this question.";
  }

  const parts = [];
  if (got.length) parts.push(`Retrieved from ${got.map((x) => x.label).join(", ")}.`);
  if (missed.length) {
    parts.push(missed.map((x) => `${x.label} did not answer (${x.reason})`).join("; ") + ".");
  }
  return parts.join(" ");
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
      // ⚠️ "anything left without a unit" was previously the whole of item 2, and a live run
      // showed what that teaches. Asked about "3t of chamomile tea leaves", the pipeline spent
      // 42 s concluding it could not proceed because it did not know what "t" meant. It is
      // tonnes. Naming a *genuinely* ambiguous quantity is useful; treating a standard
      // abbreviation as unknowable is the "say nothing safely" failure this file rejects
      // everywhere else, and it is worse than a wrong answer because it wastes the reader's
      // time before refusing.
      "2. Any quantities, with their units. ⚠️ Expand standard abbreviations yourself — t is",
      "   tonnes, kg kilograms, ha hectares, m metres. Only flag a quantity as ambiguous if it",
      "   genuinely could mean two different things here, and say which two.",
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
      // ⚠️ The facts are shown here too, not only to `compose`. Without them this stage
      // dutifully lists "the participant's position" as something only the records could
      // supply — and `compose` then inherits a note saying the answer is unavailable while
      // the answer sits two lines above it. One stage contradicting the other is worse than
      // either being wrong alone, because `check` scores the draft and not the notes.
      ...(m.facts?.length
        ? [
            "⭐ These are already known from the exchange's records — treat them as available,",
            "not as gaps:",
            ...m.facts,
            "",
          ]
        : []),
      // ⭐ The readings this stage just fetched. Its job changes shape when they are present:
      // with material, it summarises what was found; without, it lists what is missing. Both
      // are useful, and asking for the second when the first is available is what produced a
      // "what would need to be true" list sitting on top of eight countries' import tonnages.
      ...(retrievedLines(m).length
        ? [
            "⭐ These readings were just retrieved from external sources for this question.",
            "They are asserted by those sources, not measured by this exchange:",
            ...retrievedLines(m),
            "",
            "Summarise what these readings establish about the question, keeping every figure",
            "and its unit. Then name what is still missing. Do not answer the question yet.",
            "",
          ]
        : [
            "List what would have to be true, or known, to answer it well — and mark each item",
            "as either something you know, or something only the exchange's records could tell",
            "you. Do not answer the question yet.",
            "",
          ]),
      // ⚠️ Without this the stage speculates about our internals — a live run produced "we use
      // a fixed coordinate function to compute addresses", which `compose` then handed to the
      // participant as though it answered their question about selling tea. The model has no
      // knowledge of this codebase, so anything it says about how the exchange works is
      // invention, and it is the *most* damaging kind: it sounds like documentation.
      //
      // ⭐ Note the asymmetry with `compose`. There the rule is "do not explain the machinery";
      // here it is "do not guess at it". Both are needed — a stage told only not to *repeat*
      // internals will still generate them, and a later stage under token pressure will reach
      // for whatever is in its notes.
      "⚠️ Write only about the participant's situation. Do not describe or guess at how this",
      "exchange works internally — you have not been told, so anything you write about its",
      "mechanisms is invented. If something can only come from the exchange, name the missing",
      "fact itself, not the machinery that would supply it.",
    ].join("\n"),

  specialise: (m) =>
    [
      "Answer this question in your domain of expertise.",
      "State units on every quantity.",
      "",
      m.query,
    ].join("\n"),

  /**
   * ⭐ `lean` states the same rules in one line each, for a machine too slow to read them twice.
   *
   * # ⚠️ Why a flag and not a second prompt
   *
   * The `direct` path's own doc argues against forking this prompt: a second one is a second
   * place for the anti-fabrication clauses to be forgotten, in the path that has no checker to
   * catch it. That argument still holds and this does not break it — there is one `compose`,
   * one list of rules, and `lean` chooses how much prose each rule is stated in. A rule added
   * below is added to both shapes or to neither.
   *
   * # ⭐ What was measured
   *
   * The full prompt is 4018 chars (~1005 tokens), of which **3050 chars is instruction and
   * only 968 is the retrieved data**. Handed that prompt and a live Comtrade reading listing
   * eight countries with tonnages, `llama3.2:latest` on this machine returned, in 39045 ms:
   *
   * > *"You can sell your chamomile tea leaves on online marketplaces such as eBay or
   * > specialized platforms for herbal products…"*
   *
   * ⚠️ Every retrieved figure gone, and eBay — which appears in no source — invented in their
   * place. Handed the identical readings under a 1507-char prompt it named six of the eight
   * countries with their tonnages, in 21320 ms.
   *
   * ⭐ So the failure is prompt **size**, not wording. Each ⚠️ clause below was added to repair
   * a real run, and every one of them is still true; but past roughly a thousand tokens on a
   * 3b model they stop being read and start crowding out the figures they were written to
   * protect. Adding a tenth rule made the answers worse, which is what prompted measuring.
   *
   * ⚠️ **`lean` is not clean, and must not be reported as a fix.** In the same measurement the
   * lean prompt still dropped a figure's qualifier despite being told to copy it, corrupted one
   * tonnage (388 → 863) and leaked a raw reporter code as "reporter 48". It is strictly better
   * than losing every figure; it is not a model that can be trusted to restate a caveat. The
   * durable answer is to stop asking a 3b model to carry qualifiers in prose at all — see the
   * note on structural provenance — and this flag only buys room until then.
   */
  compose: (m, { lean = false } = {}) =>
    [
      // ⚠️ These three lines were added after a live run returned the *scaffolding* as the
      // answer — a numbered "1. What they are asking for / 2. Quantities and units" list,
      // followed by "What is known and unknown", verbatim from the stages below. The headings
      // were being read as an output format rather than as inputs, which is an easy mistake to
      // make when the sections are titled and the instruction to write prose is at the bottom.
      "You are writing the final answer that a person will read. Reply with that answer only.",
      ...(lean
        ? []
        : [
            "⚠️ The sections below are your working notes. Do NOT reproduce their headings, do not",
            "number your answer to match them, and do not describe your own reasoning process.",
          ]),
      "",
      "Their question:",
      m.query,
      "",
      // ⭐ Measured state, first and clearly labelled, because the run that motivated all of
      // this said "I don't know your position" while the number sat unread in `Estimate`.
      // Facts precede the model's own notes deliberately: when the two disagree, the engine
      // is right and the ordering should make that obvious rather than leave it to be inferred.
      ...(m.facts?.length
        ? [
            "⭐ Known facts from the exchange's records. These are measured values from this",
            "system, not guesses. Use them directly and state their units:",
            ...m.facts,
            "",
          ]
        : []),
      // ⭐ **The retrieved readings, before the model's own notes about them.**
      //
      // ⚠️ Same ordering argument as `facts` above, and for a sharper reason: `grounding` is a
      // 200-token summary the model wrote *of* this material, and a summary written under a
      // token cap drops numbers. Handing `compose` only the summary is what made the earlier
      // answers vague — the tonnages never survived the intermediate stage. So the source lines
      // are passed through verbatim and the summary sits under them as context, not as a
      // replacement.
      ...(retrievedLines(m).length
        ? [
            ...(lean
              ? ["⭐ Figures retrieved for this question. Use these and no others:"]
              : [
                  "⭐ Reference material retrieved from external sources for this question. These are",
                  "real figures from the named sources. ⚠️ They are ASSERTED by those sources — this",
                  "exchange did not measure them. Use them directly, keep their units, and name the",
                  "source when you state a figure:",
                ]),
            ...retrievedLines(m),
            "",
            // ⚠️ **A caveat attached to a figure has to survive being restated, and measurement
            // showed it does not on its own.** The Comtrade line says, in the line itself, that
            // its countries are "the largest among the countries returned, NOT the world's
            // largest importers" — written that way precisely so a summariser could not drop it.
            // A live run compressed it anyway and wrote *"the implied import price across major
            // markets"*: the caveat gone, and replaced by the exact claim it forbade.
            //
            // ⭐ That is not a formatting slip. "Major markets" is a ranking of participants in
            // world trade that nothing computed — `README.md` excludes AI from ranking, and this
            // is that exclusion being violated in prose rather than in code. The number was real,
            // which is what makes the sentence expensive: a seller would price against it.
            //
            // ⚠️ So the rule is stated as a prohibition on *rewording*, not as "keep the caveat".
            // A model told to keep a caveat keeps a shorter caveat. Told that the qualifier is
            // part of the figure, it copies the phrase.
            ...(lean
              ? [
                  "⚠️ Name the countries and their tonnages exactly as written above. Copy each",
                  "figure's ⚠️ qualifier. Never write \"major markets\" or \"leading importers\".",
                ]
              : [
                  "⚠️ A figure's qualifier is part of the figure. If a reading says its countries are",
                  "not a global ranking, or that a price is not a market quote, copy that qualifier",
                  "into your sentence in words as strong as the original. Never upgrade a qualified",
                  "figure into a general claim — do not turn \"the countries returned\" into \"major",
                  "markets\", \"leading importers\", or \"the biggest buyers\". If you cannot fit the",
                  "qualifier, leave the figure out instead.",
                ]),
            "",
          ]
        : []),
      // ⭐ **Why no source was consulted, when none was.**
      //
      // ⚠️ This used to go only into the trace, and the measured cost of that was severe. Asked
      // *"I have 3t of chamomille tea leaves, where can I sell them?"*, the planner correctly
      // declined — the spelling is one letter from `chamomile` and looking up the nearest match
      // would have returned figures for the wrong crop. Its note said so, and named the spelling
      // that would work. ⚠️ The note went to the trace, `compose` was handed nothing at all, and
      // the model filled the vacuum: *"You can sell your chamomille tea leaves on the exchange's
      // marketplace page"* — a page that does not exist.
      //
      // ⭐ So the note is prompt material, not diagnostics. When the planner declines, its reason
      // **is** the answer to the question, and it is the one thing here the model could not have
      // derived: only the planner knows which spelling this exchange holds. Handing `compose` an
      // empty prompt and a fabrication rule does not produce that sentence; handing it the note
      // does. This costs one line and closes the gap where the invention happened.
      ...(m.planNote
        ? [
            "⚠️ No external source was consulted, for this reason. State this reason to the",
            "participant in your answer — it is what they need to know, and it is not a note",
            "about how the system works. Do not go looking for another explanation:",
            `  ${m.planNote}`,
            "",
          ]
        : []),
      // ⚠️ A source that was consulted and failed is stated, not omitted. Silence would let the
      // model write as though the market were unknown when in fact the lookup timed out.
      ...(m.retrieved?.some((x) => !x.ok)
        ? [
            "⚠️ These sources were consulted and did not answer, so say nothing about what they",
            "would have contained:",
            ...m.retrieved.filter((x) => !x.ok).map((x) => `  ${x.label}: ${x.reason}`),
            "",
          ]
        : []),
      // ⚠️ On the `direct` path both of these are always empty, and the full prompt renders them
      // as the literal headings "Your reading of it: (none)" and "What is known and unknown:
      // (nothing retrieved)". That is four lines telling a model that nothing is known, directly
      // above the figures it was just handed — the staged path needs the headings because they
      // carry real content there, and this path pays for them without ever filling them.
      ...(lean && !m.understanding ? [] : ["Your reading of it:", m.understanding ?? "(none)", ""]),
      ...(lean && !m.grounding?.length
        ? []
        : ["What is known and unknown:", ...(m.grounding.length ? m.grounding : ["(nothing retrieved)"])]),
      ...(m.specialist
        ? ["", "A domain model's answer, to use where it is more precise than yours:", m.specialist]
        : []),
      "",
      // ⭐ From here down every rule below is preserved under `lean`, one line each, in the same
      // order. None is dropped: each repairs a live failure recorded in the comment beside it,
      // and a rule deleted here is a failure re-enabled on the only path this machine can run.
      // What `lean` removes is the *second and third sentence* of each rule — the explanation of
      // why it exists, which the comments hold anyway and which the model does not need.
      ...(lean
        ? [
            "Rules:",
            "- Be direct and brief. Answer the part you can; name a missing record once, and only",
            "  where it blocks what they asked. Never decline the whole question over a partial gap.",
            "- State every quantity's unit inline (3 tonnes, 30 metres). No separate \"Units:\" line.",
            "- A known fact above is known. Do not doubt it, and do not close by listing your doubts.",
            "- Never describe how this system works internally. If the exchange cannot do this yet,",
            "  say that in one sentence and say what it would take.",
            "- Invent nothing: no buyers, marketplaces, countries, grades, categories or numbers",
            "  that are not written above, not even as an illustrative example.",
          ]
        : [
            "Be direct and brief. Where the answer depends on records you do not have, say so",
            "plainly rather than hedging the whole answer.",
          ]),
      "",
      // ⚠️ "Units on every quantity" used to stand here alone, and a live run showed how a
      // true rule gets misread. `check` scores `unitful`, so the model started annotating every
      // line — and produced "Units: degrees (latitude) and meters (longitude)". Longitude is not
      // in metres. Asked to label everything, a 3b model will label the things that do not take
      // labels, and it invents a unit rather than leave one out.
      //
      // ⭐ The rule was always about *consignment quantities* — note 30 §5.3's
      // `{value, unit, source, precision}`, where a bare number is a value that cannot be
      // recorded. Coordinates already carry their unit in the word "degrees". So the
      // instruction now says where units belong and, as importantly, where they do not.
      ...(lean
        ? []
        : [
            "⚠️ Every quantity you state must carry its unit inline, in the sentence — 3 tonnes,",
            "30 metres. Do not add a separate \"Units:\" line, and do not restate a unit that is",
            "already part of the phrase. If you are unsure what unit something is in, use the",
            "wording from the known facts above verbatim rather than choosing one.",
            "",
          ]),
      // ⚠️ Added after a run that answered "where can I sell 3 tonnes of chamomile?" with a
      // paragraph about how this system converts coordinates to addresses. That is `ground`'s
      // notes leaking into the product: asked what would have to be true to answer well, it
      // listed the machinery, and `compose` — having nothing better — paraphrased the
      // machinery. `check` then passed it on all three axes, because it *is* grounded,
      // bounded and hedged. The axes score the shape of an answer, not whether it was any use.
      //
      // ⭐ So the rule is stated here rather than added as a fourth axis: the participant is
      // owed the state of *their* question, never a description of our internals. "This
      // exchange cannot do that yet" is a complete and honest answer; a tour of the pipeline
      // that reaches the same place is the same refusal with the reader's time spent on it.
      ...(lean
        ? []
        : [
            "⚠️ Never explain how this system works internally — not its stages, its models, its",
            "coordinate handling, or how it computes anything. The person asked about their own",
            "situation. If the honest answer is that the exchange cannot do this yet, say exactly",
            "that in one sentence and say what it would take; do not substitute a description of",
            "our machinery for the answer they asked for.",
            "",
          ]),
      // ⚠️ Added after a run that stated the position correctly and then closed with "we do not
      // know what position means in the context of the exchange or how the uncertainty is
      // calculated". Both were in the facts it had just been given. The notes above mark things
      // as unknown, and the model carries that hedge past the point where it stopped applying —
      // which reads as the whole answer being unreliable, and costs the reader more than the
      // caveat could ever be worth.
      ...(lean
        ? []
        : [
            "⚠️ A known fact above is known. Do not follow it with a sentence doubting it, and do",
            "not close by listing what you are unsure of. Name a gap only where it blocks the",
            "specific thing they asked for, and only once.",
            "",
          ]),
      // ⚠️ Added after a run that answered "we cannot determine where to sell your tea without
      // knowing the unit of measurement" — for a question that said 3t. Two failures compound
      // there: a standard abbreviation treated as unknowable (see `understand`), and a partial
      // gap used to refuse the whole question. The second is the one that makes the tool feel
      // useless, because a refusal costs the reader the same wait as an answer.
      ...(lean
        ? []
        : [
            "⚠️ Answer the part you can. A missing record is a reason to say which part is missing,",
            "never a reason to decline the whole question — if you can say something useful about",
            "what they asked, say it, then name precisely what you would need to say more. Do not",
            "restate facts that are irrelevant to their question merely because they are available.",
            "",
          ]),
      // ⚠️ Added after a live run produced a bulleted "Grade A / B / C" scheme this exchange
      // has never defined, wrapped in a disclaimer. The disclaimer is the part a reader
      // drops; the list is the part they keep. Stopping is a better answer than illustrating.
      ...(lean
        ? []
        : [
            "⚠️ Do not illustrate with made-up examples. If you do not know this exchange's grades,",
            "categories, thresholds, or codes, say that they are defined by the exchange and stop —",
            "do not invent a plausible set to show what one might look like, even labelled as an",
            "example. An invented list is remembered after the caveat around it is forgotten.",
          ]),
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
      // ⚠️ The question comes first and was absent until a rewrite changed the subject. This
      // stage only ever saw the draft, so "answer the same question" was an instruction it had
      // no way to check itself against.
      "The person asked:",
      m.query,
      "",
      `A draft answer failed these checks: ${(m.checkFailed ?? []).join(", ")}.`,
      ...(m.checkFailed ?? []).map((k) => `- ${k}: ${CHECKS[k].detail}`),
      "",
      // ⚠️ **The facts must be here.** Without them this stage was measured destroying a
      // correct answer: a draft stating the participant's recorded position failed `grounded`,
      // and `refine` — shown the failed axis and the draft but nothing the draft was grounded
      // *in* — "fixed" it by deleting the position entirely and emitting "I don't know what
      // grades, categories, thresholds or codes apply", borrowed from `compose`'s
      // anti-fabrication clause. It had no way to tell a supported claim from an invented one,
      // so it removed the only supported claim in the draft.
      //
      // ⭐ A stage asked to make an answer better must see the evidence the answer rests on.
      // Otherwise "make it more grounded" and "say less" are the same instruction to it.
      ...(m.facts?.length
        ? [
            "⭐ These facts are measured values from this system's records. They ARE grounded —",
            "keep every one of them that the draft uses, and do not remove a claim merely",
            "because it is specific:",
            ...m.facts,
            "",
          ]
        : []),
      "Rewrite it so it passes. Do not pad it, and do not add claims to compensate —",
      "if the fix is to say less, say less.",
      "",
      // ⚠️ Narrow, because the failure above was the rewrite answering a *different* question.
      "⚠️ Answer the same question the draft answers. Fix how it is stated, never what it is",
      "about — a rewrite that changes the subject has not passed the check, it has abandoned it.",
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
