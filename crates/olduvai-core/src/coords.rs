//! S-entropy coordinates: the point `(S_k, S_t, S_e) ∈ [0,1]³` an entity occupies.
//!
//! # What is deliberately absent
//!
//! **The coordinate functions themselves are not in this file, and must not be added to
//! it until the cohesion test passes.** See `notes/30-programming-structure.md` §7: step 1
//! is the skeleton, step 3 is a gate. Writing a plausible-looking `S_k` now would prejudge
//! the empirical question that gate exists to answer, and it would be very hard to
//! dislodge afterwards.
//!
//! What *is* fixed here is the shape any such function must have, expressed as the
//! [`CoordinateFn`] trait, plus the properties every implementation is held to.
//!
//! # Why the normalisers are a trait method and not constants
//!
//! The source paper's Limitation 6: its reference normalisers are taken from the extremes
//! of the database it was built on, so extending the database shifts every existing
//! address. For a chemistry paper that is a footnote. For an exchange it would mean every
//! participant is silently re-addressed whenever the market grows — destroying the
//! address-independence property that `notes/29-the-empty-dictionary.md` §4(a) rests on.
//!
//! So an implementation must state its normalisers up front, from physical or contractual
//! bounds. [`CoordinateFn::normalisers`] exists to make that a required, inspectable,
//! versioned declaration rather than a constant someone tunes.

use serde::{Deserialize, Serialize};

/// A point in the unit cube.
///
/// The invariant — every component in `[0,1]` and finite — is enforced at construction
/// and relied upon by the encoder, which would otherwise emit out-of-range trits.
#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
pub struct Coordinates {
    s_k: f64,
    s_t: f64,
    s_e: f64,
}

/// A component outside `[0,1]`, or not finite.
#[derive(Debug, Clone, Copy, PartialEq, Eq, thiserror::Error)]
#[error("coordinate {axis} out of range: expected a finite value in [0,1]")]
pub struct OutOfRange {
    pub axis: Axis,
}

impl Coordinates {
    /// Construct a point, checking the invariant.
    pub fn new(s_k: f64, s_t: f64, s_e: f64) -> Result<Self, OutOfRange> {
        for (axis, v) in [(Axis::Sk, s_k), (Axis::St, s_t), (Axis::Se, s_e)] {
            if !v.is_finite() || !(0.0..=1.0).contains(&v) {
                return Err(OutOfRange { axis });
            }
        }
        Ok(Self { s_k, s_t, s_e })
    }

    /// Construct by clamping rather than failing.
    ///
    /// For coordinate functions whose output can graze the boundary through floating-point
    /// error. Not for silencing a genuinely out-of-range result: `NaN` still fails, since
    /// there is no defensible clamp for it.
    pub fn clamped(s_k: f64, s_t: f64, s_e: f64) -> Result<Self, OutOfRange> {
        let fix = |axis: Axis, v: f64| {
            if v.is_nan() {
                Err(OutOfRange { axis })
            } else {
                Ok(v.clamp(0.0, 1.0))
            }
        };
        Ok(Self {
            s_k: fix(Axis::Sk, s_k)?,
            s_t: fix(Axis::St, s_t)?,
            s_e: fix(Axis::Se, s_e)?,
        })
    }

    #[inline]
    pub fn s_k(self) -> f64 {
        self.s_k
    }

    #[inline]
    pub fn s_t(self) -> f64 {
        self.s_t
    }

    #[inline]
    pub fn s_e(self) -> f64 {
        self.s_e
    }

    #[inline]
    pub fn get(self, axis: Axis) -> f64 {
        match axis {
            Axis::Sk => self.s_k,
            Axis::St => self.s_t,
            Axis::Se => self.s_e,
        }
    }

    /// Euclidean distance in the unit cube.
    ///
    /// Used only to check the encoder's distance-preservation property. Ranking uses
    /// longest common prefix, which is an ultrametric and not this.
    pub fn distance(self, other: Self) -> f64 {
        let d = |a: f64, b: f64| (a - b) * (a - b);
        (d(self.s_k, other.s_k) + d(self.s_t, other.s_t) + d(self.s_e, other.s_e)).sqrt()
    }

    pub fn as_array(self) -> [f64; 3] {
        [self.s_k, self.s_t, self.s_e]
    }
}

impl<'de> Deserialize<'de> for Coordinates {
    /// Deserialising checks the invariant. A `Coordinates` that came off the wire is as
    /// trustworthy as one built by `new`.
    fn deserialize<D: serde::Deserializer<'de>>(d: D) -> Result<Self, D::Error> {
        #[derive(Deserialize)]
        struct Raw {
            s_k: f64,
            s_t: f64,
            s_e: f64,
        }
        let raw = Raw::deserialize(d)?;
        Coordinates::new(raw.s_k, raw.s_t, raw.s_e).map_err(serde::de::Error::custom)
    }
}

/// Which of the three axes.
///
/// Named rather than indexed because the encoder interleaves them and an off-by-one in
/// `j mod 3` would produce addresses that are wrong but perfectly well-formed.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Axis {
    /// Concentration: is activity in one mode or spread across many?
    Sk,
    /// Timescale span: ratio of the fastest process to the slowest.
    St,
    /// Complementarity density: what fraction of interfaces are compatible?
    Se,
}

impl Axis {
    /// The axis refined by trit `j` (zero-based).
    ///
    /// Trits `0,3,6,…` refine `S_k`; `1,4,7,…` refine `S_t`; `2,5,8,…` refine `S_e`.
    /// Interleaving is what makes prefix truncation a *uniform* coarsening of all three
    /// axes at once rather than full resolution on one and none on the others.
    #[inline]
    pub fn for_trit(j: usize) -> Axis {
        match j % 3 {
            0 => Axis::Sk,
            1 => Axis::St,
            _ => Axis::Se,
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            Axis::Sk => "S_k",
            Axis::St => "S_t",
            Axis::Se => "S_e",
        }
    }
}

impl std::fmt::Display for Axis {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.name())
    }
}

/// The bounds an implementation normalises against, declared explicitly.
///
/// Every field here is an authored decision about the exchange's terms of trade
/// (`notes/29-the-empty-dictionary.md` §5.1 — this is `Φ_R`). They are published, not
/// inferred, and a change to any of them re-addresses every participant.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Normalisers {
    /// Where each bound came from, in prose. Required, and it must cite a physical or
    /// contractual limit — *not* an observed maximum over current participants.
    pub provenance: String,
    /// Bounds per axis, as `(min, max)` in the axis's own pre-normalisation units.
    pub s_k: (f64, f64),
    pub s_t: (f64, f64),
    pub s_e: (f64, f64),
}

/// Maps an entity's declared attributes to a point in the cube.
///
/// This trait is `Φ_R`. Whoever implements it sets the exchange rates
/// (`notes/20-s-entropy-dimensional-typing.md` §5), which is why it carries a version and
/// must state its normalisers.
///
/// # Contract
///
/// Implementations must be:
///
/// - **Deterministic.** Same input, same output, byte for byte, forever. No clock, no
///   RNG, no iteration over a `HashMap`, no dependence on the current roster.
/// - **Intrinsic.** A function of `input` alone. In particular `S_e` — complementarity —
///   must be computed from the entity's *own* declared interfaces, never by counting
///   matches against other participants. Defining it over the roster would make addresses
///   depend on who else has joined, losing the fairness property in
///   `notes/29-the-empty-dictionary.md` §4(a) and §6.
/// - **Total.** Every well-formed input yields a point. Missing optional attributes are a
///   normal case, not an error: a participant who declares little still gets an address,
///   just a less informative one, and the gate handles the consequence.
pub trait CoordinateFn {
    /// The attributes this function reads.
    type Input;

    /// Identifier of this function *and its normalisers*, e.g. `"olduvai/v0.1"`.
    ///
    /// Carried on every API response. An address is meaningless without it.
    fn version(&self) -> &str;

    /// The bounds this function normalises against.
    fn normalisers(&self) -> &Normalisers;

    /// Map attributes to a point in the cube.
    fn coordinates(&self, input: &Self::Input) -> Coordinates;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_points_are_accepted_including_the_boundary() {
        assert!(Coordinates::new(0.0, 0.5, 1.0).is_ok());
        assert!(Coordinates::new(0.0, 0.0, 0.0).is_ok());
        assert!(Coordinates::new(1.0, 1.0, 1.0).is_ok());
    }

    #[test]
    fn out_of_range_components_are_rejected_and_name_their_axis() {
        assert_eq!(Coordinates::new(1.5, 0.5, 0.5).unwrap_err().axis, Axis::Sk);
        assert_eq!(Coordinates::new(0.5, -0.1, 0.5).unwrap_err().axis, Axis::St);
        assert_eq!(
            Coordinates::new(0.5, 0.5, f64::NAN).unwrap_err().axis,
            Axis::Se
        );
    }

    #[test]
    fn clamping_fixes_boundary_drift_but_not_nan() {
        let c = Coordinates::clamped(1.000000001, -0.0000001, 0.5).unwrap();
        assert_eq!(c.s_k(), 1.0);
        assert_eq!(c.s_t(), 0.0);
        assert!(Coordinates::clamped(f64::NAN, 0.5, 0.5).is_err());
    }

    #[test]
    fn trit_position_selects_the_axis_cyclically() {
        // The interleaving from the source paper: S_k, S_t, S_e, S_k, S_t, S_e, …
        let axes: Vec<Axis> = (0..7).map(Axis::for_trit).collect();
        assert_eq!(
            axes,
            vec![
                Axis::Sk,
                Axis::St,
                Axis::Se,
                Axis::Sk,
                Axis::St,
                Axis::Se,
                Axis::Sk
            ]
        );
    }

    #[test]
    fn deserialising_enforces_the_same_invariant_as_new() {
        let ok: Result<Coordinates, _> = serde_json::from_str(r#"{"s_k":0.1,"s_t":0.2,"s_e":0.3}"#);
        assert!(ok.is_ok());

        let bad: Result<Coordinates, _> =
            serde_json::from_str(r#"{"s_k":2.0,"s_t":0.2,"s_e":0.3}"#);
        assert!(bad.is_err(), "an out-of-range point must not deserialise");
    }

    #[test]
    fn distance_is_euclidean_in_the_cube() {
        let a = Coordinates::new(0.0, 0.0, 0.0).unwrap();
        let b = Coordinates::new(1.0, 1.0, 1.0).unwrap();
        assert!((a.distance(b) - 3f64.sqrt()).abs() < 1e-12);
        assert_eq!(a.distance(a), 0.0);
    }
}
