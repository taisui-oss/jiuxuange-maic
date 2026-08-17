# Jiuxuange Player 1.0.0-rc.1 architecture

## Product boundary

The Player is a separate runtime deployment for released classrooms. It reuses the
OpenMAIC 0.3.0 playback components but does not expose course generation, Pro editing,
provider settings, export, deletion, project-card administration, or assessment pages.

```text
jxg.cccube.cn
  -> one-time launch ticket (60 seconds)
  -> player.jxg.cccube.cn/launch
  -> HttpOnly Player session
  -> scoped five-case package
```

## Runtime layers

```text
Player routes and middleware
  -> Session and package authorization
  -> Public package projection
  -> Native OpenMAIC playback runtime
  -> Server progress adapter
  -> Server Agent/TTS gateway
  -> PostgreSQL audit and progress data
```

The browser receives an answer-free classroom and redacted Agent descriptors. The server
keeps the grading source and Agent personas. The Agent Gateway reconstructs the request
from the private package and ignores browser-supplied provider, model, key, base URL,
stage, scene, and unauthorized Agent IDs.

## Trust boundaries

| Boundary | Trusted input | Rejected or replaced input |
|---|---|---|
| Main site to Player | bearer-protected ticket request | browser-created launch ticket |
| Player session | opaque HttpOnly cookie | localStorage identity and long-lived cross-domain JWT |
| Course content | checked V2 package | external URL, missing file, hash mismatch, incompatible runtime |
| Interaction | package, private answer source, progress version | browser answer key and stale version |
| Agent | server package roles and server provider config | client API key, base URL, model, prompt, foreign Agent ID |
| Progress | PostgreSQL transaction | browser-only completion and duplicate writes |

## Persistence

The current candidate extends the existing Jiuxuange case schema with:

```text
users
case_progress
progress_submissions
player_launch_tickets
player_sessions
player_preview_links
player_ai_runs
```

`progress_submissions` is the idempotency ledger. `case_progress.progress_version` is the
optimistic concurrency token. A duplicate idempotency key with the same request replays
the original response; a distinct write from an old version returns `409`.

## Authorization sequence

1. The main backend authenticates the learner and checks its own course enrollment.
2. The Player launch endpoint verifies its bearer secret.
3. The Player checks sequential case unlock in PostgreSQL.
4. A one-time, package-scoped ticket is stored as a hash.
5. `/launch` consumes it once and creates a hashed, expiring Player session.
6. Package, asset, Agent, and TTS routes enforce the session's package scope.
7. Progress writes additionally enforce content and progress versions.

Preview sessions are explicitly marked `preview`. They may open their scoped package
without sequential unlock but remain subject to expiry, usage count, revocation, model
limits, and audit.

## Release modes

| Mode | Intended use | Identity | Data authority |
|---|---|---|---|
| Anonymous preview | local/internal acceptance only | generated preview UUID | PostgreSQL test database |
| Signed preview link | coach/research preview | preview session | PostgreSQL |
| Formal launch | learner production flow | stable main-site `user_id` | PostgreSQL/RDS |

Anonymous preview must be disabled in production.

## Current boundary

The release registry is intentionally limited to the five Jiuxuange cases. Generic PBL,
external media, and OSS-backed package discovery are not enabled. See
`P5_COMPATIBILITY_MATRIX.md` for the blocking work.
