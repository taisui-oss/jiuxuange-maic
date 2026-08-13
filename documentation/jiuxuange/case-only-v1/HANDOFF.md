# Jiuxuange Case-only V1 Candidate Handoff

## Objective

This isolated candidate reduces the learner product to one sequential business-model case path.
OpenMAIC authoring and full classroom capabilities remain in source and can still be used outside
case-only runtime mode. They are not exposed to learners when `JIUXUANGE_CASE_ONLY=true`.

## Frozen Scope

### Included

- a minimal case directory;
- a read-only slide player based on `@openmaic/renderer`;
- required objective and open interactions;
- sequential server-derived unlocking;
- stable user id at the case-progress boundary;
- PostgreSQL progress, idempotency, and optimistic concurrency;
- content and progress versions;
- five complete business-model case packages and a coach-only answer key;
- desktop and mobile acceptance evidence.

### Excluded

- OSS;
- Agent discussion;
- personal project assessment;
- project card editing;
- AI grading;
- course generation and OpenMAIC authoring changes;
- production deployment.

## Gate State

- Gate 1: passed; see [Gate 1 results](./gate-1/RESULTS.md).
- Gate 2: passed; see [Gate 2 results](./gate-2/RESULTS.md).
- Gate 3: five-case content and sequential challenge path passed; see
  [Gate 3 results](./gate-3/RESULTS.md).
- Coach answer key: internal only; see [CASE_ANSWER_KEY.md](./coach/CASE_ANSWER_KEY.md).
- OSS entry decision: candidate may enter a separate OSS integration gate; see the
  [pre-integration acceptance report](./OSS_PREINTEGRATION_ACCEPTANCE.md).
- Production: prohibited until a separate release decision.

All five case packages remain `pending_named_sme_review`. Gate 3 proves package completeness,
answer separation, and server-authoritative progression; it does not constitute content approval
or production readiness.

## Gate 2 Runtime Contract

- `JIUXUANGE_CASE_ONLY=true` enables the isolated learner surface.
- `JIUXUANGE_DATABASE_URL` points to PostgreSQL; the application fails closed when it is absent.
- `JIUXUANGE_CASE_ONLY_IDENTITY_MODE=fixed-candidate` and the two explicit fixed-identity
  variables are test-only candidate identity. They are not roster or WeCom authentication.
- `content_version` is the SHA-256 hash of the exact published classroom JSON.
- `progress_version` is a server-incremented optimistic concurrency counter.
- The server, not the browser, derives the current scene and the next-case unlock state.
- Scene submission requires an `Idempotency-Key`; a repeated identical request replays the stored
  result, while a distinct concurrent request from an old progress version returns `409`.

## Recovery

The online baseline remains at commit `8fb3e52d374053e52214bcd78d69edb958517e6d` on its existing
branch/worktree. Removing `JIUXUANGE_CASE_ONLY=true` restores existing route behavior; no original
product code or content was deleted.

Gates 2 and 3 were developed only on `codex/jiuxuange-case-only-v1`. They were not merged, pushed
to the online branch, deployed, or connected to production data.
