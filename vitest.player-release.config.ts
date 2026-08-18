import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
  test: {
    include: [
      'tests/jiuxuange/case-only-content.test.ts',
      'tests/jiuxuange/case-only-grading.test.ts',
      'tests/jiuxuange/case-only-preview-runtime.test.ts',
      'tests/jiuxuange/case-only-progress.integration.test.ts',
      'tests/jiuxuange/case-only-route-policy.test.ts',
      'tests/jiuxuange/player-*.test.ts',
    ],
    setupFiles: ['tests/setup-env.ts'],
    fileParallelism: false,
    maxWorkers: 1,
  },
});
