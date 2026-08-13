import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/case-only',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: 'test-results/case-only-gate1',
  use: {
    baseURL: 'http://127.0.0.1:8804',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    launchOptions: {
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    },
  },
  webServer: {
    command: 'node .next/standalone/server.js',
    url: 'http://127.0.0.1:8804/case-only',
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      HOSTNAME: '127.0.0.1',
      JIUXUANGE_CASE_ONLY: 'true',
      PORT: '8804',
    },
  },
});
