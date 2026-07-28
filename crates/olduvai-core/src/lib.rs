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
//! - [`agent`] — separation floors, the character invariant χ, water-filled attention.
//! - [`foreman`] — the append-only activity record and its coherence check.
//! - [`proposal`] — ⭐ the *only* surface through which a model may write.
//!
//! # Where AI is, and is not
//!
//! Nothing in this crate calls a model, and nothing in it ever should. A model's output
//! enters through [`proposal`], becomes a [`Field`] only when a participant confirms it,
//! and arrives at [`Source::Asserted`] — evidential weight zero. That is the whole
//! integration surface.
//!
//! The exclusions are load-bearing rather than cautious:
//!
//! - **Not in the address path.** A learned coordinate function silently re-addresses
//!   every participant when it is retrained.
//! - **Not in ranking.** Ranking is longest-common-prefix and has no parameters. A learned
//!   reranker would set every exchange rate invisibly — `Φ_R`, with the weights *as* the
//!   policy.
//! - **Not in synthesis.** A synthesized entry must be recomputable from the ledger years
//!   later by someone who does not have the model.
//!
//! What a model may do is read a document and *suggest* a value, or read prose and suggest
//! a partial [`agent::Self_`]. Both are inspected before use. [`foreman`] and [`agent`] are
//! deterministic despite being the "agent" layer — χ is a graph invariant, attention is
//! bisection on a Lagrange multiplier. That is what lets an agent live inside the core.
//!
//! # Build order
//!
//! `notes/30-programming-structure.md` §7 makes the cohesion test a real gate. Steps 4–6
//! (query engine and deterministic synthesis, gate and ledger, DSL) are not in this crate
//! yet, and must not be started until the gate passes.
//!
//! [`agent`], [`foreman`] and [`proposal`] do not jump that gate: none of them depends on
//! a coordinate function, so they are step-1 work that happens to have been reached late.

#![forbid(unsafe_code)]
#![warn(missing_debug_implementations)]

pub mod address;
pub mod agent;
pub mod coords;
pub mod foreman;
pub mod proposal;
pub mod provenance;
pub mod trie;
pub mod units;

pub use address::{Address, ParseAddressError, Trit, FULL_DEPTH};
pub use agent::{
    character_invariant, realised_floor, water_fill, AgentCheck, AgentError, Regime, Scene, Self_,
    Separation, WaterFill,
};
pub use coords::{Axis, CoordinateFn, Coordinates, Normalisers, OutOfRange};
// `Outcome` is deliberately *not* re-exported from either module: `foreman::Outcome`
// (commit/observe/decline) and `proposal::Outcome` (accepted/corrected/rejected) are
// different things, and a single bare `Outcome` at the crate root would make call sites
// ambiguous to a reader even where the compiler could resolve them.
pub use foreman::{check_cycle, Activity, Closure, Coherence, Cycle, Leg, Phase, Record, Step};
pub use proposal::{Confirmation, DriftReport, Proposal, Proposer, ResolvedProposal};
pub use provenance::{Confidence, Field, Precision, Source};
pub use trie::{Fallback, Trie};
pub use units::{Bags, Days, Km, TonneDay, TonneKm, Tonnes, Unit};
