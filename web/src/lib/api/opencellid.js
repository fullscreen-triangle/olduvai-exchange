/**
 * A position from the cell tower a phone is attached to, via OpenCellID.
 *
 * # ⭐ Why this exists alongside browser geolocation
 *
 * `lib/geolocate.js` asks the browser, which is better whenever it answers: a GPS fix is tens of
 * metres, a tower fix is kilometres. This is not a replacement for it and does not compete with
 * it — the fold in `olduvai-core` weights observations by their stated sigma, so a coarse fix
 * folded alongside a fine one moves the estimate very little. That is the correct behaviour and
 * it is why both can be recorded without either having to win an argument in this file.
 *
 * ⚠️ **The case it exists for is the one the exchange is actually built around.** A farmer on a
 * feature phone, indoors, under cloud, or with location services switched off gets no GPS fix at
 * all, and every page then reports the uninformed 200 km prior. A 3 km tower fix is not a good
 * position; it is enormously better than no position, and it is the difference between a weather
 * answer for the right district and no answer.
 *
 * # ⚠️ What this is not
 *
 * **It is not an instrument reading**, and it is not recorded as one. `Source::Instrument` is
 * documented in `provenance.rs` as *"read from a device: a scale, a sensor, a GPS trace"*. Nothing
 * here read a device. OpenCellID is a third party asserting where a tower stands, and the phone's
 * association with that tower is the only thing tying the participant to it — so this enters the
 * log as **`Source::ThirdParty`**, which sits below `Instrument` in the evidential ordering. That
 * ordering is an authored judgement and this is exactly the kind of case it was authored for.
 *
 * ⚠️ **It locates the tower, not the participant.** A tower serves everyone in its cell. The
 * position returned is the tower's estimated location and the sigma is the cell's radius — so the
 * honest reading is *"somewhere within a few kilometres of this mast"*, and `sigmaFromRange`
 * below is what carries that into the filter rather than a footnote nobody reads.
 */

import { sigmaFromAccuracy } from "@/lib/geolocate";

const TIMEOUT_MS = 8000;

/**
 * ⭐ **The provider's `range` is a radius in metres; the filter wants one sigma.**
 *
 * OpenCellID documents `range` as the estimated cell radius — the distance out to which the
 * tower is believed to serve. Treating that as a sigma would claim the participant is within
 * ~68% odds of one radius, when the radius is closer to a bound than a standard deviation.
 *
 * ⚠️ So it is read as a coverage figure and halved, the same conversion `sigmaFromAccuracy`
 * applies to the browser's 95% `accuracy` — and for the same reason: **an overconfident sigma is
 * worse than a wide one.** The fold trusts what it is told. A tower fix claiming 200 m would
 * outweigh a genuine GPS fix at 400 m and drag the estimate to a mast.
 *
 * ⚠️ A missing or nonsensical `range` falls back to 5000 m, which is a mid-sized rural cell.
 * That is a placeholder in the `provenance.rs` sense — nobody measured it — and it is chosen
 * wide deliberately, because the failure mode of guessing narrow is silent and the failure mode
 * of guessing wide is a visibly uncertain answer.
 */
export function sigmaFromRange(range) {
  const r = typeof range === "number" && range > 0 ? range : 5000;
  return sigmaFromAccuracy(r);
}

/**
 * Look up a cell tower's position.
 *
 * `{mcc, mnc, lac, cellid}` identify a tower: country, network, area, cell. A handset knows all
 * four about the tower it is attached to; a browser does not expose them, so these arrive from
 * whatever client can read them (a native shell, a USSD-derived form, a manual entry).
 *
 * Returns `{ok: true, latitude, longitude, sigma_m, range_m}` or `{ok: false, reason}`.
 * ⚠️ Never throws — the same contract as `lib/api/elevation.js` and `lib/ai/sources.js`, for the
 * same reason: a failed source is a stated absence, not a stack trace in a route.
 */
export async function locateCell({ mcc, mnc, lac, cellid }) {
  const key = process.env.OPENCELLID_API_KEY;
  if (!key) return { ok: false, reason: "no OPENCELLID_API_KEY configured" };

  for (const [name, v] of Object.entries({ mcc, mnc, lac, cellid })) {
    if (!Number.isFinite(Number(v))) {
      return { ok: false, reason: `\`${name}\` must be a number identifying the cell` };
    }
  }

  const url =
    `https://opencellid.org/cell/get?key=${encodeURIComponent(key)}` +
    `&mcc=${Number(mcc)}&mnc=${Number(mnc)}&lac=${Number(lac)}&cellid=${Number(cellid)}` +
    `&format=json`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let body;
  try {
    const r = await fetch(url, { headers: { accept: "application/json" }, signal: controller.signal });
    if (!r.ok) return { ok: false, reason: `the cell database answered HTTP ${r.status}` };
    body = await r.json();
  } catch (e) {
    return {
      ok: false,
      reason: e?.name === "AbortError" ? "the cell database did not answer in time" : "the cell database could not be reached",
    };
  } finally {
    clearTimeout(timer);
  }

  /**
   * ⚠️ **This provider signals failure with HTTP 200 and an `error` field**, measured:
   * a bad key returns `200 {"error":"API Key not known: test","code":2}`. Checking only the
   * status code would treat that as a successful lookup of a tower at `undefined, undefined`.
   */
  if (body?.error) return { ok: false, reason: `the cell database rejected the lookup: ${body.error}` };

  const latitude = Number(body?.lat);
  const longitude = Number(body?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, reason: "the cell database returned no position for that tower" };
  }

  const range_m = typeof body?.range === "number" ? body.range : null;
  return { ok: true, latitude, longitude, sigma_m: sigmaFromRange(range_m), range_m };
}

/**
 * The tower fix as an `Observation::Fix`, ready to post to `/v1/observe/:source`.
 *
 * ⚠️ `source: "third_party"` — see the module doc. `provenance.rs` derives `Source` with
 * `#[serde(rename_all = "snake_case")]`, so the wire form of `ThirdParty` is `third_party`;
 * sending `"thirdParty"` or `"ThirdParty"` is rejected by the extractor.
 *
 * ⚠️ `altitude_km: 0` rather than `null`, matching `geolocate.js`: the extractor rejects the
 * whole body on a null, and a tower lookup carries no altitude to report anyway.
 */
export function towerObservation({ latitude, longitude, sigma_m }, takenAtMs = null) {
  const ms = typeof takenAtMs === "number" ? takenAtMs : null;
  return {
    kind: "fix",
    at: { latitude, longitude, altitude_km: 0 },
    sigma_m,
    source: "third_party",
    // ⚠️ Julian day, not epoch milliseconds — the same conversion `geolocate.js` documents.
    ...(ms === null ? {} : { taken_at: ms / 86400000 + 2440587.5 }),
  };
}
