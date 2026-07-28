import { authHeaders, requireSession } from "@/lib/api/session";
import { forward, methodNotAllowed, notImplemented } from "@/lib/api/upstream";

/**
 * The append-only, hash-chained assembly record.
 *
 * ⚠️ **Read-only through this route, and that is not an oversight.** Note 30 §6 defines
 * `POST /v1/ledger` as written *at assembly time*, per-leg — because `thm:path-opacity`
 * says the endpoint reveals nothing about how a coalition was assembled, so a record not
 * written during assembly is unrecoverable afterwards. A client-initiated append would
 * therefore be either redundant or a forgery, and this BFF exposes neither.
 */
export default async function handler(req, res) {
  if (methodNotAllowed(req, res, "GET")) return;
  if (requireSession(req, res)) return;

  const result = await forward("/v1/ledger", { headers: authHeaders(req) });

  if (!result.ok) {
    return notImplemented(res, {
      blockedBy: "gate-and-ledger",
      note: "The ledger is written at coalition assembly (notes/30 §7 step 5). No assemblies have occurred.",
    });
  }

  return res.status(200).json({ ok: true, data: result.data });
}
