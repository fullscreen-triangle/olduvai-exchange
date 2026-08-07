# 36 — Server deployment

> ⚠️ **Numbering collision.** `36-causal-graph-split-agents.md` already exists. This note was
> created as `36-server-deployment.md` because that is the filename that was asked for; one of
> the two should be renumbered to 37 before either is referenced by number elsewhere.

## What this note is

Everything the server administrator needs to stand this framework up on a VM, plus the one
thing they must be told that is not a configuration value: **two properties of this system are
safe on `localhost` and are not safe on a public address.** They are in §1. Everything else is
mechanical.

The motivation for moving is throughput. Measured on the development machine, `llama3.2:latest`
generated at **1.6–9.7 tokens/second** depending on load, against the **12 tok/s** the staged
pipeline needs. Every answer therefore ran the degraded single-call path with no `check` stage,
and one uncapped run spent the full 180 s ceiling and returned nothing at all. A machine that
clears 12 tok/s restores the staged pipeline and the scoring stage with no code change — the
threshold is read at runtime from an observed rate (`web/src/lib/ai/ollama.js`, `RATES`).

---

## 1. ⚠️ Read before exposing anything to a network

These are not hardening suggestions. They are two places where the current code assumes a
single trusted user on a loopback interface.

### 1.1 The bearer token is not verified

`crates/olduvai-server/src/participant.rs` says so in its own header:

> The token is **not decoded**. It is used whole, as an opaque key.
> This is not authentication and does not claim to be.

Any string in `Authorization: Bearer <token>` names a participant, and a different string names
a different participant. There is no signature, no expiry, and no way for the server to tell a
minted token from an invented one. On loopback that is a deliberate, documented seam — the
comment notes that the day tokens are verified, `Participant::from_headers` changes and no route
does. On a public address it means **anyone who can reach port 8080 can act as any participant
by guessing a string**.

**Therefore: `olduvai-server` must not be reachable from the internet.** See §4 — it binds to
loopback and should stay there, with the Next.js BFF as the only thing that talks to it.

### 1.2 State is in-memory and dies with the process

`crates/olduvai-server/src/routes.rs`:

> a process-lifetime cache with no persistence. The log is supposed to be the truth and a
> [cache] is not a database, and reaching for Postgres now would be building the wrong durable
> thing.

A restart, a deploy, or an OOM kill loses every observation. This is a correct decision for the
current stage — the log is designed to be replayable by whatever persists it later — but the
administrator must know that **there is no database to back up, and no backup will exist**, so
nothing on this server should yet be treated as a system of record.

### 1.3 What follows from both

Run it as a single-tenant service for evaluation. Do not advertise the address, do not put real
commercial consignment data in it, and do not let §1.1 be discovered by a third party before it
is fixed. Fixing it is a code change (token verification), not a configuration the admin can
apply.

---

## 2. SSH key — what to hand over

A **deployment-specific** keypair was generated for this purpose. It is not the existing
`id_ed25519` identity key, so it can be revoked without affecting anything else.

**Give the administrator this, and only this:**

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAII6cRlkCXny3nDsewazm1tcOrkRdqpo/zFFLj0uZKsKp olduvai-deploy-Vingi
```

They append it to `~/.ssh/authorized_keys` for the service account.

**Fingerprint — confirm this over a different channel** than the one that carried the key
(read it aloud, or send by a second medium). A public key intercepted and swapped in transit is
the one attack this step exists to stop:

```
256 SHA256:vZ5DW/qNi+hCGVNZ+aZvhY432XQkMthjDsVIBWFYhQ0 olduvai-deploy-Vingi (ED25519)
```

### 2.1 ⚠️ The private key is not in this note, and must never be

It is at `~/.ssh/olduvai_deploy` on the development machine and stays there. Anyone holding it
is you, as far as the server is concerned.

- **Do not paste it into this file.** `notes/` is tracked in git. `.gitignore` covers `*.pem`
  and `*.key`, and an OpenSSH private key matches **neither** pattern — a key pasted here would
  be committed silently. This repository already has one recorded incident of a credential
  reaching a public remote (note 32 §10); that one cost a key rotation.
- Do not send it to the administrator. They do not need it and cannot use it for anything you
  would want done.
- Do not email or paste it into chat, including to me.

Its permissions were left at the Windows default. Before first use from a Unix-like shell:

```bash
chmod 600 ~/.ssh/olduvai_deploy
```

### 2.2 Connecting

Add to `~/.ssh/config` on the development machine, filling in the two blanks the administrator
gives you back:

```sshconfig
Host olduvai
    HostName <server-address>
    User <service-account>
    IdentityFile ~/.ssh/olduvai_deploy
    IdentitiesOnly yes
```

`IdentitiesOnly yes` matters: without it SSH offers every key in the agent, which both leaks
which identities you hold and can trip a server's `MaxAuthTries` before the right key is tried.

Then `ssh olduvai`. ⚠️ On the **first** connection you will be shown the *server's* host
fingerprint. Verify it against what the administrator tells you out-of-band before accepting —
that prompt is the only moment you can detect a machine-in-the-middle, and accepting it blind
makes every later connection trust whatever answered.

---

## 3. What to ask the administrator for

| Item | Value | Why |
|---|---|---|
| OS | Linux, systemd | Unit files in §5 assume it |
| vCPU | 8+ | Rust build; concurrent Ollama |
| RAM | **32 GB minimum** | §3.1 |
| GPU | Strongly preferred, 16 GB+ VRAM | §3.1 — this is the whole point of moving |
| Disk | 100 GB SSD | Models are 2–40 GB each |
| Inbound | **443 only** | §4 |
| Outbound | 443 | HuggingFace specialist tier; `ollama pull` |

### 3.1 ⚠️ RAM and GPU are the reason for the move, so do not under-specify them

The bottleneck being escaped is token generation, and it is the one line item where a cheaper
VM reproduces the problem this deployment exists to solve.

- **CPU-only inference will not clear 12 tok/s** for any model worth running. A CPU VM is a
  faster version of the current situation, not a fix — the staged pipeline will stay disabled
  and every answer will still skip the `check` stage.
- 32 GB RAM is for the model plus the Rust service plus Node. A 7B model at q4 needs ~5 GB
  resident; larger models scale from there.
- If a GPU is genuinely unavailable, say so explicitly rather than quietly provisioning CPU —
  the threshold in `STAGED_MIN_TOK_PER_SEC` should then be revisited in code instead of the
  system silently degrading on every request.

---

## 4. Network shape

```
internet ──443──> reverse proxy (TLS) ──> Next.js :3000 ──> olduvai-server 127.0.0.1:8080
                                                        └──> Ollama      127.0.0.1:11434
```

**Only the proxy is public.** The two backends listen on loopback and must stay there — that is
what contains §1.1. Do not open 8080 or 11434 to the internet, and do not "temporarily" open
them for debugging; use an SSH tunnel instead:

```bash
ssh -L 8080:127.0.0.1:8080 olduvai
```

### 4.1 ⚠️ The bind address is hardcoded

`crates/olduvai-server/src/main.rs:70`:

```rust
let listener = tokio::net::TcpListener::bind("127.0.0.1:8080")
```

It is **not** configurable by environment variable. This is the correct default and it should
not be changed to `0.0.0.0` — given §1.1, binding this to a public interface exposes an
unauthenticated API. It is recorded here because it is the first thing that looks like a bug
when a container or a multi-host setup cannot reach the service: the fix is to co-locate the
BFF with the server, or to route through the loopback interface, never to widen the bind.

---

## 5. Install

### 5.1 Rust service

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh    # needs >= 1.75
cargo build --release -p olduvai-server                            # -> target/release/olduvai-server
```

`/etc/systemd/system/olduvai-server.service`:

```ini
[Unit]
Description=olduvai-server
After=network.target

[Service]
Type=simple
User=olduvai
WorkingDirectory=/srv/olduvai
ExecStart=/srv/olduvai/target/release/olduvai-server
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

⚠️ `Restart=always` combined with §1.2 means a crash silently empties the observation log and
the service comes back looking healthy. That is acceptable now; it must not survive the move to
real data.

### 5.2 Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2          # or larger, once the GPU is confirmed
```

Verify it clears the threshold — this is the number the whole move is for:

```bash
curl -s http://127.0.0.1:11434/api/generate \
  -d '{"model":"llama3.2","prompt":"Say OK.","stream":false}' \
  | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d["eval_count"]/(d["eval_duration"]/1e9),"tok/s")'
```

**≥ 12 tok/s** ⇒ the staged pipeline engages by itself. Below that, the system still works but
keeps taking the degraded path — see §3.1.

### 5.3 Web

```bash
cd web && npm ci && npm run build && npm start
```

`web/.env.production.local` — ⚠️ **gitignored, never committed** (`.gitignore:29` covers
`.env*.local`; the project README states this rule and note 32 §10 records what it cost when a
credential escaped it):

```bash
OLDUVAI_SERVER_URL=http://127.0.0.1:8080
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
HUGGINGFACE_API_KEY=<token>     # optional; specialist tier is skipped and reported without it
```

Those four are the complete set referenced anywhere under `web/src`.

---

## 6. Verify the deployment

Through the public address, in order. Each line is a claim the previous one does not make.

```bash
B=https://<address>
curl -s -c j.txt -X POST $B/api/session -H 'content-type: application/json' -d '{"email":"you@example.com"}'
TOK=$(awk '/olduvai_session/{print $NF}' j.txt)
H="Cookie: olduvai_session=$TOK"

curl -s -H "$H" $B/api/position          # 200, sigma_m 200000, rests_on_observation false
curl -s -X POST -H "$H" -H 'content-type: application/json' $B/api/observe/gps \
  -d '{"kind":"fix","at":{"latitude":-17.83,"longitude":31.05,"altitude_km":1.47},"sigma_m":30,"source":"instrument","taken_at":2460000.5}'
curl -s -H "$H" $B/api/position          # sigma_m ~30, rests_on_observation true
curl -s -X POST -H "$H" -H 'content-type: application/json' $B/api/assistant/ask -d '{"message":"What does a sigma of 30 m mean?"}'
```

The observation body shape is easy to get wrong and the errors are unhelpful, so both traps are
recorded: `Observation` is an **internally-tagged flat** enum (`{"kind":"fix", ...}`, not
`{"fix":{...}}`), and `Geodetic` **requires `altitude_km`**. `taken_at` is a bare Julian day
number, not a string.

Success criteria: sigma collapses 200 km → 30 m, and the assistant returns HTTP 200. Then read
`trace.shape` in the assistant response — **`"staged"` means the move achieved its purpose**;
`"direct"` means the server is still below 12 tok/s and §3.1 applies.

⚠️ Also confirm from **outside** the VM that the backends are not exposed. Both must fail:

```bash
curl -m 5 http://<address>:8080/health     # must NOT connect
curl -m 5 http://<address>:11434/api/tags  # must NOT connect
```

---

## 7. Revocation

The keypair is disposable by design. To revoke: have the administrator delete the line matching
`SHA256:vZ5DW/...` from `authorized_keys`, then locally

```bash
rm ~/.ssh/olduvai_deploy ~/.ssh/olduvai_deploy.pub
ssh-keygen -t ed25519 -f ~/.ssh/olduvai_deploy -N "" -C "olduvai-deploy-$(hostname)"
```

and send the new public key. Nothing else depends on it.

## 8. Open items this deployment does not fix

- §1.1 token verification — **the blocker for any multi-participant or public use.**
- §1.2 persistence — no system of record until the log is durable.
- Wrong-shaped observations return `not_implemented` instead of 422. Root cause is in the axum
  extractor layer: rejection happens at deserialization with a `text/plain` body, so the
  handler's `wrong_shape` never runs and the BFF's forward-verbatim guard
  (`web/src/pages/api/observe/[source].js:166`) finds no `reason` field to forward.
- `/api/participants/me` forwards to `/v1/participants/me`, which does not exist upstream, so
  `/dashboard/profile` always shows its gate.
- No `olduvai-cli` binary exists (note 35 §6, implication 1). The workspace has four members
  and no `[[bin]]`; the engine referred to elsewhere as "the CLI" is `olduvai-server`.
