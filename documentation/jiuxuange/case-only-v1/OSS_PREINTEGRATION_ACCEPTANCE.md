# Case-only V1 OSS Pre-integration Acceptance

## Decision

**READY TO ENTER AN OSS INTEGRATION GATE. NOT READY FOR PRODUCTION.**

The candidate now has a stable content boundary: published case JSON is read by a repository,
validated, ordered, and assigned a deterministic `content_version`. Replacing the repository file
adapter with an OSS adapter can therefore be isolated from learner progress logic.

## Accepted Before OSS

- Gate 1 learner surface and lightweight case player are complete.
- Gate 2 PostgreSQL progress and server-side unlock logic are complete.
- Content is addressed by `case_id`, classroom identity, and immutable content hash.
- Existing progress remains bound to the content version used when it was created.
- No original OpenMAIC authoring or generation source was removed.
- No OSS-specific assumptions were embedded in the progress schema or APIs.

## OSS Gate Must Preserve

1. A published content object must be immutable for a given `content_version`.
2. The server must verify object bytes against the expected SHA-256 before serving them.
3. Publishing a changed object must create a new content version; it must not overwrite the
   meaning of historical progress.
4. Database state remains authoritative for progress and unlocking; OSS never becomes a progress
   store.
5. Browser clients receive authorized content through signed or server-proxied access, never raw
   bucket credentials.
6. Disabled OpenMAIC authoring and learner APIs remain `403/404` in case-only mode.
7. Existing repository content remains a rollback source until OSS acceptance is signed.

## Required OSS Acceptance Tests

- upload and publish one case package;
- fetch it through the server repository adapter;
- reject checksum mismatch;
- reject unpublished or unauthorized object keys;
- preserve progress after process restart and object-cache eviction;
- prove a changed package creates a new `content_version`;
- prove historical progress still references the former version;
- verify mobile, refresh, local-storage clearing, second-browser recovery, and duplicate submission
  against the OSS-backed content path;
- verify backup/restore and rollback to repository content.

## Production Blockers Outside OSS

| Blocker | Required evidence |
|---|---|
| Formal identity | Roster plus WeCom login maps every learner to a stable internal UUID |
| Authorization | Course enrollment and learner/resource relationships enforced server-side |
| Managed PostgreSQL | TLS, migration controls, pooling, backup, PITR, monitoring, and restore drill |
| Capacity | Workload model and test covering expected 1,000 learners and peak submissions |
| Operations | Alerts, traces, error budget, incident owner, rollback and support runbook |
| Data governance | Retention, deletion, access audit, secrets, and sensitive-content policy |
| Release control | Separate production approval, release commit, deployment evidence, and rollback point |

## Rollback Boundary

- Online baseline remains `8fb3e52d374053e52214bcd78d69edb958517e6d` in its original
  branch/worktree.
- Candidate work is isolated on `codex/jiuxuange-case-only-v1`.
- OSS is not connected in this Gate and no production environment was modified.
- OpenMAIC authoring and generation capabilities remain in source and become visible again when
  case-only mode is disabled.
