//! The endpoints the web client's BFF forwards to.
//!
//! # ⭐ Why these three exist while the rest are still stubbed
//!
//! The crate doc says the routes stay stubbed until the cohesion gate passes, and that is
//! still true of everything on the address path. These three are not on it, and the argument
//! is `olduvai-core`'s own, made in the crate doc under *"Build order"*:
//!
//! > *"[`fusion`] does not qualify on those grounds, and needs its own argument. ... It stays
//! > behind the gate by stopping short of the step that matters. The module produces a position
//! > and an uncertainty and offers **no** function mapping either to a coordinate, a `Trit`, or
//! > an `Address`."*
//!
//! ⚠️ So the test these routes must keep passing is not "do they touch positions" — they do —
//! but **do they expose anything that maps a position to a coordinate, a trit or an address**.
//! They do not, and nothing may be added here that does. `Estimate::extent` is deliberately
//! not on the wire: it is the *guard's* input, and putting it on a JSON response would invite
//! a client to treat it as a coordinate precursor rather than as an admissibility argument.
//!
//! # ⚠️ Transport only, and the mechanical test for it
//!
//! Same test `positions.rs` applies to itself: **no floating-point arithmetic on a position or
//! a sigma appears in this file.** Every number in every response below is read straight off an
//! [`Estimate`] that `olduvai_core::fusion` produced. If a `*`, `/` or `sqrt` ever appears near
//! a coordinate here, a second implementation has been born.
//!
//! ⭐ That is why [`estimate_body`] hands back `sigma_m` rather than, say, a radius in
//! kilometres: the conversion is arithmetic, and arithmetic on a sigma is the exact thing this
//! file is forbidden to do. A client that wants kilometres divides by a thousand itself, and
//! has the unit name in `units` to tell it what it divided.
//!
//! # What a blocked response looks like from up here
//!
//! Nothing here returns a 503. The BFF does that, from its own manifest, when this server is
//! unreachable or answers with an error. ⭐ An **empty** answer from these routes is not an
//! error and must not be shaped like one: a participant with no observations has an
//! `Estimate::uninformed`, which is a real estimate carrying a 200 km sigma, and `200 km` is
//! the encoding of *we do not know where you are* rather than a missing value.
//!
//! ⚠️ The one thing that would break that is returning `200 OK` with nulls. Then the client
//! could not tell "no observations" from "the field was omitted", and the honest 200 km would
//! be the first casualty.

use std::sync::{Arc, RwLock};

use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use olduvai_core::fusion::{Estimate, Observation, MIN_SIGMA_M, UNINFORMED_SIGMA_M};
use olduvai_core::orbit::Geodetic;
use serde_json::{json, Value};

use crate::participant::Participant;
use crate::positions::Positions;

/// Shared server state.
///
/// ⚠️ An `RwLock` over an in-memory map, which is the honest shape for what this is: a
/// process-lifetime cache with no persistence. The log is supposed to be the truth and a
/// truth that dies with the process is not one — ⭐ but the missing piece is the *ledger*,
/// not a database, and reaching for Postgres now would be building the wrong durable thing.
/// [`Positions`] keeps the full log precisely so that whatever persists it later can replay
/// it and get the same fold.
#[derive(Clone, Default)]
pub struct AppState {
    positions: Arc<RwLock<Positions>>,
}

impl AppState {
    pub fn new() -> AppState {
        AppState {
            positions: Arc::new(RwLock::new(Positions::new())),
        }
    }
}

impl std::fmt::Debug for AppState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("AppState").finish_non_exhaustive()
    }
}

/// The failure shape. Matches what the BFF's `forward` already expects to parse.
fn error(status: StatusCode, reason: &str, detail: &str) -> (StatusCode, Json<Value>) {
    (
        status,
        Json(json!({ "reason": reason, "detail": detail })),
    )
}

/// ⚠️ Where a participant's fold starts when they have no observations yet.
///
/// **Authored, and not a position claim.** `Estimate::uninformed` pairs it with
/// [`UNINFORMED_SIGMA_M`] — 200 km — so the first real observation moves the estimate almost
/// entirely to itself; the core's own test `the_prior_does_not_compete_with_a_real_observation`
/// is the guarantee. It is here rather than in core because "which country is this deployment
/// serving" is a deployment fact, not a mathematical one.
///
/// ⭐ It is reported on the wire as `seed`, distinct from `at`, so nobody reads the seed as an
/// observation. When `observation_count` is zero, `at` *is* the seed and the response says so.
const SEED: Geodetic = Geodetic {
    latitude: -19.0154,
    longitude: 29.1549,
    altitude_km: 0.0,
};

// ---------------------------------------------------------------------------
// GET /v1/position
// ---------------------------------------------------------------------------

/// The fused estimate for the calling participant.
///
/// ⭐ Answers `200` even with no observations. See the module doc: the uninformed prior is a
/// result, not an absence, and the `rests_on_observation: false` plus the 200 km sigma say
/// everything a 503 would have said while remaining shape-compatible with a live answer.
pub async fn position(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let participant = require_participant(&headers)?;

    let positions = state.positions.read().expect("positions lock");
    let estimate = positions
        .estimate(participant.key())
        .unwrap_or_else(|| Estimate::uninformed(SEED));

    // ⚠️ Checked on read, not assumed. `Positions::verify` refolds the log and compares
    // exactly; a mismatch means the incremental path has diverged from the definition, which
    // is a bug rather than a condition to handle — so it is reported rather than smoothed
    // over. The estimate is still returned: refusing to answer would hide the discrepancy
    // from the only person positioned to notice it.
    let consistent = positions.verify(participant.key());
    let count = positions.log(participant.key()).map(<[_]>::len).unwrap_or(0);

    Ok(Json(json!({
        "estimate": estimate_body(&estimate),
        "declaration": declaration_body(&estimate),
        "log_length": count,
        "cache_consistent": consistent,
    })))
}

// ---------------------------------------------------------------------------
// POST /v1/observe/:source
// ---------------------------------------------------------------------------

/// One reading from one source, appended to the participant's log.
///
/// # ⭐ Why the source is in the path and the shape is in the body
///
/// The path segment says *where the reading came from*; the `kind` tag inside the observation
/// says *what it constrains*. Those are genuinely different questions and collapsing them
/// would lose the interesting case: a flight track and a farmer's drawn boundary are different
/// sources, but a terrain tile and that drawn boundary are the same *shape* — both are
/// `within`.
///
/// ⚠️ So this route checks that the pair is one the source is allowed to produce, and rejects
/// the rest. Without that check, a caller wiring the flights provider could post a `fix` and
/// the filter would fold it isotropically — silently inventing the along-track position that
/// `Corridor` exists to withhold. That is not a hypothetical: it is the single mistake note 33
/// is written to prevent, and it would produce a *tighter* sigma, so it would look like an
/// improvement.
pub async fn observe(
    State(state): State<AppState>,
    Path(source): Path<String>,
    headers: HeaderMap,
    Json(observation): Json<Observation>,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let participant = require_participant(&headers)?;

    let allowed = allowed_shapes(&source).ok_or_else(|| {
        error(
            StatusCode::NOT_FOUND,
            "unknown_source",
            &format!(
                "No observation source named \"{source}\". Known sources: {}.",
                SOURCES.iter().map(|(n, _)| *n).collect::<Vec<_>>().join(", ")
            ),
        )
    })?;

    let shape = shape_of(&observation);
    if !allowed.contains(&shape) {
        return Err(error(
            StatusCode::UNPROCESSABLE_ENTITY,
            "wrong_shape",
            &format!(
                "The \"{source}\" source constrains {}, but this reading is a \"{shape}\". \
                 A source may not submit a shape it cannot observe: folding a track as a point \
                 would invent the along-track position the corridor exists to withhold.",
                allowed.join(" or ")
            ),
        ));
    }

    // ⚠️ Rejected here rather than being allowed through as inert. `Estimate::update` treats an
    // incoherent observation as a no-op, which is right for a log being refolded years later —
    // but at the point of *submission* the caller can still fix it, and accepting it silently
    // would mean a provider misconfiguration shows up as "no readings" rather than as an error.
    if !observation.is_valid() {
        return Err(error(
            StatusCode::UNPROCESSABLE_ENTITY,
            "incoherent_observation",
            "The reading is not a coherent observation: a non-finite coordinate, a negative \
             sigma, or a corridor whose two points coincide and so define no direction.",
        ));
    }

    let mut positions = state.positions.write().expect("positions lock");
    // ⭐ The one call that advances an estimate, and it is a call into core.
    let estimate = positions.observe(participant.key(), SEED, observation);
    let count = positions.log(participant.key()).map(<[_]>::len).unwrap_or(0);
    let consistent = positions.verify(participant.key());

    Ok(Json(json!({
        "accepted": true,
        "source": source,
        "constrains": shape,
        "estimate": estimate_body(&estimate),
        "declaration": declaration_body(&estimate),
        "log_length": count,
        "cache_consistent": consistent,
    })))
}

// ---------------------------------------------------------------------------
// GET /v1/observe/:source
// ---------------------------------------------------------------------------

/// What this source has contributed to the calling participant's log.
///
/// ⚠️ Filters the participant's *own* log by shape rather than by source, because the log
/// records observations and not their provenance chain. That is a real limitation and it is
/// stated rather than hidden: `terrain` and a farmer's drawn boundary both produce `within`
/// and this endpoint cannot currently tell them apart. Fixing it means the log entries carry
/// their source, which is a change to the core's `Observation` and belongs there, not in a
/// filter here.
pub async fn readings(
    State(state): State<AppState>,
    Path(source): Path<String>,
    headers: HeaderMap,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let participant = require_participant(&headers)?;

    let allowed = allowed_shapes(&source).ok_or_else(|| {
        error(
            StatusCode::NOT_FOUND,
            "unknown_source",
            &format!("No observation source named \"{source}\"."),
        )
    })?;

    let positions = state.positions.read().expect("positions lock");
    let readings: Vec<&Observation> = positions
        .log(participant.key())
        .unwrap_or(&[])
        .iter()
        .filter(|o| allowed.contains(&shape_of(o)))
        .collect();

    Ok(Json(json!({
        "source": source,
        "constrains": allowed,
        "readings": readings,
    })))
}

// ---------------------------------------------------------------------------
// GET /v1/foreman
// ---------------------------------------------------------------------------

/// A participant's own activity record.
///
/// ⭐ Answers honestly about an empty record rather than 503-ing. The distinction matters
/// here more than anywhere: the foreman is *advisory to one person* —
///
/// > *"If a farmer lies, they will get wrong results and thats it. That does not affect the
/// > platform."*
///
/// — so "you have recorded nothing" is a complete and correct answer to someone who has
/// recorded nothing, and it is the answer they will get on their first visit. ⚠️ The
/// coherence check itself (`foreman::check_cycle`) is built and pure; what is missing is a
/// store to hold cycles, which is the ledger again.
pub async fn foreman(
    headers: HeaderMap,
) -> Result<Json<Value>, (StatusCode, Json<Value>)> {
    let _participant = require_participant(&headers)?;

    Ok(Json(json!({
        "cycles": [],
        "declaration": {
            "source": "asserted",
            "label": "Foreman record",
            "sigma": "not a measurement — a record of what was entered",
            // ⚠️ Says outright that a coherent record is not a true one. `foreman`'s own doc:
            // an alert on a wholly-asserted cycle means "these claims disagree with each
            // other", never "reality disagrees with the claim".
            "note": "Your own append-only record of your own activity, checked for coherence \
                     against itself. Coherence is not truth: a self-consistent record of things \
                     that did not happen passes every check here. It carries no weight on the \
                     exchange.",
            "readings": [],
        },
    })))
}

// ---------------------------------------------------------------------------
// Shared shaping
// ---------------------------------------------------------------------------

fn require_participant(headers: &HeaderMap) -> Result<Participant, (StatusCode, Json<Value>)> {
    Participant::from_headers(headers).ok_or_else(|| {
        error(
            StatusCode::UNAUTHORIZED,
            "unauthenticated",
            "No participant. Identity on the exchange is a ledger participant, and that \
             service is not built.",
        )
    })
}

/// The wire shape of an estimate.
///
/// ⚠️ Every field is read off the [`Estimate`] unchanged. No unit conversion, no rounding, no
/// derived radius — see the module doc for why that restriction is the whole point of this
/// file rather than an inconvenience in it.
fn estimate_body(estimate: &Estimate) -> Value {
    json!({
        "at": {
            "latitude": estimate.at.latitude,
            "longitude": estimate.at.longitude,
        },
        "sigma_m": estimate.sigma_m,
        "as_of": estimate.as_of,
        "observation_count": estimate.observation_count,
        "strongest_source": estimate.strongest_source,
        "is_informed": estimate.is_informed(),
        "rests_on_observation": estimate.rests_on_observation(),
        // ⭐ The seed, named separately so nobody mistakes an unobserved position for a
        // measured one. When `observation_count` is 0, `at` equals this.
        "seed": {
            "latitude": SEED.latitude,
            "longitude": SEED.longitude,
        },
    })
}

/// The declaration line, in the shape `RailPage.js` already renders.
///
/// ⭐ `source` is the *strongest contributing* provenance, not a constant. An estimate built
/// entirely from a participant's own assertions declares `asserted` however tight its sigma
/// became — which is `Estimate::rests_on_observation` put on the wire, and the reason
/// `RailPage`'s provenance caption had to stop being hardcoded.
fn declaration_body(estimate: &Estimate) -> Value {
    json!({
        "source": estimate
            .strongest_source
            .map(|s| serde_json::to_value(s).unwrap_or(Value::Null))
            .unwrap_or(Value::String("asserted".into())),
        "label": "Position estimate",
        "constrains": "estimate",
        "sigma": estimate.declaration(),
        "units": { "latitude": "deg", "longitude": "deg", "sigma_m": "m" },
        "rests_on_observation": estimate.rests_on_observation(),
        "readings": [],
        // ⚠️ Published so a client can state the floor rather than infer it from a suspiciously
        // round number. Both are authored constants in core with reasons attached.
        "bounds": { "uninformed_sigma_m": UNINFORMED_SIGMA_M, "min_sigma_m": MIN_SIGMA_M },
    })
}

/// Which observation shapes each source may submit.
///
/// ⭐ Mirrors `web/src/pages/api/observe/[source].js`, and the duplication is deliberate: the
/// BFF's copy is *documentation for a reader* and this one is *enforcement*. If they disagree
/// this one wins, because a check in the BFF is admissibility logic in the BFF, which
/// `lib/api/upstream.js` forbids outright.
///
/// ⚠️ `satellites` submits `within`, not an `overpass`. An overpass is not an observation of
/// the participant at all — it is the window in which a sensor could have seen them. What
/// enters the log is the *reading taken during* that window, and a reading covers ground, so
/// it is a region.
const SOURCES: &[(&str, &[&str])] = &[
    ("terrain", &["within"]),
    ("satellites", &["within"]),
    ("flights", &["corridor"]),
    ("gps", &["fix"]),
];

fn allowed_shapes(source: &str) -> Option<Vec<&'static str>> {
    SOURCES
        .iter()
        .find(|(name, _)| *name == source)
        .map(|(_, shapes)| shapes.to_vec())
}

/// The `kind` tag of an observation, matching its serde representation.
fn shape_of(observation: &Observation) -> &'static str {
    match observation {
        Observation::Fix { .. } => "fix",
        Observation::Corridor { .. } => "corridor",
        Observation::Within { .. } => "within",
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    async fn call(req: Request<Body>) -> (StatusCode, Value) {
        let app = crate::app(AppState::new());
        send(app, req).await
    }

    async fn send(app: axum::Router, req: Request<Body>) -> (StatusCode, Value) {
        let res = app.oneshot(req).await.expect("router");
        let status = res.status();
        let bytes = res.into_body().collect().await.expect("body").to_bytes();
        let value = if bytes.is_empty() {
            Value::Null
        } else {
            serde_json::from_slice(&bytes).expect("json")
        };
        (status, value)
    }

    fn get(path: &str, who: Option<&str>) -> Request<Body> {
        let mut b = Request::builder().method("GET").uri(path);
        if let Some(who) = who {
            b = b.header("authorization", format!("Bearer {who}"));
        }
        b.body(Body::empty()).unwrap()
    }

    fn post(path: &str, who: Option<&str>, body: Value) -> Request<Body> {
        let mut b = Request::builder()
            .method("POST")
            .uri(path)
            .header("content-type", "application/json");
        if let Some(who) = who {
            b = b.header("authorization", format!("Bearer {who}"));
        }
        b.body(Body::from(body.to_string())).unwrap()
    }

    fn a_fix() -> Value {
        json!({
            "kind": "fix",
            "at": { "latitude": -17.83, "longitude": 31.05, "altitude_km": 0.0 },
            "sigma_m": 30.0,
            "source": "instrument",
            // ⚠️ `Utc` is `#[serde(transparent)]` over an f64 Julian day — a bare number on the
            // wire, not an object. Wrapping it would deserialise into nothing and every one of
            // these tests would fail at the boundary rather than at what it means to assert.
            "taken_at": 2_460_000.5,
        })
    }

    #[tokio::test]
    async fn health_still_answers() {
        let (status, body) = call(get("/health", None)).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["status"], "ok");
        // ⚠️ Still null, and must stay null until a CoordinateFn exists.
        assert!(body["coordinate_fn"].is_null());
    }

    #[tokio::test]
    async fn every_route_requires_a_participant() {
        for path in ["/v1/position", "/v1/observe/gps", "/v1/foreman"] {
            let (status, body) = call(get(path, None)).await;
            assert_eq!(status, StatusCode::UNAUTHORIZED, "{path} answered anonymously");
            assert_eq!(body["reason"], "unauthenticated");
        }
    }

    #[tokio::test]
    async fn an_unobserved_participant_gets_the_uninformed_prior_not_a_null() {
        // ⭐ The property the whole design of this endpoint rests on: emptiness is a *result*.
        let (status, body) = call(get("/v1/position", Some("farm-1"))).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["estimate"]["observation_count"], 0);
        assert_eq!(body["estimate"]["is_informed"], false);
        assert_eq!(body["estimate"]["rests_on_observation"], false);
        assert_eq!(body["estimate"]["sigma_m"], UNINFORMED_SIGMA_M);
        // ⚠️ Not null. A null here would be indistinguishable from an omitted field, and the
        // honest 200 km would be the first thing lost.
        assert!(body["estimate"]["at"]["latitude"].is_number());
        assert_eq!(body["estimate"]["at"]["latitude"], body["estimate"]["seed"]["latitude"]);
        assert!(body["declaration"]["sigma"]
            .as_str()
            .unwrap()
            .contains("has not been measured"));
    }

    #[tokio::test]
    async fn a_fix_moves_the_estimate_and_the_log_records_it() {
        let app = crate::app(AppState::new());
        let (status, body) = send(app.clone(), post("/v1/observe/gps", Some("farm-1"), a_fix())).await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["accepted"], true);
        assert_eq!(body["constrains"], "fix");
        assert_eq!(body["log_length"], 1);
        assert_eq!(body["cache_consistent"], true);
        // The prior does not compete: one 30 m fix against 200 km should own the result.
        assert!(body["estimate"]["sigma_m"].as_f64().unwrap() < 31.0);
        assert_eq!(body["estimate"]["rests_on_observation"], true);

        // And it is still there on a subsequent read.
        let (status, body) = send(app, get("/v1/position", Some("farm-1"))).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["estimate"]["observation_count"], 1);
        assert_eq!(body["log_length"], 1);
    }

    #[tokio::test]
    async fn a_source_may_not_submit_a_shape_it_cannot_observe() {
        // ⭐ The check that matters most here. Posting a `fix` to the flights source would fold
        // a track isotropically and invent the along-track position `Corridor` withholds — and
        // it would produce a *tighter* sigma, so it would look like an improvement.
        let (status, body) = call(post("/v1/observe/flights", Some("farm-1"), a_fix())).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert_eq!(body["reason"], "wrong_shape");
        assert!(body["detail"].as_str().unwrap().contains("corridor"));
    }

    #[tokio::test]
    async fn a_rejected_reading_does_not_enter_the_log() {
        // ⚠️ The rejection must be a rejection, not a warning attached to an accepted write.
        let app = crate::app(AppState::new());
        let (status, _) = send(
            app.clone(),
            post("/v1/observe/flights", Some("farm-1"), a_fix()),
        )
        .await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);

        let (_, body) = send(app, get("/v1/position", Some("farm-1"))).await;
        assert_eq!(body["log_length"], 0);
        assert_eq!(body["estimate"]["observation_count"], 0);
    }

    #[tokio::test]
    async fn an_incoherent_observation_is_refused_at_submission() {
        // A corridor whose endpoints coincide defines no direction. `Estimate::update` treats
        // it as inert; at submission the caller can still fix it, so it is an error.
        let degenerate = json!({
            "kind": "corridor",
            "from": { "latitude": -17.83, "longitude": 31.05, "altitude_km": 0.0 },
            "to": { "latitude": -17.83, "longitude": 31.05, "altitude_km": 0.0 },
            "sigma_m": 2000.0,
            "source": "instrument",
            "taken_at": 2_460_000.5,
        });
        let (status, body) = call(post("/v1/observe/flights", Some("farm-1"), degenerate)).await;
        assert_eq!(status, StatusCode::UNPROCESSABLE_ENTITY);
        assert_eq!(body["reason"], "incoherent_observation");
    }

    #[tokio::test]
    async fn a_corridor_is_accepted_by_flights_and_constrains_across_track() {
        let corridor = json!({
            "kind": "corridor",
            "from": { "latitude": -18.5, "longitude": 31.0, "altitude_km": 0.0 },
            "to": { "latitude": -17.0, "longitude": 31.0, "altitude_km": 0.0 },
            "sigma_m": 2000.0,
            "source": "instrument",
            "taken_at": 2_460_000.5,
        });
        let (status, body) = call(post("/v1/observe/flights", Some("farm-1"), corridor)).await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["constrains"], "corridor");
        assert_eq!(body["estimate"]["observation_count"], 1);
    }

    #[tokio::test]
    async fn a_region_is_accepted_by_satellites_and_leaves_a_wide_sigma() {
        // ⭐ The satellites source submits `within`, not an overpass: an overpass is the window
        // in which a sensor *could* have seen the participant, and what enters the log is the
        // reading taken during it — which covers ground, so it is a region.
        let within = json!({
            "kind": "within",
            "centre": { "latitude": -17.83, "longitude": 31.05, "altitude_km": 0.0 },
            "footprint": { "kind": "swath", "across_track_km": 25.0, "along_track_km": 800.0 },
            "source": "instrument",
            "taken_at": 2_460_000.5,
        });
        let (status, body) = call(post("/v1/observe/satellites", Some("farm-1"), within)).await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["constrains"], "within");
        // ⚠️ A swath narrows the estimate but must not pretend to a fix's precision. The
        // across-track width is kilometres, and the sigma has to still show that.
        assert!(body["estimate"]["sigma_m"].as_f64().unwrap() > 1_000.0);
    }

    #[tokio::test]
    async fn participants_do_not_see_each_others_positions() {
        // ⚠️ The reason the participant is read from the header and never from the body.
        let app = crate::app(AppState::new());
        let (status, _) = send(app.clone(), post("/v1/observe/gps", Some("farm-1"), a_fix())).await;
        assert_eq!(status, StatusCode::OK);

        let (_, body) = send(app, get("/v1/position", Some("farm-2"))).await;
        assert_eq!(body["estimate"]["observation_count"], 0);
        assert_eq!(body["log_length"], 0);
    }

    #[tokio::test]
    async fn assertions_never_report_themselves_as_measured() {
        // ⭐ A pile of asserted readings can produce a tight sigma. The declaration must still
        // say `asserted`, which is the fact `RailPage`'s provenance caption renders.
        let app = crate::app(AppState::new());
        for i in 0..5 {
            let mut obs = a_fix();
            obs["source"] = json!("asserted");
            obs["taken_at"] = json!(2_460_000.5 + f64::from(i) * 0.01);
            let (status, _) = send(app.clone(), post("/v1/observe/gps", Some("farm-1"), obs)).await;
            assert_eq!(status, StatusCode::OK);
        }
        let (_, body) = send(app, get("/v1/position", Some("farm-1"))).await;
        assert!(body["estimate"]["sigma_m"].as_f64().unwrap() < 30.0);
        assert_eq!(body["estimate"]["rests_on_observation"], false);
        assert_eq!(body["declaration"]["source"], "asserted");
        assert!(body["declaration"]["sigma"]
            .as_str()
            .unwrap()
            .contains("stated rather than measured"));
    }

    #[tokio::test]
    async fn an_unknown_source_is_a_404_that_names_the_known_ones() {
        let (status, body) = call(post("/v1/observe/shipping", Some("farm-1"), a_fix())).await;
        assert_eq!(status, StatusCode::NOT_FOUND);
        assert_eq!(body["reason"], "unknown_source");
        assert!(body["detail"].as_str().unwrap().contains("gps"));
    }

    #[tokio::test]
    async fn readings_are_filtered_to_the_source_that_could_have_produced_them() {
        let app = crate::app(AppState::new());
        send(app.clone(), post("/v1/observe/gps", Some("farm-1"), a_fix())).await;

        let (status, body) = send(app.clone(), get("/v1/observe/gps", Some("farm-1"))).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["readings"].as_array().unwrap().len(), 1);

        // The same log, asked about through a source that constrains a different shape.
        let (_, body) = send(app, get("/v1/observe/flights", Some("farm-1"))).await;
        assert_eq!(body["readings"].as_array().unwrap().len(), 0);
    }

    #[tokio::test]
    async fn the_foreman_answers_an_empty_record_rather_than_failing() {
        let (status, body) = call(get("/v1/foreman", Some("farm-1"))).await;
        assert_eq!(status, StatusCode::OK);
        assert_eq!(body["cycles"].as_array().unwrap().len(), 0);
        // ⚠️ Coherence is not truth, and the declaration must say so.
        assert!(body["declaration"]["note"]
            .as_str()
            .unwrap()
            .contains("Coherence is not truth"));
    }

    #[tokio::test]
    async fn the_declaration_publishes_the_bounds_it_was_computed_under() {
        let (_, body) = call(get("/v1/position", Some("farm-1"))).await;
        assert_eq!(body["declaration"]["bounds"]["min_sigma_m"], MIN_SIGMA_M);
        assert_eq!(
            body["declaration"]["bounds"]["uninformed_sigma_m"],
            UNINFORMED_SIGMA_M
        );
    }

    #[test]
    fn every_declared_source_maps_to_a_real_observation_variant() {
        // ⚠️ Guards the one place this file restates something core owns. A typo in SOURCES
        // would silently reject every reading from that source as the wrong shape.
        let shapes = ["fix", "corridor", "within"];
        for (name, allowed) in SOURCES {
            assert!(!allowed.is_empty(), "{name} declares no shape");
            for s in *allowed {
                assert!(shapes.contains(s), "{name} declares unknown shape {s}");
            }
        }
    }
}
