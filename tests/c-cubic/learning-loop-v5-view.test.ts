import { describe, expect, it } from 'vitest';

import { BUSINESS_MODEL_LEARNING_LOOP_PACKAGE } from '@/lib/c-cubic/course-package/business-model-v5';
import { createJiuxuangeProject } from '@/lib/c-cubic/project-factory';
import { deriveJiuxuangeLearningFactCard } from '@/lib/c-cubic/learning-loop-view';

describe('Jiuxuange V5 learner fact card', () => {
  it('shows only verified learner facts for the active case task', () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_LEARNING_LOOP_PACKAGE, {
      now: '2026-07-20T16:30:00.000Z',
      learnerId: 'learner-fact-card',
      sessionVariantId: 'business-model-learning-loop',
    });
    for (const milestone of project.milestones) {
      const target = milestone.microtasks.find(
        (task) => task.jiuxuange?.learningNodeId === 'bee_fact_observation',
      );
      milestone.status = target ? 'active' : 'locked';
      for (const task of milestone.microtasks) {
        task.status = task === target ? 'in_progress' : 'todo';
      }
    }

    const card = deriveJiuxuangeLearningFactCard(project);
    expect(card).toMatchObject({
      caseId: 'convenience-bee-loop',
      title: '便利蜂：谁在做门店决策',
    });
    expect(card?.facts).toHaveLength(5);
    expect(card?.facts.every((fact) => fact.sourceLabel.includes('PDF第'))).toBe(true);
    expect(JSON.stringify(card)).not.toContain('locked_analysis');
    expect(JSON.stringify(card)).not.toContain('规模扩张依赖');
  });

  it('does not expose a case card during concept-only learning', () => {
    const project = createJiuxuangeProject(BUSINESS_MODEL_LEARNING_LOOP_PACKAGE, {
      now: '2026-07-20T16:30:00.000Z',
      learnerId: 'learner-no-card',
      sessionVariantId: 'business-model-learning-loop',
    });
    expect(deriveJiuxuangeLearningFactCard(project)).toBeNull();
  });
});
