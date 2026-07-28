//! Per-field provenance and precision.
//!
//! Every value entered into the exchange carries where it came from and how precisely it
//! is known. This is not metadata bolted on afterwards — it is the type in which values
//! are held, so that a bare number cannot enter the system without an answer to "how do
//! you know?" (`notes/30-programming-structure.md` §5.3).
//!
//! Two reasons it is per-field rather than per-entry:
//!
//! 1. **A single score cannot say the useful thing.** "This coalition's weight is
//!    weighbridge-verified and its location is asserted" is the sentence the gate needs
//!    to rank on, and it requires field granularity.
//! 2. **It is what makes a gap resolvable rather than permanent.** As individual fields
//!    become better evidenced, more of a synthesized entry becomes checkable — with no
//!    rearchitecting, because precision was tracked from the first commit.
//!
//! The `Observed`/`Asserted` distinction is the information test from
//! `notes/27-miracles-are-for-missing-information.md` §4: an asserted field is the virtual
//! region, where a settlement can be locally absurd and globally fine and nobody can tell.

use crate::units::Unit;
use serde::{Deserialize, Serialize};

/// Where a value came from.
///
/// Ordered by evidential weight, so `Source::Weighbridge > Source::Asserted`. The
/// ordering is used for ranking and must not be reordered casually — it is an authored
/// judgement about what counts as evidence.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Source {
    /// A participant's own claim, unbacked. The normal state for someone who has just
    /// joined, and **not** a mark against them — see the bootstrap note below.
    Asserted,
    /// Attested by another participant with no stake in this transaction.
    ThirdParty,
    /// Read from a device: a scale, a sensor, a GPS trace.
    Instrument,
    /// A commercial record generated as a side effect of doing business: a mill intake
    /// record, a signed input purchase, a delivery scan.
    CommercialRecord,
    /// A weighbridge ticket. Called out separately because it is the canonical
    /// independent measurement in agricultural logistics.
    Weighbridge,
}

impl Source {
    /// True when the value rests on something other than the participant's own word.
    ///
    /// This is the partition-block test: an observed field corresponds to a real thing
    /// and so has a coordinate; an asserted one does not.
    #[inline]
    pub fn is_observed(self) -> bool {
        self != Source::Asserted
    }

    /// Evidential weight in `[0,1]`.
    ///
    /// ⚠️ These weights are authored — they are part of `Φ_R` and are published with it.
    /// Note that `Asserted` is `0.0`: an unbacked claim contributes no evidence. It does
    /// not contribute *negative* evidence, because a participant with no records is
    /// unobserved, not dishonest
    /// (`notes/27-miracles-are-for-missing-information.md` §5.3).
    pub fn weight(self) -> f64 {
        match self {
            Source::Asserted => 0.0,
            Source::ThirdParty => 0.5,
            Source::Instrument => 0.75,
            Source::CommercialRecord => 0.9,
            Source::Weighbridge => 1.0,
        }
    }
}

/// How precisely a value is known, as a relative tolerance.
///
/// `Precision(0.05)` means ±5%. `None` — expressed as [`Precision::unknown`] — means the
/// precision itself is unknown, which is different from being precise to zero decimal
/// places and is treated as the weakest case.
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Precision(pub Option<f64>);

impl Precision {
    /// Precision is not known. The default for an asserted value.
    pub const fn unknown() -> Self {
        Precision(None)
    }

    /// A relative tolerance, e.g. `0.05` for ±5%.
    ///
    /// Values outside `[0,1]` or non-finite collapse to unknown rather than being
    /// accepted: a tolerance of 300% carries no information, and silently keeping it
    /// would let nonsense propagate into the confidence calculation.
    pub fn relative(tolerance: f64) -> Self {
        if tolerance.is_finite() && (0.0..=1.0).contains(&tolerance) {
            Precision(Some(tolerance))
        } else {
            Precision::unknown()
        }
    }

    pub fn is_known(self) -> bool {
        self.0.is_some()
    }

    /// Confidence contribution in `[0,1]`: `1 - tolerance`, and `0` when unknown.
    pub fn confidence(self) -> f64 {
        self.0.map_or(0.0, |t| 1.0 - t)
    }
}

impl Default for Precision {
    fn default() -> Self {
        Precision::unknown()
    }
}

/// A quantity with its unit, source and precision.
///
/// The wire shape from `notes/30-programming-structure.md` §5.3:
///
/// ```json
/// { "value": 20.0, "unit": "tonnes", "source": "weighbridge", "precision": 0.05 }
/// ```
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Field {
    pub value: f64,
    pub unit: Unit,
    pub source: Source,
    #[serde(default)]
    pub precision: Precision,
}

impl Field {
    /// A field a participant claimed, with nothing behind it.
    ///
    /// Deliberately the most convenient constructor, because it is the honest default for
    /// a newcomer and the API should not make honesty inconvenient.
    pub fn asserted(value: f64, unit: Unit) -> Self {
        Field {
            value,
            unit,
            source: Source::Asserted,
            precision: Precision::unknown(),
        }
    }

    /// A field backed by a record or a measurement.
    pub fn observed(value: f64, unit: Unit, source: Source, precision: Precision) -> Self {
        Field {
            value,
            unit,
            source,
            precision,
        }
    }

    /// Confidence in this field alone, in `[0,1]`.
    ///
    /// The product of evidential weight and precision confidence. A product rather than a
    /// mean because both are necessary: a weighbridge reading of unknown precision and a
    /// precisely-stated guess are each worth little, and only something both well-sourced
    /// and precisely known should score high.
    pub fn confidence(&self) -> f64 {
        self.source.weight() * self.precision.confidence()
    }

    /// True when the value is finite and non-negative.
    pub fn is_well_formed(&self) -> bool {
        self.value.is_finite() && self.value >= 0.0
    }
}

/// Confidence aggregated over a set of fields.
///
/// Reported rather than reduced to one number, because which fields are weak is the
/// actionable part — a participant can go and get a weighbridge ticket, but only if told
/// that weight is what is holding them back.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Confidence {
    /// Fields present.
    pub field_count: usize,
    /// Fields resting on something other than the participant's word.
    pub observed_count: usize,
    /// Lowest field confidence — the binding constraint.
    ///
    /// ⭐ The minimum, not the mean. A coalition is only as well-evidenced as its worst
    /// leg, and averaging would let a well-documented majority hide an unbacked leg. This
    /// is the same reasoning as the composite floor being a product in
    /// `notes/08-economics-remaining.md`.
    pub floor: f64,
    /// Names of fields resting on assertion alone. The remedy path: these are what to go
    /// and evidence.
    pub asserted_fields: Vec<String>,
}

impl Confidence {
    /// Aggregate over named fields.
    pub fn over<'a>(fields: impl IntoIterator<Item = (&'a str, &'a Field)>) -> Confidence {
        let mut field_count = 0;
        let mut observed_count = 0;
        let mut floor = f64::INFINITY;
        let mut asserted_fields = Vec::new();

        for (name, field) in fields {
            field_count += 1;
            if field.source.is_observed() {
                observed_count += 1;
            } else {
                asserted_fields.push(name.to_string());
            }
            floor = floor.min(field.confidence());
        }

        Confidence {
            field_count,
            observed_count,
            // An entry with no fields has confidence zero, not infinity.
            floor: if field_count == 0 { 0.0 } else { floor },
            asserted_fields,
        }
    }

    /// Fraction of fields that are observed.
    ///
    /// The ratio `notes/27-miracles-are-for-missing-information.md` §4 says to publish.
    pub fn observed_ratio(&self) -> f64 {
        if self.field_count == 0 {
            0.0
        } else {
            self.observed_count as f64 / self.field_count as f64
        }
    }

    /// True when every field rests on assertion alone — the entirely virtual case.
    pub fn is_wholly_asserted(&self) -> bool {
        self.field_count > 0 && self.observed_count == 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn assertion_is_the_only_unobserved_source() {
        assert!(!Source::Asserted.is_observed());
        for s in [
            Source::ThirdParty,
            Source::Instrument,
            Source::CommercialRecord,
            Source::Weighbridge,
        ] {
            assert!(s.is_observed(), "{s:?} should count as observed");
        }
    }

    #[test]
    fn source_weights_are_ordered_and_assertion_is_zero() {
        assert_eq!(Source::Asserted.weight(), 0.0);
        assert!(Source::ThirdParty.weight() < Source::Instrument.weight());
        assert!(Source::Instrument.weight() < Source::CommercialRecord.weight());
        assert!(Source::CommercialRecord.weight() < Source::Weighbridge.weight());
        assert_eq!(Source::Weighbridge.weight(), 1.0);
    }

    #[test]
    fn nonsense_tolerances_collapse_to_unknown() {
        assert!(Precision::relative(0.05).is_known());
        assert!(
            !Precision::relative(3.0).is_known(),
            "±300% carries no information"
        );
        assert!(!Precision::relative(-0.1).is_known());
        assert!(!Precision::relative(f64::NAN).is_known());
    }

    #[test]
    fn field_confidence_needs_both_source_and_precision() {
        let precise_guess = Field::observed(
            20.0,
            Unit::Tonnes,
            Source::Asserted,
            Precision::relative(0.001),
        );
        let vague_measurement = Field::observed(
            20.0,
            Unit::Tonnes,
            Source::Weighbridge,
            Precision::unknown(),
        );
        let good = Field::observed(
            20.0,
            Unit::Tonnes,
            Source::Weighbridge,
            Precision::relative(0.02),
        );

        assert_eq!(
            precise_guess.confidence(),
            0.0,
            "a precise guess is still a guess"
        );
        assert_eq!(
            vague_measurement.confidence(),
            0.0,
            "unknown precision carries nothing"
        );
        assert!(good.confidence() > 0.9);
    }

    #[test]
    fn confidence_takes_the_floor_not_the_mean() {
        let strong = Field::observed(
            20.0,
            Unit::Tonnes,
            Source::Weighbridge,
            Precision::relative(0.01),
        );
        let weak = Field::asserted(450.0, Unit::Km);

        let c = Confidence::over([("quantity", &strong), ("distance", &weak)]);

        // The mean would be ~0.5 and would hide the unbacked leg.
        assert_eq!(c.floor, 0.0);
        assert_eq!(c.field_count, 2);
        assert_eq!(c.observed_count, 1);
        assert_eq!(c.observed_ratio(), 0.5);
    }

    #[test]
    fn asserted_fields_are_named_so_there_is_a_remedy_path() {
        let quantity = Field::observed(
            20.0,
            Unit::Tonnes,
            Source::Weighbridge,
            Precision::relative(0.02),
        );
        let location = Field::asserted(450.0, Unit::Km);

        let c = Confidence::over([("quantity", &quantity), ("location", &location)]);

        // "Your weight is verified; go and evidence your location."
        assert_eq!(c.asserted_fields, vec!["location"]);
        assert!(!c.is_wholly_asserted());
    }

    #[test]
    fn a_newcomer_asserting_everything_is_representable_not_rejected() {
        let a = Field::asserted(20.0, Unit::Tonnes);
        let b = Field::asserted(450.0, Unit::Km);

        let c = Confidence::over([("quantity", &a), ("distance", &b)]);

        assert!(c.is_wholly_asserted());
        assert_eq!(c.observed_ratio(), 0.0);
        assert_eq!(c.floor, 0.0);
        // The point: they are in the system with a stated confidence, not excluded.
        assert_eq!(c.field_count, 2);
    }

    #[test]
    fn an_empty_entry_has_zero_confidence_not_infinite() {
        let c = Confidence::over([]);
        assert_eq!(c.floor, 0.0);
        assert_eq!(c.observed_ratio(), 0.0);
        assert!(!c.is_wholly_asserted());
    }

    #[test]
    fn the_wire_shape_is_stable() {
        let f = Field::observed(
            20.0,
            Unit::Tonnes,
            Source::Weighbridge,
            Precision::relative(0.05),
        );
        let json = serde_json::to_string(&f).unwrap();
        assert_eq!(
            json,
            r#"{"value":20.0,"unit":"tonnes","source":"weighbridge","precision":0.05}"#
        );
        assert_eq!(serde_json::from_str::<Field>(&json).unwrap(), f);
    }

    #[test]
    fn precision_defaults_to_unknown_when_absent_from_the_wire() {
        let f: Field =
            serde_json::from_str(r#"{"value":20.0,"unit":"tonnes","source":"asserted"}"#).unwrap();
        assert!(!f.precision.is_known());
    }
}
