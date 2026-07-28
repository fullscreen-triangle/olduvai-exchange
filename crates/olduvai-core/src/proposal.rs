//! The boundary an AI assistant writes through.
//!
//! ⭐ **This module is the entire AI integration surface of the core.** Everything a model
//! produces — an extracted tonnage, a parsed description, a suggested coalition — enters
//! here, and can enter nowhere else. There is deliberately no other path.
//!
//! # Why a type rather than a convention
//!
//! The foreman assistant is *read-broad, write-narrow*: it may read anything the
//! participant is entitled to see, and may write nothing except proposals the participant
//! confirms. Written as a guideline, that lasts until the first deadline. Written as a
//! type, it is checked.
//!
//! A [`Proposal`] cannot be turned into a [`Field`] except through
//! [`Proposal::accept`], which requires a [`Confirmation`] naming who confirmed it. There
//! is no `From<Proposal> for Field`, no `unwrap`, and no constructor that skips the step.
//! A model's output is therefore inert until a human has looked at it.
//!
//! # Why accepted proposals are still `Asserted`
//!
//! ⚠️ Confirming a proposal does not make it evidence. A farmer agreeing that a model read
//! their delivery note correctly has told you the *reading* is right, not that the note
//! reflects reality. So [`Proposal::accept`] produces a field at
//! [`Source::Asserted`] — weight `0.0`, contributing nothing to the confidence
//! floor — exactly as if the participant had typed it.
//!
//! If a proposal cites a document that independently attests the value, that document is a
//! separate observed field with its own provenance. The model does not launder it.
//!
//! # Where the learning loop lives
//!
//! [`Outcome::Corrected`] carries what the participant changed it to. That difference is
//! the training signal, and it accumulates outside the deterministic core — the model
//! learns from corrections without ever having been in the path that produced an address,
//! a rank, or a price.

use crate::provenance::{Field, Precision, Source};
use crate::units::Unit;
use serde::{Deserialize, Serialize};

/// What kind of thing produced a proposal.
///
/// Recorded so that a systematically wrong extractor can be found and retired. Blast
/// radius is the reason models are domain-specific here: a maize extractor that drifts
/// corrupts maize proposals, and this field is how you notice.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Proposer {
    /// A named extraction model, with its version. Both are required: "the model said so"
    /// is not attributable without knowing which model and which weights.
    Model { name: String, version: String },
    /// A deterministic rule — a unit conversion, a form default. Distinguished from a
    /// model because it is reproducible and a model is not.
    Rule { name: String },
}

impl Proposer {
    pub fn model(name: impl Into<String>, version: impl Into<String>) -> Self {
        Proposer::Model {
            name: name.into(),
            version: version.into(),
        }
    }

    pub fn rule(name: impl Into<String>) -> Self {
        Proposer::Rule { name: name.into() }
    }

    /// True when the proposer's output cannot be recomputed from the record.
    ///
    /// The property that matters for audit: a rule can be re-run years later, a model
    /// generally cannot.
    pub fn is_irreproducible(&self) -> bool {
        matches!(self, Proposer::Model { .. })
    }
}

/// A value a model suggests, awaiting confirmation.
///
/// Note the absence: there is no `value()` accessor returning a bare `f64` for use in a
/// calculation. `suggested` is public for display, and the only way to obtain a usable
/// [`Field`] is [`Proposal::accept`].
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Proposal {
    /// The field this proposal is about, e.g. `"harvest_quantity"`.
    pub field_name: String,
    pub suggested: f64,
    pub unit: Unit,
    pub proposer: Proposer,
    /// What the proposal was read from, in the participant's own terms — "your delivery
    /// note of 3 March". Shown so the participant can check the source, not the model.
    pub basis: String,
    /// The model's own confidence, if it reports one.
    ///
    /// ⚠️ Carried for display and for retiring bad extractors. It is **not** a
    /// [`Precision`] and never becomes one: a model's self-reported confidence is a
    /// statement about its internal state, not about measurement error, and converting
    /// one into the other would inject an unearned number into the confidence floor.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub self_reported_confidence: Option<f64>,
}

impl Proposal {
    pub fn new(
        field_name: impl Into<String>,
        suggested: f64,
        unit: Unit,
        proposer: Proposer,
        basis: impl Into<String>,
    ) -> Self {
        Proposal {
            field_name: field_name.into(),
            suggested,
            unit,
            proposer,
            basis: basis.into(),
            self_reported_confidence: None,
        }
    }

    pub fn with_self_reported_confidence(mut self, c: f64) -> Self {
        self.self_reported_confidence = Some(c);
        self
    }

    /// True when the suggestion is finite and non-negative.
    ///
    /// A malformed proposal can still be shown to a participant — "we could not read
    /// this" is useful — but [`Proposal::accept`] refuses it.
    pub fn is_well_formed(&self) -> bool {
        self.suggested.is_finite() && self.suggested >= 0.0
    }

    /// ⭐ The only route from a model's output to a usable value.
    ///
    /// Consumes the proposal and returns a [`Field`] at [`Source::Asserted`] with
    /// [`Precision::unknown`] — a confirmed proposal is exactly as good as the
    /// participant having typed it, and no better.
    ///
    /// Returns [`None`] if the proposal is malformed or the confirmation rejected it.
    pub fn accept(self, confirmation: &Confirmation) -> Option<Field> {
        if !self.is_well_formed() {
            return None;
        }
        let value = match &confirmation.outcome {
            Outcome::Accepted => self.suggested,
            Outcome::Corrected { to } => {
                if !(to.is_finite() && *to >= 0.0) {
                    return None;
                }
                *to
            }
            Outcome::Rejected => return None,
        };
        Some(Field {
            value,
            unit: self.unit,
            source: Source::Asserted,
            precision: Precision::unknown(),
        })
    }
}

/// What a participant did with a proposal.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "outcome")]
pub enum Outcome {
    /// Confirmed as suggested.
    Accepted,
    /// Confirmed with a different value. ⭐ The difference is the training signal.
    Corrected { to: f64 },
    /// Refused. No field is produced.
    Rejected,
}

impl Outcome {
    /// Signed error of the proposal against what the participant said, when both are
    /// known. `None` for accepted (zero by definition) and rejected (no target).
    pub fn error_against(&self, suggested: f64) -> Option<f64> {
        match self {
            Outcome::Corrected { to } => Some(suggested - to),
            _ => None,
        }
    }
}

/// A participant's decision on a proposal.
///
/// `by` is required. A confirmation with no named confirmer is an unattributable act, and
/// the ledger cannot record who took responsibility for the value.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Confirmation {
    pub by: String,
    #[serde(flatten)]
    pub outcome: Outcome,
}

impl Confirmation {
    pub fn accepted(by: impl Into<String>) -> Self {
        Confirmation {
            by: by.into(),
            outcome: Outcome::Accepted,
        }
    }

    pub fn corrected(by: impl Into<String>, to: f64) -> Self {
        Confirmation {
            by: by.into(),
            outcome: Outcome::Corrected { to },
        }
    }

    pub fn rejected(by: impl Into<String>) -> Self {
        Confirmation {
            by: by.into(),
            outcome: Outcome::Rejected,
        }
    }
}

/// A proposal and its resolution, for the audit trail and the training set.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ResolvedProposal {
    pub proposal: Proposal,
    pub confirmation: Confirmation,
}

impl ResolvedProposal {
    pub fn new(proposal: Proposal, confirmation: Confirmation) -> Self {
        ResolvedProposal {
            proposal,
            confirmation,
        }
    }

    /// The training signal: signed error, or `None` when the proposal was accepted or
    /// rejected.
    pub fn error(&self) -> Option<f64> {
        self.confirmation
            .outcome
            .error_against(self.proposal.suggested)
    }

    /// The field this resolution produced, if any.
    pub fn field(&self) -> Option<Field> {
        self.proposal.clone().accept(&self.confirmation)
    }
}

/// Whether a proposer is drifting, over a set of resolutions.
///
/// Deliberately reports counts rather than a score. "This extractor was corrected 40 times
/// out of 50, and the corrections are biased high" is actionable; a single number is not.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DriftReport {
    pub total: usize,
    pub accepted: usize,
    pub corrected: usize,
    pub rejected: usize,
    /// Mean signed error over corrected proposals. Positive means the proposer reads high.
    /// `None` when nothing was corrected.
    pub mean_signed_error: Option<f64>,
}

impl DriftReport {
    /// Summarise resolutions for one proposer.
    pub fn over<'a>(resolutions: impl IntoIterator<Item = &'a ResolvedProposal>) -> DriftReport {
        let mut total = 0;
        let mut accepted = 0;
        let mut corrected = 0;
        let mut rejected = 0;
        let mut error_sum = 0.0;

        for r in resolutions {
            total += 1;
            match r.confirmation.outcome {
                Outcome::Accepted => accepted += 1,
                Outcome::Rejected => rejected += 1,
                Outcome::Corrected { .. } => {
                    corrected += 1;
                    error_sum += r.error().unwrap_or(0.0);
                }
            }
        }

        DriftReport {
            total,
            accepted,
            corrected,
            rejected,
            mean_signed_error: (corrected > 0).then(|| error_sum / corrected as f64),
        }
    }

    /// Fraction of proposals the participant did not change.
    pub fn acceptance_rate(&self) -> f64 {
        if self.total == 0 {
            0.0
        } else {
            self.accepted as f64 / self.total as f64
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn extractor() -> Proposer {
        Proposer::model("maize-delivery-note", "0.3.1")
    }

    fn proposal(v: f64) -> Proposal {
        Proposal::new(
            "harvest_quantity",
            v,
            Unit::Tonnes,
            extractor(),
            "your delivery note of 3 March",
        )
    }

    #[test]
    fn an_accepted_proposal_is_asserted_and_contributes_no_evidence() {
        // ⭐ The central property. A model reading a document, confirmed by the farmer,
        // is worth exactly as much as the farmer typing it: nothing, until something
        // observed corroborates it.
        let f = proposal(18.4)
            .accept(&Confirmation::accepted("farmer:1042"))
            .unwrap();
        assert_eq!(f.value, 18.4);
        assert_eq!(f.source, Source::Asserted);
        assert_eq!(f.confidence(), 0.0);
        assert!(!f.source.is_observed());
    }

    #[test]
    fn a_correction_yields_the_participants_value_not_the_models() {
        let f = proposal(18.4)
            .accept(&Confirmation::corrected("farmer:1042", 17.9))
            .unwrap();
        assert_eq!(f.value, 17.9);
        assert_eq!(f.source, Source::Asserted);
    }

    #[test]
    fn a_rejected_proposal_produces_nothing() {
        assert!(proposal(18.4)
            .accept(&Confirmation::rejected("farmer:1042"))
            .is_none());
    }

    #[test]
    fn malformed_suggestions_and_corrections_are_refused() {
        for bad in [f64::NAN, f64::INFINITY, -1.0] {
            assert!(
                proposal(bad)
                    .accept(&Confirmation::accepted("farmer:1042"))
                    .is_none(),
                "{bad} should not become a field"
            );
            assert!(
                proposal(18.4)
                    .accept(&Confirmation::corrected("farmer:1042", bad))
                    .is_none(),
                "correction to {bad} should be refused"
            );
        }
    }

    #[test]
    fn a_models_self_reported_confidence_never_becomes_a_precision() {
        // ⚠️ The laundering path this module exists to close. Even a model claiming
        // 0.99 confidence yields a field of unknown precision.
        let p = proposal(18.4).with_self_reported_confidence(0.99);
        let f = p.accept(&Confirmation::accepted("farmer:1042")).unwrap();
        assert!(!f.precision.is_known());
        assert_eq!(f.confidence(), 0.0);
    }

    #[test]
    fn corrections_are_the_training_signal() {
        let r = ResolvedProposal::new(proposal(18.4), Confirmation::corrected("farmer:1042", 17.9));
        assert!((r.error().unwrap() - 0.5).abs() < 1e-9, "read 0.5t high");

        let accepted = ResolvedProposal::new(proposal(18.4), Confirmation::accepted("farmer:1042"));
        assert_eq!(accepted.error(), None);
    }

    #[test]
    fn drift_is_reported_as_counts_and_a_direction() {
        let rs = vec![
            ResolvedProposal::new(proposal(20.0), Confirmation::corrected("f", 18.0)),
            ResolvedProposal::new(proposal(21.0), Confirmation::corrected("f", 19.0)),
            ResolvedProposal::new(proposal(15.0), Confirmation::accepted("f")),
            ResolvedProposal::new(proposal(99.0), Confirmation::rejected("f")),
        ];
        let d = DriftReport::over(&rs);
        assert_eq!(d.total, 4);
        assert_eq!(d.corrected, 2);
        assert_eq!(d.accepted, 1);
        assert_eq!(d.rejected, 1);
        // Consistently reads 2t high — a retirable extractor, and visible as a direction
        // rather than as a bare error rate.
        assert!((d.mean_signed_error.unwrap() - 2.0).abs() < 1e-9);
        assert_eq!(d.acceptance_rate(), 0.25);
    }

    #[test]
    fn drift_over_nothing_is_not_a_division_by_zero() {
        let d = DriftReport::over([]);
        assert_eq!(d.total, 0);
        assert_eq!(d.mean_signed_error, None);
        assert_eq!(d.acceptance_rate(), 0.0);
    }

    #[test]
    fn models_are_marked_irreproducible_and_rules_are_not() {
        assert!(extractor().is_irreproducible());
        assert!(!Proposer::rule("bags_to_tonnes_at_declared_bag_mass").is_irreproducible());
    }

    #[test]
    fn the_wire_shape_carries_who_confirmed_and_what_proposed() {
        let r = ResolvedProposal::new(proposal(18.4), Confirmation::corrected("farmer:1042", 17.9));
        let json = serde_json::to_string(&r).unwrap();
        assert!(json.contains(r#""by":"farmer:1042""#));
        assert!(json.contains(r#""outcome":"corrected""#));
        assert!(json.contains(r#""version":"0.3.1""#));
        assert_eq!(serde_json::from_str::<ResolvedProposal>(&json).unwrap(), r);
    }
}
