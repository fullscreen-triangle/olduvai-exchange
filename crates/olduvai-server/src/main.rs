//! HTTP surface over `olduvai-core`.
//!
//! ⚠️ **Transport only.** Every endpoint in `notes/30-programming-structure.md` §6 is a
//! thin translation from JSON to a core call and back. No encoding, no ranking, no
//! synthesis rule lives here — if it did, the web client (which calls the same core
//! through WASM) could disagree with the server about a participant's address, and
//! nothing would detect it.
//!
//! # ⭐ Which routes are live, and why those and not the others
//!
//! The address-path endpoints are still stubbed, and must stay that way until the cohesion
//! gate passes (§7 step 3). Wiring them to placeholder logic would create exactly the second
//! implementation this architecture exists to prevent.
//!
//! The position and foreman routes in [`routes`] are live, on `olduvai-core`'s own argument
//! (see its crate doc, *"Build order"*): `fusion` sits *on* the coordinate path but stops
//! short of it, exposing no function that maps a position to a coordinate, a `Trit` or an
//! `Address`. ⚠️ The test to keep applying as routes are added here is not "does this touch a
//! position" but **"does this expose a mapping from a position to an address"**. The moment
//! one does, it belongs behind the gate with the rest.
//!
//! `foreman` qualifies more simply: it never depended on a coordinate function at all.

use axum::{
    routing::{get, post},
    Json, Router,
};
use serde_json::json;

mod participant;
/// ⭐ The running position filter. Storage and ordering only — every arithmetic step is a
/// call into `olduvai_core::fusion`. See the module doc for why that is not a breach of the
/// transport-only rule above.
mod positions;
mod routes;

async fn health() -> Json<serde_json::Value> {
    Json(json!({
        "status": "ok",
        "core_version": env!("CARGO_PKG_VERSION"),
        // Absent until a CoordinateFn exists. Clients must treat a null here as
        // "addresses are not yet meaningful", not as a default.
        "coordinate_fn": serde_json::Value::Null,
    }))
}

/// The router, built separately from `main` so the tests can drive it without a socket.
pub fn app(state: routes::AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/v1/position", get(routes::position))
        // ⚠️ Same path, two verbs, and they are not symmetric: `POST` appends a reading to the
        // log, `GET` reports what this source has already contributed. Splitting them onto
        // different paths would suggest they are different resources, and they are not — they
        // are the write and the read of one.
        .route(
            "/v1/observe/:source",
            post(routes::observe).get(routes::readings),
        )
        .route("/v1/foreman", get(routes::foreman))
        .with_state(state)
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let app = app(routes::AppState::new());

    let listener = tokio::net::TcpListener::bind("127.0.0.1:8080")
        .await
        .expect("bind 127.0.0.1:8080");

    tracing::info!("olduvai-server listening on http://127.0.0.1:8080");
    axum::serve(listener, app).await.expect("serve");
}
