/**
 * The one place this app talks to `olduvai-server`.
 *
 * # ⚠️ What a route in this folder may and may not do
 *
 * `notes/30-programming-structure.md` §4: *"The BFF holds session handling and response
 * shaping only. No admissibility logic ever."*
 *
 * That is not a style preference, it is the reason the architecture holds together. The
 * browser also calls the core directly through WASM. If a route here computed an address, a
 * rank, or an admissibility verdict, there would be two implementations of it — and when
 * they drifted, nothing would detect the disagreement. So a route in this folder may:
 *
 *   - attach session identity,
 *   - forward,
 *   - reshape a response for the view,
 *   - fail honestly.
 *
 * It may not encode, rank, synthesise, or decide what is admissible. If you find yourself
 * reaching for a threshold constant in this folder, it belongs in `olduvai-core`.
 *
 * # Why upstream failure is a first-class response, not a 500
 *
 * Most of the engine is behind the cohesion gate (§7 step 3), so most of these routes will
 * fail for a long time. A route that returns `503` with `{ reason: "not_implemented" }` is
 * telling the client something true and actionable. A route that returns fabricated data of
 * the right shape is telling it something false, and the UI built against it would encode
 * that falsehood in its layout. We do the former, everywhere.
 */

const UPSTREAM =
  process.env.OLDUVAI_SERVER_URL ?? "http://127.0.0.1:8080";

/** Upstream took too long. Better a clear failure than a hanging request. */
const TIMEOUT_MS = 8000;

/**
 * Reasons a request can fail, as a closed set.
 *
 * The client renders on these rather than on a message string, so the copy can change
 * without breaking the UI, and a new failure mode has to be added deliberately.
 */
export const Reason = {
  /** The route exists here but the engine behind it does not yet. */
  NOT_IMPLEMENTED: "not_implemented",
  /** `olduvai-server` is not running or not reachable. */
  UPSTREAM_UNREACHABLE: "upstream_unreachable",
  /** Upstream answered, but with an error status. */
  UPSTREAM_ERROR: "upstream_error",
  /** Upstream took longer than `TIMEOUT_MS`. */
  UPSTREAM_TIMEOUT: "upstream_timeout",
  /** No session, or a session that does not name a participant. */
  UNAUTHENTICATED: "unauthenticated",
  /** Wrong HTTP verb for this route. */
  METHOD_NOT_ALLOWED: "method_not_allowed",
};

export function fail(res, status, reason, detail) {
  return res.status(status).json({ ok: false, reason, detail });
}

/**
 * Restrict a route to one verb.
 *
 * Returns `true` when the request was rejected, so callers read as
 * `if (methodNotAllowed(req, res, "POST")) return;`
 */
export function methodNotAllowed(req, res, ...allowed) {
  if (allowed.includes(req.method)) return false;
  res.setHeader("Allow", allowed.join(", "));
  fail(
    res,
    405,
    Reason.METHOD_NOT_ALLOWED,
    `${req.method} is not accepted here; use ${allowed.join(" or ")}.`
  );
  return true;
}

/**
 * Forward a request to `olduvai-server` and return `{ ok, status, data, reason }`.
 *
 * Never throws: every failure mode is folded into the return value, because a route that
 * can throw is a route whose failure shape depends on where it threw.
 */
export async function forward(path, { method = "GET", body, headers } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const upstream = await fetch(`${UPSTREAM}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    // Read as text first: an upstream 502 from a proxy is usually HTML, and letting
    // `.json()` throw on it would report a parse bug instead of the real failure.
    const text = await upstream.text();
    let data = null;
    try {
      data = text.length ? JSON.parse(text) : null;
    } catch {
      data = { raw: text.slice(0, 500) };
    }

    if (!upstream.ok) {
      return {
        ok: false,
        status: upstream.status,
        reason: Reason.UPSTREAM_ERROR,
        data,
      };
    }

    return { ok: true, status: upstream.status, data };
  } catch (err) {
    const timedOut = err?.name === "AbortError";
    return {
      ok: false,
      status: timedOut ? 504 : 502,
      reason: timedOut ? Reason.UPSTREAM_TIMEOUT : Reason.UPSTREAM_UNREACHABLE,
      data: { upstream: UPSTREAM },
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Proxy a route straight through, with no reshaping.
 *
 * Most routes here are exactly this. Having it in one function means the failure
 * translation is written once and cannot drift between endpoints.
 */
export async function proxy(req, res, path, { method = req.method } = {}) {
  const result = await forward(path, {
    method,
    body: method === "GET" || method === "HEAD" ? undefined : req.body,
  });

  if (!result.ok) {
    return fail(res, result.status, result.reason, result.data);
  }
  return res.status(200).json({ ok: true, data: result.data });
}

/**
 * Declare a route whose engine is not built yet.
 *
 * ⭐ The `blockedBy` string is the point of this helper. It names the gate the endpoint is
 * waiting on, so the UI can tell someone *why* a panel is empty rather than showing a
 * spinner that never resolves — and so nobody wires a placeholder in and forgets.
 */
export function notImplemented(res, { blockedBy, note }) {
  return res.status(503).json({
    ok: false,
    reason: Reason.NOT_IMPLEMENTED,
    blockedBy,
    note,
  });
}
