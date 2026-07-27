import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  createDemoPortalState,
  getLearnerPortal,
  recordActivity,
  saveAssessmentDraft,
  startAssessmentSession,
  submitAssessmentAttempt,
  summarizeActiveSeconds,
} from '@/lib/jiuxuange/portal/domain';
import { MCKESS_ASSESSMENT_ASSIGNMENT_ID } from '@/lib/jiuxuange/portal/mckess-assessment';

describe('Jiuxuange dual-entry product contract', () => {
  it('binds the assessment, session and frozen card to the same Mckess project', () => {
    const state = createDemoPortalState();
    const assignment = state.assessmentAssignments[0];
    const projectCard = state.projectCardVersions[0];
    const first = startAssessmentSession(state, 'demo-learner', MCKESS_ASSESSMENT_ASSIGNMENT_ID);
    const second = startAssessmentSession(state, 'demo-teammate', MCKESS_ASSESSMENT_ASSIGNMENT_ID);

    expect(assignment.projectId).toBe('mckess-central-kitchen');
    expect(projectCard.projectId).toBe(assignment.projectId);
    expect(first.projectId).toBe(assignment.projectId);
    expect(first.projectCardVersionId).toBe(second.projectCardVersionId);
    expect(first.questionVersion).toBe(second.questionVersion);
    expect(first.questions).toEqual(second.questions);
    expect(first.questions).toHaveLength(6);
    expect(new Set(first.questions.map((question) => question.questionType))).toEqual(
      new Set([
        'fact_diagnosis',
        'hypothesis_evaluation',
        'option_comparison',
        'causal_reasoning',
        'judgment_revision',
      ]),
    );
    expect(first.questions.every((question) => question.required)).toBe(true);
    expect(first.questions.map((question) => question.prompt).join('')).toContain('麦客思');
    expect(first.questions.map((question) => question.prompt).join('')).toContain('六要素因果图');
    expect(projectCard.version).toBe('1.1.0-draft');
    expect(
      projectCard.facts.every(
        (fact) => fact.sourceLabel === '麦客思项目卡草案 · 已按模型披露规则脱敏 · 待案主确认',
      ),
    ).toBe(true);
    expect(projectCard.facts.map((fact) => fact.text).join('')).not.toContain('20.65%');
  });

  it('isolates personal drafts and attempts', () => {
    const state = createDemoPortalState();
    const first = startAssessmentSession(state, 'demo-learner', MCKESS_ASSESSMENT_ASSIGNMENT_ID);
    const second = startAssessmentSession(state, 'demo-teammate', MCKESS_ASSESSMENT_ASSIGNMENT_ID);

    saveAssessmentDraft(state, 'demo-learner', first.id, {
      [first.questions[0].id]: '我的私人草稿',
    });

    expect(first.id).not.toBe(second.id);
    expect(state.assessmentSessions.find((item) => item.id === second.id)?.draftAnswers).toEqual(
      {},
    );
  });

  it('does not consume an attempt for drafts and locks after two formal submissions', () => {
    const state = createDemoPortalState();
    const session = startAssessmentSession(state, 'demo-learner', MCKESS_ASSESSMENT_ASSIGNMENT_ID);
    const answers = Object.fromEntries(
      session.questions.map((question, index) => [
        question.id,
        `第 ${index + 1} 题：我依据项目事实形成判断，并说明因果关系和待验证条件。`,
      ]),
    );

    saveAssessmentDraft(state, 'demo-learner', session.id, answers);
    expect(session.attemptIds).toHaveLength(0);

    const first = submitAssessmentAttempt(state, 'demo-learner', session.id, answers);
    expect(first.attemptNumber).toBe(1);
    expect(first.feedback.kind).toBe('directional');
    expect(first.feedback.body).not.toContain('标准答案');

    const revised = Object.fromEntries(
      Object.entries(answers).map(([id, answer]) => [id, `${answer} 第二次补充了反证条件。`]),
    );
    const second = submitAssessmentAttempt(state, 'demo-learner', session.id, revised);
    expect(second.attemptNumber).toBe(2);
    expect(second.feedback.kind).toBe('final');
    expect(second.feedback.changedQuestionIds).toHaveLength(6);
    expect(session.status).toBe('locked');
    expect(() => submitAssessmentAttempt(state, 'demo-learner', session.id, revised)).toThrow(
      /locked/i,
    );
  });

  it('rejects unpublished assessments even when the URL id is known', () => {
    const state = createDemoPortalState();
    state.assessmentAssignments[0].status = 'draft';

    expect(() =>
      startAssessmentSession(state, 'demo-learner', MCKESS_ASSESSMENT_ASSIGNMENT_ID),
    ).toThrow(/published/i);
  });

  it('rejects a published assignment whose project differs from its project card', () => {
    const state = createDemoPortalState();
    state.assessmentAssignments[0].projectId = 'another-project';

    expect(() =>
      startAssessmentSession(state, 'demo-learner', MCKESS_ASSESSMENT_ASSIGNMENT_ID),
    ).toThrow(/does not match/i);
  });

  it('keeps assessment availability independent from course completion', () => {
    const state = createDemoPortalState();
    const portal = getLearnerPortal(state, 'demo-learner');

    expect(portal.courses[0].sessionStatus).toBe('not_started');
    expect(portal.assessments[0].status).toBe('available');
  });

  it('keeps the personal assessment independent from realtime agent assistance', () => {
    const source = readFileSync('app/assessment/[assignmentId]/page.tsx', 'utf8');

    expect(source).toContain('测评页不提供 Agent 实时帮助');
    expect(source).not.toContain('<AgentBar');
    expect(source).not.toContain('personalLearningSession');
    expect(source).not.toContain('groupDiscussionSession');
  });

  it('counts only visible, recent-interaction heartbeat intervals', () => {
    const state = createDemoPortalState();
    recordActivity(state, 'demo-learner', {
      context: 'assessment',
      occurredAt: '2026-07-26T10:00:00.000Z',
      visible: true,
      secondsSinceInteraction: 10,
      intervalSeconds: 30,
    });
    recordActivity(state, 'demo-learner', {
      context: 'assessment',
      occurredAt: '2026-07-26T10:01:00.000Z',
      visible: false,
      secondsSinceInteraction: 5,
      intervalSeconds: 30,
    });
    recordActivity(state, 'demo-learner', {
      context: 'assessment',
      occurredAt: '2026-07-26T10:02:00.000Z',
      visible: true,
      secondsSinceInteraction: 180,
      intervalSeconds: 30,
    });

    expect(summarizeActiveSeconds(state, 'demo-learner')).toEqual({
      course: 0,
      free_learning: 0,
      assessment: 30,
    });
  });
});
