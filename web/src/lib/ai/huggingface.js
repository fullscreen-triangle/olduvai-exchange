/**
 * The specialist tier: domain models through the HuggingFace Inference API.
 *
 * # ⚠️ This tier sends the participant's text to a third party
 *
 * That is the whole reason it is a separate tier rather than the default. `ollama.js`
 * explains why the base pass is local; the corollary is that entering this tier is a
 * decision with a consequence, and the pipeline records in its trace whenever it happened.
 *
 * A participant should be able to run this entire system with the specialist tier off and
 * get a worse answer, not no answer. `SPECIALISTS` therefore describes what *would* be used
 * per domain, and an absent token degrades the `specialise` stage rather than failing the
 * request.
 *
 * # ⭐ Why a manifest of models rather than one general model
 *
 * `notes/31` item 1: *"huggingfaceapi should be used to retrieve specialised domain
 * models"*, and *"every linked page in the sidebars is an agent instance of the main home
 * page model."* Those two sentences together are the design: one pipeline, and the thing
 * that varies per page is which specialist the `specialise` stage reaches for. A page about
 * soil and a page about freight are the same code with a different entry in this table.
 *
 * ⚠️ **The model ids below are unverified.** They are named because a table of real
 * candidates is more useful to whoever wires this than a `TODO`, but nobody has measured
 * whether any of them is better than the base model on these questions. Treat this as a
 * hypothesis list. `note` on each entry says what it would be for; when one is tested,
 * replace the note with the result.
 */

const HF_TOKEN = process.env.HUGGINGFACE_API_KEY ?? null;
const HF_URL = "https://api-inference.huggingface.co/models";

/** A remote hop on a cold model can be slow; a cold start is not a hang. */
const TIMEOUT_MS = 30_000;

/**
 * Domain → candidate specialist.
 *
 * Keyed by the `domain` field on a rail entry (see `lib/navigation.js`), with `general` as
 * the centre composer's own domain.
 */
export const SPECIALISTS = {
  general: {
    model: null,
    note: "The centre composer has no single subject. It runs on the base model by design.",
  },
  agronomy: {
    model: "recobo/agriculture-bert-uncased",
    note: "⚠️ Untested. An encoder trained on agricultural text — likely useful for extraction, not for prose.",
  },
  geoscience: {
    model: "botanicalgarden/geoscience-bert",
    note: "⚠️ Untested, and the id may not resolve. Soil and elevation questions.",
  },
  economics: {
    model: "yiyanghkust/finbert-tone",
    note: "⚠️ Untested. Financial text; reference prices are commodity quotes, which is adjacent but not the same.",
  },
  logistics: {
    model: null,
    note: "No candidate identified. Freight and routing questions run on the base model.",
  },
  scientific: {
    model: "allenai/scibert_scivocab_uncased",
    note: "⚠️ Untested. Cited by four-sided-triangle for entity extraction from technical text.",
  },
};

/** Is the specialist tier usable at all? */
export function available() {
  return HF_TOKEN !== null;
}

/**
 * Which specialist a domain would use, and whether it can actually be reached.
 *
 * ⭐ Returns a reason even when unavailable, because the trace shows this to the
 * participant. "Ran without the specialist" is a materially different answer from "ran with
 * it", and which one they got should not be something they have to infer.
 */
export function resolve(domain) {
  const spec = SPECIALISTS[domain] ?? SPECIALISTS.general;

  if (!spec.model) {
    return { usable: false, reason: "no_candidate", note: spec.note, model: null };
  }
  if (!HF_TOKEN) {
    return {
      usable: false,
      reason: "no_token",
      note: "HUGGINGFACE_API_KEY is not set, so the specialist tier is off. The base model answers alone.",
      model: spec.model,
    };
  }
  return { usable: true, model: spec.model, note: spec.note };
}

/**
 * Call a specialist.
 *
 * ⚠️ Never throws, and never escalates its own failure. A 503 from HuggingFace usually means
 * the model is loading on their side, which is a wait, not a fault — and either way the
 * caller's correct response is to fall back to the base model, not to fail the request.
 */
export async function infer({ model, prompt }) {
  if (!HF_TOKEN) return { ok: false, reason: "no_token" };
  if (!model) return { ok: false, reason: "no_candidate" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const r = await fetch(`${HF_URL}/${model}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${HF_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { return_full_text: false, temperature: 0.2 },
        // A cold model returns 503 rather than queuing, unless asked to wait.
        options: { wait_for_model: true },
      }),
      signal: controller.signal,
    });

    const text = await r.text();
    let data = null;
    try {
      data = text.length ? JSON.parse(text) : null;
    } catch {
      data = { raw: text.slice(0, 500) };
    }

    if (!r.ok) {
      return { ok: false, reason: "hf_error", status: r.status, data };
    }

    // The Inference API's shape varies by pipeline type: text generation returns an array
    // of `{generated_text}`, other tasks return other things. Anything not recognised is
    // handed back raw rather than coerced, so the caller can see what actually came out.
    const generated = Array.isArray(data)
      ? data[0]?.generated_text ?? null
      : data?.generated_text ?? null;

    return generated === null
      ? { ok: false, reason: "unexpected_shape", data, model }
      : { ok: true, text: generated, model };
  } catch (err) {
    return {
      ok: false,
      reason: err?.name === "AbortError" ? "hf_timeout" : "hf_unreachable",
    };
  } finally {
    clearTimeout(timer);
  }
}
