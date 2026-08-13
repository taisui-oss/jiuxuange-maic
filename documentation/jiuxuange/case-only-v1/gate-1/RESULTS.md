# Case-only V1 Gate 1 Acceptance Record

## Gate Decision

**PASS**

Gate 1 proves a candidate-only learner surface and lightweight case player. It does not prove
server-authoritative progress, trusted production identity, cross-device recovery, or production
release readiness. Those are Gate 2 concerns.

## Build Identity

- Worktree: `/Users/sijia/Documents/C 立方/OpenMAIC/.worktrees/jiuxuange-case-only-v1`
- Branch: `codex/jiuxuange-case-only-v1`
- Baseline commit: `8fb3e52d374053e52214bcd78d69edb958517e6d`
- Baseline branch: `codex/jiuxuange-v6-formal-release`
- Candidate mode: `JIUXUANGE_CASE_ONLY=true`
- Content source: pre-generated classroom JSON under `content/jiuxuange/classrooms`
- Gate 1 content version: SHA-256 of the exact classroom JSON payload

## Verified Behaviors

| Behavior | Result |
|---|---|
| Existing online source preserved | Candidate is isolated in a new worktree and branch |
| OpenMAIC authoring source preserved | No authoring, generation, Agent, editor, or classroom source was deleted |
| Learner entry converged | `/` and `/courses/business-model` render the case-only directory |
| Case sequence shown | Breakfast case is available; Convenience Bee is visibly locked |
| Lightweight player | Renders pre-generated slides through `@openmaic/renderer` without full Stage/runtime stores |
| Native interaction rule | All objective questions must be correct; retry stays local to the current quiz |
| Closed learner pages | Direct page requests return 404 |
| Closed APIs | Direct API requests return 403 |
| Desktop path | Directory, player, five-question completion, and completion screen passed |
| Mobile path | 390 x 844 directory and player passed without document-level horizontal overflow |
| Storage clearing | Clearing `localStorage` does not break or authorize a learner route |

## Closed Surface

The source remains in the repository, but case-only runtime access is denied for:

- full classroom route;
- course generation and generation preview;
- free-learning chat and generation APIs;
- project card and project assessment routes;
- PBL and assessment APIs;
- evaluation pages.

The access-code and health APIs remain reachable. Gate 2 adds only the dedicated
`/api/jiuxuange/case-only/*` progress endpoints.

## Commands And Exit Codes

```text
node_modules/.bin/vitest run \
  tests/jiuxuange/case-only-route-policy.test.ts \
  tests/jiuxuange/case-only-content.test.ts \
  --maxWorkers=1
exit 0: 2 files, 6 tests passed

node_modules/.bin/eslint --no-warn-ignored <Gate 1 changed files>
exit 0

JIUXUANGE_CASE_ONLY=true node_modules/.bin/next build
exit 0: production compilation, TypeScript, page-data collection, and 48 routes completed

node scripts/prepare-standalone-assets.mjs
exit 0

node_modules/.bin/playwright test -c playwright.case-only.config.ts
exit 0: 3 browser tests passed
```

The pre-change full Vitest baseline was not green evidence: it was manually stopped with exit 130
after two existing task-engine cases failed or produced empty streams and the run stopped making
meaningful progress. Gate 1 therefore makes no claim that the historical full suite is green.

## Browser Evidence

- [Desktop directory](./screenshots/gate1-desktop-home.png)
- [Desktop player](./screenshots/gate1-desktop-player.png)
- [Desktop completion](./screenshots/gate1-desktop-complete.png)
- [Mobile directory](./screenshots/gate1-mobile-home.png)
- [Mobile player](./screenshots/gate1-mobile-player.png)

## Known Limitations

- Gate 1 progress is intentionally not authoritative and does not unlock the second case.
- A page refresh restarts the Gate 1 player; Gate 2 must resume from PostgreSQL.
- The mobile slide is fit-to-width; source slide typography is smaller than native mobile text.
- Content files remain repository assets. OSS is explicitly out of scope for this candidate.
- Access code is not a stable learner identity. Gate 2 uses a stable candidate `user_id` contract,
  while roster and WeCom production integration remains an external production dependency.

## Gate 2 Entry Conditions

Gate 2 may begin only after this Gate 1 result is committed independently. Gate 2 must add actual
PostgreSQL persistence, optimistic concurrency, idempotency, content/progress versions, server-side
unlock derivation, and cross-context browser evidence without reopening any closed product surface.
