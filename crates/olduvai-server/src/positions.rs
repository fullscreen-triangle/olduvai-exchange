//! A running position filter, kept as a cache over the observation log.
//!
//! # ⭐ Why this is not a violation of "transport only"
//!
//! The crate doc says no business logic lives here, and a Kalman filter is business logic. It
//! is not implemented here. Every arithmetic step is [`Estimate::update`] in `olduvai-core`;
//! this module contributes **storage and an ordering**, which is precisely what the pure crate
//! is forbidden to hold.
//!
//! ⚠️ The test of whether that line has been crossed is mechanical: this file must contain no
//! floating-point arithmetic on a position or a sigma. If a `*`, `/` or `sqrt` ever appears
//! near a coordinate here, a second implementation has been born and the two will drift.
//!
//! # The cache and the truth
//!
//! ⭐ **The log is the truth. The estimate is a cache.**
//!
//! Folding the whole log on every read is correct and, for a participant with a thousand
//! observations, wasteful. So [`Positions::observe`] applies each new observation to a stored
//! estimate as it arrives — the same fold, done incrementally.
//!
//! ⚠️ That is an optimisation, and optimisations that cannot be checked become divergences.
//! [`Positions::verify`] recomputes from the log and compares, and
//! `the_cache_equals_the_fold` runs it over a log built from every observation shape. The
//! cache is required to be able to prove itself rather than be trusted.
//!
//! This is why [`Estimate::update`] is order-independent: it makes `fold(log) == cache` a
//! statement about the algorithm rather than a coincidence about arrival order.
//!
//! ⭐ **The module-wide `allow(dead_code)` is gone, as its own note instructed.**
//! `routes::observe` calls [`Positions::observe`] and `routes::position` calls
//! [`Positions::estimate`] and [`Positions::verify`], so the type is reachable and the
//! compiler is once again the thing that notices when part of it stops being.
//!
//! ⚠️ [`Positions::divergent`] is the one member with no caller, and it keeps an attribute of
//! its own rather than being deleted — see its doc.

use std::collections::HashMap;

use olduvai_core::fusion::{Estimate, Observation};
use olduvai_core::orbit::Geodetic;

/// Every participant's observation log, and the running estimate folded from it.
#[derive(Debug, Default)]
pub struct Positions {
    entries: HashMap<String, Entry>,
}

/// One participant's log and cached estimate.
#[derive(Debug, Clone)]
struct Entry {
    /// ⭐ The truth. Append-only.
    ///
    /// ⚠️ Kept in full rather than being collapsed into the estimate, because an estimate
    /// cannot be un-folded: if an observation is later found to have come from a
    /// misconfigured source, the only way to remove its influence is to drop it from the log
    /// and refold. A filter that has discarded its inputs has no way back.
    log: Vec<Observation>,
    /// Where the fold started. Held so [`Positions::verify`] can reproduce it exactly.
    origin: Geodetic,
    /// The cache.
    estimate: Estimate,
}

impl Positions {
    pub fn new() -> Positions {
        Positions {
            entries: HashMap::new(),
        }
    }

    /// Record an observation and return the updated estimate.
    ///
    /// The `near` argument seeds a participant's first fold and is ignored afterwards. ⚠️ It
    /// is not a position claim — [`Estimate::uninformed`] carries a deliberately enormous
    /// sigma so the first real observation overwrites it almost entirely.
    pub fn observe(
        &mut self,
        participant: &str,
        near: Geodetic,
        observation: Observation,
    ) -> Estimate {
        let entry = self.entries.entry(participant.to_string()).or_insert_with(|| Entry {
            log: Vec::new(),
            origin: near,
            estimate: Estimate::uninformed(near),
        });

        // ⭐ The only place the estimate advances, and it advances by calling core.
        entry.estimate = entry.estimate.update(&observation);
        entry.log.push(observation);
        entry.estimate
    }

    /// The current estimate, if this participant has one.
    pub fn estimate(&self, participant: &str) -> Option<Estimate> {
        self.entries.get(participant).map(|e| e.estimate)
    }

    /// The observation log, which is what a ledger would record.
    pub fn log(&self, participant: &str) -> Option<&[Observation]> {
        self.entries.get(participant).map(|e| e.log.as_slice())
    }

    /// ⭐ Recompute from the log, ignoring the cache.
    ///
    /// The definition of the estimate, as opposed to the incrementally maintained copy of it.
    pub fn refold(&self, participant: &str) -> Option<Estimate> {
        self.entries
            .get(participant)
            .map(|e| Estimate::fold(e.origin, &e.log))
    }

    /// ⭐ Does the cache still equal the fold?
    ///
    /// ⚠️ Exact equality, not a tolerance. The two paths perform the same operations on the
    /// same inputs in the same order, so they must agree bit for bit; a difference means the
    /// incremental path has diverged, and a tolerance would hide exactly the small drift that
    /// is the first symptom of that.
    pub fn verify(&self, participant: &str) -> bool {
        match (self.estimate(participant), self.refold(participant)) {
            (Some(cached), Some(folded)) => cached == folded,
            (None, None) => true,
            _ => false,
        }
    }

    /// Every participant whose cache no longer matches their log.
    ///
    /// Empty is the only acceptable result; a non-empty one is a bug, not a condition to
    /// handle.
    ///
    /// ⚠️ **No route calls this, and that is right rather than an omission.** A per-request
    /// check belongs on the participant being served — `routes::position` calls
    /// [`Positions::verify`] and reports `cache_consistent` — because sweeping every
    /// participant on every read is work proportional to the whole store for a question about
    /// one row. This is the *operational* form of the same question, for a health check or an
    /// admin sweep, and it is kept because deleting it would mean rewriting it under time
    /// pressure the first time a divergence is suspected.
    #[allow(dead_code)]
    pub fn divergent(&self) -> Vec<&str> {
        self.entries
            .keys()
            .map(String::as_str)
            .filter(|p| !self.verify(p))
            .collect()
    }

    /// ⚠️ Unreached by a route for the same reason as [`Positions::divergent`]: it is a
    /// question about the store, and every endpoint asks about one participant.
    #[allow(dead_code)]
    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use olduvai_core::footprint::Footprint;
    use olduvai_core::orbit::Utc;
    use olduvai_core::provenance::Source;

    fn harare() -> Geodetic {
        Geodetic::surface(-17.8292, 31.0522)
    }

    fn t(jd: f64) -> Utc {
        Utc::from_julian(jd)
    }

    /// One of each observation shape, so the equality test covers the corridor projection —
    /// the only branch whose result depends on the estimate it is applied to.
    fn mixed_log() -> Vec<Observation> {
        vec![
            Observation::fix(
                Geodetic::surface(-17.830, 31.052),
                60.0,
                Source::Instrument,
                t(2_460_000.5),
            ),
            Observation::corridor(
                Geodetic::surface(-18.5, 31.00),
                Geodetic::surface(-17.0, 31.00),
                3_000.0,
                Source::Instrument,
                t(2_460_000.6),
            ),
            Observation::within(
                Geodetic::surface(-17.828, 31.053),
                Footprint::Region { extent_km: 2.0 },
                Source::Asserted,
                t(2_460_000.7),
            ),
            Observation::fix(
                Geodetic::surface(-17.8291, 31.0523),
                25.0,
                Source::Instrument,
                t(2_460_000.8),
            ),
        ]
    }

    #[test]
    fn the_cache_equals_the_fold() {
        // ⭐ The property the whole split rests on.
        let mut p = Positions::new();
        for obs in mixed_log() {
            p.observe("farm-1", harare(), obs);
        }
        assert!(p.verify("farm-1"));
        assert_eq!(p.estimate("farm-1"), p.refold("farm-1"));
        assert!(p.divergent().is_empty());
    }

    #[test]
    fn the_cache_equals_the_fold_at_every_prefix() {
        // ⚠️ Stronger than checking once at the end: drift could cancel out over a full log
        // and would be invisible to a single final comparison.
        let mut p = Positions::new();
        for (i, obs) in mixed_log().into_iter().enumerate() {
            p.observe("farm-1", harare(), obs);
            assert!(p.verify("farm-1"), "diverged after {} observations", i + 1);
        }
    }

    #[test]
    fn an_invalid_observation_leaves_the_cache_consistent() {
        // An inert observation still enters the log, so both paths must skip it identically.
        let mut p = Positions::new();
        p.observe("farm-1", harare(), mixed_log()[0].clone());
        let degenerate =
            Observation::corridor(harare(), harare(), 1000.0, Source::Instrument, t(2_460_001.0));
        let before = p.estimate("farm-1").unwrap();
        let after = p.observe("farm-1", harare(), degenerate);
        assert_eq!(before, after, "an invalid observation moved the estimate");
        assert!(p.verify("farm-1"));
        assert_eq!(p.log("farm-1").unwrap().len(), 2, "the log must still record it");
    }

    #[test]
    fn participants_do_not_share_an_estimate() {
        let mut p = Positions::new();
        p.observe(
            "farm-1",
            harare(),
            Observation::fix(
                Geodetic::surface(-17.83, 31.05),
                30.0,
                Source::Instrument,
                t(2_460_000.5),
            ),
        );
        p.observe(
            "farm-2",
            Geodetic::surface(-20.15, 28.58),
            Observation::fix(
                Geodetic::surface(-20.15, 28.58),
                30.0,
                Source::Instrument,
                t(2_460_000.5),
            ),
        );
        let a = p.estimate("farm-1").unwrap();
        let b = p.estimate("farm-2").unwrap();
        assert!((a.at.latitude - b.at.latitude).abs() > 1.0);
        assert!(p.divergent().is_empty());
    }

    #[test]
    fn the_seed_is_ignored_after_the_first_observation() {
        // ⚠️ A caller passing a different `near` later must not silently re-seed the fold,
        // which would make the estimate depend on an argument that is not in the log.
        let mut p = Positions::new();
        let obs = mixed_log();
        p.observe("farm-1", harare(), obs[0].clone());
        p.observe("farm-1", Geodetic::surface(0.0, 0.0), obs[1].clone());
        assert!(p.verify("farm-1"), "a later seed changed the fold origin");
    }

    #[test]
    fn an_unknown_participant_has_no_estimate() {
        let p = Positions::new();
        assert!(p.is_empty());
        assert_eq!(p.estimate("nobody"), None);
        assert_eq!(p.log("nobody"), None);
        // Vacuously consistent: nothing cached and nothing to fold.
        assert!(p.verify("nobody"));
    }
}
