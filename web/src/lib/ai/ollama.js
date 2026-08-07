/**
 * The base tier: a local Ollama model.
 *
 * # Why local is the base rather than a fallback
 *
 * `notes/31` item 1 says the base model is Ollama, and the reason that ordering is right is
 * not cost. A participant describing a consignment is describing a commercial position —
 * what they have, how much, where, and when they need it moved. That is exactly the
 * information a counterparty would pay for. Running the first pass locally means the
 * ordinary case never leaves the machine, and the remote specialist tier is entered
 * deliberately, for a stage that names why it needs to.
 *
 * # ⚠️ Not running is a normal state, not an error
 *
 * Ollama is a separate process the participant starts. It will frequently not be running,
 * and that is not a fault to log — it is a fact to report, with the command that fixes it.
 * So `probe()` exists as a first-class call and every failure here is a returned value.
 */

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";

/**
 * ⚠️ No default model name is invented here.
 *
 * Ollama serves whatever the participant has pulled, and guessing `llama3` produces a
 * confident 404 that reads like a bug in this code. `probe()` reports what is actually
 * installed; the caller picks from that list, or says nothing is installed.
 */
const MODEL = process.env.OLLAMA_MODEL ?? null;

/**
 * Generation is slower than a proxy hop. This is a bound on hanging, not on thinking.
 *
 * ⚠️ Generous on purpose. A first call against a cold model pays the load cost on top of
 * generation, and on modest hardware a large model can spend a minute before emitting a
 * token. A timeout tight enough to feel responsive would turn "your machine is slow" into
 * "the assistant is broken", which is both wrong and unactionable.
 *
 * ⭐ Exported because `pipeline.js` quotes it to a participant when explaining why an answer
 * was capped, and a number stated in prose that no longer matches the code is worse than no
 * number at all.
 */
export const TIMEOUT_MS = 180_000;
/** The probe must be fast — it runs on page load to decide what to render. */
const PROBE_TIMEOUT_MS = 1500;

async function call(path, { method = "GET", body, timeout = TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const r = await fetch(`${OLLAMA_URL}${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await r.text();
    let data = null;
    try {
      data = text.length ? JSON.parse(text) : null;
    } catch {
      data = { raw: text.slice(0, 500) };
    }
    return r.ok
      ? { ok: true, data }
      : { ok: false, reason: "ollama_error", status: r.status, data };
  } catch (err) {
    return {
      ok: false,
      reason: err?.name === "AbortError" ? "ollama_timeout" : "ollama_unreachable",
      url: OLLAMA_URL,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Is Ollama up, and what does it have?
 *
 * Returns `{ running, models, model, url }`. `model` is the one that would be used: the
 * configured `OLLAMA_MODEL` if it is installed, otherwise the first installed model,
 * otherwise `null`.
 *
 * ⭐ Falling back to "the first installed model" rather than to a hardcoded name is what
 * makes this work on a machine whose owner pulled something we have never heard of. The
 * pipeline does not care which model it is; it cares that there is one.
 */
export async function probe() {
  const r = await call("/api/tags", { timeout: PROBE_TIMEOUT_MS });
  if (!r.ok) {
    return { running: false, reason: r.reason, url: OLLAMA_URL, models: [], model: null };
  }

  const models = (r.data?.models ?? []).map((m) => m.name).filter(Boolean);
  const model = models.includes(MODEL) ? MODEL : (models[0] ?? null);

  return {
    running: true,
    url: OLLAMA_URL,
    models,
    model,
    // ⚠️ Worth surfacing: a configured model that is not installed is a silent quality
    // change otherwise, since we would quietly use a different one.
    configuredMissing: MODEL !== null && !models.includes(MODEL) ? MODEL : null,
  };
}

/**
 * ⭐ What this machine was last observed to generate at, per model. Never probed.
 *
 * ⚠️ **The probe that used to live here was the wrong idea, and measurement proved it.** It
 * sent a tiny prompt and read the rate off the reply. Two runs against a cold 2 GB model:
 * `ms: 20011` then `ms: 94568`, both returning "not measurable" as their own timeouts expired
 * during the model load — after which the pipeline judged a machine that had already been
 * seen doing 9.7 tok/s to be unmeasurable, and degraded on that basis. The probe cost more
 * than the composition it was deciding about, and paid for it in the participant's wait.
 *
 * ⭐ So nothing is probed. `generate` reports the rate every call achieves, `remember` stores
 * it, and this reads it back. The first question of a process runs without a measurement and
 * takes the safe path; from the second on, the decision rests on the real thing rather than
 * on a proxy for it.
 *
 * ⚠️ Process-local and deliberately not persisted. A rate is a property of this machine under
 * its current load, and a figure cached to disk would outlive the conditions that produced it
 * — a laptop measured on mains power would be trusted after it moved to battery and a
 * different model was pulled. Losing it on restart costs one degraded answer.
 */
const RATES = new Map();

/** Record what a call achieved. Called by `generate`; a `null` rate is ignored, not stored. */
export function remember(model, tokensPerSecond) {
  if (model && typeof tokensPerSecond === "number" && tokensPerSecond > 0) {
    RATES.set(model, tokensPerSecond);
  }
}

/**
 * The remembered rate for a model.
 *
 * Returns `{ ok, tokensPerSecond }`. ⚠️ `ok: false` means *not yet observed*, not *slow* — but
 * the caller treats it as slow anyway, because being wrong that way costs a check stage and
 * being wrong the other way costs the whole answer.
 */
export function throughput({ model } = {}) {
  const rate = model ? RATES.get(model) : undefined;
  return rate === undefined
    ? { ok: false, tokensPerSecond: null }
    : { ok: true, tokensPerSecond: rate };
}

/**
 * One generation.
 *
 * `stream: false` because these responses are assembled by the pipeline before anything is
 * shown — a half-scored draft is not something to put in front of someone.
 */
export async function generate({
  model,
  system,
  prompt,
  temperature = 0.2,
  maxTokens,
}) {
  if (!model) {
    return { ok: false, reason: "no_model", detail: "No Ollama model is installed." };
  }

  const r = await call("/api/generate", {
    method: "POST",
    body: {
      model,
      prompt,
      system,
      stream: false,
      // ⚠️ Hold the model in memory between stages. The pipeline makes several calls in
      // quick succession, and Ollama's default unload would evict a multi-gigabyte model
      // between them — paying the load cost repeatedly inside one answer.
      keep_alive: "5m",
      options: {
        // ⭐ Low by default. This pipeline explains and proposes; both are jobs where being
        // interestingly wrong is worse than being dully right. four-sided-triangle raises
        // temperature to diversify candidates — that stage is deliberately absent here.
        temperature,
        // `num_predict` is Ollama's cap. Omitted rather than set to a sentinel when the
        // caller does not ask, so the model's own default stands.
        ...(maxTokens === undefined ? {} : { num_predict: maxTokens }),
      },
    },
  });

  if (!r.ok) return r;

  // ⭐ Every generation is also a measurement, at no cost. See `observedRate` and `RATES`.
  const rate = observedRate(r.data);
  remember(model, rate);

  return { ok: true, text: r.data?.response ?? "", model, tokensPerSecond: rate };
}

/**
 * ⭐ The tokens-per-second a call just achieved, or `null` if Ollama did not report it.
 *
 * ⚠️ This exists because measuring separately turned out to cost more than the thing it was
 * measuring. `throughput()` above sends its own tiny prompt, and on a cold 2 GB model two
 * measured runs spent 20s and then 94s failing to return before their timeouts — while a warm
 * run of the same model reported 9.7 tok/s in a fraction of that. The model load, not the
 * machine, was the expense, and no probe can avoid paying it once.
 *
 * So the rate is read off work that had to happen anyway. `eval_count` and `eval_duration`
 * cover generation only — Ollama reports `load_duration` separately — so this is the
 * steady-state rate, which is exactly the quantity a decision about the *next* call needs.
 */
export function observedRate(data) {
  const count = data?.eval_count;
  const ns = data?.eval_duration;
  if (!count || !ns) return null;
  return count / (ns / 1e9);
}
