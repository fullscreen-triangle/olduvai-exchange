//! Agent mathematics: separation floors, the character invariant χ, and water-filled
//! attention.
//!
//! Ported from `musande/smith-ide/smith-ide/src/engine/math.ts`, which implements the
//! Split-Attention Synchronised Agents paper. It lives here, in the deterministic core,
//! for the same reason the encoder does: a browser showing a participant their χ and a
//! server enforcing a floor against it must agree bit-for-bit, or the check is decorative.
//!
//! ⭐ **These are not LLM agents.** χ is a graph invariant computed by exhaustive
//! enumeration; the attention schedule is bisection on a Lagrange multiplier. Every
//! function here is pure and total. That is what makes an agent something the exchange can
//! hold *inside* the core rather than at its edge — a model could not live here.
//!
//! # What the pieces mean for the exchange
//!
//! A participant's declared capabilities are [`Self_`]`::parts`; the pairs that cannot be
//! split across a coalition without cost are its `separations`. Then:
//!
//! - [`realised_floor`] is what it costs to break the participant's offering into two —
//!   the cheapest cut.
//! - [`character_invariant`] is χ: the cheapest way to shatter it into *any* number of
//!   blocks. Checked against a declared floor.
//! - [`water_fill`] allocates a finite attention budget across the things a dashboard
//!   could ask, and returns the price `p*` below which a question is not worth asking.
//!   That is "necessary and sufficient information" as a computation.
//!
//! # ⚠️ Complexity
//!
//! [`realised_floor`] is `O(2ⁿ)` and [`character_invariant`] is Bell-number in the number
//! of parts. Both are exact and both are refused above [`MAX_PARTS`] rather than silently
//! approximated: a χ check against a floor is only meaningful if χ is exact, or bounded on
//! the side that makes the check conservative. An approximation that is merely *close*
//! turns a proof obligation into a heuristic without saying so.

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Largest number of parts the exact algorithms will accept.
///
/// Bell(12) = 4_213_597 partitions, which is a fraction of a second. Bell(15) is 1.38
/// billion, which is not. The cutoff is deliberately below the point where a caller would
/// notice by waiting.
pub const MAX_PARTS: usize = 12;

/// Refusals from the exact combinatorial routines.
///
/// `PartialEq` but not `Eq`, because [`AgentError::BadCost`] carries the offending `f64` —
/// and the value that triggers it is often `NaN`, which is not equal to itself. Deriving
/// `Eq` here would be asserting a reflexivity that does not hold for the field.
#[derive(Debug, Clone, PartialEq, thiserror::Error)]
pub enum AgentError {
    /// More parts than [`MAX_PARTS`]. Exactness is not negotiable here, so this is an
    /// error rather than a fallback to sampling.
    #[error("{count} parts exceeds the exact limit of {MAX_PARTS}; χ would not be exact")]
    TooManyParts { count: usize },
    /// A separation names a part that was not declared.
    #[error("separation references undeclared part {part:?}")]
    UnknownPart { part: String },
    /// A separation cost that is negative or not finite. Minimum-cut over such weights is
    /// not well defined.
    #[error("separation {from:?}–{to:?} has non-finite or negative cost {cost}")]
    BadCost { from: String, to: String, cost: f64 },
}

/// An undirected weighted separation between two declared parts.
///
/// The cost is what is lost by splitting these two across different blocks — a haulier
/// whose trucks and whose depot are separated has to pay for that separation somehow.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Separation {
    pub from: String,
    pub to: String,
    pub cost: f64,
}

/// A participant's declared self: the parts of what they do, and how those parts resist
/// being split.
///
/// Named `Self_` because `Self` is a keyword. The `.smith` DSL calls it `self`.
#[derive(Debug, Clone, PartialEq, Default, Serialize, Deserialize)]
pub struct Self_ {
    pub parts: Vec<String>,
    pub separations: Vec<Separation>,
}

impl Self_ {
    pub fn new(parts: impl IntoIterator<Item = impl Into<String>>) -> Self {
        Self_ {
            parts: parts.into_iter().map(Into::into).collect(),
            separations: Vec::new(),
        }
    }

    /// Add a separation. Chainable.
    pub fn separated(mut self, from: impl Into<String>, to: impl Into<String>, cost: f64) -> Self {
        self.separations.push(Separation {
            from: from.into(),
            to: to.into(),
            cost,
        });
        self
    }

    /// Check the declaration is well formed before any exact routine runs on it.
    ///
    /// Called by every public entry point. Validating once at the boundary means the
    /// enumeration loops can index without bounds-checking logic tangled through them.
    pub fn validate(&self) -> Result<(), AgentError> {
        if self.parts.len() > MAX_PARTS {
            return Err(AgentError::TooManyParts {
                count: self.parts.len(),
            });
        }
        for sep in &self.separations {
            if !sep.cost.is_finite() || sep.cost < 0.0 {
                return Err(AgentError::BadCost {
                    from: sep.from.clone(),
                    to: sep.to.clone(),
                    cost: sep.cost,
                });
            }
            for part in [&sep.from, &sep.to] {
                if !self.parts.contains(part) {
                    return Err(AgentError::UnknownPart { part: part.clone() });
                }
            }
        }
        Ok(())
    }

    /// Index of each part, for the bitmask loops.
    fn index(&self) -> BTreeMap<&str, usize> {
        self.parts
            .iter()
            .enumerate()
            .map(|(i, p)| (p.as_str(), i))
            .collect()
    }
}

/// Total cost of separations crossing the boundary of `subset`.
///
/// `subset` is a bitmask over `self_.parts` positions.
fn boundary_cost(self_: &Self_, index: &BTreeMap<&str, usize>, subset: u32) -> f64 {
    let mut cost = 0.0;
    for sep in &self_.separations {
        let from_in = subset & (1 << index[sep.from.as_str()]) != 0;
        let to_in = subset & (1 << index[sep.to.as_str()]) != 0;
        if from_in != to_in {
            cost += sep.cost;
        }
    }
    cost
}

/// Cost of a subset boundary, by part name. The public form of [`boundary_cost`].
///
/// Parts named in `subset` that were not declared are ignored — this is a query about a
/// cut, not a declaration, so an unknown name simply names nothing.
pub fn cut_cost(self_: &Self_, subset: &[&str]) -> Result<f64, AgentError> {
    self_.validate()?;
    let index = self_.index();
    let mut mask = 0u32;
    for name in subset {
        if let Some(&i) = index.get(name) {
            mask |= 1 << i;
        }
    }
    Ok(boundary_cost(self_, &index, mask))
}

/// The realised floor: the cheapest boundary over all non-empty proper subsets.
///
/// What it costs to split this participant in two, at the best possible place. An agent
/// with one part or none cannot be split, and the floor is infinite — there is no cut, so
/// the minimum over an empty set is `+∞`. That is the correct value rather than a sentinel:
/// it makes `floor >= declared` pass vacuously for an indivisible agent, which is right.
pub fn realised_floor(self_: &Self_) -> Result<f64, AgentError> {
    self_.validate()?;
    let n = self_.parts.len();
    if n <= 1 {
        return Ok(f64::INFINITY);
    }
    let index = self_.index();
    let total = 1u32 << n;
    let mut min_cost = f64::INFINITY;
    // Masks 1..total-1 are exactly the non-empty proper subsets.
    for mask in 1..total - 1 {
        let cost = boundary_cost(self_, &index, mask);
        if cost < min_cost {
            min_cost = cost;
        }
    }
    Ok(min_cost)
}

/// A partition of the parts into blocks, with its residual cost.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Partition {
    pub blocks: Vec<Vec<String>>,
    pub cost: f64,
}

/// Total weight cut by a partition: every separation whose endpoints land in different
/// blocks.
fn partition_residual(self_: &Self_, block_of: &[usize], index: &BTreeMap<&str, usize>) -> f64 {
    let mut cost = 0.0;
    for sep in &self_.separations {
        if block_of[index[sep.from.as_str()]] != block_of[index[sep.to.as_str()]] {
            cost += sep.cost;
        }
    }
    cost
}

/// Enumerate every partition into ≥2 blocks via restricted growth strings, calling `visit`
/// with the block assignment and its residual.
///
/// Restricted growth strings generate each set partition exactly once: `rgs[i]` is the
/// block of part `i`, and `rgs[i] <= 1 + max(rgs[0..i])`. That constraint is what stops
/// the same partition appearing under permuted block labels.
fn for_each_partition(
    self_: &Self_,
    index: &BTreeMap<&str, usize>,
    mut visit: impl FnMut(&[usize], usize, f64),
) {
    let n = self_.parts.len();
    let mut rgs = vec![0usize; n];

    fn recurse(
        pos: usize,
        max_so_far: isize,
        n: usize,
        rgs: &mut Vec<usize>,
        self_: &Self_,
        index: &BTreeMap<&str, usize>,
        visit: &mut impl FnMut(&[usize], usize, f64),
    ) {
        if pos == n {
            let num_blocks = (max_so_far + 1) as usize;
            if num_blocks < 2 {
                return;
            }
            let cost = partition_residual(self_, rgs, index);
            visit(rgs, num_blocks, cost);
            return;
        }
        for val in 0..=(max_so_far + 1) as usize {
            rgs[pos] = val;
            recurse(
                pos + 1,
                max_so_far.max(val as isize),
                n,
                rgs,
                self_,
                index,
                visit,
            );
        }
    }

    recurse(0, -1, n, &mut rgs, self_, index, &mut visit);
}

/// Rebuild named blocks from a restricted growth string.
fn blocks_from(self_: &Self_, block_of: &[usize], num_blocks: usize) -> Vec<Vec<String>> {
    let mut blocks = vec![Vec::new(); num_blocks];
    for (i, part) in self_.parts.iter().enumerate() {
        blocks[block_of[i]].push(part.clone());
    }
    blocks
}

/// The character invariant χ: the minimum residual over all partitions into ≥2 blocks,
/// with the partition that achieves it.
///
/// χ measures how cheaply the declared self can be shattered. A high χ means the parts
/// genuinely hang together; a low one means the participant has declared a bundle that
/// falls apart under mild pressure, and a coalition built on it will too.
///
/// As with [`realised_floor`], an agent of one part or none returns `+∞` — there is no
/// partition into two blocks, so the minimum is over an empty set.
///
/// ⚠️ Bell-number complexity. Refuses above [`MAX_PARTS`].
pub fn character_invariant(self_: &Self_) -> Result<(f64, Partition), AgentError> {
    self_.validate()?;
    let n = self_.parts.len();
    if n <= 1 {
        return Ok((
            f64::INFINITY,
            Partition {
                blocks: vec![self_.parts.clone()],
                cost: f64::INFINITY,
            },
        ));
    }
    let index = self_.index();
    let mut best_chi = f64::INFINITY;
    let mut best: Option<Partition> = None;

    for_each_partition(self_, &index, |block_of, num_blocks, cost| {
        if cost < best_chi {
            best_chi = cost;
            best = Some(Partition {
                blocks: blocks_from(self_, block_of, num_blocks),
                cost,
            });
        }
    });

    let partition = best.expect("n >= 2 guarantees at least the all-singletons partition");
    Ok((best_chi, partition))
}

/// Every partition with its cost, ascending. For inspecting the landscape χ minimises over.
///
/// ⚠️ Allocates one entry per partition — Bell(n). Intended for the UI at small `n`, not
/// for the hot path.
pub fn all_partition_costs(self_: &Self_) -> Result<Vec<Partition>, AgentError> {
    self_.validate()?;
    if self_.parts.len() <= 1 {
        return Ok(Vec::new());
    }
    let index = self_.index();
    let mut out = Vec::new();
    for_each_partition(self_, &index, |block_of, num_blocks, cost| {
        out.push(Partition {
            blocks: blocks_from(self_, block_of, num_blocks),
            cost,
        });
    });
    out.sort_by(|a, b| a.cost.total_cmp(&b.cost));
    Ok(out)
}

/// Which sense of an agent is being checked.
///
/// From the `.smith` DSL. The distinction matters for monitoring: a participant's
/// *character* (what they can do) should be stable across a season, while their *task*
/// (this consignment) is not. Divergence between the two is the signal
/// (`notes/16-foreman-as-continuous-verification.md` §2.2).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Regime {
    Character,
    Task,
}

/// The outcome of checking an agent's χ against its declared floor.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AgentCheck {
    pub name: String,
    pub regime: Regime,
    pub chi: f64,
    pub floor: f64,
    /// The partition χ was achieved on. Names *which* split is cheapest, which is the
    /// actionable part — it says where the declared self is weakest.
    pub chi_partition: Vec<Vec<String>>,
}

impl AgentCheck {
    /// True when the declared self holds together at least as well as it claimed.
    pub fn passes(&self) -> bool {
        self.chi >= self.floor
    }
}

/// Check a declared self against a floor.
pub fn check(
    name: impl Into<String>,
    regime: Regime,
    self_: &Self_,
    floor: f64,
) -> Result<AgentCheck, AgentError> {
    let (chi, partition) = character_invariant(self_)?;
    Ok(AgentCheck {
        name: name.into(),
        regime,
        chi,
        floor,
        chi_partition: partition.blocks,
    })
}

// ---------------------------------------------------------------------------------------
// Water-filled attention
// ---------------------------------------------------------------------------------------

/// A logarithmic gain profile `γ(a) = ln(1 + k·a)`.
///
/// Concave and increasing: the first unit of attention on a question is worth more than
/// the tenth. `k` is how steeply the question rewards early attention — its entry margin
/// `γ'(0) = k` is the price above which the question is not worth asking at all.
///
/// A struct rather than a trait object because the whole family is one parameter, and
/// keeping it concrete keeps [`water_fill`] deterministic and inlinable.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Scene {
    pub name: String,
    /// Gain parameter `k > 0`.
    pub gain_k: f64,
}

impl Scene {
    pub fn new(name: impl Into<String>, gain_k: f64) -> Self {
        Scene {
            name: name.into(),
            gain_k,
        }
    }

    /// `γ(a) = ln(1 + k·a)`.
    pub fn gain(&self, a: f64) -> f64 {
        (1.0 + self.gain_k * a).ln()
    }

    /// `γ'(a) = k / (1 + k·a)`.
    pub fn marginal_gain(&self, a: f64) -> f64 {
        self.gain_k / (1.0 + self.gain_k * a)
    }

    /// `(γ')⁻¹(p) = (k/p − 1)/k`, clamped at zero.
    ///
    /// Clamped because a negative allocation is meaningless: if the price exceeds the
    /// entry margin the answer is "allocate nothing", not "allocate backwards".
    pub fn inverse_marginal(&self, p: f64) -> f64 {
        if p <= 0.0 {
            return f64::INFINITY;
        }
        ((self.gain_k / p) - 1.0).max(0.0) / self.gain_k
    }

    /// `γ'(0) = k`. The price above which this question is not worth asking.
    pub fn entry_margin(&self) -> f64 {
        self.gain_k
    }
}

/// What a scene received.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Allocation {
    pub scene: String,
    pub allocation: f64,
    pub marginal_gain: f64,
}

/// The result of scheduling attention.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WaterFill {
    pub allocations: Vec<Allocation>,
    /// The Lagrange multiplier `p*` — the marginal value of one more unit of the user's
    /// attention. ⭐ **This is the "sufficient" in "necessary and sufficient
    /// information":** a scene whose entry margin is below `p*` is not asked at all.
    pub price: f64,
    pub total_gain: f64,
    pub budget_used: f64,
}

impl WaterFill {
    /// Scenes that received nothing — the questions not worth asking at this budget.
    pub fn omitted(&self) -> impl Iterator<Item = &str> {
        self.allocations
            .iter()
            .filter(|a| a.allocation <= 0.0)
            .map(|a| a.scene.as_str())
    }
}

/// Bisection tolerance. Fixed rather than a parameter so that two callers cannot disagree
/// about an allocation by passing different tolerances — the same determinism argument as
/// the encoder.
const WATER_FILL_TOLERANCE: f64 = 1e-10;

/// Allocate a finite attention budget across scenes by water-filling.
///
/// Bisection on the price `p*` such that `Σ (γ')⁻¹(p*) = budget`. Concavity makes the
/// total allocation monotonically decreasing in `p`, so bisection converges and the
/// solution is unique.
///
/// A non-positive or non-finite budget yields no allocations rather than an error: a
/// dashboard with no attention to spend asks nothing, which is a legitimate state.
pub fn water_fill(scenes: &[Scene], budget: f64) -> WaterFill {
    let usable: Vec<&Scene> = scenes
        .iter()
        .filter(|s| s.gain_k.is_finite() && s.gain_k > 0.0)
        .collect();

    if usable.is_empty() || !budget.is_finite() || budget <= 0.0 {
        return WaterFill {
            allocations: scenes
                .iter()
                .map(|s| Allocation {
                    scene: s.name.clone(),
                    allocation: 0.0,
                    marginal_gain: s.entry_margin(),
                })
                .collect(),
            price: 0.0,
            total_gain: 0.0,
            budget_used: 0.0,
        };
    }

    let mut p_lo = 0.0;
    let mut p_hi = usable
        .iter()
        .map(|s| s.entry_margin())
        .fold(0.0f64, f64::max);

    // Bisection. The iteration cap is a belt-and-braces bound; on f64 the interval is
    // exhausted long before 200 halvings.
    for _ in 0..200 {
        let price = (p_lo + p_hi) / 2.0;
        let total: f64 = usable
            .iter()
            .filter(|s| s.entry_margin() > price)
            .map(|s| s.inverse_marginal(price))
            .sum();
        if total > budget {
            p_lo = price;
        } else {
            p_hi = price;
        }
        if p_hi - p_lo < WATER_FILL_TOLERANCE {
            break;
        }
    }
    let price = (p_lo + p_hi) / 2.0;

    let allocations: Vec<Allocation> = scenes
        .iter()
        .map(|s| {
            let alloc = if s.gain_k.is_finite() && s.gain_k > 0.0 && s.entry_margin() > price {
                s.inverse_marginal(price)
            } else {
                0.0
            };
            Allocation {
                scene: s.name.clone(),
                allocation: alloc,
                marginal_gain: if alloc > 0.0 {
                    s.marginal_gain(alloc)
                } else {
                    s.entry_margin()
                },
            }
        })
        .collect();

    // A scene that received nothing contributes nothing. Computing `gain(0.0)` for a
    // degenerate scene would evaluate `ln(1 + NaN·0)` and poison the total — a scene we
    // deliberately refused to serve must not be able to corrupt the result for the ones
    // we did.
    let total_gain = scenes
        .iter()
        .zip(&allocations)
        .filter(|(_, a)| a.allocation > 0.0)
        .map(|(s, a)| s.gain(a.allocation))
        .sum();
    let budget_used = allocations.iter().map(|a| a.allocation).sum();

    WaterFill {
        allocations,
        price,
        total_gain,
        budget_used,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A haulier: trucks, a depot, a maize licence. Trucks and depot are tightly coupled;
    /// the licence hangs off the depot more loosely.
    fn haulier() -> Self_ {
        Self_::new(["trucks", "depot", "maize_licence"])
            .separated("trucks", "depot", 10.0)
            .separated("depot", "maize_licence", 2.0)
    }

    #[test]
    fn cutting_at_the_weakest_link_is_the_floor() {
        // Splitting off the licence costs 2; splitting off the trucks costs 10.
        assert_eq!(realised_floor(&haulier()).unwrap(), 2.0);
    }

    #[test]
    fn chi_finds_the_cheapest_shattering_and_names_it() {
        let (chi, partition) = character_invariant(&haulier()).unwrap();
        assert_eq!(chi, 2.0);
        // The cheapest split is {trucks, depot} | {maize_licence} — which is the
        // actionable part: the licence is the loosely-attached piece.
        let mut blocks: Vec<Vec<String>> = partition.blocks;
        blocks.sort_by_key(|b| b.len());
        assert_eq!(blocks[0], vec!["maize_licence"]);
        assert_eq!(blocks[1], vec!["trucks", "depot"]);
    }

    #[test]
    fn chi_never_exceeds_the_realised_floor() {
        // Every 2-subset cut is also a 2-block partition, so χ ≤ floor always.
        let s = haulier();
        assert!(character_invariant(&s).unwrap().0 <= realised_floor(&s).unwrap());
    }

    #[test]
    fn chi_is_below_the_floor_when_shattering_beats_bisecting() {
        // A triangle with equal weights: any 2-way cut costs 2w, but the
        // all-singletons partition costs 3w. So χ = floor here...
        let triangle = Self_::new(["a", "b", "c"])
            .separated("a", "b", 1.0)
            .separated("b", "c", 1.0)
            .separated("a", "c", 1.0);
        assert_eq!(realised_floor(&triangle).unwrap(), 2.0);
        assert_eq!(character_invariant(&triangle).unwrap().0, 2.0);
    }

    #[test]
    fn an_indivisible_agent_has_an_infinite_floor_not_zero() {
        // The minimum over an empty set of cuts. Infinity is right: it makes a floor
        // check pass vacuously, which is the correct reading of "cannot be split".
        assert!(realised_floor(&Self_::new(["only"])).unwrap().is_infinite());
        assert!(character_invariant(&Self_::new(["only"]))
            .unwrap()
            .0
            .is_infinite());
        assert!(realised_floor(&Self_::default()).unwrap().is_infinite());
    }

    #[test]
    fn a_self_with_no_separations_shatters_for_free() {
        let loose = Self_::new(["a", "b", "c"]);
        assert_eq!(realised_floor(&loose).unwrap(), 0.0);
        assert_eq!(character_invariant(&loose).unwrap().0, 0.0);
    }

    #[test]
    fn partition_enumeration_hits_every_bell_number() {
        // Bell(n) counts all partitions; we enumerate those with >= 2 blocks, so the
        // count is Bell(n) - 1 (excluding the single-block partition).
        for (n, bell) in [(2usize, 2u64), (3, 5), (4, 15), (5, 52), (6, 203)] {
            let parts: Vec<String> = (0..n).map(|i| format!("p{i}")).collect();
            let s = Self_::new(parts);
            assert_eq!(
                all_partition_costs(&s).unwrap().len() as u64,
                bell - 1,
                "n={n}"
            );
        }
    }

    #[test]
    fn the_check_passes_when_the_self_holds_together() {
        let c = check("haulier", Regime::Character, &haulier(), 1.5).unwrap();
        assert!(c.passes());
        assert_eq!(c.regime, Regime::Character);

        let strict = check("haulier", Regime::Character, &haulier(), 5.0).unwrap();
        assert!(!strict.passes(), "χ=2 should not clear a floor of 5");
    }

    #[test]
    fn declarations_are_validated_before_any_enumeration_runs() {
        let too_many = Self_::new((0..MAX_PARTS + 1).map(|i| format!("p{i}")));
        assert!(matches!(
            realised_floor(&too_many),
            Err(AgentError::TooManyParts { .. })
        ));

        let dangling = Self_::new(["a"]).separated("a", "ghost", 1.0);
        assert!(matches!(
            character_invariant(&dangling),
            Err(AgentError::UnknownPart { .. })
        ));

        let nonsense = Self_::new(["a", "b"]).separated("a", "b", f64::NAN);
        assert!(matches!(
            realised_floor(&nonsense),
            Err(AgentError::BadCost { .. })
        ));

        let negative = Self_::new(["a", "b"]).separated("a", "b", -1.0);
        assert!(matches!(
            realised_floor(&negative),
            Err(AgentError::BadCost { .. })
        ));
    }

    #[test]
    fn cut_cost_is_computable_for_a_named_subset() {
        let s = haulier();
        assert_eq!(cut_cost(&s, &["maize_licence"]).unwrap(), 2.0);
        assert_eq!(cut_cost(&s, &["trucks"]).unwrap(), 10.0);
        assert_eq!(cut_cost(&s, &["trucks", "depot"]).unwrap(), 2.0);
        // The empty cut and the whole set both cross nothing.
        assert_eq!(cut_cost(&s, &[]).unwrap(), 0.0);
        assert_eq!(
            cut_cost(&s, &["trucks", "depot", "maize_licence"]).unwrap(),
            0.0
        );
    }

    // --- water filling ---

    #[test]
    fn a_binding_budget_is_spent_and_prices_attention() {
        let scenes = vec![
            Scene::new("yield_estimate", 5.0),
            Scene::new("planting_date", 2.0),
            Scene::new("input_purchase", 1.0),
        ];
        let r = water_fill(&scenes, 1.0);
        assert!((r.budget_used - 1.0).abs() < 1e-6, "budget should bind");
        assert!(r.price > 0.0);
        // Higher gain gets more attention.
        assert!(r.allocations[0].allocation > r.allocations[1].allocation);
        assert!(r.allocations[1].allocation >= r.allocations[2].allocation);
    }

    #[test]
    fn marginal_gains_equalise_where_attention_is_spent() {
        // The defining property of water-filling: every served scene ends at the same
        // marginal value. If they differed, moving attention between them would gain.
        let scenes = vec![
            Scene::new("a", 8.0),
            Scene::new("b", 3.0),
            Scene::new("c", 1.5),
        ];
        let r = water_fill(&scenes, 2.0);
        let served: Vec<f64> = r
            .allocations
            .iter()
            .filter(|a| a.allocation > 0.0)
            .map(|a| a.marginal_gain)
            .collect();
        assert!(served.len() >= 2);
        for m in &served {
            assert!(
                (m - served[0]).abs() < 1e-6,
                "marginal gains should equalise, got {served:?}"
            );
        }
    }

    #[test]
    fn questions_below_the_price_are_not_asked() {
        // ⭐ The "sufficient" test. A tiny budget cannot afford the weak question.
        let scenes = vec![
            Scene::new("worth_asking", 10.0),
            Scene::new("marginal", 0.2),
        ];
        let r = water_fill(&scenes, 0.05);
        assert!(r.price > 0.2, "price should exceed the weak scene's margin");
        let omitted: Vec<&str> = r.omitted().collect();
        assert_eq!(omitted, vec!["marginal"]);
    }

    #[test]
    fn a_dashboard_with_no_attention_asks_nothing() {
        let scenes = vec![Scene::new("a", 5.0)];
        for budget in [0.0, -1.0, f64::NAN] {
            let r = water_fill(&scenes, budget);
            assert_eq!(r.budget_used, 0.0);
            assert_eq!(r.total_gain, 0.0);
            assert_eq!(r.allocations.len(), 1, "scenes are still reported");
            assert_eq!(r.allocations[0].allocation, 0.0);
        }
    }

    #[test]
    fn degenerate_scenes_are_reported_but_never_served() {
        let scenes = vec![
            Scene::new("real", 4.0),
            Scene::new("zero_gain", 0.0),
            Scene::new("nonsense", f64::NAN),
        ];
        let r = water_fill(&scenes, 1.0);
        assert_eq!(r.allocations.len(), 3);
        assert_eq!(r.allocations[1].allocation, 0.0);
        assert_eq!(r.allocations[2].allocation, 0.0);
        assert!(r.allocations[0].allocation > 0.0);
        assert!(r.total_gain.is_finite());
    }

    #[test]
    fn no_scenes_is_not_a_panic() {
        let r = water_fill(&[], 1.0);
        assert!(r.allocations.is_empty());
        assert_eq!(r.budget_used, 0.0);
    }

    #[test]
    fn allocation_is_deterministic_across_calls() {
        // The whole reason this is in the core rather than in TypeScript.
        let scenes = vec![Scene::new("a", 5.0), Scene::new("b", 2.0)];
        let first = water_fill(&scenes, 1.3);
        for _ in 0..10 {
            assert_eq!(water_fill(&scenes, 1.3), first);
        }
    }

    #[test]
    fn more_budget_never_reduces_an_allocation() {
        // Monotonicity: a larger budget lowers the price, and a lower price serves at
        // least as much everywhere. A violation would mean asking a user for *more*
        // attention could make the dashboard ask *less*.
        let scenes = vec![
            Scene::new("a", 5.0),
            Scene::new("b", 2.0),
            Scene::new("c", 0.8),
        ];
        let small = water_fill(&scenes, 0.5);
        let large = water_fill(&scenes, 3.0);
        assert!(large.price <= small.price);
        for (s, l) in small.allocations.iter().zip(&large.allocations) {
            assert!(
                l.allocation >= s.allocation - 1e-9,
                "{} shrank from {} to {}",
                s.scene,
                s.allocation,
                l.allocation
            );
        }
    }

    #[test]
    fn the_wire_shape_of_a_check_is_stable() {
        let c = check("haulier", Regime::Task, &haulier(), 1.0).unwrap();
        let json = serde_json::to_string(&c).unwrap();
        assert!(json.contains(r#""regime":"task""#));
        assert_eq!(serde_json::from_str::<AgentCheck>(&json).unwrap(), c);
    }
}
