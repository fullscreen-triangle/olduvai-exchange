/**
 * What the engine already knows, rendered as plain sentences for a prompt.
 *
 * # ⚠️ Why this file had to exist, and what it is fixing
 *
 * `pages/api/assistant/ask.js` explains at length why the assistant is not forwarded to
 * `olduvai-server`: the model must not run inside a crate whose purpose is byte-reproducibility.
 * That reasoning is correct and is not weakened here.
 *
 * ⚠️ **But it was over-applied, and a live run showed the cost.** "Do not put the model behind
 * the engine" was implemented as "do not give the model anything from the engine", and those
 * are different claims. Asked *"what is my position?"*, the pipeline ran five stages over two
 * minutes and answered:
 *
 * > *"Unfortunately, I don't know your current position on the Olduvai Exchange because I don't
 * > have direct access to your observation log."*
 *
 * The number was sitting in `Estimate` the whole time. That is not a model failing to reason —
 * it is a model told nothing and asked anyway, which is a defect in what we handed it.
 *
 * ⭐ **Reading state and putting it in a prompt does not make anything non-deterministic.** The
 * fold still happens in exactly one place (`Estimate::update` in `olduvai-core`); this only
 * *reads* the result. No sigma is multiplied here, no ranking is computed, nothing is decided.
 * The determinism rule in `README.md` constrains where computation lives, not whether a model
 * is allowed to be told a fact.
 *
 * # ⚠️ Facts are stated, never interpreted
 *
 * Every line here is a value the engine produced plus its unit. This file does not conclude
 * that a sigma is good or bad, does not say whether a position is usable, and does not rank
 * anything — those are the three AI exclusions in `README.md`, and the way to keep honouring
 * them while still being useful is to hand over numbers and let the prose stage phrase them.
 *
 * # ⚠️ A failed read is a fact too
 *
 * If the engine cannot be reached, that is reported as its own line rather than omitted.
 * Silence would let the model infer the participant has no position, which is a different
 * claim from "we could not ask" — and the second is the true one.
 */

import { authHeaders } from "@/lib/api/session";

const SERVER = process.env.OLDUVAI_SERVER_URL ?? "http://127.0.0.1:8080";

/** A short read. These run before the first model call, so they must not add visible latency. */
const TIMEOUT_MS = 4000;

async function read(path, req) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${SERVER}${path}`, {
      headers: { ...authHeaders(req) },
      signal: controller.signal,
    });
    if (!r.ok) return { ok: false, status: r.status };
    return { ok: true, data: await r.json() };
  } catch {
    return { ok: false, status: null };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * ⭐ The participant's position, as sentences.
 *
 * ⚠️ `rests_on_observation` is carried through explicitly rather than being folded into the
 * sigma line, because it is the difference between *"we measured 200 km"* and *"we have not
 * measured anything and 200 km is what that is encoded as"*. `pages/api/position.js` makes the
 * same point about its own blocked response: emptiness here is a result, not a failure, and a
 * prompt that blurred the two would invite the model to report a stated prior as a measurement.
 */
function positionFacts(estimate) {
  if (!estimate) return [];

  const {
    at,
    sigma_m: sigma,
    rests_on_observation: measured,
    observation_count: n,
    strongest_source: source,
  } = estimate;

  const lines = [];

  if (at && typeof at.latitude === "number" && typeof at.longitude === "number") {
    lines.push(
      `The participant's position estimate is latitude ${at.latitude.toFixed(6)} degrees, ` +
        `longitude ${at.longitude.toFixed(6)} degrees.`
    );
  }

  if (typeof sigma === "number") {
    // ⚠️ Metres below a kilometre, kilometres above it. A "200000 m" uncertainty is technically
    // correct and reads as precision; the unit is chosen to match the magnitude so the model
    // does not restate a vague number in a form that sounds exact.
    const magnitude = sigma >= 1000 ? `${(sigma / 1000).toFixed(1)} km` : `${sigma.toFixed(1)} m`;
    lines.push(
      measured
        ? `Its uncertainty (one sigma) is ${magnitude}, computed from ${n} observation${n === 1 ? "" : "s"}.`
        : `Its uncertainty (one sigma) is ${magnitude}. ⚠️ This does NOT rest on any observation — ` +
            `it is the uninformed prior, which is this system's way of stating that the participant's ` +
            `position is not known. Say that plainly rather than reporting it as a measurement.`
    );
  }

  if (source) lines.push(`The strongest contributing source is "${source}".`);

  return lines;
}

/**
 * ⚠️ **A fact only worth stating when it is asked about.**
 *
 * `Estimate.at` is `{latitude, longitude}` and nothing else — the filter fuses a 2-D position,
 * and the `altitude_km` that `Observation` accepts on the wire is dropped rather than folded.
 * Asked for their elevation, the model answered *"elevation cannot be determined because the
 * unit of measurement for elevation is unspecified"* — inventing a units problem to explain a
 * missing feature — so the absence has to be named explicitly.
 *
 * ⚠️ **But naming it unconditionally was worse.** Added to every request, it produced *"You can
 * sell your 3t of chamomile at local markets... The exchange does not track elevation or
 * altitude, so this information cannot be used to recommend specific locations"* — a true
 * sentence, welded to a question that never mentioned elevation. A fact in the prompt is a fact
 * the model will find a use for, and `compose` is already told not to restate irrelevant facts;
 * this is that rule applied one layer earlier, where it can actually be enforced.
 *
 * ⭐ So it is gated on the question. Crude, and deliberately so — the alternative is a model
 * call to decide relevance, which costs a stage to save three lines of prompt.
 */
const ELEVATION_WORDS = /\b(elevation|altitude|height|above sea level|asl|metres above|meters above)\b/i;

function elevationFact(query) {
  if (!ELEVATION_WORDS.test(query ?? "")) return [];
  return [
    "⚠️ This exchange does NOT record elevation or altitude. The position estimate is " +
      "latitude and longitude only, and recording a position will not produce one. Say " +
      "plainly that the exchange does not track it — do not attribute this to missing units " +
      "or to an incomplete reading.",
  ];
}

/**
 * Everything worth telling the model, for this request.
 *
 * Returns `{ lines, ok, estimate }`. ⚠️ `lines` is never `null` — an unreachable engine yields
 * a line saying so, for the reason in the module doc.
 *
 * ⭐ `estimate` is the raw `Estimate` object, carried alongside the prose. `lib/ai/plan.js`
 * needs the structured value to decide whether a weather lookup is permissible — that gate
 * turns on `rests_on_observation`, and a boolean cannot be recovered from a sentence. It is
 * returned from here rather than read again because this function has already paid for the
 * request, and a second read of the same endpoint could disagree with the first.
 *
 * ⚠️ This does not widen what the *model* sees. `lines` is unchanged; `estimate` is consumed by
 * the planner and never rendered into a prompt.
 */
export async function gather(req, query = "") {
  const position = await read("/v1/position", req);

  if (!position.ok) {
    return {
      ok: false,
      estimate: null,
      lines: [
        "⚠️ The exchange's records could not be read for this question " +
          "(the position service did not respond). Do not conclude from this that the " +
          "participant has no position — it is not known either way right now.",
      ],
    };
  }

  const estimate = position.data?.estimate ?? position.data?.data?.estimate ?? null;

  // ⭐ The uninformed prior is reported as *"we do not know"*, in those words, before any
  // coordinate is mentioned.
  //
  // ⚠️ Asked for their elevation, a participant who had never submitted an observation got 56
  // seconds of prose ending in "it's unknown whether the participant's geographic location can
  // be associated with an elevation value". The engine's answer was much simpler:
  // `observation_count: 0`, sigma 200 km, coordinates at the centroid of the country. Handing
  // the model a seed coordinate plus a caveat invites it to reason *around* the caveat; handing
  // it a flat "nothing has been measured" leaves nothing to reason around.
  if (estimate && estimate.rests_on_observation === false) {
    return {
      ok: true,
      // ⚠️ Returned even here, where it is `rests_on_observation: false`. The planner's gate
      // reads that flag and declines the coordinate; it needs the object to do so. Withholding
      // it would make "not measured" indistinguishable from "engine unreachable", and those
      // are the two cases this file exists to keep apart.
      estimate,
      lines: [
        "⚠️ The participant's location is NOT KNOWN. They have submitted no observations " +
          `(observation count: ${estimate.observation_count ?? 0}), so the exchange has never ` +
          "measured where they are.",
        "⚠️ The system holds a placeholder coordinate with an uncertainty of about 200 km. " +
          "That is not a measurement of this participant and must NOT be reported as their " +
          "position, nor used to derive anything about their location — not weather, not " +
          "distance, not nearby markets.",
        // ⚠️ Elevation is a *permanent* absence, not one this participant can fix by recording
        // a position — so it is stated separately from the placeholder warning above, which
        // describes something recording a fix does resolve. Merging them would promise that
        // pressing the button yields an elevation. It does not; the estimate is 2-D.
        ...elevationFact(query),
        // ⚠️ Phrased as the sentence to write, not as a topic to cover. Told merely to "say
        // the location is unknown", a 3b model produces a paragraph about participating in the
        // exchange that never states the fact plainly. Giving it the wording removes the step
        // where it decides how to phrase a refusal — which is the step it does badly.
        "If they ask anything that depends on where they are, your ENTIRE answer is: that the " +
          "exchange does not know their location yet, and that they can record it on the " +
          "Position page with \"Use my current location\". Say it in one or two short " +
          "sentences. Do not explain the exchange, do not describe matching or coalitions, " +
          "and do not mention the placeholder coordinate.",
      ],
    };
  }

  const lines = [...positionFacts(estimate), ...elevationFact(query)];

  return {
    ok: true,
    estimate,
    lines: lines.length
      ? lines
      : ["The exchange's records were read and contain no position estimate for this participant."],
  };
}
