import { defineConfig, devices } from '@playwright/test';

const databaseUrl =
  process.env.JIUXUANGE_DATABASE_URL ?? 'postgresql://127.0.0.1:55432/jiuxuange_case_only_test';

export default defineConfig({
  testDir: './e2e/case-only',
  testMatch: 'preview-release.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: 'test-results/case-only-preview',
  timeout: 120_000,
  use: {
    baseURL: 'http://127.0.0.1:8807',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    launchOptions: {
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    },
  },
  webServer: {
    command: 'node .next/standalone/server.js',
    url: 'http://127.0.0.1:8807/case-only',
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      HOSTNAME: '127.0.0.1',
      PORT: '8807',
      JIUXUANGE_CASE_ONLY: 'true',
      JIUXUANGE_DATABASE_URL: databaseUrl,
      JIUXUANGE_CASE_ONLY_IDENTITY_MODE: 'anonymous-preview',
      JIUXUANGE_CASE_ONLY_ALLOW_ANONYMOUS_PREVIEW: 'true',
    },
  },
});
