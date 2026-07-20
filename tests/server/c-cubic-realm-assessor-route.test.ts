import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const generateTextMock = vi.hoisted(() => vi.fn());
const resolveModelMock = vi.hoisted(() => vi.fn());

vi.mock('ai', () => ({ generateText: generateTextMock }));
vi.mock('@/lib/server/resolve-model', () => ({
  resolveModelFromRequest: resolveModelMock,
}));

import { POST } from '@/app/api/c-cubic/realm-assessor/route';

function evidenceBody() {
  const transcript = (id: string) =>
    `样本 ${id}\n用户：我的初判是获客结构失衡，你先攻击这个判断。\nAI：反例是……\n用户：这条不成立，数据显示……`;
  return {
    scenario: 'self_positioning',
    samples: [
      {
        id: 'unfamiliar',
        kind: 'unfamiliar_problem',
        background: '陌生领域任务',
        capturedAt: '2026-07-01T00:00:00.000Z',
        transcript: transcript('unfamiliar'),
        source: 'raw_export',
        redacted: true,
        edited: false,
      },
      {
        id: 'familiar',
        kind: 'familiar_domain',
        background: '熟悉领域任务',
        capturedAt: '2026-07-02T00:00:00.000Z',
        transcript: transcript('familiar'),
        source: 'raw_export',
        redacted: true,
        edited: false,
      },
      {
        id: 'iteration',
        kind: 'multi_turn_iteration',
        background: '多轮迭代任务',
        capturedAt: '2026-07-03T00:00:00.000Z',
        transcript: transcript('iteration'),
        source: 'raw_export',
        redacted: true,
        edited: false,
      },
    ],
  };
}

function request(body: unknown) {
  return new NextRequest('http://localhost/api/c-cubic/realm-assessor', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('POST /api/c-cubic/realm-assessor', () => {
  beforeEach(() => {
    generateTextMock.mockReset();
    resolveModelMock.mockReset();
    resolveModelMock.mockResolvedValue({ model: { modelId: 'test-model' } });
  });

  it('returns the evidence gaps without invoking a model', async () => {
    const incomplete = evidenceBody();
    incomplete.samples = incomplete.samples.slice(0, 1);

    const response = await POST(request(incomplete));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('insufficient_evidence');
    expect(body.readiness.ready).toBe(false);
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it('returns human review instead of inventing a fallback rating when the model fails', async () => {
    resolveModelMock.mockRejectedValue(new Error('model unavailable'));

    const response = await POST(request(evidenceBody()));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('human_review_required');
    expect(body.report).toBeUndefined();
  });

  it('returns a grounded structured assessment', async () => {
    generateTextMock.mockResolvedValue({
      text: JSON.stringify({
        scenario: 'self_positioning',
        status: 'assessed',
        conclusion: { summary: '档 3 · 框架驱动', abilityBand: 3, realmRange: '5–7 境' },
        confidence: 'medium',
        findings: [
          {
            criterionId: 'P3',
            outcome: 'confirmed',
            quote: '我的初判是获客结构失衡',
            sampleId: 'familiar',
            reasoning: '用户在 AI 分析前先亮出初判。',
          },
        ],
        bottleneck: '缺少跨时间的递归复用证据。',
        tasks: ['在下一个任务中复用并修订方法。'],
        redFlags: [],
      }),
    });

    const response = await POST(request(evidenceBody()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('assessed');
    expect(body.report.conclusion.abilityBand).toBe(3);
    expect(body.report.findings[0].quote).toContain('获客结构失衡');
  });
});
