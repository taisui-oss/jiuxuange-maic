import { describe, expect, it } from 'vitest';

import { BUSINESS_MODEL_SIX_LEVEL_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v3';
import { retryJiuxuangeTask } from '@/lib/c-cubic/retry';
import { createJiuxuangeProject } from '@/lib/c-cubic/project-factory';

describe('Jiuxuange task retry', () => {
  it('raises the hint level without clearing evidence or progress', () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_SIX_LEVEL_PACKAGE, {
      now: '2026-07-20T00:00:00.000Z',
    });
    const prelude = project.milestones[0]!;
    prelude.status = 'completed';
    prelude.microtasks.forEach((task) => {
      task.status = 'completed';
    });
    const positioning = project.milestones[1]!;
    positioning.status = 'active';
    positioning.microtasks[0]!.status = 'in_progress';
    project.runtimeEvents = [
      {
        id: 'evidence-1',
        kind: 'jiuxuange_evidence_evaluated',
        actorType: 'system',
        ts: '2026-07-20T00:00:01.000Z',
        sourceMessageId: 'message-1',
        hintLevel: 0,
        decision: {
          satisfied: false,
          missingSignals: ['distinction'],
          results: [],
          sourceMessageIds: ['message-1'],
          factIds: [],
          evidenceRefs: [],
          modelVersion: 'test-model',
          packageVersion: BUSINESS_MODEL_SIX_LEVEL_PACKAGE.version,
        },
      },
    ];

    const result = retryJiuxuangeTask(project, BUSINESS_MODEL_SIX_LEVEL_PACKAGE, {
      now: '2026-07-20T00:01:00.000Z',
    });

    expect(result.hintLevel).toBe(1);
    expect(result.question).not.toBe(
      BUSINESS_MODEL_SIX_LEVEL_PACKAGE.questionTemplates[
        positioning.microtasks[0]!.jiuxuange!.questionTemplateId
      ]!.prompt,
    );
    expect(project.runtimeEvents?.some((event) => event.id === 'evidence-1')).toBe(true);
    expect(project.runtimeEvents?.at(-2)?.kind).toBe('jiuxuange_retry_requested');
    expect(project.runtimeEvents?.at(-1)?.kind).toBe('jiuxuange_question_delivered');
    expect(positioning.status).toBe('active');
    expect(positioning.microtasks[0]!.status).toBe('in_progress');
  });

  it('caps retries at the fact-focused scaffold and does not repeat fingerprints', () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_SIX_LEVEL_PACKAGE, {
      now: '2026-07-20T00:00:00.000Z',
    });
    const prelude = project.milestones[0]!;
    prelude.status = 'completed';
    prelude.microtasks.forEach((task) => {
      task.status = 'completed';
    });
    const positioning = project.milestones[1]!;
    positioning.status = 'active';
    positioning.microtasks[0]!.status = 'in_progress';

    const fingerprints = [1, 2, 3, 4].map((minute) =>
      retryJiuxuangeTask(project, BUSINESS_MODEL_SIX_LEVEL_PACKAGE, {
        now: `2026-07-20T00:0${minute}:00.000Z`,
      }).questionFingerprint,
    );

    expect(positioning.microtasks[0]!.jiuxuange?.hintLevel).toBe(3);
    expect(new Set(fingerprints.slice(0, 3)).size).toBe(3);
    expect(fingerprints[3]).toBe(fingerprints[2]);
  });
});
