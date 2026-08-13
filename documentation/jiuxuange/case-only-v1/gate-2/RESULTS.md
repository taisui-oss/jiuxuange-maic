# Case-only V1 Gate 2 Acceptance Record

## Gate Decision

**PASS for Gate 2 candidate acceptance. Production remains NO-GO.**

Gate 2 proves server-authoritative sequential case progress against PostgreSQL, including stable
candidate identity, content/progress versions, idempotent submission, optimistic concurrency,
server-derived unlocking, blocked legacy surfaces, refresh recovery, local-storage independence,
and cross-browser-context recovery. It does not prove production identity, managed database
operations, OSS delivery, or production release readiness.

## Build Identity

- Worktree: `/Users/sijia/Documents/C 立方/OpenMAIC/.worktrees/jiuxuange-case-only-v1`
- Branch: `codex/jiuxuange-case-only-v1`
- Online baseline: `8fb3e52d374053e52214bcd78d69edb958517e6d`
- Gate 1 commit: `5a7319dcb61d596d28f4c582eff3da77076d15f7`
- Gate 2 commit: the commit containing this acceptance record
- Node.js: `v24.7.0`
- pnpm: `10.28.0`
- Verification database: PostgreSQL `16.14`, isolated database on port `55432`
- Candidate mode: `JIUXUANGE_CASE_ONLY=true`

## Implemented Contract

| Concern | Gate 2 implementation |
|---|---|
| Stable identity | Server-only UUID from explicit fixed-candidate environment configuration |
| Client spoofing | Request `user_id` and `x-jiuxuange-user-id` are ignored |
| Source of truth | PostgreSQL schema `jiuxuange_case_only` |
| Content version | `sha256:<64 hex>` over the exact published classroom JSON |
| Progress version | Integer incremented once for each accepted scene transition |
| Idempotency | Required `Idempotency-Key`, stored request hash, status, and response body |
| Concurrency | Progress row lock plus optimistic `progress_version`; stale distinct writes return `409` |
| Quiz completion | Server checks every objective answer; wrong or incomplete answers return `422` |
| Unlocking | Server derives case N+1 access only after case N reaches `completed` |
| Recovery | Browser always reloads current scene and unlock state from the server |
| Closed surfaces | Disabled learner pages return `404`; disabled APIs return `403` |
| Cache behavior | Progress APIs return `Cache-Control: no-store` |

The submission foreign key references the exact progress tuple:

```text
user_id + course_id + case_id + content_version
```

All submissions for that tuple lock the progress row before reserving an idempotency key. This
ordering was verified after an integration test exposed and eliminated a PostgreSQL deadlock in
the reverse order; the foreign key was retained.

## Verified Behaviors

| Behavior | Result |
|---|---|
| Empty database migration | Pass |
| Migration repeatability | Pass; second run is non-destructive |
| Stable candidate `user_id` | Pass |
| First case initially unlocked | Pass |
| Second case initially locked | Pass |
| Locked case direct page | `404` |
| Closed legacy pages | `404` |
| Closed legacy APIs | `403` |
| Incorrect required answers | `422`, no progress increment |
| Duplicate concurrent request | Two `200` responses, exactly one stored transition and one replay |
| Distinct concurrent stale writes | One `200`, one `409`, exactly one transition |
| Refresh recovery | Pass |
| Clear `localStorage` recovery | Pass |
| Second browser/device context recovery | Pass |
| Server-derived next-case unlock | Pass |
| Desktop layout | Pass |
| Mobile 390 x 844 layout | Pass, no document-level horizontal overflow |
| Client identity spoof attempt | Ignored; no spoofed user row created |

## Commands And Exit Codes

```text
bash scripts/jiuxuange-case-only-test-db.sh reset
exit 0: clean PostgreSQL database created and both migrations applied

JIUXUANGE_DATABASE_URL=postgresql://127.0.0.1:55432/jiuxuange_case_only_test \
  pnpm db:case-only:migrate
exit 0: repeat migration completed

JIUXUANGE_DATABASE_URL=postgresql://127.0.0.1:55432/jiuxuange_case_only_test \
  pnpm exec vitest run \
  tests/jiuxuange/case-only-content.test.ts \
  tests/jiuxuange/case-only-route-policy.test.ts \
  tests/jiuxuange/case-only-grading.test.ts \
  tests/jiuxuange/case-only-progress.integration.test.ts
exit 0: 4 files, 11 tests passed

pnpm exec tsc --noEmit
exit 0

pnpm exec eslint --no-warn-ignored <Gate 2 changed TypeScript files>
exit 0

pnpm build:case-only
exit 0: production compilation, TypeScript, 47-page data pass, and standalone assets completed

JIUXUANGE_DATABASE_URL=postgresql://127.0.0.1:55432/jiuxuange_case_only_test \
  pnpm exec playwright test -c playwright.case-only.gate2.config.ts
exit 0: 2 browser tests passed
```

The historical full Vitest suite is not claimed as green. The pre-change baseline was stopped with
exit `130` after existing task-engine failures or empty streams and loss of meaningful progress.
Gate 2 adds no claim beyond the targeted case-only suite, TypeScript, lint, production build, and
browser acceptance listed above.

## Database Evidence

After the final browser run:

```text
user_id: 10000000-0000-4000-8000-000000000002
first case: next_scene_index=10, total_scenes=10, progress_version=10, status=completed
second case: next_scene_index=0, progress_version=0, status=not_started, unlocked by server
browser-concurrent-duplicate submission rows: 1
spoofed user rows: 0
```

## Browser Evidence

- [Desktop initial locked state](./screenshots/gate2-desktop-initial.png)
- [Desktop server-complete state](./screenshots/gate2-desktop-server-complete.png)
- [Mobile cross-device resume](./screenshots/gate2-mobile-cross-device-resume.png)
- [Mobile next-case unlock](./screenshots/gate2-mobile-next-case-unlocked.png)

## Known Limitations

- Fixed candidate identity is intentionally fail-closed and server-only, but it is not formal
  roster or WeCom authentication and cannot support 1,000 distinct learners.
- PostgreSQL was verified locally, not through a managed production database with backup, PITR,
  pooling, observability, or operations runbooks.
- Content remains in repository assets; OSS is not connected.
- Cross-device evidence uses two independent browser contexts with the same server identity; it is
  not a production multi-device login test.
- No 1,000-user capacity or load test was performed.
- Agent discussion, project cards, and personal project assessment remain out of scope.
- No production environment, real learner data, production secrets, or production deployment was
  used.

## Exit Decision

Gate 2 is closed. Development stops here as requested. The next permitted phase is a separately
approved OSS integration gate; production publication is not authorized.
