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

> ⭐ **Status: deployed, live, and the staged pipeline engaged on its own.** The full stack runs
> on `91.98.157.147` behind TLS and a password gate. Measured **23.0 tok/s** on `llama3.2:3b`,
> CPU-only — 1.9× the threshold — and a verified answer over the public URL ran
> `understand → ground → specialise → compose → check` with **`degraded: false` at every stage**.
> The `check` stage had never once run on the development machine. §6.1 records the run.
>
> **The hardware section of this note was written before the machine could be measured and its
> central claim was wrong; §3.2 records the correction rather than hiding it.**

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

### 1.3 ⚠️ There is no cloud firewall, and that changes the risk from theoretical to live

Verified on the machine: `ufw status` is **inactive**, and the provider applies no network
filtering by design — the gist states this deliberately ("that is the right setup for a machine
you actually build on"). **Every port that gets bound is immediately reachable from the whole
internet.**

Combined with §1.1 that is not a hardening nicety, it is the difference between an unverified
token being a documented seam and being a live vulnerability. **Enable the firewall before
binding anything beyond SSH.** ⚠️ Allow 22 first or you lock yourself out:

```bash
ufw allow 22/tcp && ufw allow 443/tcp && ufw enable
```

Currently listening: `22` (SSH) and `11434` (Ollama, correctly bound to `127.0.0.1` only).
Nothing else. Ollama has **no authentication whatsoever** — never set `OLLAMA_HOST=0.0.0.0`;
tunnel instead (§4).

### 1.4 ⚠️ You hold root, but not ultimate control

The server sits in a Hetzner project administered by a third party ("Julian" per the gist),
whose API token **can rebuild or delete this machine regardless of who holds SSH**. Root does
not protect against that.

With §1.2 (no persistence) this compounds: a rebuild destroys the observation log and there is
no backup, because there is no database to back up. Treat the machine as **disposable** until
both the project is transferred and the log is made durable. The gist offers to restore it "in
ninety seconds" — which is a statement about the *host*, not about your data.

### 1.5 What follows from all of these

Run it as a single-tenant service for evaluation. Do not advertise the address, do not put real
commercial consignment data in it, and do not let §1.1 be discovered by a third party before it
is fixed. Fixing it is a code change (token verification), not a configuration the admin can
apply.

⚠️ Housekeeping the gist flags: `/root/.ssh/authorized_keys.pre-kundai` still exists (confirmed
present, `-rw-------`). It is a disabled backup of the previous owner's key. It is **not** read
by sshd at that filename and grants no access as it stands, but it should be removed once you
are satisfied your own access works: `rm /root/.ssh/authorized_keys.pre-kundai`

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
    HostName 91.98.157.147
    User root
    IdentityFile ~/.ssh/olduvai_deploy
    IdentitiesOnly yes
```

`IdentitiesOnly yes` matters: without it SSH offers every key in the agent, which both leaks
which identities you hold and can trip a server's `MaxAuthTries` before the right key is tried.

Then `ssh olduvai`. ✅ **You will not see a fingerprint prompt**, because the host keys were
verified against the gist and written to `known_hosts` before the first connection (§3.1) —
which is the right order. That prompt is the only moment a machine-in-the-middle is detectable,
and accepting it blind makes every later connection trust whatever answered. If it *does* appear
now, something changed: do not accept it, re-scan and compare against §3.1.

---

## 3. The server — provisioned and measured

⭐ **The server exists.** Access details arrived by gist and are recorded here; §3.2 supersedes
the hardware estimates this section originally carried, because those were written before the
machine could be measured and **one of them was wrong in the direction that mattered**.

| Item | Provisioned | Verified |
|---|---|---|
| Address | `91.98.157.147` (Falkenstein, DE) | ✅ reachable |
| OS | Ubuntu 26.04 LTS, kernel 7.0.0-29 | ✅ systemd |
| CPU | 4 shared vCPU, AMD EPYC-Genoa | ✅ |
| RAM | 8 GB (7.5 GB usable) | ✅ **no swap** |
| Disk | 160 GB NVMe (142 GB free) | ✅ |
| GPU | **none** — CPU-only inference | ✅ virtio VGA only |
| Traffic | 22 TB/month + IPv6 /64 | — |
| Access | root, via the key in §2 | ✅ logged in |

### 3.1 ⚠️ Host key fingerprints — verified, not assumed

The gist listed three fingerprints. I scanned the server independently with `ssh-keyscan` and
**all three match**, so the keys are now pinned in `~/.ssh/known_hosts`:

```
ED25519  SHA256:LKejdLO4Vj2dTImsrknBCWiG6j0Q+Nb1i/ZFzA5Ghk4
ECDSA    SHA256:Z33mg/+K2/cQVha43YSWWeMy3Nc2vqPo9k9Tskr9KhE
RSA      SHA256:0gHOKOPPJIpOnshImY+9nSejojaIsusLYQPQ16sidjk
```

The key generated in §2 (`SHA256:vZ5DW/...`) was already installed in
`/root/.ssh/authorized_keys` alongside `buhera-login-kunda`. Confirmed on the server itself.

### 3.2 ⭐ CPU-only clears the threshold — the earlier estimate was wrong

This section previously demanded 32 GB and a 16 GB GPU, and asserted that **"CPU-only inference
will not clear 12 tok/s for any model worth running."** That claim was made without a machine to
test and **the measurement refutes it.** Warm runs on this server, CPU-only:

| Model | tok/s | Verdict |
|---|---|---|
| `llama3.2:1b` | **31.5** | clears, but 3b is better and also clears |
| `llama3.2:3b` | **23.0** | ⭐ **recommended** — 1.9× the 12 tok/s threshold |

For comparison, the development machine ran **1.6–9.7 tok/s** and never once cleared it. So this
4-vCPU box is a **2.4–14× improvement with no GPU at all**, and — the point of the exercise —
**the staged pipeline engages by itself and the `check` stage returns.** Model load is 340 ms
warm, and a full answer completed in 4.1 s.

⚠️ The real constraint here is **RAM, not speed**: 7.5 GB total, ~3 GB free with one 3b model
resident, and **no swap configured**. Consequences:

- **Do not run a 7B model.** At q4 it needs ~5 GB resident, which leaves nothing for Node and
  the Rust service. With no swap, exhaustion is an OOM kill, not a slowdown — and per §1.2 an
  OOM kill silently empties the observation log while `Restart=always` brings the service back
  looking healthy. The gist says 7–8B "works at Q4"; that is true of Ollama in isolation and
  not true of this stack as a whole.
- Consider a swapfile as a safety margin, accepting that swapping during inference is slow:
  `fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`
- Keep `keep_alive` bounded so an idle model is evicted rather than held.

⭐ **The conclusion to carry forward: no GPU upgrade is needed.** If more headroom is ever
wanted, buy **RAM before a GPU** — speed is already sufficient and memory is what is scarce.

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

### 5.2 Ollama — ✅ already installed and measured

Done on `91.98.157.147`: the service is `active`, bound to `127.0.0.1:11434`, with
`llama3.2:3b` and `llama3.2:1b` pulled (3.2 GB total).

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2:3b       # ⭐ 3b, not 7b/8b — see §3.2 on the RAM ceiling
```

⚠️ Measure **warm**, not cold. A first call pays the model load and reports a rate that reflects
loading rather than generating — that mistake cost two wasted runs of 20 s and 94 s during local
development before the probe was removed from the code entirely:

```bash
curl -s http://127.0.0.1:11434/api/generate -d '{"model":"llama3.2:3b","prompt":"hi","stream":false,"options":{"num_predict":4}}' >/dev/null
curl -s http://127.0.0.1:11434/api/generate \
  -d '{"model":"llama3.2:3b","prompt":"Explain a 30 m position uncertainty.","stream":false}' \
  | python3 -c 'import json,sys;d=json.load(sys.stdin);print("%.1f tok/s"%(d["eval_count"]/(d["eval_duration"]/1e9)))'
```

**Measured: 23.0 tok/s** — 1.9× the 12 tok/s threshold, so the staged pipeline engages on its
own with no code change.

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
`"direct"` means the server is still below 12 tok/s and §3.2 applies — though at a measured
23.0 tok/s that should not happen, so `"direct"` here would mean something is loading the box.

⚠️ Also confirm from **outside** the VM that the backends are not exposed. Both must fail:

```bash
curl -m 5 http://<address>:8080/health     # must NOT connect
curl -m 5 http://<address>:11434/api/tags  # must NOT connect
```

### 6.1 ⭐ The verification run — what actually happened

Executed against `https://91.98.157.147` from the development machine. ✅ all of it.

| Check | Result |
|---|---|
| Gate closed without credentials | `401` |
| Gate open with them | `200` |
| `8080` / `11434` from outside | **connection refused** — §4 holds |
| `POST /api/session` | `200`, 64-hex-char opaque token |
| `POST /api/observe/gps` | `200` |
| `GET /api/position` | 200 km prior → **29.99999969 m**, `rests_on_observation: true`, `strongest_source: "instrument"` |
| `GET /api/process/foreman` | `200` |
| Assistant, first question | `200` in **14.2 s** |
| Assistant, second question | `200` in **30.8 s**, ⭐ **`staged`** |

⭐ **The point of the move, confirmed.** The second answer ran
`understand` (5.3 s) → `ground` (12.0 s) → `specialise` → `compose` (8.9 s) → **`check` (4.5 s)**,
every stage `degraded: false`. On the development machine the pipeline never once left the
single-call path and `check` never ran at all.

The first question still took the capped `direct` path, and that is correct rather than a
fault: no rate is remembered until a call reports one, so question one is always unmeasured. Its
trace says so in the participant's own words. Question two, with 23 tok/s known, took the full
shape — which is both halves of the passive-measurement design working.

⚠️ Two things a reader of the response needs to know, both of which cost a wrong diagnosis here:

- `/api/assistant/ask` returns **NDJSON progress events**, not one JSON object — `open`, then a
  `stage` line per stage, then `result`. Piping it to a JSON parser fails on line 2.
- `sigma_m` lives at **`data.estimate.sigma_m`**, not `data.sigma_m`.

### 6.2 ⚠️ `/api/session` refuses in production, and that had to be answered

`pages/api/session.js` guards itself with `NODE_ENV !== "production"` so a deployment cannot
ship an open door by accident. Correct — and it made every data route 401 behind the gate,
which is the same wall the route was written to remove.

It cannot be opened by configuration. Next **inlines `process.env.NODE_ENV` at build time**:
the compiled bundle contained the frozen literal `"production" !== "production"`. Setting
`NODE_ENV=development` in the systemd unit changed nothing, and `npm run build` re-forces
production internally, so a rebuild under a different ambient value changed nothing either.
Both were measured before concluding it.

⚠️ **A correction to the paragraph above, measured 2026-08-21.** "Setting `NODE_ENV=development`
in the systemd unit changed nothing" is true *of the session guard* and false in general, and the
difference cost two further debugging sessions.

`NODE_ENV` is read in **two** places with two different timings:

| Read | When | Effect of the unit's value |
|---|---|---|
| `session.js`'s `NODE_ENV !== "production"` guard | **build time** — Next inlines it | none, as §6.2 says |
| `session.js:156` `if (NODE_ENV === "production") parts.push("Secure")` | **request time** | ⭐ decisive |

So with `Environment=NODE_ENV=development` the deployment served an **HTTPS origin issuing its
session cookie without `Secure`**, and ran a development bundle. The unit is now
`Environment=NODE_ENV=production`; verified live, the cookie is
`Path=/; HttpOnly; SameSite=Lax; Max-Age=28800; Secure`.

⚠️ **This lives only in `/etc/systemd/system/olduvai-web.service`, which is not in this repo.** A
rebuilt server must set it again, and that is the whole reason it is written down here.

⚠️ Stated precisely, because the temptation to over-claim is strong: this is **not** confirmed to
be the cause of the original *"chrome would not let me log in, edge works"* report. Chrome does
generally accept a non-`Secure` `SameSite=Lax` cookie over HTTPS. What is measured is only that
the flag was missing, the bundle was a dev build, and both are now corrected.

⭐ So the guard now takes an explicit opt-in rather than being relaxed:

```
OLDUVAI_ALLOW_LOCAL_SESSIONS=yes     # in web/.env.production.local
```

The default is unchanged — production still refuses. The variable survives inlining because it
is not a Next built-in, so the compiled guard reads
`false || process.env.OLDUVAI_ALLOW_LOCAL_SESSIONS === "yes"` and is a genuine runtime read.
⚠️ It must not be set on a deployment holding real consignment data, and it does not make a
session mean more than it did: still no identity, still no standing on the exchange.

### 6.3 ⚠️ No access gate is the fix for §1.1

The Caddy `basic_auth` gate — and the invite phrase that replaced it (§6.5) — are locks on the
front door of a building whose interior doors do not lock yet. They keep strangers off the
deployment; neither **verifies bearer tokens**, so anyone past them can still name any
participant by inventing a string. §1.1 remains a code change, and this deployment stays
single-tenant until it lands.

---

### 6.4 ⚠️ Chrome refused the site entirely, and the advice to "click through" was wrong

The first TLS configuration used `tls internal` on the bare IP `https://91.98.157.147`. Edge
allowed it after a warning; **Chrome refused it with no way to proceed at all**. That is not
Chrome being stricter about a self-signed certificate in the usual sense — the certificate Caddy
generates for an IP has an **empty subject** and a 12-hour lifetime, and Chrome hard-fails that
class of certificate without offering the "Advanced → Proceed" escape. There was no button to
click, so the sign-in page was simply unreachable in that browser.

⚠️ **No certificate authority issues publicly-trusted certificates for bare IP addresses.** No
amount of Caddy configuration reaches this; the fix has to be a hostname.

⭐ **`sslip.io` supplies one for free.** It is wildcard DNS: `91-98-157-147.sslip.io` resolves to
`91.98.157.147`, which is enough for Let's Encrypt to complete an HTTP-01 challenge and issue a
real certificate. Verified with `curl` **without** `-k`:

| | |
|---|---|
| subject | `CN=91-98-157-147.sslip.io` |
| issuer | `Let's Encrypt CN=YE1` |
| expires | 8 Nov 2026 (auto-renewed by Caddy) |

The live URL is **https://91-98-157-147.sslip.io**. Plain HTTP redirects to the hostname and
never to the IP — redirecting to the IP would land the browser back on the certificate it cannot
accept. The bare-IP block is kept only so that an old bookmark reaches *something*; it still
serves the self-signed certificate and Chrome will still refuse it. That is expected, and is not
a defect to be fixed.

### 6.5 ⭐ The invite phrase — the gate moved to the seam it belongs to

The `basic_auth` block was removed because it sat in front of **every** route, so it fired before
the landing page or `/signin` could render. The result was a browser credential box standing in
front of the app's own sign-in pages, re-challenging on every navigation — a password prompt for
a site whose whole first screen exists to explain what it is.

Removing it was right, but it left the deployment open to anyone who knows the hostname, which
was not asked for either.

⭐ The protection now lives in **`pages/api/session.js`**, gated on `OLDUVAI_INVITE`:

| route | before | now |
|---|---|---|
| `/`, `/signin`, `/signup` | 401 credential box | **200, public** |
| `POST /api/session` without the phrase | opened a session | **403 `not_invited`** |
| every data route without a session | 401 | 401 (unchanged) |

Because every data route already calls `requireSession`, and `requireSession` rejects without the
cookie, gating the one route that *mints* a session gates the engine, the observation log, the
foreman and the assistant behind it. One check at the only door, rather than a wall in front of
the building.

⚠️ **It is a phrase, not a password, and the UI says so.** It identifies nobody and grants no
standing; it only decides whether this deployment will open a working session. The sign-in field
is labelled "Invite phrase" and is `required={false}` — a local run configures none, and there
the route ignores it entirely.

⚠️ `OLDUVAI_INVITE` is read at **request** time (a custom variable, so Next does not inline it the
way it inlines `NODE_ENV` — see §6.2), but `.env.production.local` is only loaded at start, so
changing it needs a service restart.

---

### 6.6 ⭐ The answers were useless, and the reasons were not the model

Two questions on the live deployment, both around two minutes, both worthless:

> *"I have 3t of chamomille tea leaves, where can I sell them?"* → **"we could not determine the
> units or the items you are selling"**
>
> *"What is my position?"* → a numbered list of the pipeline's own working headings, ending
> **"I don't know your current position ... I don't have direct access to your observation log."**

⚠️ **The number was in `Estimate` the whole time.** Four separate defects, none of them the
model being small:

**1. The model was never told anything the engine knows.** `pages/api/assistant/ask.js` correctly
refuses to put the model behind the Rust engine — `README.md`: *"nothing in `olduvai-core` calls a
model, and nothing in it should."* That was over-applied into *"the model is told nothing the
engine knows"*, which is a different claim. ⭐ **Reading state and putting it in a prompt does not
make anything non-deterministic** — `Estimate::update` is still the only fold, and this only reads
its result. The determinism rule constrains **where computation lives**, not whether a model may
be *told a fact*. Fixed by `web/src/lib/ai/facts.js`, whose lines are threaded through `run()` →
`memory()` → the `ground` and `compose` prompts.

**2. `compose` returned its own scaffolding.** Its inputs are titled sections — *"Your reading of
it:"*, *"What is known and unknown:"* — and the model read them as an **output format**. That is
exactly the text that came back. Fixed with three lines at the top of the prompt saying the
sections are working notes.

**3. `understand` was taught that abbreviations are unknowable.** Item 2 said *"anything left
without a unit"*, and the pipeline spent 42 s concluding it did not know what `t` meant. It is
tonnes. ⚠️ A refusal costs the reader the same wait as an answer, which makes "say nothing safely"
worse than being wrong.

**4. `ground` invented our internals, and `check` passed it.** Asked what would have to be true to
answer well, it produced *"we use a fixed coordinate function to compute addresses"* — pure
invention, the model has never seen this codebase — and `compose`, having nothing better, handed
that to the participant as an answer about **selling tea**. `check` scored it `grounded, bounded,
answerable` and was *not wrong*: it **is** all three. ⭐ **The check axes score the shape of an
answer, not whether it was any use.** Fixed by forbidding internals in both stages — `ground` must
not guess at them, `compose` must not repeat them — because a stage told only not to repeat them
still generates them, and a later stage under token pressure reaches for whatever is in its notes.

A fifth appeared during verification: `check` scores `unitful`, so the model began annotating
every line and produced **"Units: degrees (latitude) and meters (longitude)"**. Longitude is not
in metres. Asked to label everything, it labels the things that do not take labels, and **invents**
a unit rather than omit one. The instruction now says where units belong *and where they do not*.

Measured, same machine, same model (`llama3.2:3b`, 20 tok/s):

| question | before | after |
|---|---|---|
| "What is my position?" | ~120 s, scaffolding + "I don't know" | **37 s**, coordinates in degrees |
| tea | ~120 s, refused over units | **46 s**, reads 3t as tonnes, names the real gap |

⚠️ **What is still not good, stated rather than tuned away.** The position answer opens with a
vague sentence and drops the sigma; the tea answer is generic. That is the ceiling of a 3b model
across a five-stage prompt, not a missing instruction — and the next honest move is a better model
or fewer stages, not more prompt text. ⚠️ Note also that the **first question after any restart
takes the `direct` path**, because throughput is measured on the way past and is unknown until
something has run. A one-call answer and a five-stage answer are different answers; when comparing
runs, check `trace.shape` before concluding anything.

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
