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

use olduvai_core::{Address, Coordinates};
use wasm_bindgen::prelude::*;

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
