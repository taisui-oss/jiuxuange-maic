import { describe, expect, it } from 'vitest';

import { assessAssessmentReadiness } from '@/lib/c-cubic/assessment';

describe('Jiuxuange assessment readiness', () => {
  it('unlocks only after every required learning activity is complete', () => {
    expect(
      assessAssessmentReadiness({
        completedActivities: ['orientation', 'concept-chain', 'case-convenience-bee'],
      }),
    ).toEqual({
      ready: false,
      missingActivities: ['case-fresh-grocery'],
    });

    expect(
      assessAssessmentReadiness({
        completedActivities: [
          'orientation',
          'concept-chain',
          'case-convenience-bee',
          'case-fresh-grocery',
        ],
      }),
    ).toEqual({ ready: true, missingActivities: [] });
  });
});
