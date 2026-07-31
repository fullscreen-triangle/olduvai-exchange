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
    /// ⭐ **Nobody observed this. Someone chose it so the system would run.**
    ///
    /// A scoring coefficient, a default threshold, a stand-in for a measurement not yet
    /// taken. `notes/32-yokozuna-extraction.md` §3: a placeholder is a *state a value can
    /// be in*, distinct from both absence and presence.
    ///
    /// | State | Means |
    /// |---|---|
    /// | absent | We do not have it. |
    /// | **`Placeholder`** | **A person chose this number. It has not been measured.** |
    /// | present | Measured or derived, with provenance. |
    ///
    /// ⚠️ **First in the ordering, below [`Source::Asserted`], and that is deliberate.** An
    /// assertion is a claim by someone with standing to make it, about their own affairs,
    /// with their name attached — [`Confidence::asserted_fields`] exists precisely because
    /// there is a person to go back to. A placeholder has none of that. It is not a weaker
    /// claim; it is the absence of a claimant.
    ///
    /// ⚠️ It exists so that an authored constant cannot be *mistaken* for a measurement.
    /// [`Source::is_observed`] is false here, so it fails every guard `Asserted` fails,
    /// and additionally it is excluded from the remedy path: telling a participant to go
    /// and evidence a number *we* authored would be nonsense.
    ///
    /// Two live examples with no way to say this before now: `foreman::UNKNOWN_PRECISION_BETA`
    /// and `min_separation` in `analysis/cohesion.py`. Every constant imported under
    /// `notes/32` §4 without a citation is another.
    Placeholder,
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
    /// True when the value rests on something other than someone's word.
    ///
    /// This is the partition-block test: an observed field corresponds to a real thing
    /// and so has a coordinate; an asserted or authored one does not.
    ///
    /// ⚠️ **Written as an exhaustive match rather than `!= Source::Asserted`, and that is
    /// the point of writing it out.** The negated-equality form was silently wrong the
    /// moment [`Source::Placeholder`] was added: an authored constant would have reported
    /// itself as *observed* and walked into a coordinate. Enumerating the arms makes the
    /// next variant a compile error instead of a wrong answer.
    #[inline]
    pub fn is_observed(self) -> bool {
        match self {
            Source::Placeholder | Source::Asserted => false,
            Source::ThirdParty
            | Source::Instrument
            | Source::CommercialRecord
            | Source::Weighbridge => true,
        }
    }

    /// True when nobody observed this — a number a person chose so the system would run.
    ///
    /// Distinct from `!is_observed()`: an assertion is unobserved but *claimed*, and has a
    /// claimant. This is the narrower question, and it is the one a display layer wants —
    /// "authored, not measured" is a different sentence from "your word for it".
    #[inline]
    pub fn is_authored(self) -> bool {
        matches!(self, Source::Placeholder)
    }

    /// Evidential weight in `[0,1]`.
    ///
    /// ⚠️ These weights are authored — they are part of `Φ_R` and are published with it.
    /// Note that `Asserted` is `0.0`: an unbacked claim contributes no evidence. It does
    /// not contribute *negative* evidence, because a participant with no records is
    /// unobserved, not dishonest
    /// (`notes/27-miracles-are-for-missing-information.md` §5.3).
    ///
    /// [`Source::Placeholder`] is also `0.0`, and for a stronger reason: there is no
    /// weight at which an authored constant would be correct, because it is not evidence
    /// of anything at all. It shares the floor with `Asserted` rather than sitting below
    /// it because the scale bottoms out at "contributes nothing", and nothing is what both
    /// contribute.
    pub fn weight(self) -> f64 {
        match self {
            Source::Placeholder => 0.0,
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

    /// ⭐ A number someone authored so the system would run, with the reason they chose it.
    ///
    /// The `reason` argument is not decoration and is not optional. A placeholder whose
    /// justification is unrecorded is indistinguishable from a measurement after the person
    /// who chose it has moved on, which is the entire failure mode this variant exists to
    /// prevent (`notes/32-yokozuna-extraction.md` §3). Requiring it at the constructor is
    /// the only place the requirement can be enforced rather than requested.
    ///
    /// ⚠️ The reason is deliberately **not** stored on [`Field`]. `Field`'s wire shape is
    /// pinned by `the_wire_shape_is_stable`, and hanging a nullable string on every
    /// consignment tonnage to serve a rare case is the wrong trade — the same reasoning
    /// that made [`crate::footprint::Reading`] a sibling type rather than a field. It goes
    /// where placeholders are declared, in source, next to the constant. This signature
    /// makes writing it unavoidable.
    ///
    /// ```
    /// # use olduvai_core::provenance::{Field, Source};
    /// # use olduvai_core::units::Unit;
    /// let beta = Field::placeholder(
    ///     0.20,
    ///     Unit::Ratio,
    ///     "Authored. Assumed tolerance for a leg of unstated precision; no measured basis.",
    /// );
    /// assert_eq!(beta.confidence(), 0.0);
    /// assert!(!beta.source.is_observed());
    /// assert!(beta.source.is_authored());
    /// ```
    pub fn placeholder(value: f64, unit: Unit, reason: &str) -> Self {
        // ⚠️ `reason` is consumed by the type system, not by the struct: requiring the
        // argument forces the author to write the justification at the call site, where a
        // reader of the constant will find it. Storing it would change `Field`'s wire shape.
        let _ = reason;
        Field {
            value,
            unit,
            source: Source::Placeholder,
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
    ///
    /// ⚠️ Placeholders are **not** in this list. See [`Confidence::placeholder_fields`].
    pub asserted_fields: Vec<String>,
    /// ⭐ Names of fields carrying an authored constant rather than a measurement.
    ///
    /// ⚠️ **A separate list from [`Confidence::asserted_fields`], because it is a
    /// different sentence to a different person.** "Go and get a weighbridge ticket" is
    /// advice a participant can act on. "Go and evidence the coefficient we chose" is
    /// nonsense — the remedy for a placeholder is ours, not theirs, and folding the two
    /// lists together would put our unfinished work in their remedy path.
    ///
    /// Empty on the wire in the overwhelmingly common case, so it is `#[serde(default)]`
    /// and a reader written against the older shape still parses.
    #[serde(default)]
    pub placeholder_fields: Vec<String>,
}

impl Confidence {
    /// Aggregate over named fields.
    pub fn over<'a>(fields: impl IntoIterator<Item = (&'a str, &'a Field)>) -> Confidence {
        let mut field_count = 0;
        let mut observed_count = 0;
        let mut floor = f64::INFINITY;
        let mut asserted_fields = Vec::new();
        let mut placeholder_fields = Vec::new();

        for (name, field) in fields {
            field_count += 1;
            if field.source.is_observed() {
                observed_count += 1;
            } else if field.source.is_authored() {
                // ⚠️ Not `asserted_fields`. An authored constant has no claimant, so there
                // is nobody for the participant to go back to and nothing for them to do.
                placeholder_fields.push(name.to_string());
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
            placeholder_fields,
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
    ///
    /// ⚠️ **Requires the placeholder list to be empty**, rather than merely testing
    /// `observed_count == 0`. An entry built entirely from authored constants is not a
    /// participant asserting things about themselves; calling it "wholly asserted" would
    /// attribute our unfinished work to them. Use [`Confidence::is_unobserved`] for the
    /// union of the two.
    pub fn is_wholly_asserted(&self) -> bool {
        self.field_count > 0 && self.observed_count == 0 && self.placeholder_fields.is_empty()
    }

    /// True when no field rests on an observation — asserted, authored, or a mix.
    ///
    /// The guard to reach for when the question is "may this reach a coordinate?", where
    /// the distinction between an unbacked claim and an authored constant does not matter
    /// because neither one may.
    pub fn is_unobserved(&self) -> bool {
        self.field_count > 0 && self.observed_count == 0
    }

    /// True when any field rests on a number someone chose rather than measured.
    ///
    /// ⭐ The display hook. `notes/32-yokozuna-extraction.md` §3: a placeholder
    /// "announces itself wherever it is displayed", which requires something to ask.
    pub fn rests_on_placeholders(&self) -> bool {
        !self.placeholder_fields.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn neither_assertion_nor_authorship_counts_as_observation() {
        assert!(!Source::Asserted.is_observed());
        // ⭐ The regression this variant was most likely to introduce. `is_observed` was
        // `self != Source::Asserted`, under which a placeholder reported itself observed
        // and could have walked into a coordinate.
        assert!(!Source::Placeholder.is_observed());

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
    fn authorship_is_narrower_than_being_unobserved() {
        // An assertion has a claimant; a placeholder does not. Both are unobserved, and
        // only one is authored — the display layer needs to tell them apart.
        assert!(Source::Placeholder.is_authored());
        assert!(!Source::Asserted.is_authored());
        assert!(!Source::Weighbridge.is_authored());
    }

    #[test]
    fn a_placeholder_sorts_below_an_assertion() {
        // ⚠️ Pinned deliberately. The ordering is used for ranking and is an authored
        // judgement: an assertion is a claim by someone with standing, a placeholder is
        // the absence of a claimant.
        assert!(Source::Placeholder < Source::Asserted);
        assert!(Source::Placeholder < Source::Weighbridge);
        assert_eq!(
            Source::Placeholder.min(Source::Asserted),
            Source::Placeholder
        );
    }

    #[test]
    fn an_authored_constant_carries_no_confidence_however_it_is_stated() {
        let f = Field::placeholder(0.20, Unit::Ratio, "Authored; no measured basis.");
        assert_eq!(f.source, Source::Placeholder);
        assert_eq!(f.confidence(), 0.0);
        assert!(!f.precision.is_known());

        // And it cannot be talked up by pairing it with a tight tolerance, because
        // `weight()` is 0.0 and confidence is a product.
        let dressed = Field::observed(
            0.20,
            Unit::Ratio,
            Source::Placeholder,
            Precision::relative(0.001),
        );
        assert_eq!(dressed.confidence(), 0.0);
    }

    #[test]
    fn the_placeholder_wire_shape_is_stable() {
        let f = Field::placeholder(0.2, Unit::Ratio, "Authored.");
        let json = serde_json::to_string(&f).unwrap();
        assert_eq!(
            json,
            r#"{"value":0.2,"unit":"ratio","source":"placeholder","precision":null}"#
        );
        assert_eq!(serde_json::from_str::<Field>(&json).unwrap(), f);
    }

    #[test]
    fn an_authored_entry_is_not_reported_as_the_participants_assertion() {
        let beta = Field::placeholder(0.20, Unit::Ratio, "Authored.");
        let claimed = Field::asserted(20.0, Unit::Tonnes);

        let mixed = Confidence::over([("beta", &beta), ("quantity", &claimed)]);

        // ⭐ The distinction the variant exists for. The participant is told to evidence
        // their own claim, and is *not* told to go and evidence our coefficient.
        assert_eq!(mixed.asserted_fields, vec!["quantity"]);
        assert_eq!(mixed.placeholder_fields, vec!["beta"]);
        assert!(mixed.rests_on_placeholders());

        // Unobserved, but not the participant asserting everything about themselves.
        assert!(mixed.is_unobserved());
        assert!(
            !mixed.is_wholly_asserted(),
            "an entry containing our authored constants is not wholly the participant's claim"
        );

        let wholly_authored = Confidence::over([("beta", &beta)]);
        assert!(wholly_authored.is_unobserved());
        assert!(!wholly_authored.is_wholly_asserted());
        assert!(wholly_authored.asserted_fields.is_empty());
    }

    #[test]
    fn source_weights_are_ordered_and_assertion_is_zero() {
        assert_eq!(Source::Placeholder.weight(), 0.0);
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
