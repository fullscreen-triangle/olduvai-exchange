import { authHeaders, requireSession } from "@/lib/api/session";
import { fail, forward, methodNotAllowed } from "@/lib/api/upstream";
import { locateCell, towerObservation } from "@/lib/api/opencellid";

/**
 * Record a position from the cell tower a handset is attached to.
 *
 * # ⭐ Why this is a route of its own and not a `POST` to `observe/[source]`
 *
 * `observe/[source]` forwards its body to the engine unchanged, which is correct for every
 * source in its table: the client already holds the reading. A GPS handset knows its own
 * latitude — `lib/geolocate.js` builds the `Observation::Fix` in the browser and posts it.
 *
 * ⚠️ A handset does **not** know where its tower is. It knows four integers naming the cell,
 * and turning those into a coordinate requires a database and a key. That lookup cannot happen
 * in the browser without shipping `OPENCELLID_API_KEY` to every visitor, so it happens here —
 * which makes this a route that *constructs* an observation rather than one that forwards one.
 * Mixing that into the pass-through route would have made a table of declarations into a table
 * of special cases.
 *
 * ⭐ `observe/[source]` still declares `cell`, and that declaration is the authority on what
 * this source is: `constrains: "fix"`, `source: "third_party"`, sigma from the cell radius.
 * This route implements it and must not contradict it.
 *
 * # ⚠️ It builds an observation; it does not decide anything about it
 *
 * The fold, the weighting and the admissibility all stay in `olduvai-core`. What leaves here is
 * one `Observation::Fix` with an honest sigma, posted to the same endpoint a GPS fix goes to.
 * `lib/api/upstream.js` forbids admissibility logic in the BFF, and a coarse fix is exactly the
 * kind of reading a BFF would be tempted to reject on its own initiative — it is not rejected
 * here. A 12 km sigma is a fact about the reading, and the filter is what knows what to do
 * with it.
 */
export default async function handler(req, res) {
  if (methodNotAllowed(req, res, "POST")) return;
  if (requireSession(req, res)) return;

  const { mcc, mnc, lac, cellid, taken_at } = req.body ?? {};

  /**
   * ⚠️ The four identifiers are required and are not defaulted. A missing `mnc` defaulted to 1
   * resolves to a real tower on a different network, and the resulting fix would be wrong by
   * whatever distance separates two operators' masts — sourced, dated, and silently false.
   */
  const missing = ["mcc", "mnc", "lac", "cellid"].filter(
    (k) => !Number.isFinite(Number({ mcc, mnc, lac, cellid }[k]))
  );
  if (missing.length) {
    return fail(
      res,
      400,
      "invalid_request",
      `A cell is identified by mcc, mnc, lac and cellid, all numbers. Missing or unreadable: ${missing.join(", ")}.`
    );
  }

  const tower = await locateCell({ mcc, mnc, lac, cellid });

  /**
   * ⚠️ **502, not 400.** The request was well formed; the provider could not answer it — an
   * unknown tower, a rejected key, or a timeout. Reporting that as the participant's error
   * would send someone to re-check four numbers that were correct. `reason` carries the
   * provider's own words, including `no OPENCELLID_API_KEY configured` when the key is absent,
   * so the missing-key case is legible instead of looking like an outage.
   */
  if (!tower.ok) {
    return fail(res, 502, "source_unavailable", tower.reason);
  }

  const observation = towerObservation(tower, typeof taken_at === "number" ? taken_at : Date.now());

  const result = await forward("/v1/observe/cell", {
    method: "POST",
    body: observation,
    headers: authHeaders(req),
  });

  if (!result.ok) {
    // ⚠️ Forwarded verbatim. A refusal the engine authored — an unknown source name, a rejected
    // shape — is its statement to make, and flattening it into a generic failure here would
    // hide the one message that says what was actually wrong.
    return res.status(result.status).json(result.data ?? { ok: false, reason: "upstream_error" });
  }

  return res.status(result.status).json({
    ...result.data,
    /**
     * ⭐ The tower is echoed so a reader can see what the fix was built from. A coordinate with
     * a 6 km sigma and no explanation looks like a broken GPS reading; the same coordinate
     * labelled with the mast it came from is self-evidently a different kind of measurement.
     */
    tower: {
      latitude: tower.latitude,
      longitude: tower.longitude,
      sigma_m: tower.sigma_m,
      range_m: tower.range_m,
      note:
        "⚠️ This is the tower's position, not yours — a mast serves everyone in its cell. The " +
        "sigma is half the reported cell radius, so the reading says you are somewhere within a " +
        "few kilometres of this mast and nothing more precise than that.",
      provider: "OpenCellID",
      source: "third_party",
    },
  });
}
