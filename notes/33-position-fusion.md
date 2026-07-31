# 33 — Position fusion: many weak sources, one honest estimate

Status: **implemented** (`olduvai-core::fusion`, `olduvai-server::positions`).

---

## 1. Three ideas that turned out to be one

Three things were raised in sequence: farmers annotating their own base map, the nearest
airport as a first data reference, and aircraft flight paths as positioning input. They
arrived as three suggestions and I initially treated them as three features.

They are one feature. The unifying statement:

> *"Airport data, like any other datasource, was not meant to be precise. A combination of
> noisy sensors plus kalman filtering produces more precise data. Aircrafts are not a
> positioning check, but another gps instrument. We do not check any gps against another
> gps... the fact that the aeroplane has flown above a point, means that, we now have a gps
> track in that direction, thats all."*

⭐ **The idea is a fusion layer over heterogeneous noisy position sources, where each source
arrives with an honest error characterisation and a filter does the work.** A farmer's drawn
boundary, an aerodrome reference point and an overflying aircraft are then not three
integrations but three shapes of the same input.

### 1.1 Two errors this corrected, recorded because they were instructive

**I read "verify geopositioning" as cross-checking.** I objected that ADS-B is GPS checking
GPS, that routes vary too much to constrain anything, and that I could not state what was
being verified. That was a category error. There is no verification here: no source is trusted
enough to be the reference, so the operation on two noisy numbers is not *comparison* but
*combination*, weighted by how noisy each admits to being. The objection dissolved rather than
being answered.

**I invented a provenance problem for annotation.** I argued a farmer could improve their
standing by drawing a generous boundary — `Φ_R` with the pen as the policy. Reply:

> *"Provenence is not a problem. All the annotations are useful inside the foreman... If a
> farmer lies, they will get wrong results and thats it. That does not affect the platform.
> When something is sold, we already have methods to ensure that items are correct according
> to our system."*

The foreman is a participant's own record of their own activity, checked for coherence against
itself. It is advisory to one person. Platform guarantees attach **at sale**, where existing
methods bite. No new guard was needed; the constraint was already structural. I was solving a
problem that had been scoped away.

⚠️ Both errors share a shape: reaching for a *check* where the design calls for a *weight*.
Worth remembering when the next source is added.

---

## 2. What an observation is

⭐ **A constraint, not a fix.** This is the structural consequence of the aircraft remark, and
it is why `Observation` is an enum rather than a position-and-sigma pair.

| Variant | Constrains | Typical source |
|---|---|---|
| `Fix` | a point, isotropically | phone GPS, handheld receiver, surveyed marker |
| `Corridor` | **perpendicular distance from a line**; along-track unconstrained | an aircraft track passing overhead |
| `Within` | a region, with sigma from the region's own size | a farmer's drawn boundary, a catchment, a parcel |

⚠️ Flattening all three into "a point plus a sigma" would fabricate an along-track position
for the aircraft case that nobody observed. The plane was overhead *somewhere along its
track*; the observation says the participant is near the line, and says nothing about where
along it. `Corridor` is the honest encoding of "we now have a gps track in that direction,
that's all."

### 2.1 The corridor projection is not clamped

`t` is deliberately not clamped to `[0,1]`. The two reported points are a *sample* of a flight
path, not its extent — an aircraft on a heading was on that heading before and after those
points. Clamping would turn a passing track into a spurious pull towards its nearest endpoint,
which is an invented position. Tested by
`a_corridor_constrains_from_beyond_its_endpoints`.

---

## 3. Where annotation lands

⭐ A farmer's drawn boundary is `Observation::Within` at `Source::Asserted`.

It is a real constraint and it is treated as one — it moves the estimate, weighted by the size
of the region drawn. It is also permanently marked as unobserved: `Estimate::strongest_source`
keeps the strongest contributor rather than a blend, so a position built entirely from
assertions reports `rests_on_observation() == false` no matter how many assertions agree or
how tight the resulting sigma becomes.

⚠️ That last point is the one worth guarding, and it has a test
(`assertions_never_become_evidence_however_many_agree`). Forty agreeing assertions produce a
sub-20 m sigma. The number looks like evidence. It is not, and `declaration()` says
*"stated rather than measured"* rather than letting the number imply otherwise.

This is the annotation idea implemented without the guard I wrongly wanted: the farmer's input
is used, it helps them, and it cannot masquerade as measurement.

---

## 4. Airports

Not yet built — the fusion layer is the prerequisite and it now exists. Two distinct things
come from an aerodrome, and they enter differently:

- **The surveyed reference point.** An `Observation::Fix` at `Source::Instrument` with a small
  sigma but a large distance from any given farm. Weak *about a farm*, precise in itself.
- **METAR observations.** Not position at all. These are `footprint::Reading`s with a `Point`
  footprint held over some authored radius, and `is_distinguishing_for` will reject most of
  them for most farms — correctly. My earlier objection that a METAR 60 km away is too weak
  was beside the point: weakness is the design assumption, not a defect. It is context.

---

## 5. The pure/stateful split

A Kalman filter has state that evolves across updates, which sits oddly against
`olduvai-core`'s purity contract. The resolution:

```
core:   pub fn update(est, obs) -> Estimate    // pure, no clock, no state
server: cache = cache.update(obs)              // fast path
check:  fold(log) == cache                     // testable, and tested
```

⭐ **The log is the truth; the estimate is a cache.** `Positions::verify` recomputes from the
log and compares with exact equality — not a tolerance, because both paths run the same
operations on the same inputs and a tolerance would hide precisely the small drift that is the
first symptom of divergence.

`the_cache_equals_the_fold_at_every_prefix` checks after *each* observation rather than once at
the end, since drift could cancel over a full log and be invisible to a single final
comparison.

⚠️ `positions.rs` contains **no floating-point arithmetic on a position or a sigma**. That is
the mechanical test of whether "transport only" has been breached: if a `*`, `/` or `sqrt`
appears near a coordinate there, a second implementation has been born.

---

## 6. Build order: why this is allowed before the gate

⚠️ Unlike `orbit` and `footprint`, **`fusion` is on the coordinate path.** A fused position is
exactly what `S_k` would be derived from, so the exemption those two modules got does not
apply and needed its own argument.

It stays behind the gate by stopping short. The module produces a position and an uncertainty
and exposes **no** function mapping either to a coordinate, a `Trit` or an `Address` — the gate
is on coordinate *functions*, not on the measurements they will one day consume.

⭐ The one bridge it exposes, `Estimate::extent()`, points **away** from the address path: it
feeds `footprint::Reading::is_distinguishing_for`, so a poorly located participant makes
readings *less* admissible, not more. Building a guard's input before the thing being guarded
is the right order. The standing check on this module is that the arrow keeps pointing that
way.

---

## 7. Authored constants

Both are `⚠️`-marked in source and neither is a measurement.

| Constant | Value | Why |
|---|---|---|
| `UNINFORMED_SIGMA_M` | 200 km | The prior must not compete with any real observation. At this width even a 20 km constraint takes a gain of 0.99. |
| `MIN_SIGMA_M` | 1 m | A source claiming centimetre accuracy would take the gain to 1.0 and erase everything else. Such a source is more likely misconfigured than exceptional. |

Plus one authored *rule*: `Within` treats half the footprint's characteristic width as one
sigma. A uniform distribution over a disc of radius r has σ ≈ 0.7r, so calling it r overstates
the spread — the right direction to be wrong in.

⚠️ None of these is a `Source::Placeholder`. They are parameters of an algorithm, not stand-ins
for measurements, and tagging them as placeholders would dilute what that variant means.

---

## 8. What did not survive from CZML

Recorded because the extraction was deliberate, not incidental — *"Its no issue if some items
do not survive."*

**Survives as a principle:** a property that is a *function of time* rather than a value;
`availability` as an explicit validity interval; one schema covering ground objects and
orbiting ones.

⚠️ **Does not survive:** sampled-and-interpolated position as a *storage* form. CZML stores an
epoch, a sample array and an interpolation rule, which converts a computation back into a
lossy lookup — and `interpolationDegree` is an authored parameter silently shaping every
between-sample value. **CZML is a rendering format, not a ledger format.** If a globe is built,
a CZML serializer belongs at the presentation boundary and nowhere else.

---

## 9. Open

- **Anisotropic covariance.** `Corridor` is currently collapsed to an isotropic sigma. The
  collapse is conservative across track (where the constraint is real) and merely wasteful
  along it. A full 2×2 covariance would let the corridor stay honestly anisotropic. ⚠️ Anyone
  making that change should expect the corridor case to *improve* and should not be surprised.
- **Aerodrome and aircraft ingestion** — the sources themselves (§4). The layer they feed now
  exists.
- **Recomputation on idle** — note 32 Idea 5 is the natural home for refolding logs.
- **`min_separation`** in `analysis/cohesion.py`, the remaining placeholder from note 32 §3.
