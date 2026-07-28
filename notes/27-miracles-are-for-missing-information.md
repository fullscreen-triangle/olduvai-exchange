# ⚠️ Correction: the Miracle Principle is not a threat model

User, correcting [[26-global-objective-not-local-match]] §4:

> The miracle principle is used **when you need miracles**. You do not need to force a
> miracle. **A miracle is when there is no information.** And since this is an
> information-first system, that means **optimisation is performed with verifiable
> information.**

**This is right, I had the theorem's role wrong, and checking the source confirms the
correction is stronger than the objection I raised.**

---

## 1. What I got wrong

In [[26-global-objective-not-local-match]] §4 I treated `cor:miracle` as a **latent
hazard** — "the mathematically generic case" in which a participant is made worse off
inside a globally-optimal settlement. That framing was mistaken in a specific way:

**I read an existence theorem as a behavioural prediction.**

`cor:miracle` says such settlements *can be constructed*. It says nothing about whether
a system that has the relevant information *would* construct them. Those are different
claims, and I conflated them.

## 2. ⭐ What the source actually says

From `unconstrained-subtasks-trajectory-completion.tex:497`:

> "The Miracle Principle is **the constructive existence theorem** for sub-expressions
> whose local content is maximally wrong while their global composition is maximally
> right."

**"Constructive existence theorem"** — its job is to prove a space is non-empty, not to
describe a mechanism's normal operation.

And the conditions are much narrower than I represented. From `thm:forward-asymmetry`
(line 739, with its proof at 743):

> "Forward trajectory construction **cannot use virtual sub-states.** Only backward
> trajectory completion (from known endpoint) can."
>
> *Proof:* "the receiver must have `p_{j+1} ∈ P_{j+1}` as a **physical block**, hence
> `ι(p_{j+1}) ∈ [0,1]³`. Virtual sub-coordinates **do not correspond to any partition
> block**, so they cannot serve as `p_{j+1}`."

⟹ **⭐ Virtual sub-states are precisely the decompositions that correspond to NO
partition block — i.e. to no actual thing.** They are the calculus's way of passing
through a region where **there is no fact of the matter**, because the endpoint is known
and the interior is not.

**That is exactly the user's point: a miracle is what the calculus does where
information is absent.** Where a real block exists — a real farmer, a real truck, a real
tonne — the coordinate is in `[0,1]³` and the miracle machinery is not merely unnecessary,
it is **inapplicable by the theorem's own proof.**

## 3. ⭐⭐ The consequence: information density is the control

This reframes the entire fraud-and-fairness architecture, and it does so in the
framework's own terms rather than by adding external constraints.

**The virtual region is the region of missing information.** So:

> **Every verified fact removes a degree of freedom from the miracle space.**

And the corpus has been saying this throughout without my connecting it:

- **Foreman telemetry** ([[16-foreman-as-continuous-verification]]) — the crop
  trajectory is *observed*, so those legs are physical blocks, not virtual ones.
- **Sealed sensors at mode changes** ([[19-sealed-sensors]]) — each checkpoint converts
  an unobserved interval into a measured one.
- **Multi-role commercial records** ([[25-the-actual-shape]] §4.1) — a miller's intake
  weight, a transporter's pickup log, a supplier's seed sale. **Each is a partition
  block that was previously a free coordinate.**

⟹ **The four external constraints I proposed in [[26-global-objective-not-local-match]]
§4 were treating a symptom.** The structural answer is: **admit coalitions whose legs
are backed by verifiable information, and the miracle space shrinks to nothing.**

**⭐ That is a much better design principle than "add a fairness constraint", because it
is enforceable by the same machinery that does the matching, and it is checkable.**

## 4. ⭐ The operational rule this yields

**A leg is admissible iff it corresponds to a partition block — i.e. iff there is
verifiable information locating it.**

Concretely, per leg:
- **Is it observed?** A weighbridge ticket, a mill intake record, a sensor reading, a
  delivery scan, a signed input purchase.
- **Or is it asserted?** A participant's unbacked claim about quantity, quality, or
  capacity.

⟹ **Asserted legs are the virtual region.** They are exactly where a settlement can be
locally absurd and globally fine, and they are exactly where nobody can tell.

**⟹ Design rule: the exchange's admissibility test is an information test, not a
fairness test.** Publish the ratio — *what fraction of this coalition's legs are backed
by independent records?* — and refuse coalitions below a threshold.

That threshold is **β**, again, and for the same reason as everywhere else: below the
floor you cannot distinguish a real difference from noise ([[19-sealed-sensors]] §4.1,
[[23-rail-yield-and-phase-locked-finance]] §1.6).

## 5. ⚠️ What survives from my objection — narrower, and worth keeping

I withdraw the framing. Three residues remain, and they are smaller:

1. **Path opacity is still real, and it is independent of the miracle question.**
   `thm:path-opacity` (validated at rate 1.00) says the endpoint reveals nothing about
   assembly — **even when every leg is fully informed.** ⟹ The **leg-level ledger is
   still required**, not as a fairness guard but as ordinary record-keeping: the
   information exists at assembly time and must be *written down*, because it cannot be
   recovered afterward. **Cheap, and the system already has the data.**

2. **Right of refusal remains worth having** — not to prevent extraction, but because
   [[26-global-objective-not-local-match]] §5's concentration argument still holds
   independently of the miracle principle. **Increasing returns still favour dense
   corridors regardless of how well-informed the optimiser is.** That is an objective-
   function property, not an information property.

3. **The information test has a coverage boundary.** A participant with no verifiable
   record is not *malicious* — they are **unobserved**, and a strict information test
   excludes them. ⚠️ For a smallholder with no formal records, "asserted" is the normal
   state. ⟹ **The threshold must be reachable by someone joining with nothing**, or
   the information rule reproduces the exclusion problem by another route. **Bootstrap
   path: first transactions are small, observed, and build the record.**

## 6. ⭐ Why "information-first" is the right frame for the whole project

The user's phrase is the correct name for what the corpus actually supports.

Every genuine result surveyed here is about **what is resolvable given what is known**:
the floor β from bounded knowledge ([[01-foundation-contact-graphs]]), closure versus
confidence ([[03-semantic-causal-propagation]]), route audit beating endpoint audit,
resolution never saturating, the information bound `I_ε ≤ log₂((100−S♭)/ε)`.

**None of it is about incentives. All of it is about information.**

⟹ **An information-first exchange is inside the region where this corpus is genuinely
load-bearing** — which is the argument I tried to make in [[25-the-actual-shape]] §3 and
then partly walked back in [[26-global-objective-not-local-match]] §6.

**⭐ Restating that more carefully now:** the mechanism-design gap is real, but it is
smaller for a system that **admits on evidence** than for one that admits on
**assertion**. Misreporting is only profitable where reports are load-bearing.
**An information test converts a large class of incentive problems into
verification problems** — which is precisely the move [[16-foreman-as-continuous-verification]]
§2.2 identified as the design's central strength, now generalised from fraud to
allocation.

**It does not close the gap** — coalition-joining strategy, phantom capacity, and
availability inflation remain — **but it narrows it substantially, and it does so with
machinery already in the design.**

---

## 7. Net

**Corrected:** the Miracle Principle is a constructive existence theorem about the
region where information is absent. It is not a prediction about a system that has
information. **Where a real block exists, the virtual machinery is inapplicable by
`thm:forward-asymmetry`'s own proof.**

**Retained:** leg-level ledger (path opacity, independent), right of refusal
(concentration, independent), and a bootstrap path for the unobserved.

**Gained — the better rule:** *admissibility is an information test.* Every verified
fact removes a degree of freedom from the miracle space, and the exchange's job is to
assemble coalitions out of **observed** legs rather than asserted ones.

Links: [[00-framing]] · [[26-global-objective-not-local-match]] · [[25-the-actual-shape]] · [[20-s-entropy-dimensional-typing]] · [[19-sealed-sensors]] · [[16-foreman-as-continuous-verification]] · [[23-rail-yield-and-phase-locked-finance]] · [[01-foundation-contact-graphs]]
