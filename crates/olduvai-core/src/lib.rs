//! Olduvai Exchange — deterministic core.
//!
//! Everything in this crate is a pure function of its inputs. No clock, no RNG, no I/O, no
//! network. That is not an aesthetic preference: the encoder must produce byte-identical
//! addresses for every caller, forever, or intrinsic addressing, auditability and ledger
//! integrity all fail *silently* (`notes/30-programming-structure.md` §1).
//!
//! The same crate is consumed three ways — natively by the server, through PyO3 by the
//! calibration harness, and through WASM by the web client — so that no second
//! implementation of the encoder can exist to drift from this one.
//!
//! # Modules
//!
//! - [`units`] — quantities that cannot be added across dimensions.
//! - [`provenance`] — per-field source and precision; where a number came from.
//! - [`coords`] — the `(S_k, S_t, S_e)` cube. ⚠️ The coordinate *functions* are
//!   deliberately absent pending the cohesion gate; see the module docs.
//! - [`address`] — the interleaved ternary encoder. The encoding is the index.
//! - [`trie`] — the ternary trie; one traversal serves every query shape.
//!
//! # Build order
//!
//! `notes/30-programming-structure.md` §7 makes the cohesion test a real gate. Steps 4–6
//! (query engine and deterministic synthesis, gate and ledger, DSL) are not in this crate
//! yet, and must not be started until the gate passes.

#![forbid(unsafe_code)]
#![warn(missing_debug_implementations)]

pub mod address;
pub mod coords;
pub mod provenance;
pub mod trie;
pub mod units;

pub use address::{Address, ParseAddressError, Trit, FULL_DEPTH};
pub use coords::{Axis, CoordinateFn, Coordinates, Normalisers, OutOfRange};
pub use provenance::{Confidence, Field, Precision, Source};
pub use trie::{Fallback, Trie};
pub use units::{Bags, Days, Km, TonneDay, TonneKm, Tonnes, Unit};
