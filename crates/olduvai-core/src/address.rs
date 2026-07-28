//! Addresses: interleaved ternary strings over `(S_k, S_t, S_e)`.
//!
//! An address is produced by repeatedly subdividing the unit cube into thirds, one axis
//! at a time, cycling `S_k → S_t → S_e`. Trit `j` records which third of axis
//! `Axis::for_trit(j)` the point falls in, given all the previous trits.
//!
//! Two consequences the design leans on:
//!
//! - **The encoding is the index.** There is no separate indexing step; walking the trits
//!   *is* walking the trie. See `notes/29-the-empty-dictionary.md` §1.
//! - **Truncating is coarsening.** A `k`-trit prefix names a cell of side `3^(-⌈k/3⌉)` on
//!   the axes it has refined. Fuzzy search is prefix truncation, and the depth is the
//!   resolution knob — an operational quantity, not a tuned threshold.

use crate::coords::{Axis, Coordinates};
use serde::{Deserialize, Serialize};
use std::fmt;

/// One ternary digit: which third of the current interval.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[repr(u8)]
pub enum Trit {
    Low = 0,
    Mid = 1,
    High = 2,
}

impl Trit {
    pub const ALL: [Trit; 3] = [Trit::Low, Trit::Mid, Trit::High];

    #[inline]
    pub fn index(self) -> usize {
        self as usize
    }

    #[inline]
    pub fn from_index(i: usize) -> Option<Trit> {
        match i {
            0 => Some(Trit::Low),
            1 => Some(Trit::Mid),
            2 => Some(Trit::High),
            _ => None,
        }
    }
}

impl fmt::Display for Trit {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.index())
    }
}

/// The number of trits an address carries at full resolution.
///
/// 12 gives 4 refinements per axis, i.e. cells of side `3^-4 ≈ 0.0123`. The source paper
/// resolved all 39 of its compounds uniquely at depth 12.
pub const FULL_DEPTH: usize = 12;

/// An interleaved ternary address.
///
/// Ordering is lexicographic by trit, which makes a subtree a contiguous range — used by
/// the query engine to enumerate a cell.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(try_from = "String", into = "String")]
pub struct Address(Vec<Trit>);

/// A string that is not a valid address.
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum ParseAddressError {
    #[error("invalid trit {found:?} at position {position}: expected '0', '1' or '2'")]
    InvalidTrit { position: usize, found: char },
    #[error("address is {length} trits, exceeding the maximum of {max}")]
    TooLong { length: usize, max: usize },
}

impl Address {
    /// The empty address — the trie root. Names the whole cube.
    pub const fn root() -> Self {
        Address(Vec::new())
    }

    /// Encode a point to `depth` trits.
    ///
    /// This is the whole encoder. Each step narrows the interval on one axis to the third
    /// containing the point, then moves to the next axis.
    pub fn encode(coords: Coordinates, depth: usize) -> Address {
        // Current interval per axis; all start as the full [0,1].
        let mut lo = [0.0f64; 3];
        let mut hi = [1.0f64; 3];
        let mut trits = Vec::with_capacity(depth);

        for j in 0..depth {
            let axis = Axis::for_trit(j);
            let a = axis as usize;
            let value = coords.get(axis);
            let third = (hi[a] - lo[a]) / 3.0;

            // Which third? The clamp matters: a point exactly at the interval's top edge
            // computes index 3, which is off the end. It belongs in the top third.
            let raw = ((value - lo[a]) / third).floor() as i64;
            let idx = raw.clamp(0, 2) as usize;

            lo[a] += third * idx as f64;
            hi[a] = lo[a] + third;

            trits.push(Trit::from_index(idx).expect("clamped to 0..=2"));
        }

        Address(trits)
    }

    /// Encode at [`FULL_DEPTH`].
    pub fn encode_full(coords: Coordinates) -> Address {
        Address::encode(coords, FULL_DEPTH)
    }

    /// The centre of the cell this address names.
    ///
    /// Decoding is lossy by construction: an address names a cell, not a point. The
    /// centre is the representative with the smallest worst-case error.
    pub fn decode(&self) -> Coordinates {
        let mut lo = [0.0f64; 3];
        let mut hi = [1.0f64; 3];

        for (j, trit) in self.0.iter().enumerate() {
            let a = Axis::for_trit(j) as usize;
            let third = (hi[a] - lo[a]) / 3.0;
            lo[a] += third * trit.index() as f64;
            hi[a] = lo[a] + third;
        }

        Coordinates::clamped(
            (lo[0] + hi[0]) / 2.0,
            (lo[1] + hi[1]) / 2.0,
            (lo[2] + hi[2]) / 2.0,
        )
        .expect("midpoints of subintervals of [0,1] are in [0,1]")
    }

    /// Number of trits.
    #[inline]
    pub fn depth(&self) -> usize {
        self.0.len()
    }

    #[inline]
    pub fn is_root(&self) -> bool {
        self.0.is_empty()
    }

    #[inline]
    pub fn trits(&self) -> &[Trit] {
        &self.0
    }

    /// How many times axis `axis` has been refined at this depth.
    pub fn refinements(&self, axis: Axis) -> usize {
        (0..self.depth())
            .filter(|&j| Axis::for_trit(j) == axis)
            .count()
    }

    /// The first `depth` trits. Coarsening — this is fuzzy search.
    ///
    /// A `depth` at or beyond the current one returns the address unchanged.
    pub fn truncate(&self, depth: usize) -> Address {
        Address(self.0[..depth.min(self.depth())].to_vec())
    }

    /// The parent cell: one trit shorter. `None` at the root.
    pub fn parent(&self) -> Option<Address> {
        if self.is_root() {
            None
        } else {
            Some(self.truncate(self.depth() - 1))
        }
    }

    /// Extend by one trit.
    pub fn child(&self, trit: Trit) -> Address {
        let mut trits = self.0.clone();
        trits.push(trit);
        Address(trits)
    }

    /// True when `self` names a cell containing `other`'s cell.
    ///
    /// The root contains everything; every address contains itself.
    pub fn contains(&self, other: &Address) -> bool {
        self.depth() <= other.depth() && self.0[..] == other.0[..self.depth()]
    }

    /// Length of the longest common prefix.
    ///
    /// **This is the similarity measure.** It is an ultrametric, so it needs no tuned
    /// threshold and no learned weights — see `notes/29-the-empty-dictionary.md` §3.
    pub fn common_prefix_len(&self, other: &Address) -> usize {
        self.0
            .iter()
            .zip(other.0.iter())
            .take_while(|(a, b)| a == b)
            .count()
    }

    /// The longest address containing both.
    pub fn common_ancestor(&self, other: &Address) -> Address {
        self.truncate(self.common_prefix_len(other))
    }

    /// Upper bound on the distance between two points sharing a `k`-trit prefix.
    ///
    /// With interleaving, `k` trits refine axis `a` exactly `⌈(k - a) / 3⌉` times, so the
    /// cell has side `3^(-that)` on each axis, and the diagonal bounds the distance.
    /// This is the property the encoder's round-trip test checks.
    pub fn cell_diameter(depth: usize) -> f64 {
        let sides: f64 = (0..3)
            .map(|a| {
                let refinements = (depth + 2 - a.min(depth)) / 3;
                let side = 3f64.powi(-(refinements as i32));
                side * side
            })
            .sum();
        sides.sqrt()
    }
}

impl fmt::Display for Address {
    /// Trits as digits, e.g. `"110"`. The root renders as `"·"`.
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if self.is_root() {
            return f.write_str("·");
        }
        for trit in &self.0 {
            write!(f, "{}", trit.index())?;
        }
        Ok(())
    }
}

impl std::str::FromStr for Address {
    type Err = ParseAddressError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        if s == "·" {
            return Ok(Address::root());
        }
        if s.chars().count() > FULL_DEPTH {
            return Err(ParseAddressError::TooLong {
                length: s.chars().count(),
                max: FULL_DEPTH,
            });
        }
        s.chars()
            .enumerate()
            .map(|(position, c)| {
                c.to_digit(3)
                    .and_then(|d| Trit::from_index(d as usize))
                    .ok_or(ParseAddressError::InvalidTrit { position, found: c })
            })
            .collect::<Result<Vec<_>, _>>()
            .map(Address)
    }
}

impl TryFrom<String> for Address {
    type Error = ParseAddressError;
    fn try_from(s: String) -> Result<Self, Self::Error> {
        s.parse()
    }
}

impl From<Address> for String {
    fn from(a: Address) -> String {
        a.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    fn coords(s_k: f64, s_t: f64, s_e: f64) -> Coordinates {
        Coordinates::new(s_k, s_t, s_e).unwrap()
    }

    #[test]
    fn the_origin_and_the_far_corner_encode_to_constant_trits() {
        assert_eq!(
            Address::encode(coords(0.0, 0.0, 0.0), 6).to_string(),
            "000000"
        );
        assert_eq!(
            Address::encode(coords(1.0, 1.0, 1.0), 6).to_string(),
            "222222"
        );
    }

    #[test]
    fn the_first_three_trits_are_one_refinement_of_each_axis() {
        // S_k low, S_t mid, S_e high.
        let a = Address::encode(coords(0.1, 0.5, 0.9), 3);
        assert_eq!(a.to_string(), "012");
    }

    #[test]
    fn interleaving_refines_the_axes_evenly() {
        let a = Address::encode(coords(0.4, 0.4, 0.4), 12);
        for axis in [Axis::Sk, Axis::St, Axis::Se] {
            assert_eq!(
                a.refinements(axis),
                4,
                "{axis} should be refined 4× at depth 12"
            );
        }
    }

    #[test]
    fn truncation_is_containment() {
        let full = Address::encode(coords(0.31, 0.62, 0.17), 12);
        for d in 0..=12 {
            let prefix = full.truncate(d);
            assert_eq!(prefix.depth(), d);
            assert!(
                prefix.contains(&full),
                "depth-{d} prefix must contain the full address"
            );
        }
    }

    #[test]
    fn the_root_contains_everything() {
        let root = Address::root();
        assert!(root.is_root());
        assert!(root.contains(&Address::encode(coords(0.7, 0.2, 0.4), 12)));
        assert!(root.contains(&root));
    }

    #[test]
    fn containment_is_not_symmetric() {
        let coarse: Address = "01".parse().unwrap();
        let fine: Address = "012".parse().unwrap();
        assert!(coarse.contains(&fine));
        assert!(!fine.contains(&coarse));
    }

    #[test]
    fn common_prefix_ranks_nearer_points_higher() {
        let query = Address::encode(coords(0.5, 0.5, 0.5), 12);
        let near = Address::encode(coords(0.505, 0.505, 0.505), 12);
        let far = Address::encode(coords(0.95, 0.05, 0.95), 12);

        assert!(
            query.common_prefix_len(&near) > query.common_prefix_len(&far),
            "longest-common-prefix must order the near point above the far one"
        );
    }

    #[test]
    fn parse_round_trips_through_display() {
        for s in ["", "0", "012", "210120", "222222222222"] {
            let expected = if s.is_empty() { "·" } else { s };
            let a: Address = if s.is_empty() {
                Address::root()
            } else {
                s.parse().unwrap()
            };
            assert_eq!(a.to_string(), expected);
        }
    }

    #[test]
    fn malformed_addresses_are_rejected_with_a_position() {
        assert_eq!(
            "01x2".parse::<Address>().unwrap_err(),
            ParseAddressError::InvalidTrit {
                position: 2,
                found: 'x'
            }
        );
        // '3' is a digit, but not a ternary one.
        assert!(matches!(
            "013".parse::<Address>().unwrap_err(),
            ParseAddressError::InvalidTrit {
                position: 2,
                found: '3'
            }
        ));
        assert!(matches!(
            "0000000000000".parse::<Address>().unwrap_err(),
            ParseAddressError::TooLong { length: 13, .. }
        ));
    }

    #[test]
    fn serde_uses_the_compact_string_form() {
        let a: Address = "0120".parse().unwrap();
        let json = serde_json::to_string(&a).unwrap();
        assert_eq!(json, r#""0120""#);
        assert_eq!(serde_json::from_str::<Address>(&json).unwrap(), a);
    }

    proptest! {
        /// Encoding then decoding lands within the cell it named.
        ///
        /// This is the distance-preservation property from
        /// `notes/30-programming-structure.md` §2.2.
        #[test]
        fn encode_decode_stays_within_the_cell(
            s_k in 0.0..=1.0f64,
            s_t in 0.0..=1.0f64,
            s_e in 0.0..=1.0f64,
            depth in 0usize..=FULL_DEPTH,
        ) {
            let original = coords(s_k, s_t, s_e);
            let recovered = Address::encode(original, depth).decode();
            let bound = Address::cell_diameter(depth);

            prop_assert!(
                original.distance(recovered) <= bound + 1e-9,
                "depth {depth}: distance {} exceeded cell diameter {bound}",
                original.distance(recovered)
            );
        }

        /// Determinism: the property the whole design rests on
        /// (`notes/30-programming-structure.md` §1).
        #[test]
        fn encoding_is_deterministic(
            s_k in 0.0..=1.0f64,
            s_t in 0.0..=1.0f64,
            s_e in 0.0..=1.0f64,
        ) {
            let c = coords(s_k, s_t, s_e);
            prop_assert_eq!(Address::encode_full(c), Address::encode_full(c));
        }

        /// Encoding at depth `d` equals encoding deeper and truncating to `d`.
        ///
        /// Without this, coarse and fine queries could disagree about which cell a
        /// participant is in.
        #[test]
        fn shallow_encoding_agrees_with_truncated_deep_encoding(
            s_k in 0.0..=1.0f64,
            s_t in 0.0..=1.0f64,
            s_e in 0.0..=1.0f64,
            depth in 0usize..=FULL_DEPTH,
        ) {
            let c = coords(s_k, s_t, s_e);
            prop_assert_eq!(
                Address::encode(c, depth),
                Address::encode_full(c).truncate(depth)
            );
        }

        /// Nearer points share at least as long a prefix. Monotonicity of the ranking.
        #[test]
        fn closer_points_never_share_a_shorter_prefix(
            base in 0.05..=0.95f64,
            delta in 0.0..=0.04f64,
        ) {
            let q = coords(base, base, base);
            let near = coords(base + delta * 0.1, base, base);
            let far = coords((base + delta + 0.3).min(1.0), base, base);

            let qa = Address::encode_full(q);
            prop_assert!(
                qa.common_prefix_len(&Address::encode_full(near))
                    >= qa.common_prefix_len(&Address::encode_full(far))
            );
        }

        /// Every trit is a valid ternary digit, and the address is exactly `depth` long.
        #[test]
        fn encoding_is_well_formed(
            s_k in 0.0..=1.0f64,
            s_t in 0.0..=1.0f64,
            s_e in 0.0..=1.0f64,
            depth in 0usize..=FULL_DEPTH,
        ) {
            let a = Address::encode(coords(s_k, s_t, s_e), depth);
            prop_assert_eq!(a.depth(), depth);
            prop_assert!(a.trits().iter().all(|t| t.index() < 3));
        }
    }
}
