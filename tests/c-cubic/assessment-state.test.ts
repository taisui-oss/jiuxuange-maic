import { describe, expect, it } from 'vitest';
import { BUSINESS_MODEL_GUIDED_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v2';
import { createJiuxuangeProject } from '@/lib/c-cubic/project-factory';
import {
  createAssessmentState,
  shouldShowJiuxuangeAssessment,
  updateAssessmentDraft,
  completeAssessment,
} from '@/lib/c-cubic/assessment/state';

describe('Jiuxuange assessment state', () => {
  it('unlocks only after the concept chain and both cases are completed', () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_GUIDED_PACKAGE, {
      now: '2026-07-11T00:00:00.000Z',
    });
    project.jiuxuange!.assessment = createAssessmentState();
    expect(shouldShowJiuxuangeAssessment(project)).toBe(false);

    for (const milestone of project.milestones.slice(0, 9)) milestone.status = 'completed';
    project.milestones[9].status = 'active';
    expect(shouldShowJiuxuangeAssessment(project)).toBe(true);
  });

  it('preserves drafts, raw responses and a non-numeric feedback report', () => {
    let state = createAssessmentState();
    state = updateAssessmentDraft(state, 'fact-identification', '我引用便利蜂中央大脑的事实。');
    expect(state.drafts['fact-identification']).toContain('中央大脑');

    const drafts = Object.fromEntries(
      [
        'fact-identification',
        'concept-boundary',
        'six-elements-linkage',
        'causal-judgment',
        'counterevidence-condition',
        'project-transfer',
      ].map((id) => [id, `${id} 的完整回答，包含事实、推理和检验条件。`]),
    );
    state = { ...state, drafts };
    const completed = completeAssessment(state, {
      learnerId: 'learner-a',
      submittedAt: '2026-07-11T02:00:00.000Z',
    });

    expect(completed.responses).toHaveLength(6);
    expect(completed.responses[0].rawAnswer).toContain('完整回答');
    expect(completed.feedback).toBeDefined();
    expect(JSON.stringify(completed.feedback)).not.toMatch(/score|stars|\b\d{1,3}\b/i);
  });
});
