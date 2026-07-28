//! The ternary trie.
//!
//! Insertion follows the address's own trits, so there is no indexing step separate from
//! encoding. Only nodes along inserted paths are allocated — memory is `O(N·k)`, not
//! `O(3^k)`.
//!
//! Lookup is `O(k)` in the address depth, with `N` absent from the complexity entirely.
//! `N` affects storage, not search. The differential test at the bottom of this file
//! checks that claim against a linear scan rather than taking it on faith
//! (`notes/30-programming-structure.md` §2.2).

use crate::address::{Address, Trit};
use std::collections::BTreeMap;

/// A node. Children are boxed and allocated lazily.
#[derive(Debug, Clone, Default)]
struct Node<V> {
    children: [Option<Box<Node<V>>>; 3],
    /// Values whose address terminates here. A `Vec` because two entities with the same
    /// attributes legitimately share a cell — that is not a collision to resolve but the
    /// system working.
    values: Vec<V>,
    /// Values in this subtree, including this node. Maintained on insert so that subtree
    /// size is `O(1)` rather than a walk.
    subtree_count: usize,
}

impl<V> Node<V> {
    fn new() -> Self {
        Node {
            children: [None, None, None],
            values: Vec::new(),
            subtree_count: 0,
        }
    }

    fn child(&self, trit: Trit) -> Option<&Node<V>> {
        self.children[trit.index()].as_deref()
    }
}

/// A trie over addresses.
///
/// `V` is whatever is being addressed — a participant id, an offer, a listing.
#[derive(Debug, Clone)]
pub struct Trie<V> {
    root: Node<V>,
}

impl<V> Default for Trie<V> {
    fn default() -> Self {
        Self::new()
    }
}

/// Operations that do not need to hand out owned copies of the values.
///
/// Split from the `V: Clone` block below so that constructing and populating a trie works
/// for any `V` at all — only the query shapes that return `Vec<V>` need `Clone`.
impl<V> Trie<V> {
    pub fn new() -> Self {
        Trie { root: Node::new() }
    }

    /// Total values stored.
    #[inline]
    pub fn len(&self) -> usize {
        self.root.subtree_count
    }

    #[inline]
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    /// Insert a value at an address. `O(k)`.
    ///
    /// Note what this does *not* do: it does not move, rebalance, or re-key anything
    /// already present. A participant's address is a function of their own attributes, so
    /// insertion cannot disturb anyone else's position
    /// (`notes/29-the-empty-dictionary.md` §4a).
    pub fn insert(&mut self, address: &Address, value: V) {
        let mut node = &mut self.root;
        node.subtree_count += 1;

        for trit in address.trits() {
            node = node.children[trit.index()].get_or_insert_with(|| Box::new(Node::new()));
            node.subtree_count += 1;
        }

        node.values.push(value);
    }

    /// Walk to the node at `address`, if the path exists.
    fn node_at(&self, address: &Address) -> Option<&Node<V>> {
        let mut node = &self.root;
        for trit in address.trits() {
            node = node.child(*trit)?;
        }
        Some(node)
    }

    /// Values whose address is exactly this one. `O(k)`.
    pub fn get_exact(&self, address: &Address) -> &[V] {
        self.node_at(address)
            .map(|n| n.values.as_slice())
            .unwrap_or(&[])
    }

    /// True when anything is stored at or below `address`.
    pub fn is_occupied(&self, address: &Address) -> bool {
        self.node_at(address).is_some_and(|n| n.subtree_count > 0)
    }

    /// How many values lie at or below `address`. `O(k)` — the count is maintained on
    /// insert, not computed by walking the subtree.
    pub fn count_under(&self, address: &Address) -> usize {
        self.node_at(address).map_or(0, |n| n.subtree_count)
    }

    /// Occupancy per cell at a given depth, keyed by address.
    ///
    /// Diagnostic, for the calibration harness: this is what the cohesion test reads to
    /// decide whether a coordinate triple clusters things people already recognise
    /// (`notes/30-programming-structure.md` §3.1). A coordinate function that piles every
    /// participant into one cell has failed, and this is how that shows up.
    pub fn occupancy(&self, depth: usize) -> BTreeMap<Address, usize> {
        let mut out = BTreeMap::new();
        occupancy_at(&self.root, Address::root(), depth, &mut out);
        out
    }
}

/// Query shapes that hand out owned values, and so need `V: Clone`.
impl<V: Clone> Trie<V> {
    /// Every value at or below `address`.
    ///
    /// **This is fuzzy search.** Passing a truncated address widens the result set; the
    /// truncation depth is the resolution knob and needs no tuned threshold
    /// (`notes/29-the-empty-dictionary.md` §3).
    ///
    /// `O(k + m)` for `m` results.
    pub fn subtree(&self, address: &Address) -> Vec<V> {
        let mut out = Vec::new();
        if let Some(node) = self.node_at(address) {
            collect(node, &mut out);
        }
        out
    }

    /// Every `(address, value)` at or below `address`.
    pub fn subtree_with_addresses(&self, address: &Address) -> Vec<(Address, V)> {
        let mut out = Vec::new();
        if let Some(node) = self.node_at(address) {
            collect_addressed(node, address.clone(), &mut out);
        }
        out
    }

    /// Nearest-neighbour fallback.
    ///
    /// Walk toward `address`; on reaching an unoccupied node, back off to the deepest
    /// occupied prefix and return everything under it. An empty region is never "not
    /// found" — it degrades to a coarser answer.
    ///
    /// This is what lets a participant in a sparse region be reachable on their first day
    /// with no history (`notes/29-the-empty-dictionary.md` §4b). It falls out of the
    /// structure; there is no separate algorithm and no special case.
    ///
    /// Returns the depth actually reached alongside the results, because the caller needs
    /// to know how much resolution was given up in order to report confidence honestly.
    pub fn nearest(&self, address: &Address) -> Fallback<V> {
        let mut node = &self.root;
        let mut deepest = 0usize;
        let mut deepest_node = &self.root;

        for (depth, trit) in address.trits().iter().enumerate() {
            match node.child(*trit) {
                Some(next) if next.subtree_count > 0 => {
                    node = next;
                    deepest = depth + 1;
                    deepest_node = next;
                }
                _ => break,
            }
        }

        let mut values = Vec::new();
        collect(deepest_node, &mut values);

        Fallback {
            matched_depth: deepest,
            requested_depth: address.depth(),
            address: address.truncate(deepest),
            values,
        }
    }

    /// Values ranked by longest common prefix with `address`, descending.
    ///
    /// The ranking is the ultrametric from `notes/29-the-empty-dictionary.md` §3 — no
    /// tuned threshold and no learned weights. Ties keep insertion order, so the result
    /// is deterministic.
    ///
    /// Note this walks the whole trie: it is `O(N)` and exists for small result sets and
    /// for the differential tests. Real queries go through [`Trie::nearest`] or
    /// [`Trie::subtree`], which are the `O(k)` paths.
    pub fn ranked(&self, address: &Address) -> Vec<Ranked<V>> {
        let mut all = self.subtree_with_addresses(&Address::root());
        // Stable sort by descending shared prefix, so equal-prefix ties hold their order.
        all.sort_by(|a, b| {
            address
                .common_prefix_len(&b.0)
                .cmp(&address.common_prefix_len(&a.0))
        });
        all.into_iter()
            .map(|(addr, value)| Ranked {
                shared_prefix: address.common_prefix_len(&addr),
                address: addr,
                value,
            })
            .collect()
    }
}

fn collect<V: Clone>(node: &Node<V>, out: &mut Vec<V>) {
    out.extend(node.values.iter().cloned());
    for child in node.children.iter().flatten() {
        collect(child, out);
    }
}

fn collect_addressed<V: Clone>(node: &Node<V>, at: Address, out: &mut Vec<(Address, V)>) {
    for value in &node.values {
        out.push((at.clone(), value.clone()));
    }
    for (i, child) in node.children.iter().enumerate() {
        if let Some(child) = child {
            let trit = Trit::from_index(i).expect("children array has exactly 3 slots");
            collect_addressed(child, at.child(trit), out);
        }
    }
}

fn occupancy_at<V>(
    node: &Node<V>,
    at: Address,
    target_depth: usize,
    out: &mut BTreeMap<Address, usize>,
) {
    if at.depth() == target_depth {
        if node.subtree_count > 0 {
            out.insert(at, node.subtree_count);
        }
        return;
    }
    for (i, child) in node.children.iter().enumerate() {
        if let Some(child) = child {
            let trit = Trit::from_index(i).expect("children array has exactly 3 slots");
            occupancy_at(child, at.child(trit), target_depth, out);
        }
    }
}

/// The result of a fallback lookup.
#[derive(Debug, Clone, PartialEq)]
pub struct Fallback<V> {
    /// Depth actually reached before the trie ran out of occupied nodes.
    pub matched_depth: usize,
    /// Depth that was asked for.
    pub requested_depth: usize,
    /// The prefix these results share.
    pub address: Address,
    pub values: Vec<V>,
}

impl<V> Fallback<V> {
    /// True when the query resolved to the full requested depth.
    pub fn is_exact(&self) -> bool {
        self.matched_depth == self.requested_depth
    }

    /// Trits of resolution given up. Zero on an exact match.
    ///
    /// The caller reports this rather than hiding it: a result found by backing off six
    /// trits is a different kind of answer from an exact one, and saying so is the
    /// system naming its own gaps.
    pub fn resolution_lost(&self) -> usize {
        self.requested_depth.saturating_sub(self.matched_depth)
    }
}

/// A value with its similarity to the query.
#[derive(Debug, Clone, PartialEq)]
pub struct Ranked<V> {
    /// Trits shared with the query. Higher is nearer.
    pub shared_prefix: usize,
    pub address: Address,
    pub value: V,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::address::FULL_DEPTH;
    use crate::coords::Coordinates;
    use proptest::prelude::*;

    fn addr(s: &str) -> Address {
        s.parse().unwrap()
    }

    fn coords(s_k: f64, s_t: f64, s_e: f64) -> Coordinates {
        Coordinates::new(s_k, s_t, s_e).unwrap()
    }

    #[test]
    fn an_empty_trie_finds_nothing() {
        let trie: Trie<u32> = Trie::new();
        assert!(trie.is_empty());
        assert_eq!(trie.get_exact(&addr("012")), &[] as &[u32]);
        assert!(!trie.is_occupied(&addr("012")));
        assert_eq!(trie.subtree(&Address::root()), Vec::<u32>::new());
    }

    #[test]
    fn exact_lookup_returns_only_that_cell() {
        let mut trie = Trie::new();
        trie.insert(&addr("012"), "a");
        trie.insert(&addr("011"), "b");

        assert_eq!(trie.get_exact(&addr("012")), &["a"]);
        assert_eq!(trie.get_exact(&addr("011")), &["b"]);
        // A prefix is not an exact match — nothing terminates at "01".
        assert_eq!(trie.get_exact(&addr("01")), &[] as &[&str]);
    }

    #[test]
    fn co_located_entities_share_a_cell_rather_than_colliding() {
        let mut trie = Trie::new();
        trie.insert(&addr("012"), "first");
        trie.insert(&addr("012"), "second");

        // Two participants with identical attributes belong in the same cell.
        assert_eq!(trie.get_exact(&addr("012")), &["first", "second"]);
        assert_eq!(trie.len(), 2);
    }

    #[test]
    fn a_prefix_returns_its_whole_subtree() {
        let mut trie = Trie::new();
        trie.insert(&addr("000"), "a");
        trie.insert(&addr("001"), "b");
        trie.insert(&addr("010"), "c");
        trie.insert(&addr("100"), "d");

        let mut under_0 = trie.subtree(&addr("0"));
        under_0.sort();
        assert_eq!(under_0, vec!["a", "b", "c"]);

        let mut under_00 = trie.subtree(&addr("00"));
        under_00.sort();
        assert_eq!(under_00, vec!["a", "b"]);

        assert_eq!(trie.subtree(&addr("1")), vec!["d"]);
    }

    #[test]
    fn truncating_the_query_widens_the_result_monotonically() {
        let mut trie = Trie::new();
        for (i, a) in ["000000", "000001", "000100", "001000", "010000"]
            .iter()
            .enumerate()
        {
            trie.insert(&addr(a), i);
        }

        let full = addr("000000");
        let mut previous = 0;
        for depth in (0..=6).rev() {
            let n = trie.subtree(&full.truncate(depth)).len();
            assert!(
                n >= previous,
                "coarsening to depth {depth} must not shrink the result set"
            );
            previous = n;
        }
        // At the root, everything.
        assert_eq!(trie.subtree(&Address::root()).len(), 5);
    }

    #[test]
    fn counts_are_maintained_on_insert() {
        let mut trie = Trie::new();
        trie.insert(&addr("000"), 1);
        trie.insert(&addr("001"), 2);
        trie.insert(&addr("100"), 3);

        assert_eq!(trie.len(), 3);
        assert_eq!(trie.count_under(&addr("0")), 2);
        assert_eq!(trie.count_under(&addr("1")), 1);
        assert_eq!(trie.count_under(&addr("2")), 0);
        assert_eq!(trie.count_under(&Address::root()), 3);
    }

    #[test]
    fn fallback_backs_off_to_the_deepest_occupied_prefix() {
        let mut trie = Trie::new();
        trie.insert(&addr("000000"), "neighbour");

        // Diverges from the stored path at trit 3.
        let result = trie.nearest(&addr("000222"));

        assert_eq!(result.matched_depth, 3);
        assert_eq!(result.requested_depth, 6);
        assert_eq!(result.address, addr("000"));
        assert_eq!(result.values, vec!["neighbour"]);
        assert!(!result.is_exact());
        assert_eq!(result.resolution_lost(), 3);
    }

    #[test]
    fn fallback_on_an_exact_hit_gives_up_no_resolution() {
        let mut trie = Trie::new();
        trie.insert(&addr("012012"), "exact");

        let result = trie.nearest(&addr("012012"));
        assert!(result.is_exact());
        assert_eq!(result.resolution_lost(), 0);
        assert_eq!(result.values, vec!["exact"]);
    }

    #[test]
    fn a_newcomer_in_an_empty_region_still_gets_results() {
        // The bootstrap case: nothing near them, no history.
        let mut trie = Trie::new();
        trie.insert(&addr("222222"), "the only other participant");

        let result = trie.nearest(&addr("000000"));

        // Backs all the way off to the root rather than returning nothing.
        assert_eq!(result.matched_depth, 0);
        assert_eq!(result.address, Address::root());
        assert_eq!(result.values, vec!["the only other participant"]);
        assert_eq!(result.resolution_lost(), 6);
    }

    #[test]
    fn ranking_orders_by_shared_prefix() {
        let mut trie = Trie::new();
        trie.insert(&addr("000000"), "identical");
        trie.insert(&addr("000011"), "near");
        trie.insert(&addr("222222"), "far");

        let ranked = trie.ranked(&addr("000000"));
        assert_eq!(
            ranked.iter().map(|r| r.value).collect::<Vec<_>>(),
            vec!["identical", "near", "far"]
        );
        assert_eq!(ranked[0].shared_prefix, 6);
        assert_eq!(ranked[1].shared_prefix, 4);
        assert_eq!(ranked[2].shared_prefix, 0);
    }

    #[test]
    fn occupancy_reports_cells_for_the_cohesion_test() {
        let mut trie = Trie::new();
        trie.insert(&addr("000000"), 1);
        trie.insert(&addr("000111"), 2);
        trie.insert(&addr("110000"), 3);

        let cells = trie.occupancy(3);
        assert_eq!(cells.len(), 2, "two occupied cells at depth 3");
        assert_eq!(cells[&addr("000")], 2);
        assert_eq!(cells[&addr("110")], 1);
    }

    /// ⭐ Address independence: inserting a participant must not move anyone else.
    ///
    /// This is the fairness property from `notes/29-the-empty-dictionary.md` §4(a). In a
    /// learned embedding or a clustering catalogue a large new entrant silently re-ranks
    /// everyone; here it must not.
    #[test]
    fn inserting_does_not_move_existing_entries() {
        let mut trie = Trie::new();
        let existing: Vec<Address> = ["000000", "012012", "222111"]
            .iter()
            .map(|s| addr(s))
            .collect();
        for (i, a) in existing.iter().enumerate() {
            trie.insert(a, i);
        }

        let before: Vec<_> = existing
            .iter()
            .map(|a| trie.get_exact(a).to_vec())
            .collect();

        // A hundred newcomers land in the same region.
        for i in 0..100 {
            let c = coords(0.5 + (i as f64) * 0.001, 0.5, 0.5);
            trie.insert(&Address::encode_full(c), 1000 + i);
        }

        let after: Vec<_> = existing
            .iter()
            .map(|a| trie.get_exact(a).to_vec())
            .collect();
        assert_eq!(
            before, after,
            "existing entries must be untouched by insertion"
        );
    }

    proptest! {
        /// ⭐ The differential test note 30 §2.2 asks for: the trie must agree with a
        /// naive linear scan on every query, for every input.
        ///
        /// The `O(k)`-vs-`Θ(N)` claim is checkable, so it is checked rather than
        /// inherited from a paper.
        #[test]
        fn subtree_agrees_with_linear_scan(
            points in prop::collection::vec(
                (0.0..=1.0f64, 0.0..=1.0f64, 0.0..=1.0f64),
                0..40,
            ),
            query_depth in 0usize..=FULL_DEPTH,
            qk in 0.0..=1.0f64,
            qt in 0.0..=1.0f64,
            qe in 0.0..=1.0f64,
        ) {
            let entries: Vec<(Address, usize)> = points
                .iter()
                .enumerate()
                .map(|(i, &(k, t, e))| (Address::encode_full(coords(k, t, e)), i))
                .collect();

            let mut trie = Trie::new();
            for (a, v) in &entries {
                trie.insert(a, *v);
            }

            let query = Address::encode(coords(qk, qt, qe), query_depth);

            let mut from_trie = trie.subtree(&query);
            from_trie.sort_unstable();

            // What a scan over every entry would have returned.
            let mut from_scan: Vec<usize> = entries
                .iter()
                .filter(|(a, _)| query.contains(a))
                .map(|(_, v)| *v)
                .collect();
            from_scan.sort_unstable();

            prop_assert_eq!(from_trie, from_scan);
        }

        /// Counts agree with the scan too, and `len` is the total.
        #[test]
        fn counts_agree_with_linear_scan(
            points in prop::collection::vec(
                (0.0..=1.0f64, 0.0..=1.0f64, 0.0..=1.0f64),
                0..40,
            ),
            depth in 0usize..=6usize,
        ) {
            let addresses: Vec<Address> = points
                .iter()
                .map(|&(k, t, e)| Address::encode_full(coords(k, t, e)))
                .collect();

            let mut trie = Trie::new();
            for (i, a) in addresses.iter().enumerate() {
                trie.insert(a, i);
            }

            prop_assert_eq!(trie.len(), addresses.len());

            for a in &addresses {
                let prefix = a.truncate(depth);
                let expected = addresses.iter().filter(|x| prefix.contains(x)).count();
                prop_assert_eq!(trie.count_under(&prefix), expected);
            }
        }

        /// Fallback never returns nothing when the trie is non-empty, and the prefix it
        /// reports genuinely contains every value it returned.
        #[test]
        fn fallback_always_answers_and_reports_an_honest_prefix(
            points in prop::collection::vec(
                (0.0..=1.0f64, 0.0..=1.0f64, 0.0..=1.0f64),
                1..30,
            ),
            qk in 0.0..=1.0f64,
            qt in 0.0..=1.0f64,
            qe in 0.0..=1.0f64,
        ) {
            let entries: Vec<(Address, usize)> = points
                .iter()
                .enumerate()
                .map(|(i, &(k, t, e))| (Address::encode_full(coords(k, t, e)), i))
                .collect();

            let mut trie = Trie::new();
            for (a, v) in &entries {
                trie.insert(a, *v);
            }

            let result = trie.nearest(&Address::encode_full(coords(qk, qt, qe)));

            prop_assert!(!result.values.is_empty(), "a non-empty trie must always answer");

            // Everything returned really is under the reported prefix.
            let under: Vec<usize> = entries
                .iter()
                .filter(|(a, _)| result.address.contains(a))
                .map(|(_, v)| *v)
                .collect();
            let mut got = result.values.clone();
            got.sort_unstable();
            let mut want = under;
            want.sort_unstable();
            prop_assert_eq!(got, want);
        }

        /// Insertion order must not affect any query result. Determinism again — a trie
        /// built in a different order is the same trie.
        #[test]
        fn insertion_order_does_not_affect_results(
            points in prop::collection::vec(
                (0.0..=1.0f64, 0.0..=1.0f64, 0.0..=1.0f64),
                1..25,
            ),
        ) {
            let addresses: Vec<Address> = points
                .iter()
                .map(|&(k, t, e)| Address::encode_full(coords(k, t, e)))
                .collect();

            let mut forward = Trie::new();
            for a in &addresses {
                forward.insert(a, 0u8);
            }

            let mut backward = Trie::new();
            for a in addresses.iter().rev() {
                backward.insert(a, 0u8);
            }

            for depth in 0..=FULL_DEPTH {
                for a in &addresses {
                    let p = a.truncate(depth);
                    prop_assert_eq!(forward.count_under(&p), backward.count_under(&p));
                }
            }
        }
    }
}
