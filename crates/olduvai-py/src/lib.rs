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
//!
//! # Why the agent surface crosses as JSON
//!
//! [`Self_`], [`AgentCheck`], [`Cycle`] and [`Proposal`] already have a serde
//! representation, and that representation is the wire format the server and the web client
//! use. Re-declaring them here as `#[pyclass]` structs would create a second definition of
//! each shape that must be kept in step by hand — the same drift the single-encoder rule
//! exists to prevent, one level up. So these functions take and return JSON strings, and the
//! Python side is a thin `json.dumps`/`json.loads` away from the identical types.
//!
//! ⚠️ Note what is *not* exposed: there is no `accept_proposal` here. Confirmation is an act
//! by a named participant, and the calibration harness is not a participant. Python can
//! score a proposer's drift over resolutions the ledger already holds; it cannot manufacture
//! the confirmation that turns a suggestion into a field.

use olduvai_core::agent::{self, Regime, Scene, Self_};
use olduvai_core::foreman::{self, Cycle};
use olduvai_core::proposal::{DriftReport, ResolvedProposal};
use olduvai_core::{Address, Coordinates};
use pyo3::exceptions::PyValueError;
use pyo3::prelude::*;

/// Parse JSON into `T`, or raise `ValueError` naming the field that failed.
fn from_json<T: serde::de::DeserializeOwned>(s: &str) -> PyResult<T> {
    serde_json::from_str(s).map_err(|e| PyValueError::new_err(e.to_string()))
}

/// Serialise `T`. Infallible for the types used here, but reported rather than unwrapped.
fn to_json<T: serde::Serialize>(v: &T) -> PyResult<String> {
    serde_json::to_string(v).map_err(|e| PyValueError::new_err(e.to_string()))
}

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

// ---------------------------------------------------------------------------------------
// Agents
// ---------------------------------------------------------------------------------------

/// Character invariant χ of a declared self, as `(chi, partition_json)`.
///
/// Raises `ValueError` if the self declares more than `MAX_PARTS` parts. That refusal is
/// deliberate and is not softened here: χ is compared against a floor, and an approximated χ
/// makes the comparison meaningless rather than merely imprecise.
#[pyfunction]
fn character_invariant(self_json: &str) -> PyResult<(f64, String)> {
    let s: Self_ = from_json(self_json)?;
    let (chi, partition) =
        agent::character_invariant(&s).map_err(|e| PyValueError::new_err(e.to_string()))?;
    Ok((chi, to_json(&partition)?))
}

/// The `2^n` separation floor a declared self realises.
#[pyfunction]
fn realised_floor(self_json: &str) -> PyResult<f64> {
    let s: Self_ = from_json(self_json)?;
    agent::realised_floor(&s).map_err(|e| PyValueError::new_err(e.to_string()))
}

/// Check a declared self against a floor. Returns an `AgentCheck` as JSON.
///
/// `regime` is `"character"` or `"task"`.
#[pyfunction]
fn agent_check(name: &str, regime: &str, self_json: &str, floor: f64) -> PyResult<String> {
    let regime = match regime {
        "character" => Regime::Character,
        "task" => Regime::Task,
        other => {
            return Err(PyValueError::new_err(format!(
                "regime must be \"character\" or \"task\", got {other:?}"
            )))
        }
    };
    let s: Self_ = from_json(self_json)?;
    let c =
        agent::check(name, regime, &s, floor).map_err(|e| PyValueError::new_err(e.to_string()))?;
    to_json(&c)
}

/// Every partition of a declared self with its cut cost, as JSON. Diagnostic only.
///
/// ⚠️ Bell(n) rows. Useful for seeing *why* a χ came out where it did on a small self; not
/// something to call in a loop.
#[pyfunction]
fn all_partition_costs(self_json: &str) -> PyResult<String> {
    let s: Self_ = from_json(self_json)?;
    let ps = agent::all_partition_costs(&s).map_err(|e| PyValueError::new_err(e.to_string()))?;
    to_json(&ps)
}

/// Water-fill a budget across scenes. `scenes` is `[(name, gain_k), ...]`.
///
/// Returns a `WaterFill` as JSON. The `omitted` scenes — those whose entry margin never
/// cleared the price — are the questions not worth asking, which is the "sufficient" half of
/// "necessary and sufficient information".
#[pyfunction]
fn water_fill(scenes: Vec<(String, f64)>, budget: f64) -> PyResult<String> {
    let scenes: Vec<Scene> = scenes
        .into_iter()
        .map(|(name, k)| Scene::new(name, k))
        .collect();
    to_json(&agent::water_fill(&scenes, budget))
}

// ---------------------------------------------------------------------------------------
// Foreman
// ---------------------------------------------------------------------------------------

/// Coherence of a closed cycle, as JSON.
///
/// ⭐ Exposed so calibration can ask the empirical question the core cannot answer for
/// itself: `foreman::UNKNOWN_PRECISION_BETA` is an *authored* no-alert band, and whether
/// `0.20` is the right width is measurable against cycles whose true residual is known.
#[pyfunction]
fn check_cycle(cycle_json: &str) -> PyResult<String> {
    let c: Cycle = from_json(cycle_json)?;
    to_json(&foreman::check_cycle(&c))
}

/// The no-alert band the core currently uses. Read it; do not assume it is justified.
#[pyfunction]
fn unknown_precision_beta() -> f64 {
    foreman::UNKNOWN_PRECISION_BETA
}

// ---------------------------------------------------------------------------------------
// Proposals
// ---------------------------------------------------------------------------------------

/// Drift of a proposer over resolved proposals. `resolutions_json` is a JSON array.
///
/// This is the read side of the learning loop: corrections accumulate in the ledger, and
/// the analysis layer scores them here. Nothing about this call can produce a [`Field`] —
/// see the module note on why `accept` is absent.
#[pyfunction]
fn drift_report(resolutions_json: &str) -> PyResult<String> {
    let rs: Vec<ResolvedProposal> = from_json(resolutions_json)?;
    to_json(&DriftReport::over(&rs))
}

#[pymodule]
fn olduvai(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add("FULL_DEPTH", olduvai_core::FULL_DEPTH)?;
    m.add("MAX_PARTS", olduvai_core::agent::MAX_PARTS)?;
    m.add_function(wrap_pyfunction!(encode, m)?)?;
    m.add_function(wrap_pyfunction!(decode, m)?)?;
    m.add_function(wrap_pyfunction!(common_prefix_len, m)?)?;
    m.add_function(wrap_pyfunction!(character_invariant, m)?)?;
    m.add_function(wrap_pyfunction!(realised_floor, m)?)?;
    m.add_function(wrap_pyfunction!(agent_check, m)?)?;
    m.add_function(wrap_pyfunction!(all_partition_costs, m)?)?;
    m.add_function(wrap_pyfunction!(water_fill, m)?)?;
    m.add_function(wrap_pyfunction!(check_cycle, m)?)?;
    m.add_function(wrap_pyfunction!(unknown_precision_beta, m)?)?;
    m.add_function(wrap_pyfunction!(drift_report, m)?)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // These exercise the JSON boundary rather than the maths — `olduvai-core` already tests
    // the maths. What is untested elsewhere, and what silently breaks a harness, is a shape
    // that serialises but does not deserialise back, or a field name the Python side is
    // expected to read that the serde attributes renamed away.

    fn two_part_self() -> Self_ {
        Self_::new(["seed", "haul"]).separated("seed", "haul", 3.0)
    }

    #[test]
    fn a_declared_self_round_trips_through_the_json_boundary() {
        let json = serde_json::to_string(&two_part_self()).unwrap();
        let (chi, partition_json) = character_invariant(&json).unwrap();
        assert_eq!(chi, 3.0, "the only cut is the declared one");
        // The partition must arrive as something Python can index, not as an opaque blob.
        let p: serde_json::Value = serde_json::from_str(&partition_json).unwrap();
        assert!(p["blocks"].is_array());
        // The cheapest cut, not the number of cuts considered: with one separation there is
        // one place to split and it costs what that separation costs.
        assert_eq!(realised_floor(&json).unwrap(), 3.0);
        assert!(
            realised_floor(&serde_json::to_string(&Self_::new(["only"])).unwrap())
                .unwrap()
                .is_infinite(),
            "an indivisible self has no cut, so any floor check passes vacuously"
        );
    }

    #[test]
    fn an_agent_check_carries_the_partition_and_the_verdict() {
        let json = serde_json::to_string(&two_part_self()).unwrap();
        let out = agent_check("grower:7", "character", &json, 2.0).unwrap();
        let v: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert_eq!(v["name"], "grower:7");
        assert_eq!(v["regime"], "character");
        assert_eq!(v["chi"], 3.0);
        assert!(v["chi_partition"].is_array());
    }

    #[test]
    fn an_unknown_regime_is_refused_rather_than_defaulted() {
        // ⚠️ Defaulting to `character` here would silently answer a different question than
        // the caller asked, which is worse than an error in a calibration harness.
        let s = serde_json::to_string(&Self_::new(["a"])).unwrap();
        assert!(agent_check("x", "charcter", &s, 1.0).is_err());
    }

    #[test]
    fn too_many_parts_is_an_error_at_the_boundary_not_an_approximation() {
        let parts: Vec<String> = (0..olduvai_core::agent::MAX_PARTS + 1)
            .map(|i| format!("p{i}"))
            .collect();
        let json = serde_json::to_string(&Self_::new(parts)).unwrap();
        assert!(character_invariant(&json).is_err());
    }

    #[test]
    fn water_fill_reports_which_scenes_were_omitted() {
        // The scene with a negligible gain slope never clears the price, so it is a question
        // not worth asking — and the harness must be able to see that, not infer it from a
        // zero allocation.
        let out = water_fill(
            vec![
                ("price_outlook".into(), 8.0),
                ("rain_next_10d".into(), 5.0),
                ("soil_ph_history".into(), 1e-9),
            ],
            2.0,
        )
        .unwrap();
        let v: serde_json::Value = serde_json::from_str(&out).unwrap();
        assert!(v["price"].as_f64().unwrap() > 0.0);
        assert!(v["total_gain"].as_f64().unwrap().is_finite());
        let allocs = v["allocations"].as_array().unwrap();
        assert_eq!(allocs.len(), 3, "every scene is reported, served or not");
    }

    #[test]
    fn malformed_json_raises_rather_than_panicking() {
        for bad in ["", "{}", "not json", r#"{"parts": 3}"#] {
            assert!(character_invariant(bad).is_err(), "{bad:?} must raise");
        }
    }

    #[test]
    fn the_beta_the_harness_reads_is_the_one_the_core_uses() {
        // If these ever diverge, calibration would be tuning a threshold nothing enforces.
        assert_eq!(
            unknown_precision_beta(),
            olduvai_core::foreman::UNKNOWN_PRECISION_BETA
        );
    }

    #[test]
    fn drift_over_an_empty_array_is_a_report_not_an_error() {
        let v: serde_json::Value = serde_json::from_str(&drift_report("[]").unwrap()).unwrap();
        assert_eq!(v["total"], 0);
        assert!(v["mean_signed_error"].is_null());
    }
}
