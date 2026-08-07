/**
 * Session reading for the BFF.
 *
 * # ⚠️ There is still no identity service, and this does not pretend there is one
 *
 * Note 30 §4 gives the BFF exactly two jobs, and session handling is one of them — so this
 * file is where that job lives. What lives here is deliberately **less than authentication**,
 * because a participant on the exchange is a **ledger identity**, not a user row: every field
 * they confirm is attributed to their name and is appended, not updated. Issuing a signed
 * cookie before that identity has a definition would mean minting participants who cannot be
 * recorded.
 *
 * ⭐ `pages/api/session.js` now issues the cookie this function reads. That is a change of
 * one thing only: a browser can be told apart from another browser. It is not a change in
 * what anybody has proved. The token is opaque, random, carries no name, and
 * `crates/olduvai-server/src/participant.rs` states from its own end that treating it as
 * authentication would be wrong. Both ends agree about what is missing, which is the property
 * that matters while it is missing.
 *
 * ⚠️ **Why the cookie exists before the identity service does.** Every data route calls
 * `requireSession`; `requireSession` reads this cookie; nothing set it. So every route in the
 * app answered 401 before reaching the engine, and the fusion filter, the observation log and
 * the foreman were built, tested, and unreachable. A seam that rejects every request is not a
 * seam waiting for a backend — it is a wall. The seam still does its job: when a real service
 * lands, this function and the server's verification change, and no caller changes.
 *
 * ⚠️ Callers must still handle `null`, and for the same reason as before — a signed-out
 * visitor is the ordinary case, not an error.
 */

import { Reason, fail } from "./upstream";

export const SESSION_COOKIE = "olduvai_session";

/**
 * Returns the session, or `null`.
 *
 * ⚠️ The value is a label, never a claim. `pages/api/session.js` issues it and this reads it
 * back; between those two points nothing has been verified about who holds it. The name
 * `session` is already generous.
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
