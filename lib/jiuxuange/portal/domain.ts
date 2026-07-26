import { nanoid } from 'nanoid';
import type {
  ActivityEvent,
  AssessmentAttempt,
  AssessmentSession,
  JiuxuangePortalState,
  LearnerPortalView,
  PortalContext,
} from './types';

export type AssessmentAnswers = Record<string, string>;

const NOW = '2026-07-26T00:00:00.000Z';

function nowIso() {
  return new Date().toISOString();
}

function requireMembership(
  state: JiuxuangePortalState,
  learnerId: string,
  groupId: string,
) {
  const membership = state.groupMemberships.find(
    (item) =>
      item.learnerId === learnerId && item.groupId === groupId && item.status === 'active',
  );
  if (!membership) throw new Error('Learner is not assigned to this project group.');
  return membership;
}

function requireOwnedSession(
  state: JiuxuangePortalState,
  learnerId: string,
  sessionId: string,
) {
  const session = state.assessmentSessions.find(
    (item) => item.id === sessionId && item.learnerId === learnerId,
  );
  if (!session) throw new Error('Assessment session was not found for this learner.');
  return session;
}

function assertCompleteAnswers(session: AssessmentSession, answers: AssessmentAnswers) {
  const missing = session.questions.filter((question) => {
    const answer = answers[question.id];
    return typeof answer !== 'string' || answer.trim().length < 12;
  });
  if (missing.length > 0) {
    throw new Error('All six questions require a complete original answer.');
  }
}

export function createDemoPortalState(): JiuxuangePortalState {
  const questions = [
    ['positioning-1', '基于项目卡事实，这个项目当前服务的核心交易对象是谁？请说明你的依据。'],
    ['transaction-2', '项目当前真正完成的交易内容是什么？哪些需求仍未被满足？'],
    ['system-3', '要让交易持续发生，最关键的业务角色与关系是什么？'],
    ['resource-4', '现有资源能力中，哪一项最可能成为转型约束？请给出反证条件。'],
    ['profit-5', '当前收入、成本与利益相关者分配之间存在哪个主要张力？'],
    ['revision-6', '如果只能优先验证一个假设，你会选择什么，并如何用事实判断它？'],
  ].map(([id, prompt]) => ({ id, prompt, required: true as const }));

  return {
    schemaVersion: 1,
    courseVersions: [
      {
        id: 'business-model-course@5.1',
        courseId: 'business-model-course',
        version: '5.1',
        title: '商业模式大课',
        summary: '从真实项目出发，学习商业模式六要素并形成可验证判断。',
        status: 'published',
        publishedAt: NOW,
      },
    ],
    courseEnrollments: [
      {
        id: 'enrollment-demo-learner',
        learnerId: 'demo-learner',
        classId: 'demo-class',
        courseVersionId: 'business-model-course@5.1',
        status: 'active',
      },
      {
        id: 'enrollment-demo-teammate',
        learnerId: 'demo-teammate',
        classId: 'demo-class',
        courseVersionId: 'business-model-course@5.1',
        status: 'active',
      },
    ],
    learningSessions: [],
    groupMemberships: [
      {
        id: 'membership-demo-learner',
        learnerId: 'demo-learner',
        groupId: 'demo-group',
        classId: 'demo-class',
        status: 'active',
      },
      {
        id: 'membership-demo-teammate',
        learnerId: 'demo-teammate',
        groupId: 'demo-group',
        classId: 'demo-class',
        status: 'active',
      },
    ],
    projectCardVersions: [
      {
        id: 'project-card-demo@1',
        groupId: 'demo-group',
        projectId: 'demo-project',
        version: '1',
        title: '中草药泥膜项目',
        frozenAt: NOW,
        facts: [
          {
            id: 'fact-1',
            text: '项目拥有中草药种植园和泥膜加工能力。',
            sourceLabel: '项目卡：基础资源',
          },
          {
            id: 'fact-2',
            text: '过去主要向约 5000 家线下美容院供应面膜产品。',
            sourceLabel: '项目卡：既有交易',
          },
          {
            id: 'fact-3',
            text: '近三年实体美容院渠道持续收缩，项目计划转型。',
            sourceLabel: '项目卡：当前变化',
          },
        ],
      },
    ],
    assessmentAssignments: [
      {
        id: 'bm-assessment-v1',
        title: '商业模式个人项目测评',
        groupId: 'demo-group',
        projectCardVersionId: 'project-card-demo@1',
        questionVersion: 'bm-six-open-questions@1',
        questions,
        promptVersion: 'directional-feedback@1',
        rubricVersion: 'text-evidence-rubric@1',
        status: 'published',
        publishedAt: NOW,
      },
    ],
    assessmentSessions: [],
    assessmentAttempts: [],
    activityEvents: [],
  };
}

export function summarizeActiveSeconds(
  state: JiuxuangePortalState,
  learnerId: string,
): Record<PortalContext, number> {
  const result: Record<PortalContext, number> = {
    course: 0,
    free_learning: 0,
    assessment: 0,
  };
  for (const event of state.activityEvents) {
    if (event.learnerId === learnerId) result[event.context] += event.creditedSeconds;
  }
  return result;
}

export function getLearnerPortal(
  state: JiuxuangePortalState,
  learnerId: string,
): LearnerPortalView {
  const courses = state.courseEnrollments
    .filter((item) => item.learnerId === learnerId && item.status !== 'revoked')
    .flatMap((enrollment) => {
      const course = state.courseVersions.find(
        (item) => item.id === enrollment.courseVersionId && item.status === 'published',
      );
      if (!course) return [];
      const session = state.learningSessions.find(
        (item) =>
          item.learnerId === learnerId &&
          item.courseVersionId === enrollment.courseVersionId &&
          item.kind === 'official_course',
      );
      return [
        {
          enrollmentId: enrollment.id,
          courseVersionId: course.id,
          title: course.title,
          summary: course.summary,
          version: course.version,
          sessionStatus: session?.status ?? ('not_started' as const),
          stageId: session?.stageId,
        },
      ];
    });

  const groupIds = new Set(
    state.groupMemberships
      .filter((item) => item.learnerId === learnerId && item.status === 'active')
      .map((item) => item.groupId),
  );
  const assessments = state.assessmentAssignments
    .filter((item) => item.status === 'published' && groupIds.has(item.groupId))
    .map((assignment) => {
      const projectCard = state.projectCardVersions.find(
        (item) => item.id === assignment.projectCardVersionId,
      );
      const session = state.assessmentSessions.find(
        (item) => item.learnerId === learnerId && item.assignmentId === assignment.id,
      );
      return {
        assignmentId: assignment.id,
        title: assignment.title,
        projectTitle: projectCard?.title ?? '项目卡',
        projectCardVersion: projectCard?.version ?? 'unknown',
        status: session?.status === 'locked'
          ? ('locked' as const)
          : session
            ? ('in_progress' as const)
            : ('available' as const),
        attemptsUsed: session?.attemptIds.length ?? 0,
      };
    });

  return { learnerId, courses, assessments, activeSeconds: summarizeActiveSeconds(state, learnerId) };
}

export function startAssessmentSession(
  state: JiuxuangePortalState,
  learnerId: string,
  assignmentId: string,
): AssessmentSession {
  const existing = state.assessmentSessions.find(
    (item) => item.learnerId === learnerId && item.assignmentId === assignmentId,
  );
  if (existing) return existing;

  const assignment = state.assessmentAssignments.find((item) => item.id === assignmentId);
  if (!assignment || assignment.status !== 'published') {
    throw new Error('Assessment must be published before a learner can start it.');
  }
  requireMembership(state, learnerId, assignment.groupId);
  const projectCard = state.projectCardVersions.find(
    (item) =>
      item.id === assignment.projectCardVersionId && item.groupId === assignment.groupId,
  );
  if (!projectCard) throw new Error('The frozen project card is unavailable.');

  const session: AssessmentSession = {
    id: `assessment-session-${nanoid(10)}`,
    learnerId,
    assignmentId,
    projectCardVersionId: assignment.projectCardVersionId,
    questionVersion: assignment.questionVersion,
    questions: structuredClone(assignment.questions),
    status: 'draft',
    draftAnswers: {},
    attemptIds: [],
    updatedAt: nowIso(),
  };
  state.assessmentSessions.push(session);
  return session;
}

export function saveAssessmentDraft(
  state: JiuxuangePortalState,
  learnerId: string,
  sessionId: string,
  answers: AssessmentAnswers,
) {
  const session = requireOwnedSession(state, learnerId, sessionId);
  if (session.status === 'locked') throw new Error('Assessment session is locked.');
  const allowedIds = new Set(session.questions.map((question) => question.id));
  session.draftAnswers = Object.fromEntries(
    Object.entries(answers).filter(
      ([questionId, answer]) => allowedIds.has(questionId) && typeof answer === 'string',
    ),
  );
  session.updatedAt = nowIso();
  return session;
}

function buildFeedback(
  attemptNumber: 1 | 2,
  answers: AssessmentAnswers,
  previous?: AssessmentAttempt,
) {
  if (attemptNumber === 1) {
    return {
      kind: 'directional' as const,
      body:
        '你已经形成第一轮独立判断。下一轮请优先补足项目事实、因果连接和可能推翻判断的条件；系统不会在此阶段提供参考结论。',
      changedQuestionIds: [],
      evidenceAnswerIds: Object.keys(answers),
    };
  }
  const changedQuestionIds = Object.keys(answers).filter(
    (questionId) => previous?.answers[questionId]?.trim() !== answers[questionId]?.trim(),
  );
  return {
    kind: 'final' as const,
    body:
      changedQuestionIds.length > 0
        ? `你在第二次提交中修正了 ${changedQuestionIds.length} 个判断。最终反馈保留两次原文，供教练复核事实依据、因果逻辑和反证意识。`
        : '两次回答没有形成可识别的文字修正。最终反馈保留原文，并建议回到项目事实补充可验证的新证据。',
    changedQuestionIds,
    evidenceAnswerIds: Object.keys(answers),
  };
}

export function submitAssessmentAttempt(
  state: JiuxuangePortalState,
  learnerId: string,
  sessionId: string,
  answers: AssessmentAnswers,
): AssessmentAttempt {
  const session = requireOwnedSession(state, learnerId, sessionId);
  if (session.status === 'locked' || session.attemptIds.length >= 2) {
    throw new Error('Assessment session is locked after two attempts.');
  }
  assertCompleteAnswers(session, answers);

  const attemptNumber = (session.attemptIds.length + 1) as 1 | 2;
  const previous = session.attemptIds[0]
    ? state.assessmentAttempts.find((item) => item.id === session.attemptIds[0])
    : undefined;
  const attempt: AssessmentAttempt = {
    id: `assessment-attempt-${nanoid(10)}`,
    assessmentSessionId: session.id,
    learnerId,
    attemptNumber,
    answers: structuredClone(answers),
    submittedAt: nowIso(),
    feedback: buildFeedback(attemptNumber, answers, previous),
  };
  state.assessmentAttempts.push(attempt);
  session.attemptIds.push(attempt.id);
  session.draftAnswers = structuredClone(answers);
  session.status = attemptNumber === 2 ? 'locked' : 'revision';
  session.updatedAt = attempt.submittedAt;
  return attempt;
}

export function recordActivity(
  state: JiuxuangePortalState,
  learnerId: string,
  input: {
    context: PortalContext;
    occurredAt?: string;
    visible: boolean;
    secondsSinceInteraction: number;
    intervalSeconds: number;
  },
): ActivityEvent {
  const creditedSeconds =
    input.visible && input.secondsSinceInteraction <= 120
      ? Math.max(0, Math.min(60, Math.floor(input.intervalSeconds)))
      : 0;
  const event: ActivityEvent = {
    id: `activity-${nanoid(10)}`,
    learnerId,
    context: input.context,
    eventType: 'active_heartbeat',
    occurredAt: input.occurredAt ?? nowIso(),
    creditedSeconds,
    visible: input.visible,
    secondsSinceInteraction: Math.max(0, input.secondsSinceInteraction),
  };
  state.activityEvents.push(event);
  return event;
}
