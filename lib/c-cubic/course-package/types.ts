export type JiuxuangeModuleCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

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
  | 'counterevidence';

export type JiuxuangeFactSourceKind =
  | 'primary_project'
  | 'learner_report'
  | 'coach_review'
  | 'synthetic';

export type JiuxuangeFactVisibility = 'learner' | 'coach_only';
export type JiuxuangeVerificationStatus = 'draft' | 'verified' | 'rejected';

export interface JiuxuangeSourceRef {
  documentId: string;
  title: string;
  locator: string;
  verificationStatus: JiuxuangeVerificationStatus;
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
  mode: 'synthetic_demo' | 'real_project';
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

export interface JiuxuangeCoursePackage {
  id: 'business-model';
  version: string;
  releaseStatus: 'pilot_b_only' | 'full';
  formalScoringEnabled: boolean;
  title: string;
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
