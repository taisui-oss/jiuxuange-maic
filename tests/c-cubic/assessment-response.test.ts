import { describe, expect, it } from 'vitest';

import { createAssessmentResponse } from '@/lib/c-cubic/assessment';

const completedActivities = [
  'orientation',
  'concept-chain',
  'case-convenience-bee',
  'case-fresh-grocery',
] as const;

describe('Jiuxuange assessment responses', () => {
  it('preserves the fixed question version, raw answer, and evidence provenance', () => {
    const response = createAssessmentResponse({
      id: 'assessment-response-1',
      learnerId: 'learner-1',
      questionId: 'causal-judgment',
      rawAnswer: '  因为复购下降，所以这个增长判断需要重新检查。  ',
      evidenceMessages: [
        {
          messageId: 'message-12',
          message: '复购下降，门店数量仍在增长。',
          source: {
            id: 'case-fresh-fact-2',
            label: '生鲜案例访谈纪要',
            locator: '第 2 条',
          },
        },
      ],
      completedActivities,
      submittedAt: '2026-07-11T08:00:00.000Z',
    });

    expect(response).toEqual({
      id: 'assessment-response-1',
      learnerId: 'learner-1',
      assessmentVersion: 'jiuxuange-six-elements-assessment.v1',
      questionId: 'causal-judgment',
      questionVersion: 'v1',
      rawAnswer: '  因为复购下降，所以这个增长判断需要重新检查。  ',
      evidenceMessages: [
        {
          messageId: 'message-12',
          message: '复购下降，门店数量仍在增长。',
          source: {
            id: 'case-fresh-fact-2',
            label: '生鲜案例访谈纪要',
            locator: '第 2 条',
          },
        },
      ],
      submittedAt: '2026-07-11T08:00:00.000Z',
    });
  });

  it('refuses responses before every prerequisite activity is complete', () => {
    expect(() =>
      createAssessmentResponse({
        id: 'assessment-response-locked',
        learnerId: 'learner-1',
        questionId: 'fact-identification',
        rawAnswer: '这是一条回答。',
        evidenceMessages: [],
        completedActivities: ['orientation', 'concept-chain'],
        submittedAt: '2026-07-11T08:00:00.000Z',
      }),
    ).toThrow('Assessment is locked until: case-convenience-bee, case-fresh-grocery');
  });
});
