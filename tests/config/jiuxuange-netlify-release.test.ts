import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Jiuxuange Netlify release configuration', () => {
  it('deploys the isolated five-case preview with managed progress enabled', () => {
    const config = readFileSync(new URL('../../netlify.toml', import.meta.url), 'utf8');
    const packageJson = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as { dependencies?: Record<string, string> };

    expect(config).toContain('command = "pnpm run build:case-only"');
    expect(config).toContain('JIUXUANGE_CASE_ONLY = "true"');
    expect(config).toContain('JIUXUANGE_CASE_ONLY_IDENTITY_MODE = "anonymous-preview"');
    expect(config).toContain('JIUXUANGE_CASE_ONLY_ALLOW_ANONYMOUS_PREVIEW = "true"');
    expect(config).not.toContain('JIUXUANGE_ENABLE_DRAFT_PROJECT_CARDS = "true"');
    expect(packageJson.dependencies?.['@netlify/database']).toBe('1.1.0');
  });

  it('ships a native Netlify migration for the authoritative progress store', () => {
    const migration = readFileSync(
      new URL(
        '../../netlify/database/migrations/202608130001_case_only_progress.sql',
        import.meta.url,
      ),
      'utf8',
    );

    expect(migration).toContain('CREATE SCHEMA "jiuxuange_case_only"');
    expect(migration).toContain('CREATE TABLE "jiuxuange_case_only"."users"');
    expect(migration).toContain('CREATE TABLE "jiuxuange_case_only"."case_progress"');
    expect(migration).toContain('CREATE TABLE "jiuxuange_case_only"."progress_submissions"');
    expect(migration).toContain('CONSTRAINT "progress_submissions_progress_fk"');
    expect(migration).not.toContain('statement-breakpoint');
  });
});
