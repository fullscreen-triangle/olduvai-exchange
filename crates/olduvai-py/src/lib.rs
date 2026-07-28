//! Python bindings to `olduvai-core`.
//!
//! The analysis layer — coordinate design, calibration, cohesion tests, gate and ranking
//! policy experiments — is Python, because that work is exploratory and iterated on
//! (`notes/30-programming-structure.md` §1).
//!
//! ⭐ It calls **the same encoder the server does**, through these bindings. A calibration
//! result obtained here is therefore a statement about production behaviour rather than
//! about a NumPy reimplementation that agrees with it today. Never reimplement `encode` in
//! Python, however convenient it looks — the whole point of the Rust core is that exactly
//! one encoder exists.

use olduvai_core::{Address, Coordinates};
use pyo3::exceptions::PyValueError;
use pyo3::prelude::*;

/// Encode a point to an address string.
///
/// Raises `ValueError` if any component is outside `[0,1]` — the same invariant the server
/// enforces, not a looser one.
#[pyfunction]
#[pyo3(signature = (s_k, s_t, s_e, depth = olduvai_core::FULL_DEPTH))]
fn encode(s_k: f64, s_t: f64, s_e: f64, depth: usize) -> PyResult<String> {
    let coords =
        Coordinates::new(s_k, s_t, s_e).map_err(|e| PyValueError::new_err(e.to_string()))?;
    Ok(Address::encode(coords, depth).to_string())
}

/// Decode an address to the centre of the cell it names, as `(s_k, s_t, s_e)`.
#[pyfunction]
fn decode(address: &str) -> PyResult<(f64, f64, f64)> {
    let addr: Address = address
        .parse()
        .map_err(|e: olduvai_core::ParseAddressError| PyValueError::new_err(e.to_string()))?;
    let c = addr.decode();
    Ok((c.s_k(), c.s_t(), c.s_e()))
}

/// Length of the longest common prefix — the similarity measure.
///
/// Exposed so the cohesion test scores with the same function the query engine ranks with.
#[pyfunction]
fn common_prefix_len(a: &str, b: &str) -> PyResult<usize> {
    let parse = |s: &str| -> PyResult<Address> {
        s.parse()
            .map_err(|e: olduvai_core::ParseAddressError| PyValueError::new_err(e.to_string()))
    };
    Ok(parse(a)?.common_prefix_len(&parse(b)?))
}

#[pymodule]
fn olduvai(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add("FULL_DEPTH", olduvai_core::FULL_DEPTH)?;
    m.add_function(wrap_pyfunction!(encode, m)?)?;
    m.add_function(wrap_pyfunction!(decode, m)?)?;
    m.add_function(wrap_pyfunction!(common_prefix_len, m)?)?;
    Ok(())
}
