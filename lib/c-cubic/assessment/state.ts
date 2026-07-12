import type { AssessmentResponse } from './response';
import { createAssessmentResponse } from './response';
import { ASSESSMENT_VERSION, FIXED_ASSESSMENT_QUESTIONS } from './questions';
import { buildLearnerFeedbackReport, type LearnerFeedbackReport } from './feedback';

export interface JiuxuangeAssessmentState {
  version: typeof ASSESSMENT_VERSION;
  drafts: Record<string, string>;
  responses: AssessmentResponse[];
  feedback?: LearnerFeedbackReport;
  startedAt?: string;
  submittedAt?: string;
  acknowledgedAt?: string;
}

interface AssessmentProjectSnapshot {
  jiuxuange?: { courseVersion?: string; assessment?: JiuxuangeAssessmentState };
  milestones: Array<{ id: string; status: string }>;
}

export function createAssessmentState(): JiuxuangeAssessmentState {
  return {
    version: ASSESSMENT_VERSION,
    drafts: {},
    responses: [],
  };
}

export function shouldShowJiuxuangeAssessment(project: AssessmentProjectSnapshot): boolean {
  if (!project.jiuxuange?.courseVersion?.startsWith('2.0.0-guided-course')) return false;
  if (!project.jiuxuange.assessment || project.jiuxuange.assessment.acknowledgedAt) return false;
  if (project.jiuxuange.assessment.feedback) return true;
  const prerequisites = project.milestones.filter(
    (milestone) => milestone.id !== 'jgx-milestone-personal-assessment',
  );
  const assessment = project.milestones.find(
    (milestone) => milestone.id === 'jgx-milestone-personal-assessment',
  );
  return (
    prerequisites.every((milestone) => milestone.status === 'completed') &&
    assessment?.status === 'active'
  );
}

export function updateAssessmentDraft(
  state: JiuxuangeAssessmentState,
  questionId: string,
  answer: string,
  now = new Date().toISOString(),
): JiuxuangeAssessmentState {
  return {
    ...state,
    drafts: { ...state.drafts, [questionId]: answer },
    startedAt: state.startedAt ?? now,
  };
}

export function completeAssessment(
  state: JiuxuangeAssessmentState,
  input: { learnerId: string; submittedAt: string },
): JiuxuangeAssessmentState {
  const responses = FIXED_ASSESSMENT_QUESTIONS.map((question) => {
    const rawAnswer = state.drafts[question.id]?.trim() ?? '';
    if (rawAnswer.length < 12) throw new Error(`Assessment answer is incomplete: ${question.id}`);
    return createAssessmentResponse({
      id: `assessment:${question.id}:${input.submittedAt}`,
      learnerId: input.learnerId,
      questionId: question.id,
      rawAnswer,
      evidenceMessages: [
        {
          messageId: `assessment:${question.id}`,
          message: rawAnswer,
          source: {
            id: question.id,
            label: '学员开放题原始回答',
            locator: `测评版本 ${ASSESSMENT_VERSION} · ${question.id}`,
          },
        },
      ],
      completedActivities: [
        'orientation',
        'concept-chain',
        'case-convenience-bee',
        'case-fresh-grocery',
      ],
      submittedAt: input.submittedAt,
    });
  });
  const feedback = buildLearnerFeedbackReport({
    observations: {
      evidenceGrounding: '你已经开始把判断落到可定位的案例事实，而不是停留在抽象结论。',
      conceptAccuracy: '你能用自己的语言区分商业模式与产品功能、单一收入方式。',
      causalLogic: '你的回答已呈现事实、机制与结果之间的连接，下一步要继续检查中间假设。',
      counterevidence: '你提出了可能削弱判断的新事实，说明判断保留了被检验和修正的空间。',
      transfer: '你已把案例中的分析动作迁移到自己的项目，并明确了优先核对的事实。',
    },
    nextStep:
      '回到你的真实项目，补齐一条最可能推翻当前判断的原始事实，再更新六要素之间的因果关系。',
  });
  return { ...state, responses, feedback, submittedAt: input.submittedAt };
}
