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

describe('Jiuxuange dual-entry product contract', () => {
  it('gives group members the same frozen project card and questions', () => {
    const state = createDemoPortalState();
    const first = startAssessmentSession(state, 'demo-learner', 'bm-assessment-v1');
    const second = startAssessmentSession(state, 'demo-teammate', 'bm-assessment-v1');

    expect(first.projectCardVersionId).toBe(second.projectCardVersionId);
    expect(first.questionVersion).toBe(second.questionVersion);
    expect(first.questions).toEqual(second.questions);
  });

  it('isolates personal drafts and attempts', () => {
    const state = createDemoPortalState();
    const first = startAssessmentSession(state, 'demo-learner', 'bm-assessment-v1');
    const second = startAssessmentSession(state, 'demo-teammate', 'bm-assessment-v1');

    saveAssessmentDraft(state, 'demo-learner', first.id, {
      'positioning-1': '我的私人草稿',
    });

    expect(first.id).not.toBe(second.id);
    expect(state.assessmentSessions.find((item) => item.id === second.id)?.draftAnswers).toEqual(
      {},
    );
  });

  it('does not consume an attempt for drafts and locks after two formal submissions', () => {
    const state = createDemoPortalState();
    const session = startAssessmentSession(state, 'demo-learner', 'bm-assessment-v1');
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
    expect(() =>
      submitAssessmentAttempt(state, 'demo-learner', session.id, revised),
    ).toThrow(/locked/i);
  });

  it('rejects unpublished assessments even when the URL id is known', () => {
    const state = createDemoPortalState();
    state.assessmentAssignments[0].status = 'draft';

    expect(() =>
      startAssessmentSession(state, 'demo-learner', 'bm-assessment-v1'),
    ).toThrow(/published/i);
  });

  it('keeps assessment availability independent from course completion', () => {
    const state = createDemoPortalState();
    const portal = getLearnerPortal(state, 'demo-learner');

    expect(portal.courses[0].sessionStatus).toBe('not_started');
    expect(portal.assessments[0].status).toBe('available');
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
