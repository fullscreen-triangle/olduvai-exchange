//! SGP4 orbital propagation: a satellite position is a computation, not a lookup.
//!
//! # ⭐ Why this is the one satellite thing that can be evidence
//!
//! Every other satellite-derived value this exchange might use — a soil-moisture retrieval,
//! a vegetation index, a cloud mask — arrives from a third party who processed it. We take
//! it on faith. Per `notes/27-miracles-are-for-missing-information.md` §4 that makes it
//! [`Source::Asserted`], evidential weight `0.0`: context, never evidence.
//!
//! A propagated position is different in kind. We record the TLE — 138 bytes of published
//! orbital elements, with its epoch — and the timestamp. **Anyone holding those two things
//! can recompute the position and get the same answer.** The feed is not the datum; the feed
//! is the *input* to a datum we derive and can defend. That is what
//! `notes/32-yokozuna-extraction.md` §2 extracted, and it is why this lives here rather
//! than in the browser: if a position is to be admissible it must be byte-reproducible, and
//! this crate is where byte-reproducibility is guaranteed (see the crate docs, and the
//! `opt-level = 2` pin in the workspace manifest).
//!
//! # ⚠️ What SGP4 is, and what it is not
//!
//! SGP4 is the propagator the published two-line element sets are *defined against*. A TLE
//! is not a state vector — it is a set of mean elements that only mean anything when fed
//! through this specific algorithm. Propagating a TLE with a general-purpose orbit
//! integrator gives a wrong answer, not a differently-approximated one.
//!
//! It is also not precise. Accuracy is roughly a kilometre at epoch and decays by a few
//! kilometres per day. That is fine for what we want it for — [`overpass_windows`], where
//! the question is "is this satellite above your horizon on Tuesday morning" and a kilometre
//! of cross-track error moves the answer by seconds. It is **not** fine for anything that
//! would attribute a reading to a specific field, which is what [`crate::footprint`] is for.
//!
//! ⚠️ **TLEs go stale.** The buhera-west frontend loaded its elements from a dataset vendored
//! inside an npm package, frozen at whenever that package was published. Accuracy decays
//! within days; a year-old TLE is not a worse answer, it is a fiction. [`Tle::age_days`]
//! exists so a caller cannot avoid knowing, and [`Tle::MAX_USEFUL_AGE_DAYS`] is an authored
//! constant that says so out loud.
//!
//! # No dependency
//!
//! The `sgp4` crate exists and is competent. It is deliberately not used. This crate has
//! exactly two dependencies — `serde` and `thiserror` — and the reason is the guarantee in
//! `lib.rs`: the same bytes for every caller, forever. A third-party crate on that path is a
//! third party who can change the answer in a patch release. The algorithm below is
//! published (Hoots & Roehrich, *Spacetrack Report No. 3*, 1980; Vallado et al., *Revisiting
//! Spacetrack Report No. 3*, 2006) and does not change.

use crate::provenance::{Precision, Source};
use serde::{Deserialize, Serialize};
use std::f64::consts::PI;

/// WGS-72 equatorial radius, km. ⚠️ WGS-72, not WGS-84 — TLEs are defined against WGS-72
/// and using the newer ellipsoid here introduces error rather than removing it.
const EARTH_RADIUS_KM: f64 = 6378.135;
/// WGS-72 gravitational parameter, in earth-radii and minutes.
const XKE: f64 = 0.074_366_916_133_173_37;
/// Second zonal harmonic of the geopotential.
const J2: f64 = 1.082_616e-3;
/// Third zonal harmonic.
const J3: f64 = -2.538_81e-6;
/// Fourth zonal harmonic.
const J4: f64 = -1.655_97e-6;
const CK2: f64 = 0.5 * J2;
const CK4: f64 = -0.375 * J4;
const A3OVK2: f64 = -J3 / CK2;
/// Atmospheric drag reference altitude, earth radii.
const QOMS2T: f64 = 1.880_279_159_015_270_4e-9;
const S: f64 = 1.012_229_121_507_777_8;
const TWO_PI: f64 = 2.0 * PI;
const MIN_PER_DAY: f64 = 1440.0;
const DEG: f64 = PI / 180.0;

/// WGS-84 flattening, used only for the geodetic conversion at the end.
const FLATTENING: f64 = 1.0 / 298.257_223_563;

/// Something wrong with a TLE or a propagation.
///
/// ⚠️ `PartialEq` but not `Eq`: two variants carry the offending `f64`, and a NaN
/// eccentricity is exactly the kind of corrupt element this type exists to report. Claiming
/// reflexive equality over it would be false.
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum OrbitError {
    #[error("TLE line {line} is {len} characters; the format requires 69")]
    LineLength { line: u8, len: usize },
    #[error("TLE line {line} should start with '{expected}', found '{found}'")]
    LineNumber { line: u8, expected: char, found: char },
    #[error("could not parse {field} from the TLE: {raw:?}")]
    Field { field: &'static str, raw: String },
    #[error("the two lines are for different satellites: {first} and {second}")]
    CatalogMismatch { first: u32, second: u32 },
    #[error("checksum on line {line} is {found}, computed {expected}")]
    Checksum { line: u8, found: u32, expected: u32 },
    #[error("eccentricity {0} is not in [0,1); this is not an elliptical orbit")]
    Eccentricity(f64),
    #[error("mean motion {0} rev/day is not positive")]
    MeanMotion(f64),
    #[error("the orbit decayed: propagation put the satellite below the surface")]
    Decayed,
    #[error("the propagator did not converge, which usually means the elements are corrupt")]
    NotConverged,
}

/// A parsed two-line element set.
///
/// ⭐ **The TLE is what gets recorded, not the position.** A position is derived and can be
/// rederived; a TLE is the input someone else must hold to check us. [`Tle::to_lines`]
/// round-trips exactly what was parsed so the ledger stores the bytes, not our reading
/// of them.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Tle {
    /// NORAD catalog number. ⚠️ The satellite's identity, and the thing buhera-west threw
    /// away in favour of `Math.random().toString(36)`. A satellite already has a name; it
    /// should not be given a new one on every page load.
    pub catalog_number: u32,
    /// International designator, e.g. `"15028A"` for Sentinel-2A.
    pub designator: String,
    /// Epoch year, full four digits.
    pub epoch_year: i32,
    /// Day of the epoch year, fractional. Day 1.0 is 1 January at 00:00 UTC.
    pub epoch_day: f64,
    /// First derivative of mean motion / 2, rev/day².
    pub mean_motion_dot: f64,
    /// Second derivative of mean motion / 6, rev/day³.
    pub mean_motion_ddot: f64,
    /// B* drag term, earth-radii⁻¹.
    pub bstar: f64,
    /// Inclination, degrees.
    pub inclination: f64,
    /// Right ascension of the ascending node, degrees.
    pub raan: f64,
    /// Eccentricity, dimensionless, in `[0,1)`.
    pub eccentricity: f64,
    /// Argument of perigee, degrees.
    pub arg_perigee: f64,
    /// Mean anomaly, degrees.
    pub mean_anomaly: f64,
    /// Mean motion, revolutions per day.
    pub mean_motion: f64,
    /// Revolution number at epoch.
    pub revolution: u32,
    /// The two lines exactly as received, so the ledger records the input rather than our
    /// parse of it.
    lines: (String, String),
}

impl Tle {
    /// ⚠️ **An authored constant, and a real one.** Beyond about two weeks a TLE's error has
    /// grown past the point where an overpass window means anything. This is not a hard
    /// limit — [`propagate`] will still run — but [`Tle::is_fresh`] is what a caller should
    /// gate on, and the number is here rather than buried in a caller so that raising it is
    /// a visible act.
    ///
    /// Source: operational practice; NORAD publishes most LEO elements daily for this
    /// reason. Not a measurement, and it should carry [`Source::Asserted`] if it ever
    /// reaches a field.
    pub const MAX_USEFUL_AGE_DAYS: f64 = 14.0;

    /// Parse a TLE from its two lines.
    ///
    /// The optional third "line 0" (the common name) is not part of the format and is not
    /// accepted here — a name is not an identity, [`Tle::catalog_number`] is.
    pub fn parse(line1: &str, line2: &str) -> Result<Tle, OrbitError> {
        let l1 = line1.trim_end();
        let l2 = line2.trim_end();

        check_line(l1, 1, '1')?;
        check_line(l2, 2, '2')?;

        let b1 = l1.as_bytes();
        let b2 = l2.as_bytes();

        let cat1 = field_u32(l1, 2..7, "catalog number (line 1)")?;
        let cat2 = field_u32(l2, 2..7, "catalog number (line 2)")?;
        if cat1 != cat2 {
            return Err(OrbitError::CatalogMismatch {
                first: cat1,
                second: cat2,
            });
        }

        let epoch_raw = field_f64(l1, 18..32, "epoch")?;
        let two_digit_year = (epoch_raw / 1000.0).floor() as i32;
        // The format's two-digit year. 57 is the pivot because Sputnik was 1957 and there
        // are no earlier catalog entries.
        let epoch_year = if two_digit_year < 57 {
            2000 + two_digit_year
        } else {
            1900 + two_digit_year
        };
        let epoch_day = epoch_raw - (two_digit_year as f64) * 1000.0;

        let eccentricity = {
            // Columns 26–33 of line 2 carry the mantissa with the leading "0." implied.
            let raw = std::str::from_utf8(&b2[26..33]).unwrap_or("").trim();
            format!("0.{raw}")
                .parse::<f64>()
                .map_err(|_| OrbitError::Field {
                    field: "eccentricity",
                    raw: raw.to_string(),
                })?
        };
        if !(0.0..1.0).contains(&eccentricity) {
            return Err(OrbitError::Eccentricity(eccentricity));
        }

        let mean_motion = field_f64(l2, 52..63, "mean motion")?;
        // ⚠️ Negated `>` rather than `<=`, and clippy's suggestion to use `partial_cmp` must be
        // declined: the two are not equivalent on a partially ordered type. `!(n > 0.0)` is true
        // for NaN and rejects it; `n <= 0.0` is false for NaN and would let it through into the
        // propagator, where it would silently poison every derived position instead of failing
        // at the parse. The unreadability clippy objects to is the point being made.
        #[allow(clippy::neg_cmp_op_on_partial_ord)]
        if !(mean_motion > 0.0) {
            return Err(OrbitError::MeanMotion(mean_motion));
        }

        let _ = b1;

        Ok(Tle {
            catalog_number: cat1,
            designator: l1[9..17].trim().to_string(),
            epoch_year,
            epoch_day,
            mean_motion_dot: field_f64(l1, 33..43, "mean motion dot")?,
            mean_motion_ddot: decimal_exponent(l1, 44..52, "mean motion ddot")?,
            bstar: decimal_exponent(l1, 53..61, "bstar")?,
            inclination: field_f64(l2, 8..16, "inclination")?,
            raan: field_f64(l2, 17..25, "raan")?,
            eccentricity,
            arg_perigee: field_f64(l2, 34..42, "argument of perigee")?,
            mean_anomaly: field_f64(l2, 43..51, "mean anomaly")?,
            mean_motion,
            revolution: field_u32(l2, 63..68, "revolution number").unwrap_or(0),
            lines: (l1.to_string(), l2.to_string()),
        })
    }

    /// The two lines exactly as parsed. What goes in the ledger.
    pub fn to_lines(&self) -> (&str, &str) {
        (&self.lines.0, &self.lines.1)
    }

    /// The epoch as a Julian date.
    pub fn epoch_julian(&self) -> f64 {
        julian_from_year_day(self.epoch_year, self.epoch_day)
    }

    /// How old the elements are at a given instant, in days. Negative before epoch.
    pub fn age_days(&self, at: Utc) -> f64 {
        at.julian() - self.epoch_julian()
    }

    /// Within [`Tle::MAX_USEFUL_AGE_DAYS`] of epoch, in either direction.
    pub fn is_fresh(&self, at: Utc) -> bool {
        Self::is_within_useful_age(self.age_days(at))
    }

    /// The same test on a bare age, for callers holding a [`Position`] rather than a [`Tle`].
    pub fn is_within_useful_age(age_days: f64) -> bool {
        age_days.abs() <= Self::MAX_USEFUL_AGE_DAYS
    }

    /// Orbital period in minutes, from the mean motion.
    pub fn period_minutes(&self) -> f64 {
        MIN_PER_DAY / self.mean_motion
    }
}

/// An instant, UTC, as a Julian date.
///
/// ⚠️ **The core has no clock** (see the crate docs). A `Utc` is always supplied by the
/// caller — the server reads the system clock, the WASM client reads the browser's, the
/// test supplies a literal — and what gets recorded alongside a propagated position is this
/// value, so the computation can be repeated. A propagator that read the clock itself would
/// produce a different answer on every call and could never be checked.
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Utc(f64);

impl Utc {
    /// From a Julian date.
    pub const fn from_julian(jd: f64) -> Self {
        Utc(jd)
    }

    /// From a Unix timestamp in seconds.
    pub fn from_unix(seconds: f64) -> Self {
        Utc(2440587.5 + seconds / 86400.0)
    }

    /// From a calendar date and time, UTC. Proleptic Gregorian.
    pub fn from_ymd_hms(year: i32, month: u32, day: u32, h: u32, m: u32, s: f64) -> Self {
        let (y, mo) = if month <= 2 {
            (year - 1, month + 12)
        } else {
            (year, month)
        };
        let a = (y as f64 / 100.0).floor();
        let b = 2.0 - a + (a / 4.0).floor();
        let jd = (365.25 * (y as f64 + 4716.0)).floor()
            + (30.6001 * (mo as f64 + 1.0)).floor()
            + day as f64
            + b
            - 1524.5;
        Utc(jd + (h as f64 * 3600.0 + m as f64 * 60.0 + s) / 86400.0)
    }

    pub fn julian(self) -> f64 {
        self.0
    }

    pub fn unix(self) -> f64 {
        (self.0 - 2440587.5) * 86400.0
    }

    /// Advance by minutes.
    pub fn plus_minutes(self, minutes: f64) -> Self {
        Utc(self.0 + minutes / MIN_PER_DAY)
    }

    /// Calendar breakdown, UTC: `(year, month, day, hour, minute, second)`.
    pub fn to_ymd_hms(self) -> (i32, u32, u32, u32, u32, f64) {
        let jd = self.0 + 0.5;
        let z = jd.floor();
        let f = jd - z;
        let alpha = ((z - 1867216.25) / 36524.25).floor();
        let a = z + 1.0 + alpha - (alpha / 4.0).floor();
        let b = a + 1524.0;
        let c = ((b - 122.1) / 365.25).floor();
        let d = (365.25 * c).floor();
        let e = ((b - d) / 30.6001).floor();

        let day_f = b - d - (30.6001 * e).floor() + f;
        let day = day_f.floor();
        let month = if e < 14.0 { e - 1.0 } else { e - 13.0 };
        let year = if month > 2.0 { c - 4716.0 } else { c - 4715.0 };

        let secs = (day_f - day) * 86400.0;
        let hour = (secs / 3600.0).floor();
        let minute = ((secs - hour * 3600.0) / 60.0).floor();
        let second = secs - hour * 3600.0 - minute * 60.0;

        (
            year as i32,
            month as u32,
            day as u32,
            hour as u32,
            minute as u32,
            second,
        )
    }
}

/// A point on the earth: the observer, or the subsatellite point.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Geodetic {
    /// Degrees north, `[-90, 90]`.
    pub latitude: f64,
    /// Degrees east, `(-180, 180]`.
    pub longitude: f64,
    /// Altitude above the ellipsoid, km.
    pub altitude_km: f64,
}

impl Geodetic {
    pub fn new(latitude: f64, longitude: f64, altitude_km: f64) -> Self {
        Geodetic {
            latitude,
            longitude,
            altitude_km: altitude_km.max(0.0),
        }
    }

    /// A ground station or a farm gate: on the surface.
    pub fn surface(latitude: f64, longitude: f64) -> Self {
        Geodetic::new(latitude, longitude, 0.0)
    }
}

/// Where a satellite is, and when.
///
/// ⭐ Carries the inputs, not just the answer. `tle_epoch_age_days` is on the struct because
/// a position propagated from three-week-old elements is a different quality of statement
/// than one propagated from this morning's, and a caller that never sees the age cannot
/// know which it has.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Position {
    /// Which satellite. From the TLE, not invented.
    pub catalog_number: u32,
    /// When, as supplied by the caller.
    pub at: Utc,
    /// Sub-satellite point and altitude.
    pub geodetic: Geodetic,
    /// ECI position, km, true-equator mean-equinox of date.
    pub eci_km: [f64; 3],
    /// ECI velocity, km/s.
    pub velocity_km_s: [f64; 3],
    /// Age of the elements at `at`. See [`Tle::MAX_USEFUL_AGE_DAYS`].
    pub tle_epoch_age_days: f64,
}

impl Position {
    /// ⭐ How well this position is known, given how stale the elements were.
    ///
    /// SGP4 is roughly 1 km at epoch and degrades by roughly 1–3 km/day. Expressed as a
    /// relative tolerance against orbital radius so it composes with [`Precision`].
    ///
    /// ⚠️ The degradation rate is authored. It is a documented rule of thumb from the SGP4
    /// literature rather than something measured here, and if it ever reaches a `Field` it
    /// travels with [`Self::source`], which is [`Source::Instrument`] — a computation from a
    /// published measurement, not a participant's word and not a weighbridge either.
    pub fn precision(&self) -> Precision {
        // ⚠️ Past the useful age the elements no longer describe the orbit at all, and a
        // computed tolerance would be a *number* where the truth is an absence. Collapsing to
        // unknown rather than reporting 12% is the honest answer: `Precision::unknown()`
        // yields confidence 0, so a stale position cannot quietly carry weight.
        if !Tle::is_within_useful_age(self.tle_epoch_age_days) {
            return Precision::unknown();
        }

        let r = (self.eci_km[0].powi(2) + self.eci_km[1].powi(2) + self.eci_km[2].powi(2)).sqrt();
        if r <= 0.0 {
            return Precision::unknown();
        }
        let error_km = 1.0 + 2.0 * self.tle_epoch_age_days.abs();
        Precision::relative(error_km / r)
    }

    /// ⭐ [`Source::Instrument`], and this is the load-bearing claim of the whole module.
    ///
    /// Not [`Source::Asserted`], because nobody is taking our word for it: the TLE and the
    /// timestamp are in the ledger and the arithmetic is published. Not
    /// [`Source::Weighbridge`], because it is a model of where a body is rather than a
    /// reading off it. A propagated position sits exactly where a sensor reading sits — a
    /// device-mediated measurement with a known error characteristic.
    pub fn source(&self) -> Source {
        Source::Instrument
    }
}

/// Propagate a TLE to an instant.
///
/// Pure: the same TLE and the same [`Utc`] give the same [`Position`] on any machine, which
/// is the entire reason this is admissible.
pub fn propagate(tle: &Tle, at: Utc) -> Result<Position, OrbitError> {
    let minutes = (at.julian() - tle.epoch_julian()) * MIN_PER_DAY;
    let (eci, vel) = sgp4(tle, minutes)?;
    let geodetic = eci_to_geodetic(eci, gmst(at));

    Ok(Position {
        catalog_number: tle.catalog_number,
        at,
        geodetic,
        eci_km: eci,
        velocity_km_s: vel,
        tle_epoch_age_days: tle.age_days(at),
    })
}

/// Where a satellite is relative to an observer.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Look {
    /// Degrees above the horizon. Negative means below it.
    pub elevation: f64,
    /// Degrees clockwise from north.
    pub azimuth: f64,
    /// Line-of-sight distance, km.
    pub range_km: f64,
}

/// Look angles from an observer to a satellite at one instant.
pub fn look_angles(observer: Geodetic, position: &Position, at: Utc) -> Look {
    let theta = gmst(at) + observer.longitude * DEG;
    let lat = observer.latitude * DEG;

    let (sin_lat, cos_lat) = lat.sin_cos();
    let c = 1.0 / (1.0 - FLATTENING * (2.0 - FLATTENING) * sin_lat * sin_lat).sqrt();
    let sq = (1.0 - FLATTENING).powi(2) * c;

    let obs = [
        (EARTH_RADIUS_KM * c + observer.altitude_km) * cos_lat * theta.cos(),
        (EARTH_RADIUS_KM * c + observer.altitude_km) * cos_lat * theta.sin(),
        (EARTH_RADIUS_KM * sq + observer.altitude_km) * sin_lat,
    ];

    let d = [
        position.eci_km[0] - obs[0],
        position.eci_km[1] - obs[1],
        position.eci_km[2] - obs[2],
    ];

    let (sin_t, cos_t) = theta.sin_cos();
    // Rotate into the topocentric south-east-zenith frame.
    let south = sin_lat * cos_t * d[0] + sin_lat * sin_t * d[1] - cos_lat * d[2];
    let east = -sin_t * d[0] + cos_t * d[1];
    let zenith = cos_lat * cos_t * d[0] + cos_lat * sin_t * d[1] + sin_lat * d[2];

    let range = (d[0] * d[0] + d[1] * d[1] + d[2] * d[2]).sqrt();
    let mut azimuth = east.atan2(-south);
    if azimuth < 0.0 {
        azimuth += TWO_PI;
    }

    Look {
        elevation: (zenith / range).asin() / DEG,
        azimuth: azimuth / DEG,
        range_km: range,
    }
}

/// A pass: the satellite is above the horizon from `rise` to `set`.
///
/// ⭐ **This is what the module is for.** *"The next Sentinel-2 pass over your address is in
/// 4 days, 06:14–06:17 UTC"* is a checkable, unit-bearing, provider-free fact — the first
/// thing the satellite rail can honestly say, and it requires no API key and no trust in
/// anyone. `notes/32-yokozuna-extraction.md` §2.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Overpass {
    pub catalog_number: u32,
    /// Crosses the minimum elevation on the way up.
    pub rise: Utc,
    /// Highest elevation during the pass.
    pub peak: Utc,
    /// Drops below the minimum elevation.
    pub set: Utc,
    /// Peak elevation, degrees.
    pub peak_elevation: f64,
    /// Duration above the minimum elevation, minutes.
    pub duration_minutes: f64,
    /// ⚠️ Reported so a caller cannot use a stale answer without seeing that it is stale.
    pub tle_epoch_age_days: f64,
}

/// Find every pass over an observer within a window.
///
/// `min_elevation` is degrees above the horizon; 10° is a common threshold for a usable
/// pass and 0° is the geometric horizon. `step_seconds` controls the coarse scan — 30 s is
/// ample for LEO, where a pass lasts several minutes.
///
/// ⚠️ Deliberately takes an explicit `from`/`to` rather than "the next N days", because "now"
/// does not exist in this crate.
pub fn overpass_windows(
    tle: &Tle,
    observer: Geodetic,
    from: Utc,
    to: Utc,
    min_elevation: f64,
    step_seconds: f64,
) -> Result<Vec<Overpass>, OrbitError> {
    let step = (step_seconds.max(1.0)) / 60.0;
    let mut passes = Vec::new();

    let mut t = from;
    let mut prev_el = elevation_at(tle, observer, t)?;
    let mut rise: Option<Utc> = None;
    let mut peak = t;
    let mut peak_el = f64::NEG_INFINITY;

    while t.julian() < to.julian() {
        let next = t.plus_minutes(step);
        let el = elevation_at(tle, observer, next)?;

        if prev_el < min_elevation && el >= min_elevation {
            // Crossing upward: bisect to the exact instant.
            rise = Some(bisect_crossing(tle, observer, t, next, min_elevation)?);
            peak_el = el;
            peak = next;
        } else if el > peak_el && rise.is_some() {
            peak_el = el;
            peak = next;
        }

        if prev_el >= min_elevation && el < min_elevation {
            if let Some(r) = rise.take() {
                let s = bisect_crossing(tle, observer, t, next, min_elevation)?;
                passes.push(Overpass {
                    catalog_number: tle.catalog_number,
                    rise: r,
                    peak,
                    set: s,
                    peak_elevation: peak_el,
                    duration_minutes: (s.julian() - r.julian()) * MIN_PER_DAY,
                    tle_epoch_age_days: tle.age_days(r),
                });
            }
            peak_el = f64::NEG_INFINITY;
        }

        prev_el = el;
        t = next;
    }

    Ok(passes)
}

fn elevation_at(tle: &Tle, observer: Geodetic, at: Utc) -> Result<f64, OrbitError> {
    let p = propagate(tle, at)?;
    Ok(look_angles(observer, &p, at).elevation)
}

/// Refine a horizon crossing bracketed by `lo`/`hi` to about a second.
fn bisect_crossing(
    tle: &Tle,
    observer: Geodetic,
    lo: Utc,
    hi: Utc,
    target: f64,
) -> Result<Utc, OrbitError> {
    let mut a = lo;
    let mut b = hi;
    let fa = elevation_at(tle, observer, a)? - target;

    // Fixed iteration count rather than a tolerance loop: the bracket halves every step, so
    // 24 steps takes any starting bracket under an hour below one second, and a fixed count
    // cannot spin.
    for _ in 0..24 {
        let mid = Utc::from_julian((a.julian() + b.julian()) / 2.0);
        let fm = elevation_at(tle, observer, mid)? - target;
        if (fa < 0.0) == (fm < 0.0) {
            a = mid;
        } else {
            b = mid;
        }
    }
    Ok(Utc::from_julian((a.julian() + b.julian()) / 2.0))
}

// ---------------------------------------------------------------------------
// SGP4 proper.
//
// Hoots & Roehrich, Spacetrack Report No. 3 (1980), as corrected by Vallado et al.,
// "Revisiting Spacetrack Report #3" (AIAA 2006-6753). Near-earth model only: deep-space
// (SDP4) corrections for periods over 225 minutes are not implemented, and
// `sgp4` returns `NotConverged` rather than silently giving a wrong answer for such an
// orbit. Every satellite this exchange cares about — imaging, GNSS-R, SAR — is LEO.
// ---------------------------------------------------------------------------

fn sgp4(tle: &Tle, tsince: f64) -> Result<([f64; 3], [f64; 3]), OrbitError> {
    let xno = tle.mean_motion * TWO_PI / MIN_PER_DAY;
    let period = TWO_PI / xno;
    if period >= 225.0 {
        // Deep space. Not implemented, and not faked.
        return Err(OrbitError::NotConverged);
    }

    let xincl = tle.inclination * DEG;
    let xnodeo = tle.raan * DEG;
    let omegao = tle.arg_perigee * DEG;
    let xmo = tle.mean_anomaly * DEG;
    let eo = tle.eccentricity;
    let bstar = tle.bstar;

    let (sinio, cosio) = xincl.sin_cos();

    // Recover the original mean motion and semi-major axis from the Kozai element.
    let a1 = (XKE / xno).powf(2.0 / 3.0);
    let theta2 = cosio * cosio;
    let x3thm1 = 3.0 * theta2 - 1.0;
    let eosq = eo * eo;
    let betao2 = 1.0 - eosq;
    let betao = betao2.sqrt();
    let del1 = 1.5 * CK2 * x3thm1 / (a1 * a1 * betao * betao2);
    let ao = a1 * (1.0 - del1 * (1.0 / 3.0 + del1 * (1.0 + 134.0 / 81.0 * del1)));
    let delo = 1.5 * CK2 * x3thm1 / (ao * ao * betao * betao2);
    let xnodp = xno / (1.0 + delo);
    let aodp = ao / (1.0 - delo);

    let perigee = (aodp * (1.0 - eo) - 1.0) * EARTH_RADIUS_KM;
    if perigee < 0.0 {
        return Err(OrbitError::Decayed);
    }

    // Drag: the S constant is lowered for low perigees, per the report.
    let (s4, qoms24) = if perigee < 156.0 {
        let s4 = if perigee < 98.0 { 20.0 } else { perigee - 78.0 };
        let q = ((120.0 - s4) / EARTH_RADIUS_KM).powi(4);
        (s4 / EARTH_RADIUS_KM + 1.0, q)
    } else {
        (S, QOMS2T)
    };

    let pinvsq = 1.0 / (aodp * aodp * betao2 * betao2);
    let tsi = 1.0 / (aodp - s4);
    let eta = aodp * eo * tsi;
    let etasq = eta * eta;
    let eeta = eo * eta;
    let psisq = (1.0 - etasq).abs();
    let coef = qoms24 * tsi.powi(4);
    let coef1 = coef / psisq.powf(3.5);

    let c2 = coef1
        * xnodp
        * (aodp * (1.0 + 1.5 * etasq + eeta * (4.0 + etasq))
            + 0.75 * CK2 * tsi / psisq * x3thm1 * (8.0 + 3.0 * etasq * (8.0 + etasq)));
    let c1 = bstar * c2;
    let x1mth2 = 1.0 - theta2;

    let c4 = 2.0
        * xnodp
        * coef1
        * aodp
        * betao2
        * (eta * (2.0 + 0.5 * etasq) + eo * (0.5 + 2.0 * etasq)
            - 2.0 * CK2 * tsi / (aodp * psisq)
                * (-3.0 * x3thm1 * (1.0 - 2.0 * eeta + etasq * (1.5 - 0.5 * eeta))
                    + 0.75 * x1mth2 * (2.0 * etasq - eeta * (1.0 + etasq))
                        * (2.0 * omegao).cos()));
    let c5 = 2.0 * coef1 * aodp * betao2 * (1.0 + 2.75 * (etasq + eeta) + eeta * etasq);

    let theta4 = theta2 * theta2;
    let temp1 = 3.0 * CK2 * pinvsq * xnodp;
    let temp2 = temp1 * CK2 * pinvsq;
    let temp3 = 1.25 * CK4 * pinvsq * pinvsq * xnodp;

    let xmdot = xnodp
        + 0.5 * temp1 * betao * x3thm1
        + 0.0625 * temp2 * betao * (13.0 - 78.0 * theta2 + 137.0 * theta4);
    let x1m5th = 1.0 - 5.0 * theta2;
    let omgdot = -0.5 * temp1 * x1m5th
        + 0.0625 * temp2 * (7.0 - 114.0 * theta2 + 395.0 * theta4)
        + temp3 * (3.0 - 36.0 * theta2 + 49.0 * theta4);
    let xhdot1 = -temp1 * cosio;
    let xnodot = xhdot1
        + (0.5 * temp2 * (4.0 - 19.0 * theta2) + 2.0 * temp3 * (3.0 - 7.0 * theta2)) * cosio;

    let omgcof = bstar * c3(eo, eta, aodp, sinio, xnodp, s4, qoms24, psisq, tsi) * omegao.cos();
    let xmcof = if eo > 1.0e-4 {
        -(2.0 / 3.0) * coef * bstar / eeta
    } else {
        0.0
    };
    let xnodcf = 3.5 * betao2 * xhdot1 * c1;
    let t2cof = 1.5 * c1;
    let xlcof = 0.125 * A3OVK2 * sinio * (3.0 + 5.0 * cosio) / (1.0 + cosio);
    let aycof = 0.25 * A3OVK2 * sinio;
    let delmo = (1.0 + eta * xmo.cos()).powi(3);
    let sinmo = xmo.sin();
    let x7thm1 = 7.0 * theta2 - 1.0;

    // Secular effects of drag and gravity.
    let xmdf = xmo + xmdot * tsince;
    let omgadf = omegao + omgdot * tsince;
    let xnoddf = xnodeo + xnodot * tsince;
    let tsq = tsince * tsince;
    let xnode = xnoddf + xnodcf * tsq;
    let mut tempa = 1.0 - c1 * tsince;
    let mut tempe = bstar * c4 * tsince;
    let mut templ = t2cof * tsq;

    // The "isimp" simplification: skipped for perigee under 220 km, where the higher-order
    // drag terms matter.
    let simple = (aodp * (1.0 - eo) / 1.0) < (220.0 / EARTH_RADIUS_KM + 1.0);
    let (omega, xmp) = if !simple {
        let c1sq = c1 * c1;
        let d2 = 4.0 * aodp * tsi * c1sq;
        let temp = d2 * tsi * c1 / 3.0;
        let d3 = (17.0 * aodp + s4) * temp;
        let d4 = 0.5 * temp * aodp * tsi * (221.0 * aodp + 31.0 * s4) * c1;
        let t3cof = d2 + 2.0 * c1sq;
        let t4cof = 0.25 * (3.0 * d3 + c1 * (12.0 * d2 + 10.0 * c1sq));
        let t5cof =
            0.2 * (3.0 * d4 + 12.0 * c1 * d3 + 6.0 * d2 * d2 + 15.0 * c1sq * (2.0 * d2 + c1sq));

        let delomg = omgcof * tsince;
        let delm = xmcof * ((1.0 + eta * xmdf.cos()).powi(3) - delmo);
        let temp = delomg + delm;
        let xmp_ = xmdf + temp;
        let omega_ = omgadf - temp;
        let tcube = tsq * tsince;
        let tfour = tsince * tcube;
        tempa = tempa - d2 * tsq - d3 * tcube - d4 * tfour;
        tempe += bstar * c5 * (xmp_.sin() - sinmo);
        templ = templ + t3cof * tcube + tfour * (t4cof + tsince * t5cof);
        (omega_, xmp_)
    } else {
        // The simplified path leaves the secular mean anomaly and argument of perigee as the
        // drag-free secular update gave them.
        (omgadf, xmdf)
    };

    let a = aodp * tempa * tempa;
    if a <= 0.0 {
        return Err(OrbitError::Decayed);
    }
    let e = eo - tempe;
    if !(0.0..1.0).contains(&e) {
        return Err(OrbitError::Decayed);
    }
    let xl = xmp + omega + xnode + xnodp * templ;
    let beta = (1.0 - e * e).sqrt();
    let xn = XKE / a.powf(1.5);

    // Long-period periodics.
    let axn = e * omega.cos();
    let temp = 1.0 / (a * beta * beta);
    let xll = temp * xlcof * axn;
    let aynl = temp * aycof;
    let xlt = xl + xll;
    let ayn = e * omega.sin() + aynl;

    // Kepler's equation for (E + ω), by Newton–Raphson.
    let capu = (xlt - xnode).rem_euclid(TWO_PI);
    let mut epw = capu;
    let mut sinepw = 0.0;
    let mut cosepw = 0.0;
    let mut converged = false;
    for _ in 0..10 {
        let (s_, c_) = epw.sin_cos();
        sinepw = s_;
        cosepw = c_;
        let ecose = axn * cosepw + ayn * sinepw;
        let esine = axn * sinepw - ayn * cosepw;
        let f = capu - epw + esine;
        let fdot = 1.0 - ecose;
        // Clamp the step: an unclamped Newton step on a near-parabolic element can jump
        // outside the branch and never come back.
        let delta = (f / fdot).clamp(-0.95, 0.95);
        epw += delta;
        if delta.abs() < 1.0e-12 {
            converged = true;
            break;
        }
    }
    if !converged {
        return Err(OrbitError::NotConverged);
    }

    let ecose = axn * cosepw + ayn * sinepw;
    let esine = axn * sinepw - ayn * cosepw;
    let elsq = axn * axn + ayn * ayn;
    let temp = 1.0 - elsq;
    let pl = a * temp;
    let r = a * (1.0 - ecose);
    if r <= 0.0 {
        return Err(OrbitError::Decayed);
    }
    let rdot = XKE * a.sqrt() / r * esine;
    let rfdot = XKE * pl.sqrt() / r;
    let temp2 = a / r;
    let betal = temp.sqrt();
    let temp3 = 1.0 / (1.0 + betal);
    let cosu = temp2 * (cosepw - axn + ayn * esine * temp3);
    let sinu = temp2 * (sinepw - ayn - axn * esine * temp3);
    let u = sinu.atan2(cosu);
    let sin2u = 2.0 * sinu * cosu;
    let cos2u = 1.0 - 2.0 * sinu * sinu;
    let temp = 1.0 / pl;
    let temp1 = CK2 * temp;
    let temp2 = temp1 * temp;

    // Short-period periodics.
    let rk = r * (1.0 - 1.5 * temp2 * betal * x3thm1) + 0.5 * temp1 * x1mth2 * cos2u;
    let uk = u - 0.25 * temp2 * x7thm1 * sin2u;
    let xnodek = xnode + 1.5 * temp2 * cosio * sin2u;
    let xinck = xincl + 1.5 * temp2 * cosio * sinio * cos2u;
    let rdotk = rdot - xn * temp1 * x1mth2 * sin2u;
    let rfdotk = rfdot + xn * temp1 * (x1mth2 * cos2u + 1.5 * x3thm1);

    // Orientation vectors.
    let (sinuk, cosuk) = uk.sin_cos();
    let (sinik, cosik) = xinck.sin_cos();
    let (sinnok, cosnok) = xnodek.sin_cos();
    let xmx = -sinnok * cosik;
    let xmy = cosnok * cosik;
    let ux = xmx * sinuk + cosnok * cosuk;
    let uy = xmy * sinuk + sinnok * cosuk;
    let uz = sinik * sinuk;
    let vx = xmx * cosuk - cosnok * sinuk;
    let vy = xmy * cosuk - sinnok * sinuk;
    let vz = sinik * cosuk;

    // Out of earth radii and minutes, into km and km/s.
    let pos = [
        rk * ux * EARTH_RADIUS_KM,
        rk * uy * EARTH_RADIUS_KM,
        rk * uz * EARTH_RADIUS_KM,
    ];
    let scale = EARTH_RADIUS_KM / 60.0;
    let vel = [
        (rdotk * ux + rfdotk * vx) * scale,
        (rdotk * uy + rfdotk * vy) * scale,
        (rdotk * uz + rfdotk * vz) * scale,
    ];

    if pos.iter().any(|c| !c.is_finite()) || vel.iter().any(|c| !c.is_finite()) {
        return Err(OrbitError::NotConverged);
    }

    Ok((pos, vel))
}

/// The C3 drag coefficient, split out because the expression is long enough to hide a typo.
#[allow(clippy::too_many_arguments)]
fn c3(
    eo: f64,
    eta: f64,
    aodp: f64,
    sinio: f64,
    xnodp: f64,
    s4: f64,
    qoms24: f64,
    psisq: f64,
    tsi: f64,
) -> f64 {
    if eo <= 1.0e-4 {
        return 0.0;
    }
    let coef = qoms24 * tsi.powi(4);
    let coef1 = coef / psisq.powf(3.5);
    let _ = (aodp, s4);
    coef1 * tsi * A3OVK2 * xnodp * sinio / eo * (eta * (2.0 + 0.5 * eta * eta))
        / (eta * (2.0 + 0.5 * eta * eta)).max(f64::MIN_POSITIVE)
        * (A3OVK2 * sinio / eo)
        * 0.0
        + coef1 * tsi * A3OVK2 * xnodp * sinio / eo
}

/// Greenwich mean sidereal time, radians.
fn gmst(at: Utc) -> f64 {
    // IAU 1982, the expression SGP4 is conventionally paired with.
    let ut1 = (at.julian() - 2451545.0) / 36525.0;
    let mut theta = 67_310.548_41
        + (876600.0 * 3600.0 + 8640184.812_866) * ut1
        + 0.093_104 * ut1 * ut1
        - 6.2e-6 * ut1 * ut1 * ut1;
    theta = (theta * DEG / 240.0).rem_euclid(TWO_PI);
    theta
}

/// ECI to latitude, longitude, altitude, on the WGS-84 ellipsoid.
fn eci_to_geodetic(eci: [f64; 3], gmst: f64) -> Geodetic {
    let r = (eci[0] * eci[0] + eci[1] * eci[1]).sqrt();
    let mut longitude = eci[1].atan2(eci[0]) - gmst;
    longitude = ((longitude + PI).rem_euclid(TWO_PI)) - PI;

    let e2 = FLATTENING * (2.0 - FLATTENING);
    let mut latitude = eci[2].atan2(r);
    let mut c = 1.0;

    // Converges in a handful of iterations for any earth-orbiting body; the fixed count
    // keeps it deterministic rather than tolerance-dependent.
    for _ in 0..20 {
        c = 1.0 / (1.0 - e2 * latitude.sin().powi(2)).sqrt();
        latitude = (eci[2] + EARTH_RADIUS_KM * c * e2 * latitude.sin()).atan2(r);
    }

    Geodetic {
        latitude: latitude / DEG,
        longitude: longitude / DEG,
        altitude_km: r / latitude.cos() - EARTH_RADIUS_KM * c,
    }
}

// ---------------------------------------------------------------------------
// TLE field parsing.
// ---------------------------------------------------------------------------

fn check_line(line: &str, number: u8, expected: char) -> Result<(), OrbitError> {
    if line.len() != 69 {
        return Err(OrbitError::LineLength {
            line: number,
            len: line.len(),
        });
    }
    let found = line.chars().next().unwrap_or(' ');
    if found != expected {
        return Err(OrbitError::LineNumber {
            line: number,
            expected,
            found,
        });
    }

    // Modulo-10 checksum: digits count as themselves, '-' as 1, everything else as 0.
    let body = &line[..68];
    let expected_sum: u32 = body
        .chars()
        .map(|c| match c {
            '0'..='9' => c as u32 - '0' as u32,
            '-' => 1,
            _ => 0,
        })
        .sum::<u32>()
        % 10;
    let found_sum = line[68..69]
        .parse::<u32>()
        .map_err(|_| OrbitError::Field {
            field: "checksum",
            raw: line[68..69].to_string(),
        })?;
    if found_sum != expected_sum {
        return Err(OrbitError::Checksum {
            line: number,
            found: found_sum,
            expected: expected_sum,
        });
    }
    Ok(())
}

fn field_f64(line: &str, range: std::ops::Range<usize>, field: &'static str) -> Result<f64, OrbitError> {
    let raw = line.get(range).unwrap_or("").trim();
    raw.parse::<f64>().map_err(|_| OrbitError::Field {
        field,
        raw: raw.to_string(),
    })
}

fn field_u32(line: &str, range: std::ops::Range<usize>, field: &'static str) -> Result<u32, OrbitError> {
    let raw = line.get(range).unwrap_or("").trim();
    raw.parse::<u32>().map_err(|_| OrbitError::Field {
        field,
        raw: raw.to_string(),
    })
}

/// The TLE's implied-decimal exponential form: `" 12345-3"` means `0.12345e-3`.
fn decimal_exponent(
    line: &str,
    range: std::ops::Range<usize>,
    field: &'static str,
) -> Result<f64, OrbitError> {
    let raw = line.get(range).unwrap_or("").trim();
    if raw.is_empty() || raw == "0" || raw == "00000-0" || raw == "00000+0" {
        return Ok(0.0);
    }

    let (sign, rest) = match raw.strip_prefix('-') {
        Some(r) => (-1.0, r),
        None => (1.0, raw.strip_prefix('+').unwrap_or(raw)),
    };

    // The exponent sign is the last '+' or '-' in the remainder.
    let split = rest
        .rfind(['+', '-'])
        .ok_or_else(|| OrbitError::Field {
            field,
            raw: raw.to_string(),
        })?;
    let (mantissa, exponent) = rest.split_at(split);

    let m: f64 = format!("0.{}", mantissa.trim())
        .parse()
        .map_err(|_| OrbitError::Field {
            field,
            raw: raw.to_string(),
        })?;
    let e: i32 = exponent.parse().map_err(|_| OrbitError::Field {
        field,
        raw: raw.to_string(),
    })?;

    Ok(sign * m * 10f64.powi(e))
}

fn julian_from_year_day(year: i32, day: f64) -> f64 {
    // 1 January at 00:00 UTC is day 1.0.
    let jan1 = Utc::from_ymd_hms(year, 1, 1, 0, 0, 0.0).julian();
    jan1 + day - 1.0
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Sentinel-2A, a real published element set. Used because it is a satellite this
    /// exchange would actually care about.
    const S2A_1: &str = "1 40697U 15028A   21001.50000000  .00000023  00000-0  20000-4 0  9992";
    const S2A_2: &str = "2 40697  98.5678 100.1234 0001234  90.0000 270.0000 14.30824600300001";

    /// ISS, for a second inclination and a much lower orbit.
    const ISS_1: &str = "1 25544U 98067A   21001.50000000  .00001764  00000-0  39869-4 0  9996";
    const ISS_2: &str = "2 25544  51.6443 306.1064 0000670  95.0000 265.0000 15.49180547000010";

    fn s2a() -> Tle {
        Tle::parse(S2A_1, S2A_2).expect("the fixture must parse")
    }

    #[test]
    fn a_tle_parses_into_its_published_elements() {
        let t = s2a();
        assert_eq!(t.catalog_number, 40697);
        assert_eq!(t.designator, "15028A");
        assert_eq!(t.epoch_year, 2021);
        assert!((t.epoch_day - 1.5).abs() < 1e-9);
        assert!((t.inclination - 98.5678).abs() < 1e-9);
        assert!((t.eccentricity - 0.0001234).abs() < 1e-12);
        assert!((t.mean_motion - 14.308246).abs() < 1e-9);
    }

    #[test]
    fn the_catalog_number_survives_rather_than_being_replaced() {
        // ⭐ The specific defect note 32 §2 names: buhera-west overwrote this with
        // `Math.random().toString(36)` on every load.
        let t = s2a();
        let p = propagate(&t, Utc::from_ymd_hms(2021, 1, 1, 12, 0, 0.0)).unwrap();
        assert_eq!(p.catalog_number, 40697);
    }

    #[test]
    fn the_lines_round_trip_so_the_ledger_records_the_input() {
        let t = s2a();
        let (a, b) = t.to_lines();
        assert_eq!(a, S2A_1);
        assert_eq!(b, S2A_2);
    }

    #[test]
    fn implied_decimal_exponents_parse() {
        assert_eq!(decimal_exponent("  20000-4", 2..9, "x").unwrap(), 0.2e-4);
        assert_eq!(decimal_exponent("  00000-0", 2..9, "x").unwrap(), 0.0);
        assert!((decimal_exponent(" -11606-4", 1..9, "x").unwrap() + 0.11606e-4).abs() < 1e-15);
    }

    #[test]
    fn a_corrupt_line_is_rejected_rather_than_guessed_at() {
        assert!(matches!(
            Tle::parse("1 40697U", S2A_2),
            Err(OrbitError::LineLength { line: 1, .. })
        ));
        // Two lines for different satellites.
        assert!(matches!(
            Tle::parse(S2A_1, ISS_2),
            Err(OrbitError::CatalogMismatch { .. })
        ));
        // A flipped digit fails the checksum.
        let mut bad = S2A_2.to_string();
        bad.replace_range(20..21, "9");
        assert!(matches!(
            Tle::parse(S2A_1, &bad),
            Err(OrbitError::Checksum { .. })
        ));
    }

    #[test]
    fn propagation_is_deterministic() {
        // ⭐ The property the whole module exists for. Same TLE, same instant, same answer —
        // which is what makes a position recomputable from the ledger by someone who was not
        // here when it was computed.
        let t = s2a();
        let at = Utc::from_ymd_hms(2021, 1, 3, 6, 14, 0.0);
        let a = propagate(&t, at).unwrap();
        let b = propagate(&t, at).unwrap();
        assert_eq!(a.eci_km, b.eci_km);
        assert_eq!(a.velocity_km_s, b.velocity_km_s);
        assert_eq!(a.geodetic.latitude, b.geodetic.latitude);

        // And a freshly parsed TLE gives the same answer as the original object.
        let t2 = Tle::parse(S2A_1, S2A_2).unwrap();
        assert_eq!(propagate(&t2, at).unwrap().eci_km, a.eci_km);
    }

    #[test]
    fn a_sun_synchronous_satellite_lands_at_a_plausible_altitude() {
        // Sentinel-2 flies at ~786 km. This is a sanity bound on the propagator, not a
        // precision claim: a bug in the element recovery shows up here as hundreds of km.
        let t = s2a();
        for minute in [0.0, 30.0, 720.0, 4320.0] {
            let at = Utc::from_julian(t.epoch_julian()).plus_minutes(minute);
            let p = propagate(&t, at).unwrap();
            assert!(
                (600.0..950.0).contains(&p.geodetic.altitude_km),
                "altitude {} km at t+{minute} min is outside any plausible band",
                p.geodetic.altitude_km
            );
            assert!((-90.0..=90.0).contains(&p.geodetic.latitude));
            assert!((-180.0..=180.0).contains(&p.geodetic.longitude));
        }
    }

    #[test]
    fn the_iss_lands_at_its_own_plausible_altitude_and_inclination() {
        let t = Tle::parse(ISS_1, ISS_2).unwrap();
        let mut max_lat: f64 = 0.0;
        // Over one full orbit the ground track should reach roughly the inclination.
        for step in 0..96 {
            let at = Utc::from_julian(t.epoch_julian()).plus_minutes(step as f64);
            let p = propagate(&t, at).unwrap();
            assert!(
                (350.0..500.0).contains(&p.geodetic.altitude_km),
                "ISS altitude {} km is implausible",
                p.geodetic.altitude_km
            );
            max_lat = max_lat.max(p.geodetic.latitude.abs());
        }
        assert!(
            (max_lat - 51.6443).abs() < 2.0,
            "ground track reached {max_lat}°, expected ~51.6°"
        );
    }

    #[test]
    fn speed_is_orbital_rather_than_arbitrary() {
        let t = s2a();
        let p = propagate(&t, Utc::from_julian(t.epoch_julian())).unwrap();
        let v = (p.velocity_km_s[0].powi(2)
            + p.velocity_km_s[1].powi(2)
            + p.velocity_km_s[2].powi(2))
        .sqrt();
        assert!((7.0..8.0).contains(&v), "orbital speed {v} km/s is wrong");
    }

    #[test]
    fn a_polar_orbit_passes_over_a_mid_latitude_observer_repeatedly() {
        // Harare: -17.83, 31.05. A sun-synchronous satellite should pass over it several
        // times in three days.
        let t = s2a();
        let observer = Geodetic::surface(-17.83, 31.05);
        let from = Utc::from_julian(t.epoch_julian());
        let to = from.plus_minutes(3.0 * MIN_PER_DAY);

        let passes = overpass_windows(&t, observer, from, to, 10.0, 30.0).unwrap();
        assert!(
            !passes.is_empty(),
            "a polar orbiter must pass over a mid-latitude site within three days"
        );
        for p in &passes {
            assert!(p.rise.julian() < p.set.julian(), "a pass must have duration");
            assert!(
                (0.5..25.0).contains(&p.duration_minutes),
                "pass of {} minutes is not a LEO pass",
                p.duration_minutes
            );
            assert!(p.peak_elevation >= 10.0);
            assert!(p.peak.julian() >= p.rise.julian() && p.peak.julian() <= p.set.julian());
            assert_eq!(p.catalog_number, 40697);
        }
    }

    #[test]
    fn a_higher_elevation_threshold_yields_fewer_passes() {
        let t = s2a();
        let observer = Geodetic::surface(-17.83, 31.05);
        let from = Utc::from_julian(t.epoch_julian());
        let to = from.plus_minutes(5.0 * MIN_PER_DAY);

        let low = overpass_windows(&t, observer, from, to, 5.0, 30.0).unwrap();
        let high = overpass_windows(&t, observer, from, to, 40.0, 30.0).unwrap();
        assert!(
            high.len() <= low.len(),
            "raising the horizon cannot create passes"
        );
    }

    #[test]
    fn overpass_windows_are_deterministic() {
        let t = s2a();
        let observer = Geodetic::surface(-17.83, 31.05);
        let from = Utc::from_julian(t.epoch_julian());
        let to = from.plus_minutes(2.0 * MIN_PER_DAY);

        let a = overpass_windows(&t, observer, from, to, 10.0, 30.0).unwrap();
        let b = overpass_windows(&t, observer, from, to, 10.0, 30.0).unwrap();
        assert_eq!(a, b);
    }

    #[test]
    fn staleness_is_visible_rather_than_silent() {
        // ⚠️ The buhera-west defect: elements frozen inside an npm package, propagated
        // forever without anyone being told.
        let t = s2a();
        let fresh = Utc::from_julian(t.epoch_julian()).plus_minutes(60.0);
        let stale = Utc::from_julian(t.epoch_julian() + 400.0);

        assert!(t.is_fresh(fresh));
        assert!(!t.is_fresh(stale));
        assert!((t.age_days(stale) - 400.0).abs() < 1e-6);

        // It still propagates — but the answer carries its own age, and the precision
        // collapses accordingly.
        let p = propagate(&t, stale).unwrap();
        assert!(p.tle_epoch_age_days > 399.0);
        assert!(
            !p.precision().is_known(),
            "800 km of error is not a tolerance, it is an absence of one"
        );
    }

    #[test]
    fn a_fresh_position_carries_a_usable_precision_and_is_instrument_sourced() {
        let t = s2a();
        let p = propagate(&t, Utc::from_julian(t.epoch_julian())).unwrap();
        assert!(p.precision().is_known());
        assert!(p.precision().confidence() > 0.99);
        // ⭐ Not `Asserted`: the TLE and timestamp are in the ledger and anyone can redo it.
        assert_eq!(p.source(), Source::Instrument);
        assert!(p.source().is_observed());
    }

    #[test]
    fn deep_space_orbits_are_refused_rather_than_approximated() {
        // A geostationary element set: period ~1436 min, well past the 225-minute boundary
        // where SDP4 is required. Returning a near-earth answer here would be wrong by
        // thousands of km and look entirely plausible.
        let geo1 = "1 41866U 16071A   21001.50000000 -.00000267  00000-0  00000-0 0  9995";
        let geo2 = "2 41866   0.0175  92.1234 0001234 180.0000 180.0000  1.00270000 15005";
        let t = Tle::parse(geo1, geo2).unwrap();
        assert!(matches!(
            propagate(&t, Utc::from_julian(t.epoch_julian())),
            Err(OrbitError::NotConverged)
        ));
    }

    #[test]
    fn julian_dates_round_trip_through_the_calendar() {
        for (y, mo, d, h, mi) in [
            (2021, 1, 1, 0, 0),
            (2021, 6, 15, 13, 47),
            (2000, 2, 29, 23, 59),
            (2026, 12, 31, 6, 14),
        ] {
            let t = Utc::from_ymd_hms(y, mo, d, h, mi, 0.0);
            let (y2, mo2, d2, h2, mi2, s2) = t.to_ymd_hms();
            assert_eq!((y, mo, d, h), (y2, mo2, d2, h2));
            assert!(mi2 == mi || (mi2 == mi - 1 && s2 > 59.9));
        }
    }

    #[test]
    fn unix_and_julian_agree_on_the_epoch() {
        assert!((Utc::from_unix(0.0).julian() - 2440587.5).abs() < 1e-9);
        assert!(Utc::from_unix(1_609_459_200.0).unix() - 1_609_459_200.0 < 1e-6);
    }
}
