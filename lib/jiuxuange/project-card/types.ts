export type JiuxuangeProjectCardStatementKind =
  | 'reported_fact'
  | 'learner_claim'
  | 'redesign_proposal'
  | 'forecast_assumption';

export type JiuxuangeProjectCardTopic =
  | 'identity'
  | 'operations'
  | 'customer'
  | 'positioning'
  | 'business_system'
  | 'key_resources_capabilities'
  | 'profit_model'
  | 'cash_flow_structure'
  | 'enterprise_value';

export type JiuxuangeProjectCardVerificationStatus = 'draft' | 'verified' | 'rejected';

export type JiuxuangeProjectCardAgentId = 'professor' | 'senior' | 'mystery' | 'growth_feedback';

export type JiuxuangeProjectCardEntryMethod = 'learner_form' | 'admin_import';

export type JiuxuangeProjectCardOwnerConfirmationStatus = 'pending' | 'confirmed';

export interface JiuxuangeProjectCardSourceDocument {
  id: string;
  fileName: string;
  title: string;
  pageCount: number;
  contentHash: `sha256:${string}`;
  sourceKind: 'learner_assignment';
  createdAt: string;
}

export interface JiuxuangeProjectCardSourceRef {
  documentId: string;
  page: number;
  locator: string;
}

export interface JiuxuangeProjectCardStatement {
  id: string;
  kind: JiuxuangeProjectCardStatementKind;
  topic: JiuxuangeProjectCardTopic;
  text: string;
  sourceRef: JiuxuangeProjectCardSourceRef;
  verificationStatus: JiuxuangeProjectCardVerificationStatus;
  confidence: 'low' | 'medium' | 'high';
  observedPeriod?: string;
}

export interface JiuxuangeProjectCardTension {
  id: string;
  title: string;
  statementIds: string[];
  prompt: string;
  status: 'open' | 'resolved';
}

export interface JiuxuangeProjectCardAgentPolicy {
  agentId: JiuxuangeProjectCardAgentId;
  purpose: string;
  allowedStatementKinds: JiuxuangeProjectCardStatementKind[];
  must: string[];
  mustNot: string[];
}

export interface JiuxuangeProjectCard {
  schemaVersion: 1;
  kind: 'project_card';
  id: string;
  projectId: string;
  groupId: string;
  version: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  entryMethod: JiuxuangeProjectCardEntryMethod;
  ownerUserId?: string;
  ownerConfirmationStatus: JiuxuangeProjectCardOwnerConfirmationStatus;
  importRef?: string;
  sourceDocument: JiuxuangeProjectCardSourceDocument;
  reportedFacts: JiuxuangeProjectCardStatement[];
  learnerClaims: JiuxuangeProjectCardStatement[];
  redesignProposals: JiuxuangeProjectCardStatement[];
  forecastAssumptions: JiuxuangeProjectCardStatement[];
  tensions: JiuxuangeProjectCardTension[];
  agentPolicies: JiuxuangeProjectCardAgentPolicy[];
}

export function getJiuxuangeProjectCardStatements(
  card: JiuxuangeProjectCard,
): JiuxuangeProjectCardStatement[] {
  return [
    ...card.reportedFacts,
    ...card.learnerClaims,
    ...card.redesignProposals,
    ...card.forecastAssumptions,
  ];
}
