# Jiuxuange Player V1 release test set

## Candidate

```text
Player: 1.0.0-rc.1
OpenMAIC compatibility baseline: 0.3.0
Course package format: MAIC Course Package V2
Source baseline: 5febdef28b149b35b519cec4d6c433cb45a956af
```

The immutable acceptance fixture is
`tests/jiuxuange/fixtures/player-v1-acceptance-baseline.json`. It locks the five package
IDs, source and content hashes, scene and question counts, accepted visual threshold,
load-test result, evidence files, and explicit release boundaries.

`tests/jiuxuange/player-release-baseline.test.ts` verifies that the checked-in runtime,
package index, package ZIP files, and evidence still match that fixture. A content change
must create a reviewed baseline version; do not rewrite the current fixture silently.

## Player release tests

Start or provide the isolated PostgreSQL test database, then run:

```text
JIUXUANGE_DATABASE_URL=<test-db> pnpm test:player-release
```

The release config disables file-level parallelism because the two PostgreSQL integration
files reset shared test tables. This preserves concurrency assertions inside each test
while preventing unrelated test files from truncating the same tables simultaneously.

Recorded result on 2026-08-18:

```text
Test Files  14 passed (14)
Tests       40 passed (40)
Exit code   0
```

## Full repository tests

Stable full-suite command for the shared PostgreSQL test database:

```text
JIUXUANGE_DATABASE_URL=<test-db> pnpm exec vitest run --maxWorkers=1
```

Recorded result on 2026-08-18:

```text
Test Files  321 passed (321)
Tests       2330 passed (2330)
Exit code   0
```

The production Player build and package audit also passed:

```text
pnpm build:player
pnpm audit:jiuxuange-player-release
```

## Boundaries

- Five-case deterministic playback and server-authoritative progression passed.
- Desktop and 390 x 844 mobile rendering passed.
- Live Qwen, DeepSeek, and TTS provider acceptance remains conditional.
- Generic OpenMAIC classroom import remains blocked.
- RDS, DNS, TLS, grey release, and production traffic switch were not executed.
