export const REALM_ASSESSOR_VERSION = '1.0' as const;

export type RealmAssessmentScenario =
  | 'self_positioning'
  | 'dragon_gate_review'
  | 'realm_drop_diagnosis';

export type RealmEvidenceSampleKind =
  | 'unfamiliar_problem'
  | 'familiar_domain'
  | 'multi_turn_iteration'
  | 'thinking_process'
  | 'prompt_iteration'
  | 'collaboration_statement'
  | 'whiteboard_rebuild'
  | 'prior_review';

export interface RealmEvidenceSample {
  id: string;
  kind: RealmEvidenceSampleKind;
  background: string;
  capturedAt: string;
  transcript: string;
  source: 'raw_export' | 'manual_paste';
  redacted: boolean;
  edited: boolean;
}

export interface RealmEvidencePackage {
  scenario: RealmAssessmentScenario;
  learnerLabel?: string;
  samples: RealmEvidenceSample[];
}

export interface RealmEvidenceReadiness {
  ready: boolean;
  maxConfidence: 'high' | 'medium' | 'low';
  missing: string[];
  warnings: string[];
  redFlags: string[];
}

export type RealmFindingOutcome = 'confirmed' | 'triggered' | 'not_found';

export interface RealmAssessmentFinding {
  criterionId: string;
  outcome: RealmFindingOutcome;
  quote?: string;
  sampleId?: string;
  reasoning: string;
}

export interface RealmAssessmentReport {
  scenario: RealmAssessmentScenario;
  status: 'assessed' | 'human_review_required' | 'insufficient_evidence';
  conclusion?: {
    summary: string;
    abilityBand?: 1 | 2 | 3 | 4 | 5;
    realmRange?: string;
    recommendation?: string;
  };
  confidence: 'high' | 'medium' | 'low';
  findings: RealmAssessmentFinding[];
  bottleneck: string;
  tasks: string[];
  redFlags: string[];
}

export interface RealmAssessmentValidation {
  ok: boolean;
  report?: RealmAssessmentReport;
  errors: string[];
}
