import { describe, expect, it } from 'vitest';

import {
  learnerFacingAgent,
  shouldShowAgentTabs,
} from '@/components/scene-renderers/pbl/v2/agent-tabs';
import {
  roleForMessage,
  shouldShowJiuxuangeContinuation,
  shouldShowProgressDivider,
  shouldShowStructuredEvaluation,
} from '@/components/scene-renderers/pbl/v2/chat';
import { completionLearnerVisibility } from '@/components/scene-renderers/pbl/v2/completion';
import {
  milestoneEvaluationVisibility,
  milestoneHandoverCtaState,
} from '@/components/scene-renderers/pbl/v2/eval-cards/milestone-card';
import { taskEvaluationVisibility } from '@/components/scene-renderers/pbl/v2/eval-cards/task-evaluation-card';
import {
  jiuxuangeContinuationKind,
  shouldShowLearnerRoadmap,
} from '@/components/scene-renderers/pbl/v2/sidebar';
import {
  shouldShowWorkspaceProgress,
  workspaceGridTemplateColumns,
} from '@/components/scene-renderers/pbl/v2/workspace';
import type { PBLChatMessage, PBLEvaluation, PBLProjectV2 } from '@/lib/pbl/v2/types';

function project(overrides: Partial<PBLProjectV2> = {}): PBLProjectV2 {
  return {
    uiPhase: 'workspace',
    title: 'Business Model',
    description: 'Build an evidence-backed judgment',
    proficiency: 'beginner',
    language: 'zh-CN',
    tags: [],
    status: 'active',
    roles: [
      { id: 'professor', type: 'instructor', name: 'Professor' },
      { id: 'senior', type: 'mentor', name: 'Senior' },
      { id: 'feedback', type: 'evaluator', name: 'Growth feedback' },
    ],
    milestones: [
      {
        id: 'module-a',
        title: 'Module A',
        status: 'active',
        order: 0,
        documents: [],
        microtasks: [
          {
            id: 'task-a',
            title: 'Task A',
            status: 'in_progress',
            assignee: 'user',
            hints: [],
            order: 0,
          },
        ],
      },
      {
        id: 'module-b',
        title: 'Future module',
        status: 'locked',
        order: 1,
        documents: [],
        microtasks: [],
      },
    ],
    submissions: [],
    evaluations: [],
    threads: [{ agentId: 'professor', messages: [] }],
    engagementEvents: [],
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z',
    ...overrides,
  };
}

function jiuxuangeProject(formalScoringEnabled: boolean): PBLProjectV2 {
  return project({
    jiuxuange: {
      courseId: 'business-model',
      courseVersion: '1.0.0',
      moduleId: 'six-elements',
      curriculumOrder: 2,
      releaseStatus: 'pilot_b_only',
      factPackHash: 'facts-v1',
      caseId: 'demo',
      runtimeMode: 'demo',
      formalScoringEnabled,
    },
  });
}

const taskEvaluation: PBLEvaluation = {
  id: 'eval-task',
  kind: 'task',
  feedback: 'Your evidence is clearer now.',
  strengths: ['Used a concrete fact'],
  improvements: ['State the boundary condition'],
  score: 88,
  createdAt: '2026-07-11T00:01:00.000Z',
};

const milestoneEvaluation: PBLEvaluation = {
  id: 'eval-milestone',
  kind: 'milestone',
  feedback: 'You connected the fact to a causal judgment.',
  strengths: ['Connected fact and conclusion'],
  improvements: ['Test the counterexample'],
  stars: 4.5,
  createdAt: '2026-07-11T00:02:00.000Z',
};

describe('Jiuxuange learner presentation', () => {
  it('hides role tabs, roadmap, progress segments, and divider markers', () => {
    const p = jiuxuangeProject(false);

    expect(shouldShowAgentTabs(p)).toBe(false);
    expect(shouldShowLearnerRoadmap(p)).toBe(false);
    expect(shouldShowWorkspaceProgress(p)).toBe(false);
    expect(shouldShowProgressDivider(p)).toBe(false);
  });

  it('keeps the current task completion control without exposing the roadmap', () => {
    const p = jiuxuangeProject(false);
    p.pendingTaskCompletion = {
      microtaskId: 'task-a',
      milestoneId: 'module-a',
      reason: 'ready',
      createdAt: '2026-07-11T00:03:00.000Z',
    };

    expect(jiuxuangeContinuationKind(p)).toBe('complete-task');
    expect(shouldShowJiuxuangeContinuation(p)).toBe(true);
    expect(workspaceGridTemplateColumns(p, { sidebar: 22, chat: 52, submission: 26 })).toBe(
      '74fr 6px 26fr',
    );
  });

  it('keeps handover in the transition card without duplicating it in the sidebar', () => {
    const p = jiuxuangeProject(false);
    p.pendingHandover = {
      completedMilestoneId: 'module-a',
      completedMilestoneTitle: 'Module A',
      nextMilestoneId: 'module-b',
      nextMilestoneTitle: 'Future module',
      consumed: false,
    };

    expect(jiuxuangeContinuationKind(p)).toBeUndefined();
    expect(milestoneHandoverCtaState(p.pendingHandover)).toBe('ready');
  });

  it('resolves a restored bubble identity from message.agentId in the shared thread', () => {
    const p = jiuxuangeProject(false);
    const savedMessage: PBLChatMessage = {
      id: 'saved-turn',
      agentId: 'senior',
      roleType: 'instructor',
      content: 'Bring this back to your own project.',
      ts: '2026-07-11T00:04:00.000Z',
    };

    expect(roleForMessage(p, savedMessage)?.name).toBe('Senior');
    expect(p.threads).toHaveLength(1);
  });

  it('uses the phase-selected role for the live Jiuxuange turn label', () => {
    const p = jiuxuangeProject(false);
    p.roles.push({ id: 'jiuxuange-mystery', type: 'collaborator', name: '神秘角色' });
    p.milestones[0].microtasks[0].jiuxuange = {
      phase: 'tension',
      questionTemplateId: 'probe_tension',
      questionPrompt: '你看到了什么不一致？',
      evidenceRuleIds: ['fact_grounding'],
      preferredRole: 'mystery',
    };

    expect(learnerFacingAgent(p)?.name).toBe('神秘角色');
  });

  it('keeps natural-language feedback but hides structured scoring details before calibration', () => {
    const p = jiuxuangeProject(false);

    expect(shouldShowStructuredEvaluation(p)).toBe(false);
    expect(taskEvaluationVisibility(taskEvaluation, false)).toEqual({
      showCard: false,
      showScore: false,
    });
    expect(milestoneEvaluationVisibility(milestoneEvaluation, false)).toEqual({
      showStars: false,
      showLearned: false,
      showPerformance: false,
    });
    expect(completionLearnerVisibility(p)).toEqual({
      showStars: false,
      showDuration: false,
      showStageCounts: false,
      showCoachEvaluation: false,
    });
    expect(taskEvaluation.feedback).toBe('Your evidence is clearer now.');
    expect(milestoneEvaluation.feedback).toBe('You connected the fact to a causal judgment.');
  });
});

describe('generic PBL learner presentation regression', () => {
  it('keeps the existing tabs, roadmap, progress, dividers, and evaluation details', () => {
    const p = project();

    expect(shouldShowAgentTabs(p)).toBe(true);
    expect(shouldShowLearnerRoadmap(p)).toBe(true);
    expect(shouldShowWorkspaceProgress(p)).toBe(true);
    expect(shouldShowProgressDivider(p)).toBe(true);
    expect(shouldShowStructuredEvaluation(p)).toBe(true);
    expect(workspaceGridTemplateColumns(p, { sidebar: 22, chat: 52, submission: 26 })).toBe(
      '22fr 6px 52fr 6px 26fr',
    );
    expect(taskEvaluationVisibility(taskEvaluation, true)).toEqual({
      showCard: true,
      showScore: true,
    });
    expect(milestoneEvaluationVisibility(milestoneEvaluation, true)).toEqual({
      showStars: true,
      showLearned: true,
      showPerformance: true,
    });
    expect(completionLearnerVisibility(p)).toEqual({
      showStars: true,
      showDuration: true,
      showStageCounts: true,
      showCoachEvaluation: true,
    });
  });

  it('falls back to the instructor for messages without an agent identity', () => {
    const p = project();
    const legacyMessage: PBLChatMessage = {
      id: 'legacy-turn',
      roleType: 'instructor',
      content: 'Legacy message',
      ts: '2026-07-11T00:05:00.000Z',
    };

    expect(roleForMessage(p, legacyMessage)?.name).toBe('Professor');
  });
});
