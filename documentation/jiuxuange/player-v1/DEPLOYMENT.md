# Jiuxuange Player 1.0.0-rc.1 deployment runbook

## Release boundary

This candidate is a five-case Player release. It is not a generic OpenMAIC importer and
must not replace the current classroom entry until the real Agent provider check, RDS
migration, domain TLS, load test, and rollback rehearsal are signed off.

## Required inputs

- DNS control for `player.jxg.cccube.cn`;
- a PostgreSQL database with TLS and automated backups;
- a least-privilege database user;
- independent launch and preview-admin secrets;
- a server-only `server-providers.yml` containing Qwen and DeepSeek credentials;
- approved input, output Token, and per-user concurrency limits;
- the main-site backend change that requests a one-time launch ticket;
- monitoring and alert destinations.

Do not place credentials in Git, the image, a course package, a URL, or browser storage.

## Build

```text
cp deploy/player/player.env.example deploy/player/player.env
docker compose -f docker-compose.player.yml build player
```

The dependency install must run normally. Do not use `--ignore-scripts`: OpenMAIC's
workspace packages generate required `dist` contracts during postinstall.

## Database

Back up the target database and confirm the restore point before migration.

```text
JIUXUANGE_DATABASE_URL=<rds-url> pnpm db:case-only:migrate
```

Verify that the migration schema and seven Player/case tables exist. Migration failure
is a stop condition; do not start the new container against a partially migrated schema.

## Start and readiness

```text
docker compose -f docker-compose.player.yml up -d player
curl -fsS http://127.0.0.1:3001/api/player/health
```

Expected readiness fields:

```text
status=ready
playerVersion=1.0.0-rc.1
openMaicCompatibility=0.3.0
packageFormatVersion=2
requiredPackageCount=5
```

Then point the Caddy service at the Player and create the DNS record. Confirm HTTPS and
HSTS before issuing a real launch ticket.

Confirm these production values before Agent testing:

```text
JIUXUANGE_PLAYER_MAX_INPUT_CHARS
JIUXUANGE_PLAYER_MAX_OUTPUT_TOKENS
JIUXUANGE_PLAYER_MAX_CONCURRENT_AI
```

## Security checks

Verify all of the following from an unauthenticated client:

```text
/generation-preview                       -> 404
/classroom/<id>                           -> 404
/api/generate-classroom                   -> 403
/api/classroom                            -> 403
/api/player/launch-tickets without secret -> 403
```

A valid ticket must be usable once, expire after 60 seconds, and create an HttpOnly,
SameSite=Lax Player cookie. A revoked or expired preview link must fail immediately.

## Load check

```text
PLAYER_LOAD_REQUESTS=1000 \
PLAYER_LOAD_CONCURRENCY=100 \
node scripts/load-test-jiuxuange-player.mjs \
  https://player.jxg.cccube.cn/api/player/packages/convenience-bee/manifest
```

The script fails when P95 is 800 ms or higher or the error rate is 0.5% or higher.
Run this against the grey environment and record instance size, RDS tier, region, and
test timestamp. A local result is diagnostic only and does not prove production capacity.

## Grey release

1. Create a new image tag; never overwrite the previous tag.
2. Run database backup and migration.
3. Start one grey Player instance without changing the main-site entry.
4. Test one internal learner and one coach preview link.
5. Run all five cases, Agent, TTS, refresh, and a second-device resume.
6. Route a small named cohort to the new hostname.
7. Observe HTTP errors, DB writes, AI failure/fallback, and latency for at least one class.
8. Expand only after the acceptance owner signs the release record.

## Rollback

1. Stop issuing new launch tickets for the candidate.
2. Route the main-site case link back to the existing classroom URL.
3. Keep the candidate database rows; do not delete evidence during rollback.
4. Re-deploy the previous immutable image tag.
5. If a migration rollback is required, restore from the pre-migration backup rather than
   manually deleting columns or tables.
6. Record the incident, affected users, content versions, and last accepted Trace ID.
