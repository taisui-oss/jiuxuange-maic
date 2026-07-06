import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

function readRepoFile(path: string): string {
  return readFileSync(resolve(__dirname, '..', '..', path), 'utf-8');
}

describe('Jiuxuange default agent selection', () => {
  it('selects all four Jiuxuange roles by default across settings fallbacks', () => {
    const expected = "['default-1', 'default-2', 'default-3', 'default-4']";

    expect(readRepoFile('lib/store/settings.ts')).toContain(expected);
    expect(readRepoFile('components/agent/agent-bar.tsx')).toContain(expected);
    expect(readRepoFile('lib/orchestration/registry/agent-selection.ts')).toContain(expected);
  });
});
