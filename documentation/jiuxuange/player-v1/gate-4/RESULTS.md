# Gate P4: Five-case equivalence results

## Verdict

- Deterministic course equivalence: **PASS**
- Server-authoritative progression and sequential unlock: **PASS**
- Desktop and mobile rendering: **PASS**
- Live Agent provider acceptance: **CONDITIONAL**
- Production traffic switch: **NOT AUTHORIZED**

The five Jiuxuange cases use the original OpenMAIC playback chrome, slide renderer,
action engine, quiz component, role bar, chat area, and completion page. The Player
removes authoring settings and export controls by design. The course body is compared
separately from those intentionally removed controls.

## Candidate

- Branch: `codex/jiuxuange-player-v1`
- Player version: `1.0.0-rc.1`
- OpenMAIC baseline: `0.3.0`
- Package format: `MAIC Course Package V2`
- Gate baseline commit: `45cd37282e84e76639f2c4681f4faa09cc304b13`

The final P4 commit and tag are recorded after this report is committed.

## Five-case package audit

| Package | Scenes | Slides | Native quizzes | Required questions | External URLs |
|---|---:|---:|---:|---:|---:|
| `breakfast-chain-six-elements-foundation` | 10 | 9 | 1 | 5 | 0 |
| `convenience-bee` | 10 | 8 | 2 | 5 | 0 |
| `fresh-grocery-comparison` | 10 | 8 | 2 | 5 | 0 |
| `shein-system-capabilities` | 10 | 8 | 2 | 5 | 0 |
| `florasis-business-model` | 10 | 8 | 2 | 5 | 0 |

Each package was opened in the production Player build. The correct title and the four
configured roles were present. The mobile layout uses the original autonomous layout,
with the thumbnail rail and roundtable collapsed to preserve a usable course canvas.

## Interaction acceptance

The browser acceptance path for the first case covered:

1. nine sequential native scenes;
2. a deliberately incomplete quiz attempt;
3. native retry;
4. a partial result of 80/100 with four correct and one incorrect;
5. a complete result of 100/100 with five correct;
6. transition to the OpenMAIC completion scene;
7. refresh recovery to `课程完成` and `11/11` from server progress.

The quiz answer key is not present in the learner package and is not returned by the
interaction API. The browser receives only per-question correctness and feedback.

## Automated verification

Command:

```text
JIUXUANGE_DATABASE_URL=postgresql://127.0.0.1:55432/jiuxuange_case_only_test \
pnpm exec vitest run \
  tests/jiuxuange/case-only-content.test.ts \
  tests/jiuxuange/case-only-grading.test.ts \
  tests/jiuxuange/case-only-preview-runtime.test.ts \
  tests/jiuxuange/case-only-progress.integration.test.ts \
  tests/jiuxuange/case-only-route-policy.test.ts \
  tests/jiuxuange/player-chat-policy.test.ts \
  tests/jiuxuange/player-initial-scene.test.ts \
  tests/jiuxuange/player-package-v2.test.ts \
  tests/jiuxuange/player-quiz-grade.test.ts \
  tests/jiuxuange/player-route-policy.test.ts \
  tests/jiuxuange/player-session.integration.test.ts
```

Result: **11 files passed, 33 tests passed, exit code 0**.

The progression suite submits a wrong interaction and then a valid interaction for
every quiz in all five cases. It verifies the lock before each case, the unlock after
completion, idempotent replay, and rejection of distinct concurrent writes from the
same `progress_version`.

Build command:

```text
pnpm build:player
```

Final result: **exit code 0**. The first build attempt failed because the ignored
workspace postinstall left `@openmaic/dsl/dist` absent. Running the package's own build
restored the generated contract; subsequent full OpenMAIC and Player production builds
both passed. Deployment must use a normal frozen install with workspace postinstall.

## Visual and action comparison

Baseline:

```text
documentation/jiuxuange/player-v1/gate-4/screenshots/openmaic-baseline-convenience-bee.png
```

Candidate:

```text
documentation/jiuxuange/player-v1/gate-4/screenshots/player-final-convenience-bee.png
```

Command:

```text
node scripts/compare-jiuxuange-player-screenshots.mjs \
  documentation/jiuxuange/player-v1/gate-4/screenshots/openmaic-baseline-convenience-bee.png \
  documentation/jiuxuange/player-v1/gate-4/screenshots/player-final-convenience-bee.png \
  255,87,771,434
```

Result:

```text
changedPixelRatio: 0.00289288553377922
meanAbsoluteChannelDelta: 0.20766614666451494
threshold: 0.01
passed: true
exit code: 0
```

The package test also compares each scene's action array to the source classroom action
array. This prevents a package transformation from silently changing the event sequence.

## Evidence files

Final evidence includes:

- one complete OpenMAIC baseline screenshot;
- one final Player comparison screenshot;
- five desktop Player screenshots;
- one final 390 x 844 mobile screenshot;
- two earlier diagnostic screenshots retained to show the sidebar/mobile issues found
  and corrected during acceptance.

## Remaining condition

No real Qwen/DeepSeek credentials were supplied to this worktree. Agent request policy,
role filtering, server-owned provider configuration, fallback, SSE error auditing, and
AI run persistence are covered by automated tests, but a real learner question has not
been accepted against the production provider account. This condition blocks a claim of
full P4 completion and blocks replacement of the current online classroom route.
