//! WASM bindings to `olduvai-core`, for the web client.
//!
//! The browser encodes with the same code the server does. This is what lets the client
//! show a participant their address, or preview how a change to their declared attributes
//! would move it, without a round trip — and without the risk that a JavaScript
//! reimplementation rounds a third differently and produces a plausible wrong answer
//! (`notes/30-programming-structure.md` §1).
//!
//! Client-side encoding is a *display* convenience. The address of record is the one the
//! server computed and wrote to the ledger; a client is never trusted to submit one.
//!
//! # The agent surface, and what is missing from it
//!
//! The client can compute χ, check a declared self against its floor, and water-fill a
//! question budget locally — all deterministic, all the same code the server runs. That is
//! what makes a dashboard responsive: the "what would happen if I declared this instead"
//! preview needs no round trip.
//!
//! ⚠️ [`accept_proposal`] is here, and it is the one place a client touches the AI boundary.
//! It requires a confirmer's name and returns a field at `Source::Asserted`. Note what that
//! means: a client cannot mint an *observed* field, so the worst a compromised client can do
//! through this path is assert something, which carries evidential weight `0.0` and moves no
//! confidence floor. The address of record and the ledger entry are still the server's.
//!
//! Structured values cross as JSON strings rather than as `#[wasm_bindgen]` structs, so that
//! the TypeScript types are generated from the same serde representation the HTTP API uses
//! rather than being a second hand-maintained declaration of each shape.

use olduvai_core::agent::{self, Regime, Scene, Self_};
use olduvai_core::foreman::{self, Cycle};
use olduvai_core::proposal::{Confirmation, Proposal};
use olduvai_core::{Address, Coordinates};
use wasm_bindgen::prelude::*;

fn from_json<T: serde::de::DeserializeOwned>(s: &str) -> Result<T, JsError> {
    serde_json::from_str(s).map_err(|e| JsError::new(&e.to_string()))
}

fn to_json<T: serde::Serialize>(v: &T) -> Result<String, JsError> {
    serde_json::to_string(v).map_err(|e| JsError::new(&e.to_string()))
}

/// Encode a point to an address string.
#[wasm_bindgen]
pub fn encode(s_k: f64, s_t: f64, s_e: f64, depth: usize) -> Result<String, JsError> {
    let coords = Coordinates::new(s_k, s_t, s_e).map_err(|e| JsError::new(&e.to_string()))?;
    Ok(Address::encode(coords, depth).to_string())
}

/// Decode an address to the centre of its cell, as `[s_k, s_t, s_e]`.
#[wasm_bindgen]
pub fn decode(address: &str) -> Result<Vec<f64>, JsError> {
    let addr: Address = address
        .parse()
        .map_err(|e: olduvai_core::ParseAddressError| JsError::new(&e.to_string()))?;
    Ok(addr.decode().as_array().to_vec())
}

/// Length of the longest common prefix — the similarity measure the UI ranks by.
#[wasm_bindgen]
pub fn common_prefix_len(a: &str, b: &str) -> Result<usize, JsError> {
    let parse = |s: &str| -> Result<Address, JsError> {
        s.parse()
            .map_err(|e: olduvai_core::ParseAddressError| JsError::new(&e.to_string()))
    };
    Ok(parse(a)?.common_prefix_len(&parse(b)?))
}

/// The address depth at full resolution.
#[wasm_bindgen]
pub fn full_depth() -> usize {
    olduvai_core::FULL_DEPTH
}

/// The maximum number of parts a declared self may have.
///
/// Exposed so the UI can refuse a thirteenth part *at the point of typing it*, with a reason,
/// rather than letting the participant finish and then rejecting the whole declaration.
#[wasm_bindgen]
pub fn max_parts() -> usize {
    olduvai_core::agent::MAX_PARTS
}

// ---------------------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------------------

/// Check a declared self against a floor. `regime` is `"character"` or `"task"`.
///
/// Returns an `AgentCheck` as JSON, including the partition χ was achieved on — which names
/// *where* a declared self is weakest, and is the part worth showing the participant.
#[wasm_bindgen]
pub fn agent_check(
    name: &str,
    regime: &str,
    self_json: &str,
    floor: f64,
) -> Result<String, JsError> {
    let regime = match regime {
        "character" => Regime::Character,
        "task" => Regime::Task,
        other => {
            return Err(JsError::new(&format!(
                "regime must be \"character\" or \"task\", got {other:?}"
            )))
        }
    };
    let s: Self_ = from_json(self_json)?;
    let c = agent::check(name, regime, &s, floor).map_err(|e| JsError::new(&e.to_string()))?;
    to_json(&c)
}

/// Character invariant χ of a declared self.
#[wasm_bindgen]
pub fn character_invariant(self_json: &str) -> Result<f64, JsError> {
    let s: Self_ = from_json(self_json)?;
    agent::character_invariant(&s)
        .map(|(chi, _)| chi)
        .map_err(|e| JsError::new(&e.to_string()))
}

/// The `2^n` separation floor a declared self realises.
#[wasm_bindgen]
pub fn realised_floor(self_json: &str) -> Result<f64, JsError> {
    let s: Self_ = from_json(self_json)?;
    agent::realised_floor(&s).map_err(|e| JsError::new(&e.to_string()))
}

/// Water-fill an attention budget across scenes, as JSON.
///
/// `scenes_json` is `[{"name": ..., "gain_k": ...}, ...]`. ⭐ This is what makes a dashboard
/// tailored rather than merely filtered: `omitted` names the panels not worth rendering for
/// this participant at this budget.
#[wasm_bindgen]
pub fn water_fill(scenes_json: &str, budget: f64) -> Result<String, JsError> {
    let scenes: Vec<Scene> = from_json(scenes_json)?;
    to_json(&agent::water_fill(&scenes, budget))
}

// ---------------------------------------------------------------------------------------
// Foreman
// ---------------------------------------------------------------------------------------

/// Coherence of a closed cycle, as JSON.
///
/// Computed client-side so the foreman view can show a participant why a cycle is flagged
/// without waiting on a round trip. The *authoritative* check is still the server's — this
/// one is a display of the same function over data the client already holds.
#[wasm_bindgen]
pub fn check_cycle(cycle_json: &str) -> Result<String, JsError> {
    let c: Cycle = from_json(cycle_json)?;
    to_json(&foreman::check_cycle(&c))
}

// ---------------------------------------------------------------------------------------
// Proposals — the AI boundary
// ---------------------------------------------------------------------------------------

/// ⭐ Turn a model's proposal into a field, given a participant's confirmation.
///
/// `confirmation_json` must name who confirmed it. Returns the resulting `Field` as JSON, or
/// `null` if the proposal was rejected or malformed.
///
/// The result is always `Source::Asserted`: confirming that a model read a document
/// correctly is not the same as the document being true, and this function does not launder
/// the one into the other. There is no variant of it that produces observed evidence.
#[wasm_bindgen]
pub fn accept_proposal(
    proposal_json: &str,
    confirmation_json: &str,
) -> Result<Option<String>, JsError> {
    let p: Proposal = from_json(proposal_json)?;
    let c: Confirmation = from_json(confirmation_json)?;
    match p.accept(&c) {
        Some(f) => to_json(&f).map(Some),
        None => Ok(None),
    }
}
