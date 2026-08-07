import { SESSION_COOKIE, readSession } from "@/lib/api/session";
import { fail, methodNotAllowed } from "@/lib/api/upstream";

/**
 * Open, read, and end a **local working session**.
 *
 * # ⚠️ This is not authentication, and the name says so in every direction
 *
 * `lib/api/session.js` and `crates/olduvai-server/src/participant.rs` both state the same
 * thing from their own ends: a participant on the exchange is a **ledger identity** — every
 * field they confirm is attributed to their name and appended, never updated — and that
 * service is not built. Issuing a signed cookie here would mint participants who cannot be
 * recorded, which is the one failure this whole seam was arranged to prevent.
 *
 * ⭐ So what this route issues is deliberately **less** than a session: an opaque label that
 * separates one working set of observations from another on a local server. It authenticates
 * nobody, proves nothing, and grants no standing on the exchange. `olduvai-server` treats the
 * token the same way — `participant.rs` is explicit that it "is not authentication and does
 * not claim to be" — so the two ends agree about what is missing, which is the property that
 * matters while it is missing.
 *
 * ⚠️ **Why it exists at all, rather than waiting for the real thing.** Every data route calls
 * `requireSession`, `requireSession` reads a cookie, and nothing set that cookie — so every
 * route in the app answered 401 before it reached the engine. The fusion filter, the
 * observation log and the foreman were all built, tested, and unreachable. A seam that
 * rejects every request is not a seam waiting for a backend; it is a wall. This makes the
 * built parts usable while the identity service is designed, and it is scoped so that
 * designing that service replaces this file rather than working around it.
 *
 * # ⭐ What must be true when the real identity service lands
 *
 * The token issued here is random and opaque. It is not a user id, it is not derived from the
 * email, and nothing decodes it — `readSession` returns it for forwarding "and nothing more —
 * it deliberately does not tell the caller a name". That is the property to preserve: when a
 * real service issues signed tokens, only this file and the server's verification change, and
 * no caller learns anything new about the shape of a token.
 *
 * ⚠️ The email is **taken and discarded**. It is not stored, not sent upstream, and not
 * encoded in the token. Keeping it would create a second record of who a participant is —
 * one that is not the ledger, not append-only and not attributed — which is precisely the
 * refusal `lib/ai/pipeline.js` makes about working memory, for the same reason.
 *
 * # Development only, and enforced rather than documented
 *
 * ⚠️ In production this route refuses. A note saying "dev only" is a note; this returns 404,
 * so a deployment cannot accidentally ship an open door because someone did not read the
 * comment. The 404 rather than 403 is deliberate — in production this genuinely is not a
 * route, and saying "forbidden" would advertise that it exists somewhere.
 */

/** ⚠️ Guarded, not documented. See the module doc. */
const ENABLED = process.env.NODE_ENV !== "production";

/**
 * ⚠️ 32 bytes from the platform CSPRNG, never `Math.random()`.
 *
 * The token is weak *by design* in what it proves — it proves nothing — but it must still be
 * unguessable, because it is the only thing separating one local working set from another. A
 * predictable label would let one browser tab read another participant's observation log on a
 * shared server, which is a real leak even in a system where identity is admittedly absent.
 */
function mint() {
  const bytes = new Uint8Array(32);
  // `globalThis.crypto` is available in Node 18+, which the Next 13 runtime requires.
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The cookie.
 *
 * `HttpOnly` so script cannot read it, `SameSite=Lax` so it is not sent cross-site, `Path=/`
 * so the API routes see it. ⚠️ `Secure` is set only outside development: setting it on
 * `http://localhost` makes the browser drop the cookie silently, and the failure looks
 * exactly like a server that did not set one.
 */
function cookie(value, { maxAge }) {
  const parts = [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export default async function handler(req, res) {
  if (methodNotAllowed(req, res, "GET", "POST", "DELETE")) return;

  if (!ENABLED) {
    return fail(
      res,
      404,
      "not_found",
      "No session service. Identity on the exchange is a ledger participant, and that service is not built."
    );
  }

  // Read: does this browser hold a session? ⭐ Returns the *fact*, never the token — the
  // client has no use for the value and handing it to script would defeat `HttpOnly`.
  if (req.method === "GET") {
    const session = readSession(req);
    return res.status(200).json({
      ok: true,
      data: {
        open: Boolean(session),
        // ⚠️ Restated on every read so a client cannot come to treat an open session as a
        // sign-in. The banner a dashboard renders is built from this, not from a constant in
        // a component, so the two cannot drift apart.
        authenticated: false,
        note: "A local working session. It separates your observations from another browser's on this server. It is not a ledger identity and carries no standing on the exchange.",
      },
    });
  }

  if (req.method === "DELETE") {
    res.setHeader("set-cookie", cookie("", { maxAge: 0 }));
    return res.status(200).json({ ok: true, data: { open: false } });
  }

  // POST — open one.
  //
  // ⚠️ The email is validated for shape and then dropped. Validating it at all is not
  // theatre: `signin.js` collects one, and a form that accepts anything teaches a participant
  // that the field does not matter, which is a habit that survives into the version where it
  // does. What is refused here is *storing* it.
  const { email } = req.body ?? {};
  if (typeof email !== "string" || !email.includes("@")) {
    return fail(res, 400, "invalid_request", "`email` must look like an email address.");
  }

  const token = mint();
  // Eight hours: long enough for a working day, short enough that an abandoned machine does
  // not hold an open working set indefinitely.
  res.setHeader("set-cookie", cookie(token, { maxAge: 60 * 60 * 8 }));

  return res.status(200).json({
    ok: true,
    data: {
      open: true,
      authenticated: false,
      note: "Local working session opened. Your observations are kept under an opaque label on this server. Nothing here is a ledger identity, and nothing recorded in this session carries standing on the exchange.",
    },
  });
}
