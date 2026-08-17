# Gate P6: deployment candidate results

## Verdict

**DEPLOYMENT ARTIFACT READY; PRODUCTION RELEASE NOT EXECUTED.**

Blocking production items:

- P5 generic compatibility is not passed;
- no real RDS endpoint was supplied or migrated;
- no Qwen/DeepSeek/TTS provider acceptance was run;
- no DNS or TLS change was made for `player.jxg.cccube.cn`;
- Docker is unavailable in this workstation environment, so the image build itself was
  not executed;
- no grey cohort or rollback rehearsal was performed.

## Standalone acceptance

The generated `.next/standalone/server.js` started successfully and loaded all five
packages from its own output directory. The readiness endpoint returned:

```json
{
  "status": "ready",
  "playerVersion": "1.0.0-rc.1",
  "openMaicCompatibility": "0.3.0",
  "packageFormatVersion": 2,
  "requiredPackageCount": 5
}
```

Route checks:

```text
/generation-preview     -> 404, x-jiuxuange-player=blocked
/api/generate-classroom -> 403, x-jiuxuange-player=blocked
```

Ticket checks:

```text
new learner / first case       -> 200
new learner / locked case      -> 403
completed learner / fifth case -> 200
```

## Prompt and answer protection

- public manifest Agent persona lengths: `0, 0, 0, 0`;
- private Agent markers absent from `.next/static` and standalone static chunks;
- learner packages contain no answer, analysis, or grading-prompt keys;
- five packages contain no external runtime URL.

## Local load result

Initial implementation:

```text
requests=1000, concurrency=100, HTTP errors=0, P95=1018.51ms, result=FAIL
```

The manifest hot path was then changed to trust the already package-scoped Player session;
sequential unlock moved to launch-ticket issuance. Progress writes still use PostgreSQL.

Final local standalone result:

```text
requests=1000
concurrency=100
HTTP 200=1000
errorRate=0
requestsPerSecond=311.12
P50=200.18ms
P95=354.84ms
P99=2854.27ms
threshold P95<800ms and errorRate<0.5%
result=PASS
```

This is a single-machine loopback result. It does not establish 1000 simultaneous learner
capacity against the intended RDS tier, public network, TLS terminator, and real Agent
traffic.

## Delivered operations files

```text
Dockerfile.player
docker-compose.player.yml
deploy/player/Caddyfile
deploy/player/player.env.example
documentation/jiuxuange/player-v1/DEPLOYMENT.md
scripts/load-test-jiuxuange-player.mjs
scripts/audit-jiuxuange-player-release.mjs
```

Production release remains a separate change window with named business, technical, and
operations approvers.

## Final local verification

```text
pnpm test
  319 test files passed
  2325 tests passed
  exit code 0

targeted ESLint for Player routes, runtime, server modules, registry, and tests
  0 errors
  0 warnings
  exit code 0

pnpm build:player
  production compile, TypeScript, 56 routes, standalone staging passed
  exit code 0

pnpm audit:jiuxuange-player-release
  five packages audited
  private Prompt static scan passed
  standalone package presence passed
  exit code 0

standalone readiness after final build
  status=ready
  exit code 0
```
