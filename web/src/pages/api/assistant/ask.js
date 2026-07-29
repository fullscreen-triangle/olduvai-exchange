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
 */
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

  const result = await run({ query: message.trim(), agent, base });

  if (!result.ok) {
    // The established shape for "this route works, the thing behind it is not available".
    // `blockedBy: "no-model"` is a new gate — an operational one rather than a research
    // one, and the only gate in the app a participant can clear themselves.
    return notImplemented(res, {
      blockedBy: "no-model",
      note: result.blocked.detail,
      remedy: result.blocked.remedy ?? null,
      trace: result.trace,
    });
  }

  return res.status(200).json({
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
  });
}
