import { authHeaders } from "@/lib/api/session";
import { fail, forward, methodNotAllowed, notImplemented } from "@/lib/api/upstream";

/**
 * `POST /v1/query` — the composer's destination.
 *
 * ⚠️ Blocked on the cohesion gate, and this is the endpoint the gate exists for. Note 30
 * §7 step 3: *"Gate on this before building anything on top. If the triple does not
 * cluster, everything above it is built on sand."* Query is the first thing built on top.
 *
 * ⭐ Note what is **not** in the request body: no coordinates, no cell, no ranking weights.
 * Per §5.1 the server derives the address from attributes, which is what makes
 * cell-shopping impossible by construction. A `depth` field is accepted because §6 defines
 * it as a resolution request, not a result preference — the engine backtracks on an empty
 * node regardless of what was asked for.
 */
export default async function handler(req, res) {
  if (methodNotAllowed(req, res, "POST")) return;

  const { constraints, depth } = req.body ?? {};
  if (typeof constraints !== "string" || !constraints.trim()) {
    return fail(
      res,
      400,
      "invalid_request",
      "`constraints` must be a non-empty string."
    );
  }

  const result = await forward("/v1/query", {
    method: "POST",
    headers: authHeaders(req),
    body: { constraints, ...(depth === undefined ? {} : { depth }) },
  });

  // Upstream has no `/v1/query` yet, so an unreachable-or-404 answer here is the expected
  // state, not an incident. Translating it into the gate that actually blocks it tells the
  // client something true; passing the raw 404 through would suggest a routing bug.
  if (!result.ok) {
    return notImplemented(res, {
      blockedBy: "cohesion-gate",
      note: "The query engine is gated on the cohesion test (notes/30 §7 step 3). Nothing was matched, and no results were fabricated.",
    });
  }

  return res.status(200).json({ ok: true, data: result.data });
}
