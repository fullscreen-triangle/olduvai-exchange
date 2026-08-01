//! A reading carries its footprint the way a value carries its unit.
//!
//! # ⭐ The parallel is exact
//!
//! `notes/30-programming-structure.md` §5.3: a bare number about a consignment is a defect,
//! because **it cannot be recorded** — twenty of what? A [`crate::provenance::Field`] refuses
//! to exist without a [`crate::units::Unit`] for that reason.
//!
//! A bare number about a *location* is a defect for the adjacent reason: **it cannot be
//! attributed.** A soil-moisture retrieval of 0.23 m³/m³ is not a fact about a farm until you
//! know whether it was measured over that farm or over a 25 km disc containing that farm and
//! four hundred others.
//!
//! ⚠️ **This is not a display caveat, it is a structural one.** A reading whose footprint is
//! larger than the thing it is offered as evidence about is *by construction not a
//! distinguishing attribute*: it takes the same value for every participant inside the disc,
//! so it cannot separate any two of them. Feeding it into an address or a coalition does not
//! merely add noise — it adds a coordinate that is constant across the participants it is
//! supposed to distinguish, which is worse than adding nothing, because the resulting address
//! *looks* better resolved than it is.
//!
//! [`Resolution::admits`] is that test, performed by the code rather than written in a
//! sentence someone skims past. `notes/32-yokozuna-extraction.md` §7.
//!
//! # Where the idea came from
//!
//! buhera-west's `StripImage.jsx` invents `swathWidth: 50 + Math.random() * 200`. The number
//! is worthless; **naming the field was the contribution.** A swath has a width, and once you
//! have written that down you cannot go back to pretending a satellite reading is a point.

use crate::orbit::Geodetic;
use crate::provenance::{Field, Precision, Source};
use crate::units::Unit;
use serde::{Deserialize, Serialize};

/// Mean earth radius, km. Used only for great-circle distance, where the ellipsoid's
/// 0.3% flattening is far below the precision any of these footprints have.
const MEAN_EARTH_RADIUS_KM: f64 = 6371.0088;
const DEG: f64 = std::f64::consts::PI / 180.0;

/// The ground area a reading actually covers.
///
/// Every variant carries a characteristic width in km, because that is what
/// [`Resolution::admits`] compares against. The variants exist rather than a bare `f64`
/// because *how* a reading is spatially bounded changes what it can be attributed to: a
/// gridded product's cell has hard edges and a fixed position, whereas a specular reflection
/// has a soft centre that moves with the geometry.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "kind")]
pub enum Footprint {
    /// A physical instrument at a place: a rain gauge, a weighbridge, a soil probe.
    /// The width is the radius over which the reading is taken to hold, which for a point
    /// sensor is an authored judgement, not a property of the instrument.
    Point {
        /// ⚠️ Zero means "this reading is about this spot and nowhere else". That is a strong
        /// claim and usually the wrong one — a soil probe reads one auger hole.
        radius_km: f64,
    },
    /// A satellite swath: a strip, wide across track and long along it. Attribution is
    /// governed by the *across-track* width, which is the narrow dimension.
    Swath {
        across_track_km: f64,
        along_track_km: f64,
    },
    /// A resolution cell of a gridded product — a reanalysis grid, an interpolated surface.
    Cell { side_km: f64 },
    /// A GNSS-R specular point: a soft-edged ellipse whose size depends on surface roughness
    /// and geometry. CYGNSS is roughly 25 km × 5 km coherent.
    Specular {
        major_axis_km: f64,
        minor_axis_km: f64,
    },
    /// An administrative or catchment polygon, characterised by its extent. Used for things
    /// like district-level price reporting.
    Region {
        /// Greatest distance across the region.
        extent_km: f64,
    },
}

impl Footprint {
    /// ⭐ The one number attribution turns on: the smallest dimension over which the reading
    /// varies, in km.
    ///
    /// ⚠️ **The minimum, not the mean or the major axis.** A 25 km × 5 km specular ellipse can
    /// distinguish two farms 8 km apart *along its minor axis*, and a rule keyed to the major
    /// axis would throw that away. The reverse error — keying to the minimum on a
    /// long-and-thin swath — is the one that matters and is guarded here: a 290 km × 10 km
    /// Sentinel-1 strip is 10 km across track, and 10 km is the honest number.
    pub fn characteristic_km(self) -> f64 {
        match self {
            Footprint::Point { radius_km } => 2.0 * radius_km,
            Footprint::Swath {
                across_track_km, ..
            } => across_track_km,
            Footprint::Cell { side_km } => side_km,
            Footprint::Specular { minor_axis_km, .. } => minor_axis_km,
            Footprint::Region { extent_km } => extent_km,
        }
    }

    /// Is this a coherent description of an area?
    ///
    /// Rejects non-finite and negative dimensions. A zero-radius [`Footprint::Point`] is
    /// valid — it is a strong claim, not an incoherent one.
    pub fn is_valid(self) -> bool {
        let dims: &[f64] = &match self {
            Footprint::Point { radius_km } => [radius_km, 0.0],
            Footprint::Swath {
                across_track_km,
                along_track_km,
            } => [across_track_km, along_track_km],
            Footprint::Cell { side_km } => [side_km, 0.0],
            Footprint::Specular {
                major_axis_km,
                minor_axis_km,
            } => [major_axis_km, minor_axis_km],
            Footprint::Region { extent_km } => [extent_km, 0.0],
        };
        dims.iter().all(|d| d.is_finite() && *d >= 0.0)
    }

    /// A short human phrase, for the frontend's declaration line.
    pub fn describe(self) -> String {
        match self {
            Footprint::Point { radius_km: 0.0 } => "a single point".to_string(),
            Footprint::Point { radius_km } => format!("a point, held over {radius_km} km"),
            Footprint::Swath {
                across_track_km,
                along_track_km,
            } => format!("a {across_track_km} km × {along_track_km} km swath"),
            Footprint::Cell { side_km } => format!("a {side_km} km grid cell"),
            Footprint::Specular {
                major_axis_km,
                minor_axis_km,
            } => format!("a {major_axis_km} km × {minor_axis_km} km specular footprint"),
            Footprint::Region { extent_km } => format!("a region about {extent_km} km across"),
        }
    }
}

/// How much ground the thing being described occupies.
///
/// A farm gate is metres. A field is hundreds of metres. A district is tens of km. The
/// question [`Resolution::admits`] answers is whether a reading of a given footprint is
/// specific enough to be *about* a target of a given extent.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Extent {
    /// Greatest distance across the target, km.
    pub across_km: f64,
}

impl Extent {
    pub const fn km(across_km: f64) -> Self {
        Extent { across_km }
    }

    /// A specific place — a gate, a store, a weighbridge. 100 m.
    pub const POINT_OF_DELIVERY: Extent = Extent { across_km: 0.1 };
    /// A typical smallholding. ⚠️ Authored: 2 ha is roughly 140 m across, and the number
    /// below is deliberately generous rather than precise.
    pub const SMALLHOLDING: Extent = Extent { across_km: 0.5 };
    /// A commercial field or block.
    pub const FIELD: Extent = Extent { across_km: 2.0 };
    /// A ward or a catchment.
    pub const DISTRICT: Extent = Extent { across_km: 40.0 };
}

/// Whether a reading is specific enough to be attributed to a target.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Resolution {
    /// The footprint fits inside the target: the reading is about this thing.
    Resolves,
    /// The footprint is comparable to the target. The reading is about a neighbourhood that
    /// includes this thing, and about several others. Usable as context, not as a
    /// distinguishing attribute.
    Marginal,
    /// The footprint dwarfs the target. ⚠️ **This reading takes the same value for everyone
    /// inside it and therefore cannot distinguish this participant from any of them.**
    TooCoarse,
}

impl Resolution {
    /// ⭐ The test, and the whole point of the module.
    ///
    /// A reading resolves a target when its characteristic width is no larger than the
    /// target. It is marginal up to [`Resolution::MARGINAL_FACTOR`] times the target, and too
    /// coarse beyond that.
    ///
    /// ⚠️ The factor is authored and lives here rather than at a call site so raising it is a
    /// visible act. It is not a measurement and should never be presented as one.
    pub fn admits(footprint: Footprint, target: Extent) -> Resolution {
        let f = footprint.characteristic_km();
        let t = target.across_km;

        if !f.is_finite() || !t.is_finite() || t <= 0.0 {
            return Resolution::TooCoarse;
        }
        if f <= t {
            Resolution::Resolves
        } else if f <= t * Self::MARGINAL_FACTOR {
            Resolution::Marginal
        } else {
            Resolution::TooCoarse
        }
    }

    /// ⚠️ **Authored.** The width at which "about your field" becomes "about your area".
    /// Three is a judgement, not a finding: at 3× a target the reading covers roughly an
    /// order of magnitude more area, which is where the claim stops being about the target.
    pub const MARGINAL_FACTOR: f64 = 3.0;

    /// May this reading be used as a distinguishing attribute — one that affects an address
    /// or separates two participants?
    ///
    /// ⭐ Only [`Resolution::Resolves`]. Marginal readings are context: they can be shown,
    /// they can inform a person, and they must not move a coordinate.
    pub fn is_distinguishing(self) -> bool {
        matches!(self, Resolution::Resolves)
    }

    /// The sentence to show alongside the reading.
    pub fn declaration(self) -> &'static str {
        match self {
            Resolution::Resolves => "This reading covers your location specifically.",
            Resolution::Marginal => {
                "This reading covers your area, not your location specifically — it is context, \
                 not evidence about you."
            }
            Resolution::TooCoarse => {
                "This reading is far larger than your location. It has the same value for \
                 everyone inside it and says nothing that distinguishes you."
            }
        }
    }
}

/// A measurement of somewhere, with everything needed to say what it is about.
///
/// ⚠️ **Deliberately a separate type rather than a field on [`Field`].**
///
/// `Field` is pinned on the wire by `the_wire_shape_is_stable` in
/// [`crate::provenance`], and that pin is load-bearing: a `Field` is what an entry is made
/// of, and entries are what the ledger records. Adding an optional `footprint` there would
/// make every consignment tonnage carry a nullable spatial field it has no use for, and would
/// make the footprint *skippable* precisely where it matters — a reading with `footprint:
/// null` would deserialise happily and then be attributed to a farm.
///
/// So a `Reading` is a `Field` **plus** the two things a `Field` cannot express: where it was
/// taken and how much ground it covers. Both are required. There is no constructor that omits
/// them, which is the same discipline that stops a `Field` existing without a `Unit`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Reading {
    /// The measured value, with its unit, source and precision.
    pub field: Field,
    /// Where the reading is centred.
    pub at: Geodetic,
    /// ⭐ Required. The whole idea.
    pub footprint: Footprint,
}

impl Reading {
    /// A reading from an instrument or a third-party product.
    ///
    /// ⚠️ There is deliberately no `Reading::asserted`. In [`crate::provenance`],
    /// `Field::asserted` is *"the most convenient constructor, because it is the honest
    /// default for a newcomer"* — a participant saying what they have. That reasoning does
    /// not carry over: a participant does not assert a *footprint*. A spatial reading with no
    /// instrument behind it is a reading someone made up, and the API should not have a
    /// convenient shape for it. Build the `Field` yourself if you really mean it.
    pub fn new(value: f64, unit: Unit, source: Source, precision: Precision, at: Geodetic, footprint: Footprint) -> Reading {
        Reading {
            field: Field {
                value,
                unit,
                source,
                precision,
            },
            at,
            footprint,
        }
    }

    /// Does this reading resolve a target of the given extent at the given place?
    ///
    /// ⚠️ Two independent tests, and both must pass. A 300 m footprint is fine enough to
    /// resolve a field — but not *this* field if it was taken 40 km away. Distance is checked
    /// against the footprint's own radius, because a reading is about the ground it covers
    /// and nothing outside it.
    pub fn resolves(&self, target: Geodetic, extent: Extent) -> Resolution {
        let separation = great_circle_km(self.at, target);
        let reach = self.footprint.characteristic_km() / 2.0;

        // Outside the footprint entirely: it is not a reading about this place at any
        // resolution.
        if separation > reach + extent.across_km / 2.0 {
            return Resolution::TooCoarse;
        }
        Resolution::admits(self.footprint, extent)
    }

    /// ⭐ May this reading move an address or separate two participants?
    ///
    /// The guard the satellite rail needs before any real feed arrives. See the module doc for
    /// why a too-coarse reading is worse than no reading.
    pub fn is_distinguishing_for(&self, target: Geodetic, extent: Extent) -> bool {
        self.resolves(target, extent).is_distinguishing() && self.field.source.is_observed()
    }

    /// Confidence, further reduced when the reading does not resolve the target.
    ///
    /// ⚠️ Not zeroed. A marginal reading is real information about a real area, and zeroing
    /// it would say "this does not exist" when the truth is "this is not about you
    /// specifically". The factor is authored; see [`Reading::MARGINAL_DISCOUNT`].
    pub fn confidence_for(&self, target: Geodetic, extent: Extent) -> f64 {
        match self.resolves(target, extent) {
            Resolution::Resolves => self.field.confidence(),
            Resolution::Marginal => self.field.confidence() * Self::MARGINAL_DISCOUNT,
            Resolution::TooCoarse => 0.0,
        }
    }

    /// ⚠️ Authored, and part of `Φ_R` if it ever reaches ranking. Published with it.
    pub const MARGINAL_DISCOUNT: f64 = 0.5;
}

/// Great-circle distance between two points, km. Haversine.
///
/// Spherical rather than ellipsoidal on purpose: the 0.3% error is three orders of magnitude
/// below the coarseness of anything this module is comparing, and a geodesic solver would be
/// precision theatre.
pub fn great_circle_km(a: Geodetic, b: Geodetic) -> f64 {
    let (lat1, lat2) = (a.latitude * DEG, b.latitude * DEG);
    let dlat = lat2 - lat1;
    let dlon = (b.longitude - a.longitude) * DEG;

    let h = (dlat / 2.0).sin().powi(2) + lat1.cos() * lat2.cos() * (dlon / 2.0).sin().powi(2);
    2.0 * MEAN_EARTH_RADIUS_KM * h.sqrt().clamp(-1.0, 1.0).asin()
}

/// Footprints of instruments this exchange is likely to meet.
///
/// ⚠️ **Every one of these is a published specification, not a measurement we made.** They
/// are here so that a caller writing `KNOWN::CYGNSS` cannot accidentally write `25.0` and
/// have nobody know where it came from. The citation is the point; the number is secondary.
pub mod known {
    use super::Footprint;

    /// Sentinel-2 MSI, 10 m bands. ESA S2 User Handbook: 290 km swath, 10 m pixel.
    /// The footprint of a *pixel*, which is what a per-field retrieval uses.
    pub const SENTINEL_2_PIXEL: Footprint = Footprint::Cell { side_km: 0.01 };
    /// Sentinel-2 MSI, whole swath. ESA S2 User Handbook.
    pub const SENTINEL_2_SWATH: Footprint = Footprint::Swath {
        across_track_km: 290.0,
        along_track_km: 290.0,
    };
    /// Sentinel-1 IW mode. ESA S1 User Handbook: 250 km swath, 5 m × 20 m resolution.
    pub const SENTINEL_1_PIXEL: Footprint = Footprint::Cell { side_km: 0.02 };
    /// CYGNSS coherent specular footprint. Ruf et al., *CYGNSS Handbook* (2016):
    /// approximately 25 km × 5 km.
    pub const CYGNSS: Footprint = Footprint::Specular {
        major_axis_km: 25.0,
        minor_axis_km: 5.0,
    };
    /// SMAP L-band radiometer. NASA SMAP Handbook: 36 km gridded product.
    pub const SMAP_RADIOMETER: Footprint = Footprint::Cell { side_km: 36.0 };
    /// ERA5 reanalysis. ECMWF: 0.25° grid, ~31 km at the equator.
    pub const ERA5_CELL: Footprint = Footprint::Cell { side_km: 31.0 };
    /// A tipping-bucket rain gauge. ⚠️ The radius is authored: WMO siting guidance treats a
    /// gauge as representative over a few km in flat terrain, and not at all in convective
    /// rainfall. 5 km is generous.
    pub const RAIN_GAUGE: Footprint = Footprint::Point { radius_km: 5.0 };
    /// A soil probe: one auger hole. Representative of itself.
    pub const SOIL_PROBE: Footprint = Footprint::Point { radius_km: 0.0 };
}

#[cfg(test)]
mod tests {
    use super::*;

    fn harare() -> Geodetic {
        Geodetic::surface(-17.83, 31.05)
    }

    #[test]
    fn the_characteristic_width_of_a_swath_is_across_track() {
        // ⚠️ A 290 km × 290 km Sentinel-2 swath and a 250 km × 20 km Sentinel-1 strip are
        // both coarse, but the rule must key on the narrow dimension or a long thin strip
        // would look finer than it is.
        let strip = Footprint::Swath {
            across_track_km: 10.0,
            along_track_km: 290.0,
        };
        assert_eq!(strip.characteristic_km(), 10.0);
    }

    #[test]
    fn a_specular_footprint_is_judged_on_its_minor_axis() {
        // A 25 × 5 km ellipse can separate two farms 8 km apart along the short axis; keying
        // on the major axis would discard that.
        assert_eq!(known::CYGNSS.characteristic_km(), 5.0);
    }

    #[test]
    fn a_pixel_resolves_a_field_and_a_reanalysis_cell_does_not() {
        // ⭐ The headline case. A 10 m Sentinel-2 pixel is a fact about a field. A 31 km ERA5
        // cell is a fact about a district containing hundreds of them.
        assert_eq!(
            Resolution::admits(known::SENTINEL_2_PIXEL, Extent::FIELD),
            Resolution::Resolves
        );
        assert_eq!(
            Resolution::admits(known::ERA5_CELL, Extent::FIELD),
            Resolution::TooCoarse
        );
        // And the same cell is fine for a district.
        assert_eq!(
            Resolution::admits(known::ERA5_CELL, Extent::DISTRICT),
            Resolution::Resolves
        );
    }

    #[test]
    fn a_too_coarse_reading_is_never_distinguishing() {
        // ⚠️ The structural claim of the module: a reading that takes the same value for
        // everyone inside it cannot separate any two of them, so it must not reach an
        // address. Note 32 §7.
        assert!(!Resolution::admits(known::SMAP_RADIOMETER, Extent::SMALLHOLDING)
            .is_distinguishing());
        assert!(!Resolution::admits(known::CYGNSS, Extent::SMALLHOLDING).is_distinguishing());
        assert!(!Resolution::Marginal.is_distinguishing());
        assert!(Resolution::Resolves.is_distinguishing());
    }

    #[test]
    fn the_marginal_band_is_where_it_is_declared_to_be() {
        let target = Extent::km(10.0);
        assert_eq!(
            Resolution::admits(Footprint::Cell { side_km: 10.0 }, target),
            Resolution::Resolves
        );
        assert_eq!(
            Resolution::admits(Footprint::Cell { side_km: 25.0 }, target),
            Resolution::Marginal
        );
        assert_eq!(
            Resolution::admits(Footprint::Cell { side_km: 30.0 }, target),
            Resolution::Marginal
        );
        assert_eq!(
            Resolution::admits(Footprint::Cell { side_km: 30.001 }, target),
            Resolution::TooCoarse
        );
    }

    #[test]
    fn a_fine_reading_taken_somewhere_else_does_not_resolve_this_place() {
        // ⚠️ The trap this guards. A 10 m pixel is fine enough for anything — but a 10 m pixel
        // over Bulawayo is not a reading about Harare, and a rule that only compared widths
        // would say it was.
        let r = Reading::new(
            0.23,
            Unit::Tonnes,
            Source::Instrument,
            Precision::relative(0.05),
            Geodetic::surface(-20.15, 28.58), // Bulawayo, ~440 km away
            known::SENTINEL_2_PIXEL,
        );
        assert_eq!(r.resolves(harare(), Extent::FIELD), Resolution::TooCoarse);
        assert!(!r.is_distinguishing_for(harare(), Extent::FIELD));

        // The same instrument over the right place does resolve it.
        let here = Reading::new(
            0.23,
            Unit::Tonnes,
            Source::Instrument,
            Precision::relative(0.05),
            harare(),
            known::SENTINEL_2_PIXEL,
        );
        assert_eq!(here.resolves(harare(), Extent::FIELD), Resolution::Resolves);
        assert!(here.is_distinguishing_for(harare(), Extent::FIELD));
    }

    #[test]
    fn a_coarse_reading_centred_nearby_still_covers_the_target() {
        // A 36 km SMAP cell centred 10 km away does contain the farm — it is marginal or
        // coarse because of its width, not because of the offset.
        let r = Reading::new(
            0.23,
            Unit::Tonnes,
            Source::Instrument,
            Precision::relative(0.1),
            Geodetic::surface(-17.92, 31.05), // ~10 km south
            known::SMAP_RADIOMETER,
        );
        assert_eq!(r.resolves(harare(), Extent::DISTRICT), Resolution::Resolves);
        assert_eq!(r.resolves(harare(), Extent::FIELD), Resolution::TooCoarse);
    }

    #[test]
    fn an_asserted_reading_is_never_distinguishing_however_fine_its_footprint() {
        // ⭐ The two guards compose. Fine enough spatially, but nobody measured it — so it
        // still cannot move a coordinate. `Source::Asserted` is weight 0.0 per `provenance`.
        let r = Reading::new(
            0.23,
            Unit::Tonnes,
            Source::Asserted,
            Precision::relative(0.01),
            harare(),
            known::SOIL_PROBE,
        );
        assert_eq!(r.resolves(harare(), Extent::FIELD), Resolution::Resolves);
        assert!(!r.is_distinguishing_for(harare(), Extent::FIELD));
    }

    #[test]
    fn confidence_degrades_with_resolution_rather_than_collapsing() {
        let field = |at, fp| {
            Reading::new(
                0.23,
                Unit::Tonnes,
                Source::Instrument,
                Precision::relative(0.0),
                at,
                fp,
            )
        };
        let target = Extent::km(10.0);

        let fine = field(harare(), Footprint::Cell { side_km: 5.0 });
        let marginal = field(harare(), Footprint::Cell { side_km: 25.0 });
        let coarse = field(harare(), Footprint::Cell { side_km: 200.0 });

        assert_eq!(fine.confidence_for(harare(), target), fine.field.confidence());
        assert!(marginal.confidence_for(harare(), target) < fine.confidence_for(harare(), target));
        assert!(marginal.confidence_for(harare(), target) > 0.0);
        assert_eq!(coarse.confidence_for(harare(), target), 0.0);
    }

    #[test]
    fn distances_are_about_right() {
        // ⚠️ Harare to Bulawayo is ~366 km great-circle. The commonly quoted ~440 km is the
        // *road* distance, which is a different quantity — noted because using it here as a
        // bound would have declared a correct implementation broken.
        let d = great_circle_km(harare(), Geodetic::surface(-20.15, 28.58));
        assert!((360.0..372.0).contains(&d), "got {d} km");
        assert_eq!(great_circle_km(harare(), harare()), 0.0);

        // One degree of latitude is ~111 km anywhere.
        let d = great_circle_km(Geodetic::surface(0.0, 0.0), Geodetic::surface(1.0, 0.0));
        assert!((110.0..112.0).contains(&d), "got {d} km");
    }

    #[test]
    fn incoherent_footprints_are_rejected() {
        assert!(known::CYGNSS.is_valid());
        assert!(Footprint::Point { radius_km: 0.0 }.is_valid());
        assert!(!Footprint::Cell { side_km: -1.0 }.is_valid());
        assert!(!Footprint::Cell { side_km: f64::NAN }.is_valid());
        assert!(!Footprint::Swath {
            across_track_km: 10.0,
            along_track_km: f64::INFINITY
        }
        .is_valid());
    }

    #[test]
    fn a_reading_cannot_be_deserialised_without_its_footprint() {
        // ⭐ The structural half of the idea. `serde` has no default for `footprint`, so a
        // payload that omits it fails to parse rather than arriving with a null and being
        // attributed to a farm anyway. Same discipline as `Field` requiring a `Unit`.
        let without = r#"{"field":{"value":0.23,"unit":"tonnes","source":"instrument"},
                          "at":{"latitude":-17.83,"longitude":31.05,"altitude_km":0.0}}"#;
        assert!(serde_json::from_str::<Reading>(without).is_err());

        let with = r#"{"field":{"value":0.23,"unit":"tonnes","source":"instrument"},
                       "at":{"latitude":-17.83,"longitude":31.05,"altitude_km":0.0},
                       "footprint":{"kind":"cell","side_km":31.0}}"#;
        let r: Reading = serde_json::from_str(with).unwrap();
        assert_eq!(r.footprint, known::ERA5_CELL);
    }

    #[test]
    fn the_footprint_wire_shape_is_stable() {
        // ⚠️ These strings appear in API responses; changing one is a breaking change. Same
        // guarantee `units::unit_symbols_are_stable_on_the_wire` makes.
        let cases = [
            (
                known::ERA5_CELL,
                r#"{"kind":"cell","side_km":31.0}"#,
            ),
            (
                known::CYGNSS,
                r#"{"kind":"specular","major_axis_km":25.0,"minor_axis_km":5.0}"#,
            ),
            (
                Footprint::Point { radius_km: 5.0 },
                r#"{"kind":"point","radius_km":5.0}"#,
            ),
            (
                Footprint::Region { extent_km: 40.0 },
                r#"{"kind":"region","extent_km":40.0}"#,
            ),
        ];
        for (fp, expected) in cases {
            assert_eq!(serde_json::to_string(&fp).unwrap(), expected);
            assert_eq!(serde_json::from_str::<Footprint>(expected).unwrap(), fp);
        }
    }

    #[test]
    fn every_declaration_says_something_a_participant_can_act_on() {
        for r in [Resolution::Resolves, Resolution::Marginal, Resolution::TooCoarse] {
            assert!(!r.declaration().is_empty());
        }
        // The two non-resolving cases must both say plainly that this is not about you.
        assert!(Resolution::Marginal.declaration().contains("not"));
        assert!(Resolution::TooCoarse.declaration().contains("everyone"));
    }
}
