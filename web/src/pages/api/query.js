import { authHeaders } from "@/lib/api/session";
import { fail, forward, methodNotAllowed } from "@/lib/api/upstream";
import { COMMODITY_TABLE } from "@/lib/commodities";
import { fetchMarket, resolveCommodity, resolveQuantity } from "@/lib/market";

/**
 * The composer's destination: a consignment in, a market survey out.
 *
 * # ⚠️ What was wrong here, in the participant's words
 *
 * *"I tried every kind of prompt on what I have to bring to the market… chamomile tea leaves,
 * maize, wheat, all returned no results."*
 *
 * This route forwarded to `POST /v1/query` and translated any failure into the cohesion gate.
 * `crates/olduvai-server/src/main.rs` declares four routes — `/health`, `/v1/position`,
 * `/v1/observe/:source` (which binds both `POST` and `GET`) and `/v1/foreman` — so **there is no
 * `/v1/query`**, every request failed, and every commodity
 * produced the identical sentence. The commodity was never read by anything. Three different
 * goods returning one byte-identical refusal is not a gate reporting a limit; it is a dead path
 * wearing a gate's clothes, and it was reported as a broken feature because that is what it was.
 *
 * # ⭐ What is gated, and what was never gated
 *
 * The gate is real and stays shut. `main.rs`: *"The address-path endpoints are still stubbed,
 * and must stay that way until the cohesion gate passes. Wiring them to placeholder logic would
 * create exactly the second implementation this architecture exists to prevent."* The test it
 * states is precise — **"does this expose a mapping from a position to an address"**.
 * `Address::encode` is that mapping, so matching participants against the occupied trie is
 * behind the gate and is not attempted below.
 *
 * ⚠️ **But "where can I sell three tonnes of chamomile" was never one question.** It is two:
 *
 *   1. *Which participants on this exchange will buy it* — matching. Needs the trie, needs an
 *      address, gated. Not answered here, and the response says so in those terms.
 *   2. *What does the market for this commodity look like* — a published statistic. Needs no
 *      address, no trie, no ranking of anybody. **Never gated, and never answered.**
 *
 * This route answers (2) and continues to refuse (1). ⭐ The refusal is now *specific*: it names
 * the commodity it resolved, the tonnage it read, and the countries importing it, so a
 * participant can tell chamomile from wheat in the reply — which is the minimum test the old
 * response failed.
 *
 * # ⚠️ No model is involved, and that is load-bearing rather than incidental
 *
 * `lib/ai/` runs a local model through Ollama, and the deployed server has none — which is why
 * the assistant box, the page's own suggested fallback for exactly this question, also returned
 * nothing. So this path is deterministic end to end: a declared HS table, one keyless HTTP call,
 * arithmetic, authored caveats. It answers on a machine with no model and no API key.
 *
 * ⭐ It also keeps `README.md`'s third exclusion honest by construction. Synthesis here is
 * division and a sort; nothing plausible-sounding is generated, so there is nothing to
 * recompute later and fail to reproduce.
 *
 * # ⭐ Still `503`, still `blockedBy: "cohesion-gate"`
 *
 * The status and the gate name are unchanged, because the thing the participant submitted a
 * consignment *for* has not happened: nothing was matched. Returning `200 ok` with a market
 * survey would report a match that does not exist. `notImplemented` already spreads extra
 * fields, so the survey rides alongside the gate rather than replacing it — the response says
 * *"here is the market, and no, you have not been matched to anyone in it."*
 */
export default async function handler(req, res) {
  if (methodNotAllowed(req, res, "POST")) return;

  const { constraints, depth } = req.body ?? {};
  if (typeof constraints !== "string" || !constraints.trim()) {
    return fail(res, 400, "invalid_request", "`constraints` must be a non-empty string.");
  }

  /**
   * ⭐ Attempted first, and kept, even though it is known to fail today.
   *
   * The day `/v1/query` exists this route starts returning matches with no edit here — which was
   * the original design's whole point and is worth preserving. ⚠️ What changed is only what
   * happens *after* it fails: the failure no longer terminates the request.
   */
  const matched = await forward("/v1/query", {
    method: "POST",
    headers: authHeaders(req),
    body: { constraints, ...(depth === undefined ? {} : { depth }) },
  });

  if (matched.ok) return res.status(200).json({ ok: true, data: matched.data });

  const commodity = resolveCommodity(constraints);
  const tonnes = resolveQuantity(constraints);

  /**
   * ⚠️ An unrecognised commodity is named as such, with the table listed.
   *
   * `resolveCommodity` declines rather than guessing a nearest match, because a wrong HS code
   * returns a real, sourced, well-formed market for an entirely different good. ⭐ So the reply
   * says which words this exchange knows — a participant who typed "sorghum" learns that the
   * gap is the table and not their phrasing, which the previous single sentence could not tell
   * anyone.
   */
  if (!commodity) {
    return res.status(503).json({
      ok: false,
      reason: "not_implemented",
      blockedBy: "cohesion-gate",
      note:
        "No participant was matched: the matching engine is gated on the cohesion test " +
        "(notes/30 §7 step 3), and nothing was fabricated in its place.",
      market: {
        ok: false,
        reason:
          "This exchange has no declared HS code for what you described, so no trade " +
          "statistics were looked up. A code is not guessed, because the wrong one returns a " +
          "real and entirely irrelevant market.",
        known: Object.keys(COMMODITY_TABLE),
      },
    });
  }

  const market = await fetchMarket(commodity);

  return res.status(503).json({
    ok: false,
    reason: "not_implemented",
    blockedBy: "cohesion-gate",
    note:
      "No participant was matched: the matching engine is gated on the cohesion test " +
      "(notes/30 §7 step 3), and nothing was fabricated in its place. The market below is a " +
      "published trade statistic, not an offer from anyone on this exchange.",
    // ⚠️ Echoed so a participant can see what was actually read out of their sentence. A
    // survey of the wrong commodity is otherwise indistinguishable from a survey of the right
    // one, and the tonnage silently ignored is how "3t" becomes "3000t" in someone's head.
    read: { commodity: commodity.name, hs: commodity.hs, tonnes: tonnes ?? null },
    market,
  });
}
