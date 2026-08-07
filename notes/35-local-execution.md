# 35 — Local execution: the PWA, the CLI, and what the two references contribute

Status: **design**. Nothing here is implemented. Two references were supplied for extraction
rather than endorsement — the standing instruction from note 32 and note 34 applies:

> *"I knew the code was useless, and that is the whole reason I decided to have this
> framework here. I wanted you to extract ideas that we can implement here."*

---

## 1. ⭐ The split already exists; it has not been named

The stated shape is: a participant uses the web app, **or** the web app *together with* a Rust
executable on their own machine.

That is not a new architecture for this repo. It is the one that is already built, described
from the participant's side for the first time. `crates/olduvai-core` compiles to three
consumers today:

| Consumer | Crate | How core is reached |
|---|---|---|
| Browser | `olduvai-wasm` (`cdylib`) | WASM, in the participant's tab |
| Server | `olduvai-server` | natively, in process |
| Python | `olduvai-py` | native extension |

⭐ **The missing fourth consumer is a `[[bin]]`, and it is the smallest of the four to add.**
`address.rs`, `fusion.rs`, `orbit.rs`, `footprint.rs` and `foreman.rs` are all already in core
and all already deterministic. A CLI does not need new arithmetic. It needs `clap` and a `main`.

⚠️ This is worth stating plainly because the obvious implementation is the wrong one: a CLI
that talks to `olduvai-server` over HTTP is a thin client with extra steps, and it inverts the
whole point. The reason to hand someone a binary is that it runs **when the network does not**,
and computes the same bytes the exchange would.

### 1.1 The test that keeps them honest

The same mechanical test `positions.rs` applies to itself, and note 33's rule about
`Estimate::update`: **if the CLI ever computes something the browser cannot, a second
implementation has been born.** So the CLI's job description is exactly:

- parse arguments,
- read and write local files,
- call `olduvai-core`,
- print.

It may not encode, rank, or decide admissibility in its own code — the same four verbs the BFF
is limited to in `lib/api/upstream.js`, for the same reason. Three implementations of the
address path is one more than two, and two was already the number that made us write the rule.

---

## 2. ⭐ What each half is *for* — the division is epistemic, not technical

The tempting division is by convenience: "big jobs on the CLI, small jobs in the browser."
That produces two products that do the same thing at different speeds and eventually disagree.

The division that holds is **by what the exchange is allowed to know**:

| | PWA | CLI |
|---|---|---|
| Holds | what has been *submitted* | what has not been submitted **yet** |
| Network | required for matching | never required |
| Data at rest | session + ledger, upstream | the participant's own files, on their disk |
| Provenance of its output | `Source::Asserted` until sealed | identical — the binary is not a witness |

⭐ **The CLI is where a participant works on data that is not yet a claim.** A field record they
are still assembling, a boundary they are still drawing, a season's observations they have not
decided to publish. Note 33's foreman argument extends directly:

> *"Provenence is not a problem. All the annotations are useful inside the foreman... If a
> farmer lies, they will get wrong results and thats it."*

⚠️ **The binary confers no evidential weight.** A reading computed locally and one computed in
the browser are the same reading, both `Asserted`, because a participant running our code on
their own machine is still a participant asserting something. What the binary buys is *not
having to send it anywhere to find out what it computes to*. That is a privacy and latency
property, never a provenance one, and a CLI that printed "verified locally" would be lying in
the most expensive available way.

---

## 3. PWA — what it is actually for here, and the one thing it must not do

A PWA is usually adopted for installability. That is the least interesting part of it here.

⭐ **The load-bearing part is that `olduvai-wasm` already runs offline.** The address path, the
fusion update, the orbit propagation and the footprint test do not need a server. What needs a
server is matching — the trie, the coalition assembly, the ledger. So the honest offline
capability set is *exactly* the set of things core computes, and it is knowable statically
rather than by trial.

⚠️ **A service worker must never serve a stale answer as a current one.** This is note 34 §8's
lesson in the one place it is most likely to recur:

> *"An outage that renders as an epistemic limit is the most flattering possible lie about a
> deployment, because it reads as honesty."*

A cached coalition list rendered without a timestamp is worse than that, because it is not even
an outage — it is a *past truth presented as a present one*, and the participant has no way to
tell. So:

- **Cache the shell, never the answers.** Pages, styles, WASM — yes. `/api/query` responses,
  `/v1/position` estimates, ledger reads — no.
- ⭐ **A queued write must be visible as queued.** If a participant records an observation
  offline, the foreman shows it as *held*, not as *recorded*, until it reaches the server. Note
  34 §8's `upstream-unreachable` gate is the precedent: the state of the connection is never
  reported as a state of the data.

---

## 4. Agent-Reach — what survives

The repo is a Python CLI that gives an agent read access to platforms (Twitter, Reddit,
YouTube, GitHub, RSS), by *selecting and routing to* upstream tools rather than wrapping them.

**⚠️ The domain is irrelevant to us.** We do not read social platforms and are not going to. So
the content of its channel modules extracts nothing at all. Three *structural* ideas do:

### 4.1 ⭐ Ordered backends with genuine probing — this is `ollama.probe()` generalised

Its core mechanism: each capability declares a preferred backend plus fallbacks, and the
installer **actually probes each candidate in sequence** rather than checking whether a binary
exists. First working one wins; broken ones produce a repair suggestion.

⭐ We already do exactly this in one place — `lib/ai/ollama.js`'s `probe()` returns
`{running, models, model, configuredMissing}` and falls back to the first installed model
rather than a hardcoded name. And it is *why* `/api/assistant/status` can tell a participant
"Ollama is not running" before they type anything instead of after they lose a paragraph.

⚠️ The generalisation is the interesting part, and it lands precisely on §1's split: **a
participant may or may not have the CLI.** The web app should discover that the same way it
discovers Ollama — by probing, and by saying which capability is currently answering.

That gives a *third* status alongside `base` and `specialist` in `/api/assistant/status`, and
it is the same shape: `usable`, what is answering, and a remedy when nothing is.

### 4.2 ⭐ `doctor` as a first-class command

Its `agent-reach doctor` reports each channel's status and which backend is active. ⭐ This is
the same instinct as the trace in `lib/ai/pipeline.js`, and note 34 §5's lesson about captions:
*nothing type-checks a sentence*, so the deployment has to be able to state its own condition.

For us `olduvai doctor` would report: core version, whether it agrees with the server's, whether
a session is configured, what the local ledger holds, and — ⭐ the one that matters —
**whether the CLI and the server compute the same bytes for a known input.** That is §1.1's
"second implementation" test, run by the participant rather than by CI.

⚠️ A version mismatch between a downloaded binary and a live server is not hypothetical, it is
the *normal* condition, because the participant chooses when to update. Note 30's determinism
guarantee only holds when both sides are running the same address path. A `doctor` that
reported everything green while the two disagreed would be exactly the kind of flattering lie
§3 warns about.

### 4.3 The install model — ⚠️ partially adopt, and the rejected part matters more

**Take:** opt-in rather than install-everything, `--dry-run`, and a clean uninstall that
removes what it added.

**⚠️ Reject: the credential handling, and reject it explicitly.** Agent-Reach stores cookies in
`~/.agent-reach/config.yaml` at mode 600, tells users to export browser cookies by hand, and
*recommends burner accounts because of ban risk*. That is an honest description of an unsafe
situation — but it is a shape we must never grow. The reason is in this repo's own history:
§9 of note 32 records a Google OAuth client secret committed to a public repo, in a sibling
project, still present in history.

⭐ So the rule for `olduvai-cli`: **it holds a session token and nothing else.** No third-party
credentials, no cookie import, no browser session reuse. If a provider ever needs a key, that
key belongs to the *server's* deployment and never to a participant's laptop. A CLI that
accumulates other services' credentials becomes the highest-value file on the machine, and the
participant did not sign up for guarding it.

---

## 5. geo-three — what survives, and it is not the renderer

A three.js library rendering map tiles as a quadtree of meshes, with pluggable providers, three
LOD strategies, and CPU- or GPU-displaced terrain.

⚠️ **Note 34 §3 already ruled on the renderer**, and nothing here changes it: `three-geo` was
declined because *"what is needed is the soil/elevation relation and the resolution it was
measured at"*, and no dependency was added. geo-three is a better library than the one declined
and the argument against adopting it *now* is identical. It stays on note 34 §9's "a renderer
inside a page, if one earns it" — below the statement of what the reading constrains, never in
place of it.

Two ideas extract cleanly regardless, and both are about *data*, not drawing:

### 5.1 ⭐ The quadtree is the trie, in two dimensions — and this is the real find

geo-three subdivides space into a quadtree where each node has a level, and refines a node when
the camera is close enough to warrant it.

⭐ `crates/olduvai-core/src/trie.rs` and `address.rs` already do this. The address path is a
prefix structure over space, ranked by longest-common-prefix, and `footprint.rs` decides whether
a reading is fine enough to distinguish two neighbouring holdings —
`footprint::Reading::is_distinguishing_for`, cited in `pages/api/observe/[source].js`.

**These are the same idea, and the library states the correspondence more sharply than we
have:** a tile has a *level*, and a level has a *resolution*, and asking a question below that
resolution is asking for something the data cannot answer. geo-three enforces it as
`distance /= Math.pow(2, 20 - node.level)`. We enforce it as a footprint test.

⚠️ The extraction is therefore a vocabulary check, not code: **an address prefix length and an
observation's resolution are the same kind of quantity and should be stated in the same units.**
Note 34 §9 lists `Observation` not recording its own source; this is adjacent and worse-hidden
— a `within` from a 30 m DEM cell and a `within` from a 90 m one are different observations, as
`observe/[source].js` already says in prose, but nothing makes the trie depth agree with the
metres.

### 5.2 ⭐ `MapProvider.fetchTile` is `SOURCES` — the pattern is already ours

Every data source implements one method returning a promise; providers need not hit a network
at all (its `BlueToRedProvider` paints a canvas). ⭐ That is `SOURCES` in
`pages/api/observe/[source].js`: one route, four sources, each declaring what it constrains.

⚠️ The **divergence** is the useful part. geo-three's providers are interchangeable — any
provider can fill any tile. Ours are *not*, and must not be: note 34 §8 records that a provider
wired to `flights` posting a `fix` is refused with 422 `wrong_shape`, because folding it
isotropically would invent the along-track position `Corridor` exists to withhold, **and would
produce a tighter sigma so it would read as an improvement.**

⭐ So: adopt the one-interface-per-source shape, which we have. Refuse the interchangeability,
which is the part that makes their design work and would make ours silently wrong.

### 5.3 ⚠️ The interaction warning, recorded before it bites

geo-three's docs note that GPU-displaced terrain "is not accessible for ray casting, so
interaction with these geometries is limited."

That is a rendering detail with an exact analogue here: **a value computed for display is not
available for reasoning about.** If a terrain surface is ever drawn by displacing vertices in a
shader, the elevations on screen are not elevations the address path has seen. A participant
clicking that surface to place a boundary would be placing it against a picture. Worth writing
down now, because it will be discovered later as a bug about clicking.

---

## 6. What this implies, in order

Nothing below is started.

1. **`olduvai-cli` as a `[[bin]]` over core.** Smallest real step, and the one that makes the
   split in §1 concrete. Commands worth having first: `address`, `observe`, `position`,
   `foreman`, and `doctor` (§4.2).
2. **`doctor`'s agreement check** — CLI and server computing the same bytes for a known input
   (§1.1, §4.2). ⭐ This is the one that protects the determinism guarantee, so it should not
   be deferred to "later polish".
3. **Capability probing in `/api/assistant/status`** — the web app discovering whether a local
   CLI is present, the same way it discovers Ollama (§4.1).
4. **PWA shell caching, with answers explicitly excluded** (§3), and queued writes shown as
   held rather than recorded.
5. **Reconcile trie depth with observation resolution** (§5.1) — vocabulary before code.

⚠️ Not on the list, deliberately: any renderer (§5, note 34 §3), any credential storage in the
CLI (§4.3), and any CLI-side computation that core does not already do (§1.1).
