/**
 * Session reading for the BFF.
 *
 * # ⚠️ There is no session backend, and this does not pretend there is one
 *
 * Note 30 §4 gives the BFF exactly two jobs, and session handling is one of them — so this
 * file is where that job will live. It does not live here yet, because a participant on the
 * exchange is a **ledger identity**, not a user row: every field they confirm is attributed
 * to their name and is appended, not updated. Issuing a signed cookie before that identity
 * has a definition would mean minting participants who cannot be recorded.
 *
 * So `readSession` reads a cookie that nothing currently sets, and every caller must handle
 * `null`. That is deliberate. When auth lands, this function changes and its callers do not
 * — which is the whole reason it exists as a seam now rather than as an inline check later.
 */

import { Reason, fail } from "./upstream";

export const SESSION_COOKIE = "olduvai_session";

/**
 * Returns the session, or `null`.
 *
 * ⚠️ Currently always `null` in effect: nothing issues the cookie. It is written as a real
 * parse rather than `return null` so the failure is "no cookie present" — the same path
 * production will take for a signed-out visitor — instead of a stub that behaves
 * differently from the real thing.
 */
export function readSession(req) {
  const raw = req.cookies?.[SESSION_COOKIE];
  if (!raw) return null;

  // ⚠️ Placeholder: an opaque token here must be *verified* upstream, never decoded and
  // trusted locally. A cookie the client can forge is not identity. This returns the token
  // for forwarding and nothing more — it deliberately does not tell the caller a name.
  return { token: raw };
}

/**
 * Guard a route that requires a participant.
 *
 * Returns `true` when the request was rejected, so callers read as
 * `if (requireSession(req, res)) return;`
 */
export function requireSession(req, res) {
  const session = readSession(req);
  if (session) return false;

  fail(
    res,
    401,
    Reason.UNAUTHENTICATED,
    "No participant session. Identity on the exchange is a ledger participant, and that service is not built."
  );
  return true;
}

/** Headers that carry the session upstream, for use with `forward`. */
export function authHeaders(req) {
  const session = readSession(req);
  return session ? { authorization: `Bearer ${session.token}` } : {};
}
