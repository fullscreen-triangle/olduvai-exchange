//! HTTP surface over `olduvai-core`.
//!
//! ⚠️ **Transport only.** Every endpoint in `notes/30-programming-structure.md` §6 is a
//! thin translation from JSON to a core call and back. No encoding, no ranking, no
//! synthesis rule lives here — if it did, the web client (which calls the same core
//! through WASM) could disagree with the server about a participant's address, and
//! nothing would detect it.
//!
//! The routes are stubbed until the cohesion gate passes (§7 step 3). Wiring them to
//! placeholder logic now would create exactly the second implementation this architecture
//! exists to prevent.

use axum::{routing::get, Json, Router};
use serde_json::json;

/// ⭐ The running position filter. Storage and ordering only — every arithmetic step is a
/// call into `olduvai_core::fusion`. See the module doc for why that is not a breach of the
/// transport-only rule above.
mod positions;

async fn health() -> Json<serde_json::Value> {
    Json(json!({
        "status": "ok",
        "core_version": env!("CARGO_PKG_VERSION"),
        // Absent until a CoordinateFn exists. Clients must treat a null here as
        // "addresses are not yet meaningful", not as a default.
        "coordinate_fn": serde_json::Value::Null,
    }))
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let app = Router::new().route("/health", get(health));

    let listener = tokio::net::TcpListener::bind("127.0.0.1:8080")
        .await
        .expect("bind 127.0.0.1:8080");

    tracing::info!("olduvai-server listening on http://127.0.0.1:8080");
    axum::serve(listener, app).await.expect("serve");
}
