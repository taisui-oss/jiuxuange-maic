import { describe, expect, test } from 'vitest';
import { readPlayerPackage } from '@/lib/server/jiuxuange-player/package-repository';
import {
  toPublicPlayerManifest,
  toPublicPlayerPackage,
} from '@/lib/server/jiuxuange-player/public-package';

describe('player public package projection', () => {
  test('removes private Agent personas without mutating the server package', async () => {
    const loaded = await readPlayerPackage('convenience-bee');
    expect(loaded).not.toBeNull();
    expect(loaded!.manifest.agents.some((agent) => agent.persona.length > 0)).toBe(true);

    const publicPackage = toPublicPlayerPackage(loaded!);
    expect(publicPackage.manifest.agents.every((agent) => agent.persona === '')).toBe(true);
    expect(loaded!.manifest.agents.some((agent) => agent.persona.length > 0)).toBe(true);
  });

  test('does not expose personas in the manifest JSON contract', async () => {
    const loaded = await readPlayerPackage('convenience-bee');
    const publicJson = JSON.stringify(toPublicPlayerManifest(loaded!.manifest));
    expect(publicJson).not.toContain('不暴露内部评分维度');
    expect(publicJson).not.toContain('你是九轩阁商业模式大课里的');
  });
});
