import { defineConfig, devices } from '@playwright/test';

const databaseUrl =
  process.env.JIUXUANGE_DATABASE_URL ?? 'postgresql://127.0.0.1:55432/jiuxuange_case_only_test';
const remoteBaseUrl = process.env.JIUXUANGE_PREVIEW_BASE_URL?.trim();

export default defineConfig({
  testDir: './e2e/case-only',
  testMatch: 'gate3.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: 'test-results/case-only-gate3',
  timeout: 120_000,
  use: {
    baseURL: remoteBaseUrl || 'http://127.0.0.1:8806',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    launchOptions: {
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    },
  },
  webServer: remoteBaseUrl
    ? undefined
    : {
        command: 'node .next/standalone/server.js',
        url: 'http://127.0.0.1:8806/case-only',
        reuseExistingServer: false,
        timeout: 180_000,
        env: {
          HOSTNAME: '127.0.0.1',
          PORT: '8806',
          JIUXUANGE_CASE_ONLY: 'true',
          JIUXUANGE_DATABASE_URL: databaseUrl,
          JIUXUANGE_CASE_ONLY_IDENTITY_MODE: 'fixed-candidate',
          JIUXUANGE_CASE_ONLY_ALLOW_FIXED_IDENTITY: 'true',
          JIUXUANGE_CASE_ONLY_FIXED_USER_ID: '10000000-0000-4000-8000-000000000003',
        },
      },
});
