import { describe, expect, it } from 'vitest';

import { BUSINESS_MODEL_SIX_LEVEL_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v3';
import { applyJiuxuangeEvidenceGate, type JiuxuangeEvidenceDecision } from '@/lib/c-cubic/evidence';
import { createJiuxuangeProject } from '@/lib/c-cubic/project-factory';

function decision(satisfied: boolean): JiuxuangeEvidenceDecision {
  return {
    satisfied,
    missingSignals: satisfied ? [] : ['distinction'],
    results: [
      {
        signal: 'own_words',
        status: satisfied ? 'autonomous' : 'unsupported',
        sourceMessageIds: ['message-1'],
        factIds: [],
        hintLevel: 'none',
        reason: satisfied ? 'learner used own words' : 'insufficient evidence',
        modelVersion: 'test-model',
        packageVersion: BUSINESS_MODEL_SIX_LEVEL_PACKAGE.version,
      },
    ],
    sourceMessageIds: ['message-1'],
    factIds: [],
    evidenceRefs: [],
    modelVersion: 'test-model',
    packageVersion: BUSINESS_MODEL_SIX_LEVEL_PACKAGE.version,
  };
}

describe('Jiuxuange evidence gate', () => {
  it('does not make a task continuable when evidence is missing', () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_SIX_LEVEL_PACKAGE, {
      now: '2026-07-20T00:00:00.000Z',
    });

    expect(
      applyJiuxuangeEvidenceGate(project, decision(false), {
        sourceMessageId: 'message-1',
        message: '这只是一句笼统的回答。',
        now: '2026-07-20T00:01:00.000Z',
      }),
    ).toBe(false);
    expect(project.pendingTaskCompletion).toBeUndefined();
  });

  it('creates a deterministic continuation gate only after evidence is satisfied', () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_SIX_LEVEL_PACKAGE, {
      now: '2026-07-20T00:00:00.000Z',
    });

    expect(
      applyJiuxuangeEvidenceGate(project, decision(true), {
        sourceMessageId: 'message-1',
        message: '商业模式不是产品清单，而是一组交易结构。',
        now: '2026-07-20T00:01:00.000Z',
      }),
    ).toBe(true);
    expect(project.pendingTaskCompletion).toMatchObject({
      microtaskId: project.milestones[0]?.microtasks[0]?.id,
      reason: 'jiuxuange_evidence_gate_satisfied',
    });
    expect(project.milestones[0]?.microtasks[0]?.status).toBe('in_progress');
  });
});
