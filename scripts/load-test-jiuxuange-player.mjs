import { performance } from 'node:perf_hooks';
import process from 'node:process';

const target =
  process.argv[2] ?? 'http://127.0.0.1:3000/api/player/packages/convenience-bee/manifest';
const requestCount = Number(process.env.PLAYER_LOAD_REQUESTS ?? 1000);
const concurrency = Number(process.env.PLAYER_LOAD_CONCURRENCY ?? 100);
const p95LimitMs = Number(process.env.PLAYER_LOAD_P95_LIMIT_MS ?? 800);
const maxErrorRate = Number(process.env.PLAYER_LOAD_MAX_ERROR_RATE ?? 0.005);

if (!Number.isInteger(requestCount) || requestCount < 1) throw new Error('Invalid request count');
if (!Number.isInteger(concurrency) || concurrency < 1) throw new Error('Invalid concurrency');

let cookie = process.env.PLAYER_LOAD_COOKIE?.trim() ?? '';
if (!cookie) {
  const warmup = await fetch(target, { redirect: 'manual' });
  const setCookie = warmup.headers.get('set-cookie') ?? '';
  cookie = setCookie.split(';', 1)[0] ?? '';
  await warmup.arrayBuffer();
}

const durations = [];
const statuses = new Map();
let cursor = 0;

async function worker() {
  while (true) {
    const index = cursor;
    cursor += 1;
    if (index >= requestCount) return;
    const started = performance.now();
    try {
      const response = await fetch(target, {
        headers: cookie ? { Cookie: cookie } : undefined,
        redirect: 'manual',
      });
      await response.arrayBuffer();
      statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
    } catch {
      statuses.set(0, (statuses.get(0) ?? 0) + 1);
    } finally {
      durations.push(performance.now() - started);
    }
  }
}

const startedAt = performance.now();
await Promise.all(Array.from({ length: Math.min(concurrency, requestCount) }, () => worker()));
const elapsedMs = performance.now() - startedAt;
durations.sort((left, right) => left - right);

function percentile(fraction) {
  return durations[Math.min(durations.length - 1, Math.ceil(durations.length * fraction) - 1)] ?? 0;
}

const successful = [...statuses.entries()]
  .filter(([status]) => status >= 200 && status < 400)
  .reduce((sum, [, count]) => sum + count, 0);
const errorRate = 1 - successful / requestCount;
const result = {
  target,
  requestCount,
  concurrency,
  elapsedMs,
  requestsPerSecond: requestCount / (elapsedMs / 1000),
  p50Ms: percentile(0.5),
  p95Ms: percentile(0.95),
  p99Ms: percentile(0.99),
  errorRate,
  statuses: Object.fromEntries([...statuses.entries()].sort(([a], [b]) => a - b)),
  thresholds: { p95LimitMs, maxErrorRate },
};

const passed = result.p95Ms < p95LimitMs && errorRate < maxErrorRate;
process.stdout.write(`${JSON.stringify({ ...result, passed }, null, 2)}\n`);
if (!passed) process.exit(1);
