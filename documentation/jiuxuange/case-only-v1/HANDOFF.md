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
- Gate 2: not yet implemented at the Gate 1 commit.
- Production: prohibited until a separate release decision.

## Recovery

The online baseline remains at commit `8fb3e52d374053e52214bcd78d69edb958517e6d` on its existing
branch/worktree. Removing `JIUXUANGE_CASE_ONLY=true` restores existing route behavior; no original
product code or content was deleted.
