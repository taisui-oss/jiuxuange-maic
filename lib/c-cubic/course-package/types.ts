export type JiuxuangeModuleCode =
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'H'
  | 'I'
  | 'J'
  | 'K'
  | 'L';

export type JiuxuangeVisibleLevelId =
  | 'positioning'
  | 'business-system'
  | 'key-resources-capabilities'
  | 'profit-model'
  | 'cash-flow-structure'
  | 'enterprise-value';

export type JiuxuangeQuestionPhase =
  | 'ground'
  | 'apply'
  | 'compare'
  | 'tension'
  | 'judge'
  | 'test'
  | 'reflect';

export type JiuxuangeEvidenceSignal =
  | 'own_words'
  | 'distinction'
  | 'fact_ref'
  | 'causal_link'
  | 'boundary'
  | 'counterevidence'
  | 'judgment_revision';

export type JiuxuangeLearningNodeId =
  | 'baseline_capture'
  | 'must_know_instruction'
  | 'bee_fact_observation'
  | 'bee_independent_commit'
  | 'bee_unlock_compare'
  | 'fresh_transfer'
  | 'judgment_revision'
  | 'evidence_feedback';

export type JiuxuangeFactSourceKind =
  | 'primary_project'
  | 'learner_report'
  | 'coach_review'
  | 'synthetic'
  | 'course_case';

export type JiuxuangeFactVisibility = 'learner' | 'coach_only';
export type JiuxuangeVerificationStatus = 'draft' | 'verified' | 'rejected';

export interface JiuxuangeSourceRef {
  documentId: string;
  title: string;
  locator: string;
  verificationStatus: JiuxuangeVerificationStatus;
  contentHash?: `sha256:${string}`;
}

export interface JiuxuangeCaseFact {
  id: string;
  text: string;
  sourceKind: JiuxuangeFactSourceKind;
  sourceRef: JiuxuangeSourceRef;
  visibility: JiuxuangeFactVisibility;
  verificationStatus: JiuxuangeVerificationStatus;
  confidence: 'low' | 'medium' | 'high';
  observedAt?: string;
}

export interface JiuxuangeConcept {
  id: string;
  name: string;
  definition: string;
  distinctions: string[];
  misconceptions: string[];
  applicationCriteria: string[];
  sourceRefs: JiuxuangeSourceRef[];
}

export interface JiuxuangeCase {
  id: string;
  title: string;
  mode: 'synthetic_demo' | 'real_project' | 'curated_case';
  availability: 'demo' | 'draft' | 'pilot';
  conceptIds: string[];
  facts: JiuxuangeCaseFact[];
}

export interface JiuxuangeQuestionTemplate {
  id: string;
  phase: JiuxuangeQuestionPhase;
  conceptIds: string[];
  prompt: string;
  singleQuestion: boolean;
  evidenceRuleIds: string[];
  factScope?: 'project' | 'case' | 'disclosed' | 'none';
  learningFragmentIds?: string[];
  scaffolds?: JiuxuangeQuestionScaffold[];
  conceptNodeId?: string;
  caseId?: string;
  casePhase?: 'blind' | 'commit' | 'unlock' | 'compare';
  teachingMode?: 'question-first' | 'explain-then-check';
  teachingText?: string;
  learningNodeId?: JiuxuangeLearningNodeId;
}

export interface JiuxuangeQuestionScaffold {
  hintLevel: 1 | 2 | 3;
  prompt: string;
}

export interface JiuxuangeEvidenceRule {
  id: string;
  description: string;
  requiredSignals: JiuxuangeEvidenceSignal[];
  provenanceRequired: boolean;
}

export interface JiuxuangeCourseModule {
  id: string;
  code: JiuxuangeModuleCode;
  order: number;
  title: string;
  learningObjective: string;
  conceptIds: string[];
  caseIds: string[];
  questionTemplateIds: string[];
  evidenceRuleIds: string[];
}

export interface JiuxuangeTransferRule {
  fromModuleId: string;
  whenEvidenceRuleIds: string[];
  toModuleId?: string;
}

export interface JiuxuangeCourseJourneyLevel {
  id: JiuxuangeVisibleLevelId;
  title: string;
  order: number;
  moduleIds: string[];
  calibrationCaseId?: string;
}

export interface JiuxuangeCourseJourney {
  version: string;
  preludeModuleIds: string[];
  levels: JiuxuangeCourseJourneyLevel[];
  postludeModuleIds: string[];
}

export interface JiuxuangeCoursePackage {
  id: 'business-model';
  version: string;
  releaseStatus: 'pilot_b_only' | 'full';
  formalScoringEnabled: boolean;
  title: string;
  entryMode?: 'legacy-contract' | 'learning-first' | 'learning-loop';
  journey?: JiuxuangeCourseJourney;
  modules: JiuxuangeCourseModule[];
  concepts: Record<string, JiuxuangeConcept>;
  cases: Record<string, JiuxuangeCase>;
  questionTemplates: Record<string, JiuxuangeQuestionTemplate>;
  evidenceRules: Record<string, JiuxuangeEvidenceRule>;
  transferRules: JiuxuangeTransferRule[];
}

export interface CoursePackageReadiness {
  canRunDemo: boolean;
  canRunRealPilot: boolean;
  canPublishScores: boolean;
  blockers: string[];
  warnings: string[];
}
