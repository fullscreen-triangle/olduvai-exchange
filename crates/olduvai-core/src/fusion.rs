//! Many weak observations of a place, combined into one estimate that knows how good it is.
//!
//! # ⭐ The idea, in the form it was given
//!
//! > *"Airport data, like any other datasource, was not meant to be precise. A combination of
//! > noisy sensors plus kalman filtering produces more precise data. Aircrafts are not a
//! > positioning check, but another gps instrument. We do not check any gps against another
//! > gps... the fact that the aeroplane has flown above a point, means that, we now have a gps
//! > track in that direction, thats all."*
//!
//! That sentence sets the whole design, and it rules out the two things a module called
//! "position" would otherwise become.
//!
//! ⚠️ **It is not verification.** There is no trusted source here and no source being checked
//! against it. An aircraft's reported track is not an oracle; it is one more noisy instrument
//! that happened to pass overhead. Nothing in this module compares two positions and decides
//! which is right, because that question has no answer — both are noisy, and the useful
//! operation on two noisy numbers is to *combine* them, weighted by how noisy each admits to
//! being.
//!
//! ⚠️ **It is not a search for a precise source.** The design assumption is that every source
//! is weak. A surveyed aerodrome reference point is good to metres but it is 40 km away and
//! tells you almost nothing about a particular farm. A phone GPS trace is right on top of the
//! farm and good to tens of metres on a good day and hundreds on a bad one. Neither is
//! sufficient. The value is *coverage*: an observation constrains one direction, and enough
//! observations from enough directions leave one small region standing.
//!
//! # What an observation actually is
//!
//! ⭐ **A constraint, not a fix.** This is the structural consequence of the aircraft remark
//! and it is why [`Observation`] is an enum rather than a position-and-sigma pair.
//!
//! A phone GPS gives you a point with a radius: [`Observation::Fix`]. An aircraft overhead
//! gives you something weaker and differently shaped — *the participant is somewhere under
//! this track* — which is a line with a soft width, not a point: [`Observation::Corridor`]. A
//! farmer drawing their field boundary gives you a region: [`Observation::Within`]. Flattening
//! all three into "a point plus a sigma" would fabricate an along-track position for the
//! aircraft case that nobody observed.
//!
//! # The filter
//!
//! A scalar-gain Kalman update on a local tangent plane, in metres east and north of a
//! reference. Two dimensions, isotropic uncertainty, no velocity state — see
//! [`Estimate::update`] for why each of those is a deliberate restriction rather than a
//! simplification to be lifted later.
//!
//! # Purity
//!
//! ⚠️ [`Estimate::update`] is a pure function: `(estimate, observation) -> estimate`. It takes
//! no clock — an observation carries its own [`crate::orbit::Utc`] — and holds no state. The
//! running filter that the server keeps is a *cache* of a fold over the observation log, and
//! `fold(log) == cache` is a property the server tests rather than assumes. The ledger is the
//! truth; the cache is an optimisation that must be able to prove itself.
//!
//! # Where this sits in the build order
//!
//! ⚠️ Unlike [`crate::orbit`] and [`crate::footprint`], **this module is on the coordinate
//! path**, and that needs saying rather than glossing. A fused position is exactly the kind of
//! thing `S_k` would be built from, and the cohesion gate in
//! `notes/30-programming-structure.md` §7 exists to stop coordinate functions being written
//! before it passes.
//!
//! It stays on the right side of the gate by *stopping short*: this module produces an estimate
//! and an uncertainty, and offers no function that turns either into a coordinate, a trit, or
//! an address. The one bridge it does offer, [`Estimate::extent`], goes the *other* way — it
//! hands the estimate to [`crate::footprint::Reading::is_distinguishing_for`], which is the
//! guard that decides a reading is too coarse to be used. Building the guard's input before the
//! thing being guarded is the correct order.

use crate::footprint::{great_circle_km, Extent, Footprint};
use crate::orbit::{Geodetic, Utc};
use crate::provenance::{Precision, Source};
use serde::{Deserialize, Serialize};

/// Metres per degree of latitude, WGS-84 mean. Used only to convert a small local offset to
/// and from degrees, where the 0.5% variation with latitude is far below the uncertainty of
/// anything this module fuses.
const METRES_PER_DEG_LAT: f64 = 111_132.0;
const DEG: f64 = std::f64::consts::PI / 180.0;

/// ⚠️ **Authored.** The uncertainty, in metres, assigned to an estimate that has taken no
/// observations at all.
///
/// It is deliberately enormous — 200 km is most of a province — because the prior must not
/// compete with any real observation. A 20 km aerodrome-reference constraint should dominate
/// this completely on the first update, and it does: the gain works out at 0.99.
///
/// ⚠️ This is not a measurement and there is no basis on which it could be one. It exists so
/// that "we know nothing" is representable in the same type as "we know something", rather
/// than being an `Option` that every caller must unwrap.
pub const UNINFORMED_SIGMA_M: f64 = 200_000.0;

/// The floor on any observation's stated uncertainty, in metres.
///
/// ⚠️ **Authored, and a guard rather than a physical constant.** A source claiming
/// centimetre accuracy over a farm would take the gain to 1.0 and erase every other
/// observation. Nothing in this system is trusted to that degree, and a source that claims to
/// be is more likely misconfigured than exceptional. One metre is below every real source here
/// and above the point where the arithmetic degenerates.
pub const MIN_SIGMA_M: f64 = 1.0;

/// Where something is, and how well we know it.
///
/// ⭐ The uncertainty is in **metres, absolute** — not a [`Precision`], which is a *relative*
/// tolerance in `[0,1]`.
///
/// ⚠️ That is not a mismatch to be smoothed over; the two quantities are genuinely different.
/// "±5%" is the honest form for a tonnage, because doubling the load doubles the plausible
/// error. A position has no such scaling: ±5% of a latitude is a meaningless quantity, and ±5%
/// of a *longitude* is a different distance at every latitude. Position error is absolute, so
/// it is stored absolute. [`Estimate::precision_at`] does the conversion, once, at the
/// reporting boundary, and requires the caller to say what the tolerance is relative *to*.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Estimate {
    /// The current best position.
    pub at: Geodetic,
    /// One-sigma horizontal uncertainty, metres. Isotropic — see [`Estimate::update`].
    pub sigma_m: f64,
    /// When the most recent observation folded in was taken. `None` for an uninformed prior.
    ///
    /// ⚠️ Recorded, not used as a clock. Nothing in this module reads the current time; this
    /// is here so a caller can see how stale an estimate is and decide for itself.
    pub as_of: Option<Utc>,
    /// How many observations have been folded in.
    ///
    /// ⭐ Kept because sigma alone cannot distinguish "one good observation" from "forty
    /// mediocre ones that agree", and those warrant different amounts of trust. A reader of a
    /// declaration line should be able to see which they are looking at.
    pub observation_count: u32,
    /// The strongest [`Source`] that has contributed.
    ///
    /// ⚠️ The strongest, not a blend. There is no meaningful average of an instrument and an
    /// assertion, and inventing one would let a pile of assertions add up to something that
    /// reports itself as measured. This answers "is there anything observed under this at
    /// all", which is the question [`Source::is_observed`] is for.
    pub strongest_source: Option<Source>,
}

impl Estimate {
    /// An estimate that has seen nothing: a place to start folding from.
    ///
    /// ⚠️ The position is a *guess to be overwritten*, not a claim. It carries
    /// [`UNINFORMED_SIGMA_M`] precisely so that the first real observation moves it almost
    /// entirely to itself. [`Estimate::is_informed`] reports `false` until something arrives.
    pub fn uninformed(near: Geodetic) -> Estimate {
        Estimate {
            at: near,
            sigma_m: UNINFORMED_SIGMA_M,
            as_of: None,
            observation_count: 0,
            strongest_source: None,
        }
    }

    /// Has any observation contributed to this?
    ///
    /// ⚠️ Distinct from having a small sigma. An estimate can be informed and still terrible.
    /// This answers "did anyone look", not "is it any good".
    pub fn is_informed(&self) -> bool {
        self.observation_count > 0
    }

    /// Is there an *observed* source under this, or only assertions and placeholders?
    ///
    /// ⭐ The same test [`crate::footprint::Reading::is_distinguishing_for`] applies, asked of
    /// a fused estimate. A position built entirely from what participants said about
    /// themselves is not evidence, however many of them said it and however tightly they agree.
    pub fn rests_on_observation(&self) -> bool {
        self.strongest_source.is_some_and(Source::is_observed)
    }

    /// ⭐ **The Kalman update. Pure: no clock, no state, no I/O.**
    ///
    /// Each observation is turned into an equivalent point-and-sigma *in the direction it
    /// actually constrains*, and folded in with the scalar gain `k = σ_e² / (σ_e² + σ_o²)`.
    ///
    /// # ⚠️ What this filter deliberately is not
    ///
    /// **No velocity state.** A farm does not move. Adding a motion model would let the filter
    /// extrapolate between observations, which for a fixed asset means inventing movement that
    /// did not happen. The prediction step is therefore the identity, and there is no process
    /// noise. ⚠️ This is why the module is about *places*, not vehicles: fusing an aircraft's
    /// own trajectory would need the state this deliberately omits.
    ///
    /// **Isotropic uncertainty, not a covariance matrix.** A full 2×2 covariance would let a
    /// [`Observation::Corridor`] stay honestly anisotropic — well constrained across track,
    /// unconstrained along it — instead of being collapsed to a circle. That is a real loss and
    /// it is recorded here rather than hidden: the collapse is conservative in the direction
    /// that matters (across track, where the constraint is real) and merely wasteful along
    /// track. ⚠️ Anyone widening this to a matrix should expect the corridor case to *improve*
    /// and should not be surprised by that.
    ///
    /// **Order-independent by construction.** The gain depends only on the two sigmas, so
    /// folding an observation log in a different order gives the same answer to within floating
    /// point. That is what makes `fold(log) == cache` a fair test rather than a coincidence.
    ///
    /// ```
    /// # use olduvai_core::fusion::{Estimate, Observation};
    /// # use olduvai_core::orbit::{Geodetic, Utc};
    /// # use olduvai_core::provenance::Source;
    /// let start = Estimate::uninformed(Geodetic::surface(-17.8, 31.0));
    /// let obs = Observation::fix(
    ///     Geodetic::surface(-17.83, 31.05),
    ///     30.0,
    ///     Source::Instrument,
    ///     Utc::from_julian(2_460_000.5),
    /// );
    /// let after = start.update(&obs);
    /// // One tight observation against an uninformed prior: it wins almost entirely.
    /// assert!(after.sigma_m < 31.0);
    /// assert!(after.is_informed());
    /// ```
    pub fn update(&self, observation: &Observation) -> Estimate {
        let Some((target, sigma_o)) = observation.constraint_on(self.at) else {
            // An incoherent observation changes nothing. ⚠️ Returning the estimate unchanged
            // rather than erroring: a malformed reading in a log of thousands should be inert,
            // not fatal, and it is already visible as a non-increment of `observation_count`.
            return *self;
        };

        let sigma_e = self.sigma_m.max(MIN_SIGMA_M);
        let sigma_o = sigma_o.max(MIN_SIGMA_M);

        let var_e = sigma_e * sigma_e;
        let var_o = sigma_o * sigma_o;
        let gain = var_e / (var_e + var_o);

        // Innovation in metres on the local tangent plane at the current estimate.
        let (de, dn) = offset_m(self.at, target);
        let at = translate_m(self.at, de * gain, dn * gain);

        // Posterior variance: (1 - k) * var_e. Equivalently the harmonic combination, which
        // is the form that makes it obvious the result is below *both* inputs.
        let var_post = (1.0 - gain) * var_e;

        Estimate {
            at,
            sigma_m: var_post.sqrt().max(MIN_SIGMA_M),
            as_of: Some(observation.taken_at()),
            observation_count: self.observation_count.saturating_add(1),
            strongest_source: Some(match self.strongest_source {
                Some(existing) => existing.max(observation.source()),
                None => observation.source(),
            }),
        }
    }

    /// Fold an observation log into an estimate.
    ///
    /// ⭐ **This is the definition of the estimate; the server's running filter is a cache of
    /// it.** Written here, in the pure crate, so that the thing being cached and the cache
    /// cannot drift into two different algorithms.
    pub fn fold<'a>(
        near: Geodetic,
        log: impl IntoIterator<Item = &'a Observation>,
    ) -> Estimate {
        log.into_iter()
            .fold(Estimate::uninformed(near), |est, obs| est.update(obs))
    }

    /// The estimate as an [`Extent`], for handing to
    /// [`crate::footprint::Reading::is_distinguishing_for`].
    ///
    /// ⭐ Two sigma, so roughly 95% — the extent is meant to be the region the thing plausibly
    /// occupies, and one sigma would understate it by more than a factor of two in area.
    ///
    /// ⚠️ This is the module's only outward bridge, and note which direction it points: it
    /// supplies the *guard's* input, not a coordinate. An estimate with a 20 km extent will
    /// cause `is_distinguishing_for` to reject readings it would have accepted for a
    /// confidently located farm, which is the correct and conservative behaviour.
    pub fn extent(&self) -> Extent {
        Extent::km((2.0 * self.sigma_m.max(MIN_SIGMA_M)) / 1000.0)
    }

    /// The uncertainty as a [`Precision`], relative to a stated scale.
    ///
    /// ⚠️ **The `over` argument is required and cannot be defaulted.** A relative tolerance is
    /// relative *to* something, and for a position there is no natural choice — a 300 m
    /// uncertainty is excellent for a district and useless for a farm gate. Making the caller
    /// name the scale is the whole point; a `precision()` with a hidden denominator would put a
    /// number on the wire whose meaning nobody could reconstruct.
    ///
    /// Returns [`Precision::unknown`] when the estimate is uninformed or when the tolerance
    /// exceeds 100%, since [`Precision::relative`] treats anything outside `[0,1]` as carrying
    /// no information.
    pub fn precision_at(&self, over: Extent) -> Precision {
        if !self.is_informed() || over.across_km <= 0.0 {
            return Precision::unknown();
        }
        Precision::relative((self.sigma_m / 1000.0) / over.across_km)
    }

    /// The sentence to show alongside a fused position.
    pub fn declaration(&self) -> String {
        if !self.is_informed() {
            return "No position observations. This location has not been measured.".to_string();
        }
        let n = self.observation_count;
        let plural = if n == 1 { "observation" } else { "observations" };
        let basis = if self.rests_on_observation() {
            "measured"
        } else {
            // ⚠️ Says so plainly. A tight sigma from forty agreeing assertions is still not
            // evidence, and the declaration must not let the number imply otherwise.
            "stated rather than measured"
        };
        format!(
            "Located to about {:.0} m from {n} {plural} ({basis}).",
            self.sigma_m
        )
    }
}

/// One noisy look at where something is.
///
/// ⭐ **An enum because observations are different *shapes*, not different qualities.** See
/// the module doc: an aircraft overhead constrains one direction and says nothing about the
/// other, and flattening that into a point would invent an along-track position nobody saw.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "kind")]
pub enum Observation {
    /// A positioning instrument reporting a point: a phone GPS, a surveyed marker, a
    /// handheld receiver.
    Fix {
        at: Geodetic,
        /// One-sigma horizontal error, metres. ⚠️ The instrument's honest self-report. A
        /// phone under tree cover should say 80, not 5.
        sigma_m: f64,
        source: Source,
        taken_at: Utc,
    },
    /// ⭐ **An aircraft track, or anything else that constrains a direction rather than a
    /// point.**
    ///
    /// > *"the fact that the aeroplane has flown above a point, means that, we now have a gps
    /// > track in that direction, thats all."*
    ///
    /// The constraint is *perpendicular distance from the track*. Position along the track is
    /// unconstrained, and this variant does not pretend otherwise — [`Observation::constraint_on`]
    /// projects the current estimate onto the line and only pulls it sideways.
    Corridor {
        /// A point the track passes through.
        from: Geodetic,
        /// Another point on the track. ⚠️ Two points, not a point and a bearing, because a
        /// bearing over a long leg is not constant on a sphere and the endpoints are what the
        /// source actually reports.
        to: Geodetic,
        /// One-sigma across-track error, metres. Widened from the reported track error by
        /// whatever the overflight geometry costs — a track 10 km up constrains the ground
        /// position far more loosely than its own positional accuracy suggests.
        sigma_m: f64,
        source: Source,
        taken_at: Utc,
    },
    /// A region the thing is somewhere inside: a farmer's drawn boundary, a delivery
    /// catchment, a titled parcel.
    ///
    /// ⭐ This is where a farmer's map annotation enters. It is a real constraint and it is
    /// treated as one — with a sigma derived from the region's size and a [`Source`] that says
    /// who claimed it. A drawn boundary from a participant is [`Source::Asserted`], and
    /// [`Estimate::rests_on_observation`] will report the difference.
    Within {
        centre: Geodetic,
        /// How much ground the region covers.
        footprint: Footprint,
        source: Source,
        taken_at: Utc,
    },
}

impl Observation {
    /// A positioning fix.
    pub fn fix(at: Geodetic, sigma_m: f64, source: Source, taken_at: Utc) -> Observation {
        Observation::Fix {
            at,
            sigma_m,
            source,
            taken_at,
        }
    }

    /// A track passing overhead.
    pub fn corridor(
        from: Geodetic,
        to: Geodetic,
        sigma_m: f64,
        source: Source,
        taken_at: Utc,
    ) -> Observation {
        Observation::Corridor {
            from,
            to,
            sigma_m,
            source,
            taken_at,
        }
    }

    /// A region containing the thing.
    pub fn within(
        centre: Geodetic,
        footprint: Footprint,
        source: Source,
        taken_at: Utc,
    ) -> Observation {
        Observation::Within {
            centre,
            footprint,
            source,
            taken_at,
        }
    }

    /// Where this observation was taken.
    pub fn taken_at(&self) -> Utc {
        match self {
            Observation::Fix { taken_at, .. }
            | Observation::Corridor { taken_at, .. }
            | Observation::Within { taken_at, .. } => *taken_at,
        }
    }

    /// Who or what produced it.
    pub fn source(&self) -> Source {
        match self {
            Observation::Fix { source, .. }
            | Observation::Corridor { source, .. }
            | Observation::Within { source, .. } => *source,
        }
    }

    /// Is this a coherent observation?
    ///
    /// A [`Observation::Corridor`] whose two points coincide is incoherent — it defines no
    /// direction, so there is no across-track to constrain.
    pub fn is_valid(&self) -> bool {
        let sigma_ok = |s: f64| s.is_finite() && s >= 0.0;
        match self {
            Observation::Fix { at, sigma_m, .. } => sigma_ok(*sigma_m) && is_finite(*at),
            Observation::Corridor {
                from, to, sigma_m, ..
            } => {
                sigma_ok(*sigma_m)
                    && is_finite(*from)
                    && is_finite(*to)
                    && great_circle_km(*from, *to) > 0.0
            }
            Observation::Within {
                centre, footprint, ..
            } => is_finite(*centre) && footprint.is_valid(),
        }
    }

    /// ⭐ Reduce the observation to the point it pulls towards, and how hard.
    ///
    /// This is where the enum earns itself. The three variants produce genuinely different
    /// answers, and for [`Observation::Corridor`] the answer *depends on the current
    /// estimate* — the target is the nearest point on the track, which moves as the estimate
    /// moves. Returns `None` for an incoherent observation.
    fn constraint_on(&self, current: Geodetic) -> Option<(Geodetic, f64)> {
        if !self.is_valid() {
            return None;
        }
        match self {
            Observation::Fix { at, sigma_m, .. } => Some((*at, *sigma_m)),

            Observation::Corridor {
                from, to, sigma_m, ..
            } => {
                // Project the current estimate onto the segment's line, in the local tangent
                // plane. The nearest point is the target; the estimate is pulled perpendicular
                // to the track and not along it.
                let (ax, ay) = offset_m(current, *from);
                let (bx, by) = offset_m(current, *to);
                let (vx, vy) = (bx - ax, by - ay);
                let len2 = vx * vx + vy * vy;
                if len2 <= 0.0 {
                    return None;
                }
                // ⚠️ `t` is deliberately *not* clamped to [0,1]. The track is a sample of a
                // flight path, not its full extent, and an aircraft observed on a heading was
                // on that heading before and after the two reported points. Clamping would
                // turn a passing track into a spurious pull towards its endpoint.
                let t = -(ax * vx + ay * vy) / len2;
                let (nx, ny) = (ax + t * vx, ay + t * vy);
                Some((translate_m(current, nx, ny), *sigma_m))
            }

            Observation::Within {
                centre, footprint, ..
            } => {
                // ⭐ The region's own size *is* the uncertainty. A 500 m boundary says "in
                // here somewhere", which is a 500 m-ish constraint centred on the middle.
                //
                // ⚠️ Half the characteristic width, treated as one sigma. That is authored and
                // slightly conservative: a uniform distribution over a disc of radius r has a
                // standard deviation nearer 0.7r, so calling it r overstates the spread. That
                // is the right direction to be wrong in.
                let sigma = footprint.characteristic_km() * 500.0;
                Some((*centre, sigma))
            }
        }
    }
}

fn is_finite(g: Geodetic) -> bool {
    g.latitude.is_finite() && g.longitude.is_finite() && g.altitude_km.is_finite()
}

/// Offset from `origin` to `point`, in metres east and north on the local tangent plane.
///
/// ⚠️ A flat-earth approximation, valid because it is only ever applied to offsets small
/// compared to the earth's radius. At 200 km — the uninformed prior's sigma — the error is
/// under 1%, and at the scales that matter after one real observation it is negligible.
fn offset_m(origin: Geodetic, point: Geodetic) -> (f64, f64) {
    let dn = (point.latitude - origin.latitude) * METRES_PER_DEG_LAT;
    let de = (point.longitude - origin.longitude)
        * METRES_PER_DEG_LAT
        * (origin.latitude * DEG).cos();
    (de, dn)
}

/// The inverse of [`offset_m`]: move `origin` by the given metres east and north.
fn translate_m(origin: Geodetic, de: f64, dn: f64) -> Geodetic {
    let lat = origin.latitude + dn / METRES_PER_DEG_LAT;
    let coslat = (origin.latitude * DEG).cos();
    // ⚠️ Guard against the pole, where a metre east is an unbounded number of degrees. No
    // agricultural produce is exchanged at 89.999° but the arithmetic should not produce an
    // infinity if a corrupt record puts something there.
    let lon = if coslat.abs() < 1e-9 {
        origin.longitude
    } else {
        origin.longitude + de / (METRES_PER_DEG_LAT * coslat)
    };
    Geodetic::new(lat, lon, origin.altitude_km)
}

#[cfg(test)]
mod tests {
    use super::*;

    const HARARE: Geodetic = Geodetic {
        latitude: -17.8292,
        longitude: 31.0522,
        altitude_km: 0.0,
    };

    fn t(jd: f64) -> Utc {
        Utc::from_julian(jd)
    }

    fn at(lat: f64, lon: f64) -> Geodetic {
        Geodetic::surface(lat, lon)
    }

    #[test]
    fn an_uninformed_estimate_reports_itself_as_such() {
        let e = Estimate::uninformed(HARARE);
        assert!(!e.is_informed());
        assert!(!e.rests_on_observation());
        assert_eq!(e.observation_count, 0);
        assert_eq!(e.sigma_m, UNINFORMED_SIGMA_M);
        assert!(e.declaration().contains("has not been measured"));
    }

    #[test]
    fn the_prior_does_not_compete_with_a_real_observation() {
        // ⭐ The property UNINFORMED_SIGMA_M exists for: the first observation should own the
        // result, not be averaged against a guess.
        let e = Estimate::uninformed(at(-17.0, 31.0));
        let obs = Observation::fix(at(-17.8292, 31.0522), 50.0, Source::Instrument, t(2_460_000.5));
        let after = e.update(&obs);
        let drift_km = great_circle_km(after.at, at(-17.8292, 31.0522));
        assert!(drift_km < 0.1, "prior pulled the fix {drift_km} km off");
        assert!(after.sigma_m < 51.0);
    }

    #[test]
    fn combining_two_equal_observations_beats_either_alone() {
        // ⭐ The whole premise: noisy plus noisy is less noisy.
        let e = Estimate::uninformed(HARARE);
        let a = Observation::fix(at(-17.8300, 31.0520), 100.0, Source::Instrument, t(2_460_000.5));
        let b = Observation::fix(at(-17.8284, 31.0524), 100.0, Source::Instrument, t(2_460_000.6));
        let once = e.update(&a);
        let twice = once.update(&b);
        assert!(twice.sigma_m < once.sigma_m);
        assert!(twice.sigma_m < 100.0);
    }

    #[test]
    fn a_tight_observation_outweighs_a_loose_one() {
        let e = Estimate::uninformed(HARARE);
        let loose = Observation::fix(at(-17.90, 31.05), 5000.0, Source::Instrument, t(2_460_000.5));
        let tight = Observation::fix(at(-17.83, 31.05), 20.0, Source::Instrument, t(2_460_000.6));
        let fused = e.update(&loose).update(&tight);
        assert!(great_circle_km(fused.at, at(-17.83, 31.05)) < 0.05);
    }

    #[test]
    fn folding_a_log_reproduces_a_running_update() {
        // ⭐ The property the server's cache is checked against.
        let log = vec![
            Observation::fix(at(-17.83, 31.05), 60.0, Source::Instrument, t(2_460_000.5)),
            Observation::within(
                at(-17.828, 31.053),
                Footprint::Region { extent_km: 3.0 },
                Source::Asserted,
                t(2_460_000.6),
            ),
            Observation::corridor(
                at(-18.5, 30.5),
                at(-17.0, 31.6),
                4000.0,
                Source::Instrument,
                t(2_460_000.7),
            ),
        ];
        let folded = Estimate::fold(HARARE, &log);
        let mut running = Estimate::uninformed(HARARE);
        for obs in &log {
            running = running.update(obs);
        }
        assert_eq!(folded, running);
    }

    #[test]
    fn a_corridor_pulls_across_track_and_not_along_it() {
        // ⭐ The aircraft case, stated as a test. A track running due north past a point to
        // the east of it should move the estimate west, not north or south.
        let e = Estimate {
            at: at(-17.80, 31.10),
            sigma_m: 5_000.0,
            as_of: None,
            observation_count: 1,
            strongest_source: Some(Source::Instrument),
        };
        // A meridional track at longitude 31.00, well north and south of the estimate.
        let obs = Observation::corridor(
            at(-18.50, 31.00),
            at(-17.00, 31.00),
            2_000.0,
            Source::Instrument,
            t(2_460_000.5),
        );
        let after = e.update(&obs);
        // Moved west, towards the track.
        assert!(after.at.longitude < e.at.longitude);
        // Barely moved north or south: the along-track direction is unconstrained.
        let lat_shift_m = (after.at.latitude - e.at.latitude).abs() * METRES_PER_DEG_LAT;
        assert!(
            lat_shift_m < 50.0,
            "corridor invented {lat_shift_m} m of along-track movement"
        );
    }

    #[test]
    fn a_corridor_constrains_from_beyond_its_endpoints() {
        // ⚠️ The un-clamped projection. An aircraft observed on a heading was on that heading
        // outside the two reported points, so a short track segment must still constrain a
        // position that is off its end rather than pulling towards the endpoint.
        let e = Estimate {
            at: at(-17.00, 31.10),
            sigma_m: 5_000.0,
            as_of: None,
            observation_count: 1,
            strongest_source: Some(Source::Instrument),
        };
        // Segment entirely south of the estimate, running north along 31.00.
        let obs = Observation::corridor(
            at(-18.50, 31.00),
            at(-18.00, 31.00),
            2_000.0,
            Source::Instrument,
            t(2_460_000.5),
        );
        let after = e.update(&obs);
        assert!(after.at.longitude < e.at.longitude, "no across-track pull");
        let lat_shift_m = (after.at.latitude - e.at.latitude).abs() * METRES_PER_DEG_LAT;
        assert!(
            lat_shift_m < 50.0,
            "clamping dragged the estimate {lat_shift_m} m towards the endpoint"
        );
    }

    #[test]
    fn a_region_contributes_an_uncertainty_the_size_of_the_region() {
        let e = Estimate::uninformed(HARARE);
        let obs = Observation::within(
            HARARE,
            Footprint::Region { extent_km: 2.0 },
            Source::Asserted,
            t(2_460_000.5),
        );
        let after = e.update(&obs);
        // 2 km across → about 1000 m of sigma, not 2 m and not 200 km.
        assert!(after.sigma_m > 500.0 && after.sigma_m < 1200.0, "{}", after.sigma_m);
    }

    #[test]
    fn assertions_never_become_evidence_however_many_agree() {
        // ⭐ A pile of assertions can produce a tight sigma. It must not produce an observed
        // source, and the declaration must say so.
        let mut e = Estimate::uninformed(HARARE);
        for i in 0..40 {
            e = e.update(&Observation::fix(
                at(-17.8292 + (i % 3) as f64 * 1e-5, 31.0522),
                50.0,
                Source::Asserted,
                t(2_460_000.5 + i as f64 * 0.01),
            ));
        }
        assert!(e.sigma_m < 20.0, "expected a tight sigma to set up the test");
        assert!(e.is_informed());
        assert!(!e.rests_on_observation());
        assert!(e.declaration().contains("stated rather than measured"));
    }

    #[test]
    fn the_strongest_source_survives_a_weaker_one_arriving_later() {
        // ⚠️ Order must not let a late assertion downgrade a measured position.
        let e = Estimate::uninformed(HARARE)
            .update(&Observation::fix(HARARE, 30.0, Source::Instrument, t(2_460_000.5)))
            .update(&Observation::fix(HARARE, 30.0, Source::Asserted, t(2_460_000.6)));
        assert_eq!(e.strongest_source, Some(Source::Instrument));
        assert!(e.rests_on_observation());
    }

    #[test]
    fn a_placeholder_position_is_not_an_observation() {
        let e = Estimate::uninformed(HARARE).update(&Observation::fix(
            HARARE,
            100.0,
            Source::Placeholder,
            t(2_460_000.5),
        ));
        assert!(e.is_informed());
        assert!(!e.rests_on_observation());
    }

    #[test]
    fn an_incoherent_observation_is_inert_rather_than_fatal() {
        let e = Estimate::uninformed(HARARE)
            .update(&Observation::fix(HARARE, 50.0, Source::Instrument, t(2_460_000.5)));
        // A corridor whose endpoints coincide defines no direction.
        let degenerate = Observation::corridor(
            HARARE,
            HARARE,
            1000.0,
            Source::Instrument,
            t(2_460_000.6),
        );
        assert!(!degenerate.is_valid());
        let after = e.update(&degenerate);
        assert_eq!(after, e, "an invalid observation changed the estimate");
    }

    #[test]
    fn a_nonfinite_observation_is_rejected() {
        let e = Estimate::uninformed(HARARE);
        let nan = Observation::fix(
            Geodetic::new(f64::NAN, 31.0, 0.0),
            50.0,
            Source::Instrument,
            t(2_460_000.5),
        );
        assert!(!nan.is_valid());
        assert_eq!(e.update(&nan), e);
    }

    #[test]
    fn no_source_can_claim_to_be_perfect() {
        // ⚠️ MIN_SIGMA_M as a guard: a zero-sigma source would take the gain to 1.0 and erase
        // every other observation.
        let e = Estimate::uninformed(HARARE)
            .update(&Observation::fix(at(-17.83, 31.05), 0.0, Source::Instrument, t(2_460_000.5)));
        assert!(e.sigma_m >= MIN_SIGMA_M);
        assert!(e.sigma_m.is_finite());
    }

    #[test]
    fn precision_requires_a_scale_and_reports_honestly_at_each() {
        let e = Estimate::uninformed(HARARE)
            .update(&Observation::fix(HARARE, 300.0, Source::Instrument, t(2_460_000.5)));
        // 300 m against a 40 km district is a tight relative tolerance.
        let district = e.precision_at(Extent::DISTRICT);
        assert!(district.is_known());
        assert!(district.confidence() > 0.98);
        // The same 300 m against a 100 m gate carries no information at all.
        let gate = e.precision_at(Extent::POINT_OF_DELIVERY);
        assert!(!gate.is_known(), "300 m should not resolve a 100 m gate");
    }

    #[test]
    fn an_uninformed_estimate_has_no_precision_at_any_scale() {
        let e = Estimate::uninformed(HARARE);
        assert!(!e.precision_at(Extent::DISTRICT).is_known());
        assert!(!e.precision_at(Extent::FIELD).is_known());
    }

    #[test]
    fn the_extent_widens_the_guard_when_the_position_is_uncertain() {
        // ⭐ The bridge to footprint. A poorly located farm should make readings *less*
        // admissible, not more.
        let vague = Estimate::uninformed(HARARE).update(&Observation::within(
            HARARE,
            Footprint::Region { extent_km: 20.0 },
            Source::Asserted,
            t(2_460_000.5),
        ));
        let sharp = Estimate::uninformed(HARARE)
            .update(&Observation::fix(HARARE, 40.0, Source::Instrument, t(2_460_000.5)));
        assert!(vague.extent().across_km > sharp.extent().across_km);
        assert!(sharp.extent().across_km < Extent::SMALLHOLDING.across_km);
    }

    #[test]
    fn the_wire_shape_is_stable() {
        // These shapes cross the API boundary; changing one is a breaking change.
        let obs = Observation::fix(
            Geodetic::surface(-17.8292, 31.0522),
            30.0,
            Source::Instrument,
            Utc::from_julian(2_460_000.5),
        );
        let json = serde_json::to_string(&obs).unwrap();
        assert!(json.contains(r#""kind":"fix""#), "{json}");
        assert!(json.contains(r#""sigma_m":30.0"#), "{json}");
        assert!(json.contains(r#""source":"instrument""#), "{json}");

        let corridor = Observation::corridor(
            Geodetic::surface(-18.0, 31.0),
            Geodetic::surface(-17.0, 31.0),
            2000.0,
            Source::Instrument,
            Utc::from_julian(2_460_000.5),
        );
        assert!(serde_json::to_string(&corridor)
            .unwrap()
            .contains(r#""kind":"corridor""#));

        let within = Observation::within(
            Geodetic::surface(-17.8, 31.0),
            Footprint::Region { extent_km: 2.0 },
            Source::Asserted,
            Utc::from_julian(2_460_000.5),
        );
        assert!(serde_json::to_string(&within)
            .unwrap()
            .contains(r#""kind":"within""#));
    }

    #[test]
    fn an_observation_survives_a_round_trip() {
        let log = vec![
            Observation::fix(HARARE, 30.0, Source::Instrument, t(2_460_000.5)),
            Observation::corridor(
                at(-18.0, 31.0),
                at(-17.0, 31.0),
                2000.0,
                Source::Instrument,
                t(2_460_000.6),
            ),
            Observation::within(
                HARARE,
                Footprint::Swath {
                    across_track_km: 10.0,
                    along_track_km: 290.0,
                },
                Source::ThirdParty,
                t(2_460_000.7),
            ),
        ];
        let json = serde_json::to_string(&log).unwrap();
        let back: Vec<Observation> = serde_json::from_str(&json).unwrap();
        assert_eq!(log, back);
        // ⭐ And the estimate folded from the round-tripped log is identical, which is what
        // actually matters for a ledger.
        assert_eq!(Estimate::fold(HARARE, &log), Estimate::fold(HARARE, &back));
    }

    #[test]
    fn the_tangent_plane_round_trips() {
        let there = at(-17.90, 31.15);
        let (de, dn) = offset_m(HARARE, there);
        let back = translate_m(HARARE, de, dn);
        assert!(great_circle_km(back, there) < 0.001);
    }
}
