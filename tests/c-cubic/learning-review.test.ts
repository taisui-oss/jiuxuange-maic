import { describe, expect, it } from 'vitest';

import { BUSINESS_MODEL_SIX_LEVEL_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v3';
import { buildJiuxuangeLearningReview } from '@/lib/c-cubic/learning-review';
import { createJiuxuangeProject } from '@/lib/c-cubic/project-factory';

describe('Jiuxuange learning review', () => {
  it('separates autonomous and hinted evidence without producing a score', () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_SIX_LEVEL_PACKAGE, {
      now: '2026-07-20T00:00:00.000Z',
    });
    project.runtimeEvents = [
      {
        id: 'evidence-1',
        kind: 'jiuxuange_evidence_evaluated',
        actorType: 'system',
        ts: '2026-07-20T00:01:00.000Z',
        sourceMessageId: 'message-1',
        hintLevel: 1,
        decision: {
          satisfied: true,
          missingSignals: [],
          results: [
            {
              signal: 'own_words',
              status: 'autonomous',
              sourceMessageIds: ['message-1'],
              factIds: [],
              hintLevel: 0,
              reason: 'learner wording',
              modelVersion: 'deterministic-v1',
              packageVersion: BUSINESS_MODEL_SIX_LEVEL_PACKAGE.version,
            },
            {
              signal: 'distinction',
              status: 'hinted',
              sourceMessageIds: ['message-1'],
              factIds: [],
              hintLevel: 1,
              reason: 'after scaffold',
              modelVersion: 'deterministic-v1',
              packageVersion: BUSINESS_MODEL_SIX_LEVEL_PACKAGE.version,
            },
          ],
          sourceMessageIds: ['message-1'],
          factIds: [],
          evidenceRefs: [],
          modelVersion: 'deterministic-v1',
          packageVersion: BUSINESS_MODEL_SIX_LEVEL_PACKAGE.version,
        },
      },
    ];

    const review = buildJiuxuangeLearningReview(project, BUSINESS_MODEL_SIX_LEVEL_PACKAGE);

    expect(review.autonomousEvidenceCount).toBe(1);
    expect(review.hintedEvidenceCount).toBe(1);
    expect(review).not.toHaveProperty('score');
    expect(review.levels).toHaveLength(6);
  });
});
