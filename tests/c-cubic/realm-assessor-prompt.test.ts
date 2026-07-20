import { describe, expect, it } from 'vitest';
import {
  buildRealmAssessorPrompt,
  loadRealmAssessorAssets,
} from '@/lib/c-cubic/realm-assessor/prompt';
import type { RealmEvidencePackage } from '@/lib/c-cubic/realm-assessor';

const evidence: RealmEvidencePackage = {
  scenario: 'self_positioning',
  learnerLabel: '测试学员',
  samples: [
    {
      id: 'sample-a',
      kind: 'familiar_domain',
      background: '一次真实商业分析',
      capturedAt: '2026-07-01T00:00:00.000Z',
      transcript: '用户：我先说初判，你只找反例。\nAI：反例是……',
      source: 'raw_export',
      redacted: true,
      edited: false,
    },
  ],
};

describe('MetaThink realm assessor prompt adapter', () => {
  it('loads the versioned source skill and all four reference documents', () => {
    const assets = loadRealmAssessorAssets();

    expect(assets.skill).toContain('十五境评定官');
    expect(assets.rubric).toContain('P1');
    expect(assets.evidence).toContain('证据包规范');
    expect(assets.realms).toContain('五档');
    expect(assets.templates).toContain('自评定位报告');
  });

  it('adds Jiuxuange grounding rules and a structured output contract', () => {
    const prompt = buildRealmAssessorPrompt(evidence);

    expect(prompt.system).toContain('每一条 confirmed 或 triggered 判定');
    expect(prompt.system).toContain('human_review_required');
    expect(prompt.prompt).toContain('[sample-a]');
    expect(prompt.prompt).toContain('我先说初判');
  });
});
