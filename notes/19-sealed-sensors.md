# Sealed sensors — closing the packing-step diagonal

User's answer to the weak link in [[18-accomplice-fraud-and-the-container]]:

> If a fraudulent farmer switched things before sealing, **remember the trackers
> inside** — the sensors will report a difference between what's there and what was
> entered. **You make an array of measurements, and you seal the sensors.** Even
> better, **at any transport mode change we could check the sensors** — meaning fraud
> would require **corrupting the sensors.**

**This closes the diagonal properly, and better than the four controls I proposed.**

---

## 1. Why it works — it removes the self-verifier

My objection was structural, not practical: the farmer performed the checks, packed,
sealed, and attached the trackers, so **one actor held both the goods and their
measurement.** That is the self-applicable configuration the diagonal obstruction
forbids ([[12-irreducible-bounded-phase-space]]) — a verifier that is also part of
the totality it verifies grounds nothing.

**Sealed sensors take the measurement out of the farmer's hands at the moment of
sealing.** After that instant the farmer is no longer a verifier of the container; the
sensor array is. The farmer can still misdeclare *at* packing — but the array then
**continuously contradicts the declaration**, and each contradiction is a committed
act at a higher count.

**The declaration and the measurement stop being the same act.** That is the whole
requirement.

## 2. ⭐ Mode-change checkpoints are the sharp part

Truck → rail → port → ship is a **sequence of independent read points**, and this is
where the corpus result actually bites.

From [[01-foundation-contact-graphs]] and repeated throughout — the two-pronged
falsification of point-identity:

> **Resolution never saturates**, and **independent lines of measurement never become
> redundant.**

I recorded that as an abstract claim about why instruments keep multiplying. **Here it
is the design.** Each mode change is another independent measurement line against the
same sealed contents. The identity of the load is never resolved to a point — it is
**bracketed more tightly at every checkpoint**, and the bracket is auditable.

And it converts the single self-verified snapshot into a **monotone series the farmer
never controls.** Non-return applies: a checkpoint reading is a committed act; a
later reading does not overwrite an earlier one, it appends. **The record is
append-only by physics, not by policy.**

**What this specifically defeats:**
- **Top-layer loading** — sensors read the actual contents, not the sampled surface.
- **Post-check substitution** — the array reads after sealing, so substitution before
  sealing is contradicted from the first checkpoint onward.
- **Measuring a compliant sample that was never loaded** — the sample is no longer
  what's measured; the load is.

Three of the four single-actor frauds from [[18-accomplice-fraud-and-the-container]]
are closed structurally rather than by detection.

## 3. Fraud becomes sensor corruption — a harder and more visible problem

**Corrupting sensors is a categorically different attack** from misreporting:
- It requires **physical access to sealed equipment**, which is itself an observable
  event.
- It must be sustained **across every mode change**, not performed once.
- It must produce a **coherent** false series — readings that stay agronomically
  consistent with the season record, the declared load, and each other, at every
  checkpoint.
- And by non-return, **a corrupted reading cannot be quietly revised later** — it
  commits, and it must remain consistent with everything that follows.

That is the same cost-profile shift as [[16-foreman-as-continuous-verification]]: **not
incentive-compatible by proof, but expensive by construction, and expensive in a way
that compounds over the journey.**

## 4. Two things that remain — both smaller than what's closed

### 4.1 Sensors have their own floor
Moisture and chemical sensors have a resolution below which they cannot distinguish a
real difference from drift. **That is β again**, and it sets the no-alert band.

Per [[12-irreducible-bounded-phase-space]]: **below the floor a discrepancy cannot be
told from measurement noise, and adjudicating a sub-floor difference is provably
unresolvable.** So:
- **Measure β per sensor type** — the same exercise that sets every other threshold in
  the design: re-read the same load with independent instruments, take the spread.
- **Set the dispute threshold at β and defend it.** Do not litigate below it.
- And per the composition law, **the sensor array's floors multiply only if the sensor
  types are decoder-disjoint** — weight, moisture, and chemistry are; three moisture
  sensors are not. **Never re-inspect the same way twice** applies to the array design.

### 4.2 ⭐ Homogeneous shortfall is the residual case — and it needs the season record
A container that is genuinely **18 t of exactly the right maize when 22 t was sold**
reads as **correct on every sensor.** Composition is right, moisture is right,
chemistry is right. Only the quantity is wrong, and a sensor array measuring *what is
there* has nothing to contradict.

**That one is caught by the season-record cross-check, not by sensors** — declared
area × corroborated yield/ha → implied harvest, closed against shipped weight.

**⟹ The two controls are complementary, not redundant, and that is the right shape:**
- **Sensors** catch *substitution, contamination, misdeclaration of kind.*
- **Season record** catches *quantity fraud and oversell.*
- Neither substitutes for the other.

## 5. What still isn't closed

Unchanged from [[18-accomplice-fraud-and-the-container]], and worth keeping visible:

- **Farmer + fake-buyer collusion.** A confederate buyer confirming a fake shipment —
  to build reputation or move value — survives everything above. **Correlated
  sources; the framework cannot see it.** Mechanism design.
- **The seal as bearer token.** Physical security, not information geometry.
- **The incentive layer generally** — escrow, staged release, bonding, exit-scam
  economics. Still the corpus's largest hole, still carrying more weight than any
  other part of the design.

## 6. Net

The sealed-sensor array **converts the packing step from a self-verified snapshot into
an independently-measured, append-only, multi-checkpoint series.** That is exactly what
the diagonal obstruction demands and what my four proposed controls only approximated.

**Fraud moves from misreporting to sensor corruption**, which is physical, sustained,
observable, and must remain coherent across the whole journey.

**Keep two things:** measure β per sensor type and set the dispute threshold there;
and retain the season-record cross-check, because **quantity fraud is invisible to a
sensor array measuring a genuinely correct load.**

Links: [[00-framing]] · [[16-foreman-as-continuous-verification]] · [[18-accomplice-fraud-and-the-container]] · [[12-irreducible-bounded-phase-space]] · [[01-foundation-contact-graphs]]
