import { describe, expect, it } from 'vitest';

import { ASSESSMENT_VERSION, FIXED_ASSESSMENT_QUESTIONS } from '@/lib/c-cubic/assessment';

describe('Jiuxuange fixed assessment question bank', () => {
  it('keeps six versioned questions covering the complete reasoning sequence', () => {
    expect(ASSESSMENT_VERSION).toBe('jiuxuange-six-elements-assessment.v1');
    expect(FIXED_ASSESSMENT_QUESTIONS).toHaveLength(6);
    expect(FIXED_ASSESSMENT_QUESTIONS.map((question) => question.focus)).toEqual([
      'fact-identification',
      'concept-boundary',
      'six-elements-linkage',
      'causal-judgment',
      'counterevidence-condition',
      'project-transfer',
    ]);
    expect(FIXED_ASSESSMENT_QUESTIONS.every((question) => question.version === 'v1')).toBe(true);
    expect(new Set(FIXED_ASSESSMENT_QUESTIONS.map((question) => question.id)).size).toBe(6);
  });
});
