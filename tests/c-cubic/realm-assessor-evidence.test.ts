import { describe, expect, it } from 'vitest';
import {
  assessRealmEvidenceReadiness,
  type RealmEvidencePackage,
  type RealmEvidenceSample,
} from '@/lib/c-cubic/realm-assessor';

const NOW = '2026-07-20T00:00:00.000Z';

function sample(
  id: string,
  kind: RealmEvidenceSample['kind'],
  overrides: Partial<RealmEvidenceSample> = {},
): RealmEvidenceSample {
  return {
    id,
    kind,
    background: '这是一次真实任务，目标是检验我与 AI 的协同方式。',
    capturedAt: '2026-07-01T10:00:00.000Z',
    transcript: `样本 ${id}\n用户：我的初判是问题来自渠道结构，你只负责反驳这个判断。\nAI：一个反例是……\n用户：这条反例不成立，因为原始数据显示……`,
    source: 'raw_export',
    redacted: true,
    edited: false,
    ...overrides,
  };
}

function packageA(samples: RealmEvidenceSample[]): RealmEvidencePackage {
  return { scenario: 'self_positioning', samples };
}

describe('MetaThink realm assessor evidence gate', () => {
  it('accepts a complete self-positioning package with all three sample types', () => {
    const result = assessRealmEvidenceReadiness(
      packageA([
        sample('unfamiliar', 'unfamiliar_problem'),
        sample('familiar', 'familiar_domain'),
        sample('iteration', 'multi_turn_iteration'),
      ]),
      NOW,
    );

    expect(result.ready).toBe(true);
    expect(result.missing).toEqual([]);
    expect(result.maxConfidence).toBe('high');
  });

  it('refuses to rate one polished conversation as a full evidence package', () => {
    const result = assessRealmEvidenceReadiness(
      packageA([sample('familiar', 'familiar_domain')]),
      NOW,
    );

    expect(result.ready).toBe(false);
    expect(result.missing).toEqual(
      expect.arrayContaining([
        expect.stringContaining('3–5'),
        expect.stringContaining('陌生领域'),
        expect.stringContaining('多轮迭代'),
      ]),
    );
  });

  it('rejects edited or stale evidence instead of silently lowering the standard', () => {
    const result = assessRealmEvidenceReadiness(
      packageA([
        sample('unfamiliar', 'unfamiliar_problem', { edited: true }),
        sample('familiar', 'familiar_domain', { capturedAt: '2025-12-01T00:00:00.000Z' }),
        sample('iteration', 'multi_turn_iteration'),
      ]),
      NOW,
    );

    expect(result.ready).toBe(false);
    expect(result.missing.join('\n')).toContain('未经删改');
    expect(result.missing.join('\n')).toContain('近 3 个月');
  });

  it('requires a whiteboard rebuild before a Dragon Gate review can run', () => {
    const result = assessRealmEvidenceReadiness(
      {
        scenario: 'dragon_gate_review',
        samples: [
          sample('thinking', 'thinking_process'),
          sample('prompts', 'prompt_iteration'),
          sample('collaboration', 'collaboration_statement'),
        ],
      },
      NOW,
    );

    expect(result.ready).toBe(false);
    expect(result.missing.join('\n')).toContain('白纸重建');
  });

  it('requires the prior review and original material for a realm-drop diagnosis', () => {
    const result = assessRealmEvidenceReadiness(
      {
        scenario: 'realm_drop_diagnosis',
        samples: [sample('review', 'prior_review')],
      },
      NOW,
    );

    expect(result.ready).toBe(false);
    expect(result.missing.join('\n')).toContain('论道原始材料');
  });
});
