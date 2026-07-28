import { authHeaders, requireSession } from "../_session";
import { forward, methodNotAllowed, notImplemented } from "../_upstream";

/**
 * The signed-in participant's own entry, address, and per-field provenance.
 *
 * ⭐ The per-field provenance is the reason this is not just a profile endpoint. Note 30
 * §5.3: every value carries `{value, unit, source, precision}`, so this response can say
 * *"weight is weighbridge-verified, location is asserted"* — a single trust score cannot,
 * and that distinction is exactly what the gate ranks on. The profile view is built to
 * render fields at their stated source, never to flatten them into one badge.
 */
export default async function handler(req, res) {
  if (methodNotAllowed(req, res, "GET")) return;
  if (requireSession(req, res)) return;

  const result = await forward("/v1/participants/me", {
    headers: authHeaders(req),
  });

  if (!result.ok) {
    return notImplemented(res, {
      blockedBy: "participant-identity",
      note: "A participant is a ledger identity, not a user row. Registration and the identity service are not built.",
    });
  }

  return res.status(200).json({ ok: true, data: result.data });
}
