# Olduvai Exchange

An agricultural produce exchange built on intrinsic addressing.

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
| [`crates/olduvai-core/`](crates/olduvai-core/) | Rust | Encoder, trie, units, provenance. Pure, deterministic, no I/O. |
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
cargo test --workspace          # 53 unit tests + 5 doctests
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

1. ✅ Rust core — units, provenance, encoder, trie, exhaustive tests.
2. ◻ PyO3 bindings + calibration harness.
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
