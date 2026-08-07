import { agentFor } from "@/lib/ai/agents";
import * as ollama from "@/lib/ai/ollama";
import { run } from "@/lib/ai/pipeline";
import { fail, methodNotAllowed, notImplemented } from "@/lib/api/upstream";

/**
 * Ask the assistant.
 *
 * # ⚠️ How this differs from `/api/query`, and why both exist
 *
 * `notes/28-matching-is-search.md` is explicit that *matching IS search — there is no second
 * system*. That makes this route look suspicious, so the distinction has to be exact:
 *
 *   - **`/api/query`** submits constraints to the matching engine. It is the product. It
 *     returns coalitions, ranked by longest-common-prefix, and it is gated on the cohesion
 *     test.
 *   - **this route** asks a model to explain something, or to read some prose and suggest
 *     what a participant might have meant. It matches nothing. It returns no coalitions and
 *     no ordering over participants.
 *
 * Those are not two search systems. This one never touches the trie. If it ever returns
 * something that looks like a match, that is the bug `notes/28` is warning about.
 *
 * # ⚠️ Why the request is not forwarded upstream
 *
 * Every other route in this folder proxies `olduvai-server`. This one does not, and that is
 * not an oversight: `README.md` says *"nothing in `olduvai-core` calls a model, and nothing
 * in it should."* Putting the model behind the Rust engine would put a non-deterministic
 * call inside a crate whose whole purpose is byte-reproducibility. The model runs here, on
 * the BFF, precisely because here is outside the deterministic core.
 *
 * This does not make the route a place for admissibility logic. It holds none: it validates
 * a string, runs a pipeline of model calls, and shapes the result.
 *
 * # ⭐ Why the response is NDJSON rather than one JSON body
 *
 * A measured run of the pipeline on modest hardware took 291 seconds — six sequential model
 * calls at roughly six tokens per second. Held as a single JSON response, the participant sees
 * nothing at all for the whole of that, and the honest conclusion to draw from a page that has
 * said "Thinking" for five minutes is that it has hung.
 *
 * So this writes one JSON object per line as the pipeline reports progress, and a final line
 * carrying the result. ⚠️ The final line's body is **exactly** what this route used to return
 * — same `ok`, same `data`, same blocked shape — so the client's handling of an answer or a
 * gate is unchanged, and only its arrival is different. Two shapes for one outcome would be
 * two things to keep in agreement.
 *
 * ⚠️ Progress lines carry `{id, tier, model, state, ms, ok, degraded, detail}` and nothing
 * else. No draft, no partial prose. `lib/ai/pipeline.js` explains at length why: the draft is
 * withheld until `check` has scored it, and leaking it through a progress channel would defeat
 * that check by the back door.
 */

/** One NDJSON line. Newline-delimited, so a client can split on `\n` and parse each half. */
function line(res, obj) {
  res.write(`${JSON.stringify(obj)}\n`);
}

export default async function handler(req, res) {
  if (methodNotAllowed(req, res, "POST")) return;

  const { message, agent: agentHref } = req.body ?? {};

  if (typeof message !== "string" || !message.trim()) {
    return fail(res, 400, "invalid_request", "`message` must be a non-empty string.");
  }

  // ⚠️ A bound, not a policy. Working memory is one query long and the composed prompt
  // carries the whole message; an unbounded field would be an unbounded prompt.
  if (message.length > 8000) {
    return fail(
      res,
      413,
      "invalid_request",
      "`message` is longer than 8000 characters. Ask in parts."
    );
  }

  // ⭐ The agent instance. `agentHref` is the dashboard page the participant is on, so the
  // same pipeline runs specialised to that page — `notes/31` item 1's "every linked page is
  // an agent instance of the main home page model". An absent or unknown href is the home
  // agent, which is the right default rather than an error.
  const agent = agentFor(agentHref);
  const base = await ollama.probe();

  // ⚠️ Everything above this point fails as ordinary JSON, and deliberately so. Those are
  // rejections of the request itself, decided before any model ran; streaming a 400 down a
  // progress channel would dress up an instant refusal as work in progress.
  //
  // ⭐ From here the status is committed to 200 whatever happens, because the first progress
  // line goes out long before the pipeline knows whether it will succeed. That is not a
  // 200 for a failure: the outcome is carried in the terminal line's `ok`, which is where a
  // reader of a stream has to look anyway. `notImplemented` is still what builds a blocked
  // body — captured rather than sent, so the two paths cannot drift.
  res.writeHead(200, {
    "content-type": "application/x-ndjson; charset=utf-8",
    // ⚠️ Both required. Next will otherwise buffer the whole response and deliver it at once,
    // which would leave every progress line arriving simultaneously at the end — the exact
    // behaviour this route exists to fix, and invisible in testing because the result is
    // still correct.
    "cache-control": "no-cache, no-transform",
    "x-accel-buffering": "no",
  });

  // ⭐ Sent before the first model call so the client can render the pipeline as pending
  // immediately. Without it the view stays empty for the ~44s `understand` takes, which is
  // the same defect at smaller scale.
  line(res, { kind: "open", agent: agent.id, model: base?.model ?? null });

  const result = await run({
    query: message.trim(),
    agent,
    base,
    onStage: (event) => line(res, { kind: "stage", ...event }),
  });

  if (!result.ok) {
    // The established shape for "this route works, the thing behind it is not available".
    // These are operational gates rather than research ones — the only gates in the app a
    // participant can clear themselves.
    //
    // ⚠️ `no-model` used to be sent for *every* pipeline failure, including a stage that
    // timed out on a model that is installed and answering. That told someone whose machine
    // is merely slow to go and install what they already have. A gate that misnames its own
    // cause is note 34 §8's outage-as-epistemic-limit in a different costume: it reads as a
    // clear diagnosis, which is exactly what makes it expensive to be wrong about.
    //
    // ⭐ Built by the same `notImplemented` as before, with the status and body intercepted
    // rather than written, so the blocked body stays identical to the non-streaming one.
    line(res, { kind: "result", ...captured(res, (r) => notImplemented(r, {
      blockedBy: result.blocked.reason === "ollama_timeout" ? "model-too-slow" : "no-model",
      note: result.blocked.detail,
      remedy: result.blocked.remedy ?? null,
      trace: result.trace,
    })) });
    return res.end();
  }

  line(res, {
    kind: "result",
    status: 200,
    body: {
      ok: true,
      data: {
        answer: result.answer,
        // ⚠️ Always empty today. When extraction lands, each of these must go through
        // `accept_proposal` in `crates/olduvai-wasm/src/lib.rs` — the single place a client
        // touches the AI boundary — and arrive as `Source::Asserted` at weight 0.0. There is
        // deliberately no path from here into a `Field`.
        proposals: result.proposals,
        trace: result.trace,
      },
    },
  });
  return res.end();
}

/**
 * Run a responder against a stand-in `res` and return what it *would* have sent.
 *
 * ⚠️ The alternative was to hand-write the blocked body here, next to the one `notImplemented`
 * writes elsewhere. Two copies of a failure shape drift silently, because nothing renders both
 * — and this one is a gate a participant is expected to act on, so a stale `remedy` would send
 * them to fix the wrong thing.
 */
function captured(res, responder) {
  let status = 503;
  let body = null;
  responder({
    status(code) {
      status = code;
      return this;
    },
    json(payload) {
      body = payload;
      return this;
    },
    // `notImplemented` sets no headers, but a stand-in that silently swallows one would hide
    // the day it starts to.
    setHeader: res.setHeader.bind(res),
  });
  return { status, body };
}
