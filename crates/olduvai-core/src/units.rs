//! Unit types.
//!
//! A miller charges per tonne milled, a transporter per tonne-kilometre, a supplier per
//! bag, storage per tonne-day. Four unit systems meet inside one coalition, and the
//! arithmetic that combines them is exactly the arithmetic that would silently *succeed*
//! on a mismatch. See `notes/30-programming-structure.md` §2.1.
//!
//! So the quantities here are distinct types with no `Add` between them. `Tonnes +
//! TonneKm` is a compile error, not a runtime check — there is no code path in which it
//! can be reached at all.
//!
//! Combining across units is possible, but only through an explicit named operation
//! (`Tonnes::over(Km) -> TonneKm`) where the reader can see the dimensional step happen.

use serde::{Deserialize, Serialize};
use std::fmt;
use std::ops::{Add, Mul, Sub};

/// Declares a scalar quantity carrying a unit.
///
/// Each invocation produces a distinct type. `Add`/`Sub` are implemented only
/// within a type, and scaling by a bare `f64` is allowed because it is dimensionless.
macro_rules! quantity {
    ($(#[$meta:meta])* $name:ident, $symbol:literal) => {
        $(#[$meta])*
        #[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Serialize, Deserialize)]
        #[serde(transparent)]
        pub struct $name(pub f64);

        impl $name {
            pub const ZERO: Self = Self(0.0);

            /// The unit symbol, for display and for the API's `unit` field.
            pub const SYMBOL: &'static str = $symbol;

            #[inline]
            pub fn value(self) -> f64 {
                self.0
            }

            /// True when the quantity is finite and non-negative.
            ///
            /// Negative quantities are not meaningful for any unit in this system:
            /// there is no negative tonnage and no negative distance.
            #[inline]
            pub fn is_valid(self) -> bool {
                self.0.is_finite() && self.0 >= 0.0
            }
        }

        impl Add for $name {
            type Output = Self;
            #[inline]
            fn add(self, rhs: Self) -> Self {
                Self(self.0 + rhs.0)
            }
        }

        impl Sub for $name {
            type Output = Self;
            #[inline]
            fn sub(self, rhs: Self) -> Self {
                Self(self.0 - rhs.0)
            }
        }

        /// Scaling by a dimensionless factor preserves the unit.
        impl Mul<f64> for $name {
            type Output = Self;
            #[inline]
            fn mul(self, rhs: f64) -> Self {
                Self(self.0 * rhs)
            }
        }

        impl std::iter::Sum for $name {
            fn sum<I: Iterator<Item = Self>>(iter: I) -> Self {
                iter.fold(Self::ZERO, |a, b| a + b)
            }
        }

        impl fmt::Display for $name {
            fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                write!(f, "{} {}", self.0, $symbol)
            }
        }
    };
}

quantity!(
    /// Mass of produce, in tonnes.
    Tonnes,
    "t"
);

quantity!(
    /// Distance, in kilometres.
    Km,
    "km"
);

quantity!(
    /// Haulage: mass moved over distance. What a transporter charges against.
    TonneKm,
    "t·km"
);

quantity!(
    /// Storage: mass held over time. What a warehouse charges against.
    TonneDay,
    "t·day"
);

quantity!(
    /// Duration, in days.
    Days,
    "day"
);

quantity!(
    /// Count of bags. Deliberately *not* convertible to `Tonnes`: bag mass varies by
    /// crop, moisture and filling practice, so any fixed conversion factor here would be
    /// an authored assumption hiding inside a unit type. If a participant declares a bag
    /// mass, that is a field on their entry with its own provenance — not a constant.
    Bags,
    "bag"
);

impl Tonnes {
    /// Mass moved over a distance.
    #[inline]
    pub fn over(self, distance: Km) -> TonneKm {
        TonneKm(self.0 * distance.0)
    }

    /// Mass held for a duration.
    #[inline]
    pub fn held_for(self, duration: Days) -> TonneDay {
        TonneDay(self.0 * duration.0)
    }
}

/// The unit of a quantity, as carried on the wire.
///
/// The API sends `{value, unit, source, precision}` per field
/// (`notes/30-programming-structure.md` §5.3); this is the `unit`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Unit {
    Tonnes,
    Km,
    TonneKm,
    TonneDay,
    Days,
    Bags,
}

impl Unit {
    pub fn symbol(self) -> &'static str {
        match self {
            Unit::Tonnes => Tonnes::SYMBOL,
            Unit::Km => Km::SYMBOL,
            Unit::TonneKm => TonneKm::SYMBOL,
            Unit::TonneDay => TonneDay::SYMBOL,
            Unit::Days => Days::SYMBOL,
            Unit::Bags => Bags::SYMBOL,
        }
    }
}

impl fmt::Display for Unit {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.symbol())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn addition_within_a_unit_works() {
        assert_eq!(Tonnes(2.0) + Tonnes(3.0), Tonnes(5.0));
        assert_eq!(TonneKm(1.5) + TonneKm(0.5), TonneKm(2.0));
    }

    #[test]
    fn dimensional_products_are_explicit() {
        assert_eq!(Tonnes(20.0).over(Km(450.0)), TonneKm(9000.0));
        assert_eq!(Tonnes(20.0).held_for(Days(30.0)), TonneDay(600.0));
    }

    #[test]
    fn summing_a_coalitions_legs_stays_in_one_unit() {
        let legs = [TonneKm(100.0), TonneKm(250.0), TonneKm(75.0)];
        assert_eq!(legs.into_iter().sum::<TonneKm>(), TonneKm(425.0));
    }

    #[test]
    fn scaling_by_a_dimensionless_factor_preserves_the_unit() {
        assert_eq!(Tonnes(10.0) * 1.5, Tonnes(15.0));
    }

    #[test]
    fn negative_and_nonfinite_quantities_are_invalid() {
        assert!(Tonnes(20.0).is_valid());
        assert!(Tonnes::ZERO.is_valid());
        assert!(!Tonnes(-1.0).is_valid());
        assert!(!Tonnes(f64::NAN).is_valid());
        assert!(!Tonnes(f64::INFINITY).is_valid());
    }

    #[test]
    fn unit_symbols_are_stable_on_the_wire() {
        // These strings appear in API responses; changing one is a breaking change.
        assert_eq!(Unit::Tonnes.symbol(), "t");
        assert_eq!(Unit::TonneKm.symbol(), "t·km");
        assert_eq!(Unit::TonneDay.symbol(), "t·day");
        assert_eq!(Unit::Bags.symbol(), "bag");
    }
}

/// Mixed-unit arithmetic does not compile. **This is the point of the module.**
///
/// These are `compile_fail` doctests rather than ordinary tests because the property being
/// asserted is the *absence* of a code path: there is no runtime in which `Tonnes +
/// TonneKm` can be evaluated, so no runtime test can observe it being rejected. Only the
/// compiler can, and only by failing.
///
/// ⚠️ They must live on a public item — a `compile_fail` block on a private item inside
/// `#[cfg(test)] mod tests` is silently never collected, and the guarantee quietly lapses.
///
/// A mass is not a haulage:
///
/// ```compile_fail
/// use olduvai_core::units::{Tonnes, TonneKm};
/// let _ = Tonnes(20.0) + TonneKm(9000.0);
/// ```
///
/// A mass is not a distance:
///
/// ```compile_fail
/// use olduvai_core::units::{Tonnes, Km};
/// let _ = Tonnes(20.0) + Km(450.0);
/// ```
///
/// Bags are not tonnes, since no fixed conversion exists:
///
/// ```compile_fail
/// use olduvai_core::units::{Bags, Tonnes};
/// let _ = Bags(200.0) + Tonnes(20.0);
/// ```
///
/// Storage is not haulage, though both are a mass times something:
///
/// ```compile_fail
/// use olduvai_core::units::{TonneDay, TonneKm};
/// let _ = TonneDay(600.0) + TonneKm(9000.0);
/// ```
///
/// And the arithmetic that *should* work still does:
///
/// ```
/// use olduvai_core::units::{Days, Km, Tonnes};
/// assert_eq!(Tonnes(20.0).over(Km(450.0)).value(), 9000.0);
/// assert_eq!(Tonnes(20.0).held_for(Days(30.0)).value(), 600.0);
/// assert_eq!((Tonnes(2.0) + Tonnes(3.0)).value(), 5.0);
/// ```
#[derive(Debug)]
pub struct DimensionalSafety;
