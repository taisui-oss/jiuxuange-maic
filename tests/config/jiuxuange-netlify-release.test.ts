import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Jiuxuange Netlify release configuration', () => {
  it('deploys the isolated five-case preview with managed progress enabled', () => {
    const config = readFileSync(new URL('../../netlify.toml', import.meta.url), 'utf8');

    expect(config).toContain('command = "pnpm run build:case-only:netlify"');
    expect(config).toContain('JIUXUANGE_CASE_ONLY = "true"');
    expect(config).toContain('JIUXUANGE_CASE_ONLY_IDENTITY_MODE = "anonymous-preview"');
    expect(config).toContain('JIUXUANGE_CASE_ONLY_ALLOW_ANONYMOUS_PREVIEW = "true"');
    expect(config).not.toContain('JIUXUANGE_ENABLE_DRAFT_PROJECT_CARDS = "true"');
  });
});
