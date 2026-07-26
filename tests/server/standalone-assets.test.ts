import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('standalone production assets', () => {
  it('copies static and public assets into the standalone output', () => {
    const fixtureRoot = mkdtempSync(resolve(tmpdir(), 'openmaic-standalone-'));
    temporaryDirectories.push(fixtureRoot);
    mkdirSync(resolve(fixtureRoot, '.next/static/chunks'), { recursive: true });
    mkdirSync(resolve(fixtureRoot, '.next/standalone'), { recursive: true });
    mkdirSync(resolve(fixtureRoot, 'public'), { recursive: true });
    writeFileSync(resolve(fixtureRoot, '.next/static/chunks/app.js'), 'interactive');
    writeFileSync(resolve(fixtureRoot, 'public/logo.png'), 'brand');

    execFileSync(
      process.execPath,
      [resolve(process.cwd(), 'scripts/prepare-standalone-assets.mjs')],
      {
        cwd: fixtureRoot,
        stdio: 'pipe',
      },
    );

    expect(
      readFileSync(resolve(fixtureRoot, '.next/standalone/.next/static/chunks/app.js'), 'utf8'),
    ).toBe('interactive');
    expect(readFileSync(resolve(fixtureRoot, '.next/standalone/public/logo.png'), 'utf8')).toBe(
      'brand',
    );
    expect(existsSync(resolve(fixtureRoot, '.next/standalone/.next/static'))).toBe(true);
  });

  it('keeps the asset staging step in the production build command', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.build).toContain('node scripts/prepare-standalone-assets.mjs');
  });
});
