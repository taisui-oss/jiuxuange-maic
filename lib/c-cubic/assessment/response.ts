import { ASSESSMENT_VERSION, getAssessmentQuestion } from './questions';
import { assessAssessmentReadiness, type AssessmentRequiredActivity } from './readiness';

export interface AssessmentEvidenceSource {
  id: string;
  label: string;
  locator: string;
}

export interface AssessmentEvidenceMessage {
  messageId: string;
  message: string;
  source: AssessmentEvidenceSource;
}

export interface CreateAssessmentResponseInput {
  id: string;
  learnerId: string;
  questionId: string;
  rawAnswer: string;
  evidenceMessages: readonly AssessmentEvidenceMessage[];
  completedActivities: readonly AssessmentRequiredActivity[];
  submittedAt: string;
}

export interface AssessmentResponse {
  id: string;
  learnerId: string;
  assessmentVersion: typeof ASSESSMENT_VERSION;
  questionId: string;
  questionVersion: 'v1';
  rawAnswer: string;
  evidenceMessages: AssessmentEvidenceMessage[];
  submittedAt: string;
}

export function createAssessmentResponse(input: CreateAssessmentResponseInput): AssessmentResponse {
  const readiness = assessAssessmentReadiness({
    completedActivities: input.completedActivities,
  });
  if (!readiness.ready) {
    throw new Error(`Assessment is locked until: ${readiness.missingActivities.join(', ')}`);
  }

  const question = getAssessmentQuestion(input.questionId);
  if (!question) throw new Error(`Unknown assessment question: ${input.questionId}`);

  return {
    id: input.id,
    learnerId: input.learnerId,
    assessmentVersion: ASSESSMENT_VERSION,
    questionId: question.id,
    questionVersion: question.version,
    rawAnswer: input.rawAnswer,
    evidenceMessages: input.evidenceMessages.map((evidence) => ({
      ...evidence,
      source: { ...evidence.source },
    })),
    submittedAt: input.submittedAt,
  };
}
