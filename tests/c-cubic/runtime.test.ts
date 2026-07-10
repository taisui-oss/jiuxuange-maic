import { describe, expect, it } from 'vitest';
import {
  buildJiuxuangeRuntimeBlock,
  countLearnerFacingQuestions,
  enforceOneLearnerFacingQuestion,
  getCurrentJiuxuangeMicrotask,
  roleForJiuxuangePhase,
  selectJiuxuangeRole,
  type JiuxuangeRuntimeProject,
} from '@/lib/c-cubic/runtime';

function projectAtPhase(
  phase: Parameters<typeof roleForJiuxuangePhase>[0],
): JiuxuangeRuntimeProject {
  return {
    jiuxuange: { courseVersion: '1.0.0-pilot-b' },
    roles: [
      { id: 'jiuxuange-professor', name: '教授' },
      { id: 'jiuxuange-senior', name: '学长' },
      { id: 'jiuxuange-mystery', name: '神秘角色' },
      { id: 'jiuxuange-growth-feedback', name: '成长反馈官' },
    ],
    milestones: [
      {
        id: 'inactive',
        status: 'completed',
        microtasks: [],
      },
      {
        id: 'active',
        status: 'active',
        microtasks: [
          { id: 'todo', status: 'todo' },
          {
            id: `task-${phase}`,
            status: 'in_progress',
            jiuxuange: {
              phase,
              questionPrompt: '把门店增长和续约下降放在一起，你看到了什么不一致？',
            },
          },
        ],
      },
    ],
  };
}

describe('Jiuxuange runtime helpers', () => {
  it('finds only the in-progress microtask in the active milestone', () => {
    expect(getCurrentJiuxuangeMicrotask(projectAtPhase('tension'))?.id).toBe('task-tension');
  });

  it('does not treat a generic in-progress task as a Jiuxuange microtask', () => {
    expect(
      getCurrentJiuxuangeMicrotask({
        roles: [],
        milestones: [
          {
            id: 'generic-milestone',
            status: 'active',
            microtasks: [{ id: 'generic-task', status: 'in_progress' }],
          },
        ],
      }),
    ).toBeUndefined();
  });

  it.each([
    ['ground', 'professor'],
    ['apply', 'senior'],
    ['compare', 'senior'],
    ['tension', 'mystery'],
    ['judge', 'mystery'],
    ['test', 'senior'],
    ['reflect', 'growth-feedback'],
  ] as const)('routes %s to the %s role', (phase, role) => {
    expect(roleForJiuxuangePhase(phase)).toBe(role);
    expect(selectJiuxuangeRole(projectAtPhase(phase)).id).toBe(`jiuxuange-${role}`);
  });

  it('returns no runtime block outside a current Jiuxuange microtask', () => {
    expect(buildJiuxuangeRuntimeBlock({ milestones: [], roles: [] }, [])).toBe('');
  });

  it('injects one role, one question, learner-safe rules, and only verified visible facts', () => {
    const block = buildJiuxuangeRuntimeBlock(projectAtPhase('tension'), [
      {
        id: 'visible-fact',
        text: '门店数量增长，加盟商续约率下降。',
        visibility: 'learner',
        verificationStatus: 'verified',
      },
      {
        id: 'draft-fact',
        text: '这条还没有核验。',
        visibility: 'learner',
        verificationStatus: 'draft',
      },
      {
        id: 'coach-fact',
        text: '教练已经判定了核心矛盾。',
        visibility: 'coach_only',
        verificationStatus: 'verified',
      },
    ]);

    expect(block).toContain('本轮唯一可见角色：神秘角色');
    expect(block).toContain('本轮唯一问题：把门店增长和续约下降放在一起');
    expect(block).toContain('[visible-fact]');
    expect(block).not.toContain('draft-fact');
    expect(block).not.toContain('coach-fact');
    expect(block).toContain('不展示课程模块、阶段、评价维度或证据门槛');
    expect(block).toContain('不直接说出或命名学员需要自己发现的矛盾');
  });

  it('enforces exactly one learner-facing question', () => {
    const response = '你认为这条事实首先改变了哪一项？';
    expect(countLearnerFacingQuestions(response)).toBe(1);
    expect(enforceOneLearnerFacingQuestion(response)).toBe(response);
    expect(() => enforceOneLearnerFacingQuestion('你看到了什么？为什么？')).toThrow(
      'Expected exactly one learner-facing question, received 2',
    );
    expect(() => enforceOneLearnerFacingQuestion('请继续。')).toThrow(
      'Expected exactly one learner-facing question, received 0',
    );
  });
});
