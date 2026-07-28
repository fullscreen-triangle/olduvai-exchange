"""The cohesion test.

`notes/30-programming-structure.md` §7 makes this a **gate**, not a report. Nothing in
steps 4-6 (query engine, deterministic synthesis, gate, ledger, DSL) may be built until it
passes, because everything above it assumes the address means something.

# The question

Do participants that people already recognise as similar land in nearby cells?

If a maize aggregator in one district and a maize aggregator in the next district end up
with no common prefix, the triple `(S_k, S_t, S_e)` is not carrying the structure the
exchange needs and no amount of good engineering above it will help. That is a falsifiable
claim about a proposed coordinate function, and this is where it gets tested.

# Why it is written against a labelled set

The test needs an external notion of "similar" that the coordinate function did not
produce, or it is circular. So it consumes ground-truth groupings supplied by someone who
knows the trade -- not clusters discovered in the data.

⭐ This module deliberately contains no coordinate function. It scores whichever one is
supplied. Writing one here would let it be tuned against its own gate.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Callable, Iterable, Mapping, Sequence

import olduvai

# A coordinate function under test: attributes -> (s_k, s_t, s_e).
CoordinateFn = Callable[[Mapping[str, object]], tuple[float, float, float]]


@dataclass(frozen=True)
class Participant:
    """One entity, with the label the test scores against."""

    id: str
    attributes: Mapping[str, object]
    #: The externally-supplied grouping. Never derived from coordinates.
    label: str


@dataclass(frozen=True)
class CohesionResult:
    """What the gate reads."""

    #: Mean longest-common-prefix length within a label group.
    within_label: float
    #: Mean longest-common-prefix length across different label groups.
    across_label: float
    #: Fraction of cells at the reported depth holding more than one label.
    mixed_cell_fraction: float
    #: Occupancy histogram at the reported depth, for the degenerate-collapse check.
    cell_sizes: Sequence[int]
    depth: int

    @property
    def separation(self) -> float:
        """How much longer a shared prefix is within a group than across groups.

        The headline number. At or below zero, the coordinate function is not
        distinguishing the groups at all.
        """
        return self.within_label - self.across_label

    def passes(self, min_separation: float = 1.0) -> bool:
        """⚠️ The threshold is authored and provisional.

        `min_separation = 1.0` means "on average, same-label participants agree for one
        more trit than different-label ones" -- roughly one extra refinement of one axis.
        It is a starting point for discussion, **not** an empirically justified floor, and
        the note-25 §7 gap about having no empirical floor for beta applies here too.

        The degenerate case is checked separately: a function mapping everything to one
        cell scores perfect within-label cohesion and is useless.
        """
        if self.collapsed:
            return False
        return self.separation >= min_separation

    @property
    def collapsed(self) -> bool:
        """True when nearly everything shares one cell -- cohesion by degeneracy."""
        if not self.cell_sizes:
            return True
        total = sum(self.cell_sizes)
        return max(self.cell_sizes) > 0.5 * total


def evaluate(
    participants: Iterable[Participant],
    coordinate_fn: CoordinateFn,
    depth: int = olduvai.FULL_DEPTH,
) -> CohesionResult:
    """Score a coordinate function against labelled participants.

    Addresses come from `olduvai.encode`, i.e. from the Rust encoder the server uses.
    A result here is a statement about production behaviour, not about a NumPy
    reimplementation that happens to agree today.
    """
    entries = [
        (p, olduvai.encode(*coordinate_fn(p.attributes), depth))
        for p in participants
    ]
    if len(entries) < 2:
        raise ValueError("cohesion needs at least two participants to compare")

    within: list[int] = []
    across: list[int] = []
    for i, (p_i, addr_i) in enumerate(entries):
        for p_j, addr_j in entries[i + 1 :]:
            shared = olduvai.common_prefix_len(addr_i, addr_j)
            (within if p_i.label == p_j.label else across).append(shared)

    cells: dict[str, set[str]] = defaultdict(set)
    sizes: dict[str, int] = defaultdict(int)
    for p, addr in entries:
        cells[addr].add(p.label)
        sizes[addr] += 1

    mixed = sum(1 for labels in cells.values() if len(labels) > 1)

    return CohesionResult(
        within_label=sum(within) / len(within) if within else 0.0,
        across_label=sum(across) / len(across) if across else 0.0,
        mixed_cell_fraction=mixed / len(cells) if cells else 0.0,
        cell_sizes=sorted(sizes.values(), reverse=True),
        depth=depth,
    )
