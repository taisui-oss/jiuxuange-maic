import { describe, expect, it } from 'vitest';

import {
  buildDryRunFlow,
  loadJiuxuangeCaseTests,
  runJiuxuangeDryRun,
  validateJiuxuangeCaseTests,
} from '@/eval/jiuxuange-learning-partner/runner';

describe('Jiuxuange learning partner dry-run runner', () => {
  it('validates the reusable five-case dataset', () => {
    const cases = loadJiuxuangeCaseTests();

    expect(validateJiuxuangeCaseTests(cases)).toEqual([]);
    expect(cases).toHaveLength(5);
  });

  it('builds learner-visible and coach-only flow checkpoints', () => {
    const [testCase] = loadJiuxuangeCaseTests();
    const flow = buildDryRunFlow(testCase);

    expect(flow.checkpoints.map((checkpoint) => checkpoint.cardType)).toEqual([
      'concept_understanding',
      'case_observation',
      'contradiction_discovery',
      'business_model_judgement',
    ]);
    expect(flow.checkpoints.filter((checkpoint) => checkpoint.visibleToLearner)).toHaveLength(2);
    expect(flow.checkpoints.filter((checkpoint) => !checkpoint.visibleToLearner)).toHaveLength(2);
  });

  it('turns each case into a PBL planner input without changing the state machine', () => {
    const flows = runJiuxuangeDryRun();

    expect(flows).toHaveLength(5);
    for (const flow of flows) {
      expect(flow.plannerInput.outline.type).toBe('pbl');
      expect(flow.plannerInput.outline.pblConfig?.projectTopic).toContain(flow.targetName);
      expect(flow.plannerInput.courseContext.allOutlines).toHaveLength(1);
      expect(flow.plannerInput.courseContext.languageDirective).toBe('Reply in Simplified Chinese');
      expect(flow.plannerInput.user?.requirement).toContain('九轩阁商业模式学习伙伴测试');
    }
  });
});
