import type { JiuxuangeLearningNodeId } from './course-package/types';

export type JiuxuangeLearningSupportStatus =
  | 'autonomous'
  | 'hinted'
  | 'assisted'
  | 'leaked-answer'
  | 'unsupported';

export type JiuxuangeLearnerClaimType =
  | 'baseline'
  | 'fact_observation'
  | 'case_commit'
  | 'comparison'
  | 'transfer';

export interface JiuxuangeLearnerClaim {
  id: string;
  claimType: JiuxuangeLearnerClaimType;
  nodeId: JiuxuangeLearningNodeId;
  sourceMessageId: string;
  text: string;
  factIds: string[];
  hintLevel: 0 | 1 | 2 | 3;
  supportStatus: JiuxuangeLearningSupportStatus;
  immutable: true;
  createdAt: string;
}

export interface JiuxuangeDisclosureRecord {
  id: string;
  nodeId: JiuxuangeLearningNodeId;
  caseId: string;
  phase: 'facts' | 'analysis';
  factIds: string[];
  sectionIds: string[];
  sourceMessageId: string;
  unlockedByClaimId?: string;
  createdAt: string;
}

export interface JiuxuangeJudgmentRevision {
  id: string;
  nodeId: 'judgment_revision';
  sourceMessageId: string;
  beforeClaimId: string;
  afterText: string;
  reason: string;
  factIds: string[];
  hintLevel: 0 | 1 | 2 | 3;
  supportStatus: JiuxuangeLearningSupportStatus;
  createdAt: string;
}

export interface JiuxuangeFeedbackStatement {
  id: string;
  text: string;
  evidenceRefs: string[];
}

export interface JiuxuangeLearningFeedback {
  id: string;
  outcome: 'A' | 'B' | 'C';
  statements: JiuxuangeFeedbackStatement[];
  suggestions: string[];
  evidenceVersion: string;
  generatedAt: string;
}

export interface JiuxuangeLearningLoopState {
  version: 'learning-loop-state.v1';
  claims: JiuxuangeLearnerClaim[];
  disclosures: JiuxuangeDisclosureRecord[];
  revisions: JiuxuangeJudgmentRevision[];
  feedback?: JiuxuangeLearningFeedback;
}
