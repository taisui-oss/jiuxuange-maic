import { describe, expect, it } from 'vitest';
import {
  parseAndValidateRealmAssessment,
  type RealmEvidencePackage,
} from '@/lib/c-cubic/realm-assessor';

const evidence: RealmEvidencePackage = {
  scenario: 'self_positioning',
  samples: [
    {
      id: 'sample-1',
      kind: 'familiar_domain',
      background: '商业分析任务',
      capturedAt: '2026-07-01T00:00:00.000Z',
      transcript: '用户：我的初判是获客结构失衡，你先攻击这个判断。',
      source: 'raw_export',
      redacted: true,
      edited: false,
    },
  ],
};

function report(quote: string, confidence = 'medium') {
  return JSON.stringify({
    scenario: 'self_positioning',
    status: 'assessed',
    conclusion: {
      summary: '档 3 · 框架驱动',
      abilityBand: 3,
      realmRange: '5–7 境',
    },
    confidence,
    findings: [
      {
        criterionId: 'P3',
        outcome: 'confirmed',
        quote,
        sampleId: 'sample-1',
        reasoning: '用户在 AI 分析前先亮出初判。',
      },
    ],
    bottleneck: '还需跨时间的递归复用证据。',
    tasks: ['在下一个任务中复用并修订本次方法。'],
    redFlags: [],
  });
}

describe('MetaThink realm assessor report grounding', () => {
  it('accepts findings whose quote exists verbatim in the cited sample', () => {
    const result = parseAndValidateRealmAssessment(report('我的初判是获客结构失衡'), evidence);

    expect(result.ok).toBe(true);
    expect(result.report?.conclusion?.abilityBand).toBe(3);
  });

  it('rejects a plausible but invented quote', () => {
    const result = parseAndValidateRealmAssessment(report('我的初判是现金流结构失衡'), evidence);

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('无法回溯');
  });

  it('does not allow a low-confidence result to keep a rating conclusion', () => {
    const result = parseAndValidateRealmAssessment(
      report('我的初判是获客结构失衡', 'low'),
      evidence,
    );

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('低置信度');
  });
});
