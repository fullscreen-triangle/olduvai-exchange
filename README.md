

<p align="center">
  <img src="assets/images/iStock_TZ_LandscapeOlduvaiGorge2.jpg" alt="Computational Cathedral" width="300"/>
  <br>
  <em>An agricultural produce exchange built on intrinsic addressing.</em>
</p>



Participants declare what they can do — capabilities, units, time windows. The system
derives their position from those attributes and constructs an address. Matching is a walk
down a trie rather than a scan over a roster, and the entry describing a participant is
*synthesized when asked for* rather than stored in advance.

This is run as a research project. Design decisions and their justifications live in
[`notes/`](notes/); the architecture note is
[`notes/30-programming-structure.md`](notes/30-programming-structure.md), and the idea the
whole thing rests on is in
[`notes/29-the-empty-dictionary.md`](notes/29-the-empty-dictionary.md).

## Layout

| Path | Language | What it is |
|---|---|---|
| [`crates/olduvai-core/`](crates/olduvai-core/) | Rust | Encoder, trie, units, provenance, agents, foreman. Pure, deterministic, no I/O. |
| [`crates/olduvai-server/`](crates/olduvai-server/) | Rust | HTTP surface. Transport only. |
| [`crates/olduvai-py/`](crates/olduvai-py/) | Rust | PyO3 bindings for the analysis harness. |
| [`crates/olduvai-wasm/`](crates/olduvai-wasm/) | Rust | WASM bindings for the web client. |
| [`analysis/`](analysis/) | Python | Coordinate design, calibration, the cohesion test. |
| [`web/`](web/) | JS | Next.js client. |

## Why the core is in Rust

**Determinism, not speed.** The encoder must produce byte-identical addresses for every
caller — server, calibration script, browser — forever. If it does not, intrinsic
addressing, auditability and ledger integrity all fail *silently*: two components disagree
about where a participant sits and nothing raises an error.

That is why there is one crate with three consumers rather than three implementations that
agree today. **Never reimplement the encoder in Python or JavaScript**, however convenient
it looks.

The toolchain is pinned in [`rust-toolchain.toml`](rust-toolchain.toml) for the same
reason.

## Build

```bash
cargo test --workspace          # 105 unit tests + 5 doctests
cargo clippy --workspace --all-targets -- -D warnings
cargo fmt --all --check
```

The doctests are not incidental. Four of them are `compile_fail` blocks asserting that
`Tonnes + TonneKm` and friends **do not compile** — a property no runtime test can observe,
since the point is that the code path does not exist.

Python harness:

```bash
pip install maturin
maturin develop            # builds olduvai-py, installs `olduvai` into the current venv
```

Web client:

```bash
cd web && npm install && npm run dev
```

## ⚠️ Current state: before the gate

[`notes/30-programming-structure.md`](notes/30-programming-structure.md) §7 sets a build
order in which **step 3, the cohesion test, is a real gate**:

1. ✅ Rust core — units, provenance, encoder, trie, agents, foreman, proposals.
2. ◻ PyO3 bindings + calibration harness. *(Bindings done; harness not.)*
3. ◻ **Cohesion test. Gate.**
4. ◻ Query engine + deterministic synthesis.
5. ◻ Gate + append-only ledger.
6. ◻ DSL grammar → WASM → web client.

**The coordinate functions are deliberately not written.** `crates/olduvai-core/src/coords.rs`
fixes the *shape* any such function must have — the `CoordinateFn` trait, its determinism
and intrinsicness obligations, and a required declaration of normalisers — but contains no
`S_k`. Writing a plausible-looking one now would prejudge the empirical question the gate
exists to answer, and a plausible-looking wrong answer is very hard to dislodge once code
is built on it.

The cohesion test asks whether participants people already recognise as similar land in
nearby cells. If a proposed triple fails it, no engineering above it can compensate.

The agent, foreman and proposal modules do **not** jump that gate. None of them reads a
coordinate or an address: χ is computed over a declared self, coherence over a cycle's legs,
and a proposal over a single field. They are step-1 work that happened to be reached late.

## Where AI is, and is not

Nothing in `olduvai-core` calls a model, and nothing in it should. A model's output enters
through [`proposal.rs`](crates/olduvai-core/src/proposal.rs), becomes a `Field` only when a
named participant confirms it, and arrives at `Source::Asserted` — evidential weight `0.0`.
There is no `From<Proposal> for Field` and no constructor that skips the confirmation. That
is the whole integration surface.

The three exclusions are load-bearing rather than cautious:

| Excluded from | Because |
|---|---|
| The address path | A learned coordinate function silently re-addresses every participant when it is retrained. |
| Ranking | Ranking is longest-common-prefix and has no parameters. A learned reranker sets every exchange rate invisibly — `Φ_R`, with the weights *as* the policy. |
| Deterministic synthesis | A synthesized entry must be recomputable from the ledger years later by someone who does not have the model. |

What a model *may* do is read a document and suggest a value, read prose and suggest a
partial declared self, explain a result, or draft the foreman's advisory output. All of it
is inspected before use. **Read-broad, write-narrow**: the assistant may read anything the
participant is entitled to see and write nothing but proposals the participant confirms.

Confirming a proposal does not make it evidence. A farmer agreeing that a model read their
delivery note correctly has said the *reading* is right, not that the note is true — so an
accepted proposal is worth exactly as much as the farmer having typed it.

`Outcome::Corrected` carries what the participant changed the value to. That difference is
the training signal, and it accumulates entirely outside the deterministic core.

### The agent layer is deterministic

[`agent.rs`](crates/olduvai-core/src/agent.rs) and
[`foreman.rs`](crates/olduvai-core/src/foreman.rs) are the "agent" layer and contain no
model. χ is a graph invariant computed by exact enumeration over restricted growth strings;
attention allocation is bisection on a Lagrange multiplier to a fixed `1e-10`. That is what
lets an agent live inside a core that must be byte-reproducible.

`MAX_PARTS = 12` is a refusal, not a limit to be raised: a χ compared against a floor is
only meaningful if χ is exact, so a self too large to enumerate is rejected rather than
approximated.

⚠️ **Two authored placeholders.** `foreman::UNKNOWN_PRECISION_BETA = 0.20` (the no-alert
band) and `min_separation = 1.0` in `analysis/cohesion.py` are not justified by anything
yet. They are part of `Φ_R` — whoever authored them set policy — and they are the same open
empirical question. `unknown_precision_beta()` is exposed to the Python harness precisely so
that question can be measured rather than inherited.

## Two invariants worth knowing before contributing

**Normalisers come from physical or contractual bounds, never from observed data.** The
source paper set its reference values from the extremes of its own database, which means
extending the database shifts every existing address. For a chemistry paper that is a
footnote; here it would silently re-address every participant whenever the market grows.
`Normalisers::provenance` is a required field, and it must cite a real limit.

**`S_e` must be intrinsic.** Complementarity is computed from a participant's own declared
interfaces, never by counting matches against the current roster. Defining it over the
roster would make an address depend on who else has joined — losing exactly the fairness
property the design is for.

## Secrets

`.env*.local` files are gitignored and must never be committed. If you need to report on
one, name the service and redact the value.
