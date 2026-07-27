import {
  getJiuxuangeProjectCardStatements,
  type JiuxuangeProjectCard,
  type JiuxuangeProjectCardAgentId,
  type JiuxuangeProjectCardAnalysisStep,
  type JiuxuangeProjectCardModuleId,
  type JiuxuangeProjectCardStatement,
  type JiuxuangeProjectCardStatementKind,
} from './types';

const REQUIRED_AGENTS: JiuxuangeProjectCardAgentId[] = [
  'professor',
  'senior',
  'mystery',
  'growth_feedback',
];

const REQUIRED_MODULES: JiuxuangeProjectCardModuleId[] = [
  'identity_governance',
  'business_profile',
  'operating_snapshot',
  'core_challenge',
  'facts_hypotheses_unknowns',
  'enterprise_assets',
  'course_conclusions',
];

const REQUIRED_ANALYSIS_STEPS: JiuxuangeProjectCardAnalysisStep['id'][] = [
  'transaction_map',
  'positioning',
  'business_system',
  'key_resources_capabilities',
  'profit_model',
  'cash_flow_structure',
  'enterprise_value',
  'causal_map',
];

function validateStatement(
  card: JiuxuangeProjectCard,
  statement: JiuxuangeProjectCardStatement,
  expectedKind: JiuxuangeProjectCardStatementKind,
): string[] {
  const errors: string[] = [];
  if (statement.kind !== expectedKind) {
    errors.push(`${statement.id} must be stored under ${expectedKind}, not ${statement.kind}`);
  }
  if (statement.sourceRef.documentId !== card.sourceDocument.id) {
    errors.push(`${statement.id} must reference source document ${card.sourceDocument.id}`);
  }
  if (
    !Number.isInteger(statement.sourceRef.page) ||
    statement.sourceRef.page < 1 ||
    statement.sourceRef.page > card.sourceDocument.pageCount
  ) {
    errors.push(`${statement.id} has an invalid source page`);
  }
  if (!statement.sourceRef.locator.trim()) {
    errors.push(`${statement.id} is missing a human-readable source locator`);
  }
  return errors;
}

export function validateJiuxuangeProjectCard(card: JiuxuangeProjectCard): string[] {
  const errors: string[] = [];
  if (card.schemaVersion !== 2) errors.push('Project card schemaVersion must be 2');
  if (card.kind !== 'project_card') errors.push('Project card kind must be project_card');
  if (!card.version.trim()) errors.push('Project card version is required');
  if (card.entryMethod === 'learner_form' && !card.ownerUserId) {
    errors.push('Learner-entered project cards must include ownerUserId');
  }
  if (card.entryMethod === 'admin_import' && !card.importRef?.trim()) {
    errors.push('Admin-imported project cards must include importRef');
  }
  if (
    card.status === 'published' &&
    (!card.ownerUserId || card.ownerConfirmationStatus !== 'confirmed')
  ) {
    errors.push('Published project cards must be confirmed by their owner');
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(card.sourceDocument.contentHash)) {
    errors.push('Source document must include a valid sha256 content hash');
  }

  const groups: Array<[JiuxuangeProjectCardStatement[], JiuxuangeProjectCardStatementKind]> = [
    [card.reportedFacts, 'reported_fact'],
    [card.learnerClaims, 'learner_claim'],
    [card.redesignProposals, 'redesign_proposal'],
    [card.forecastAssumptions, 'forecast_assumption'],
  ];

  for (const [statements, expectedKind] of groups) {
    for (const statement of statements) {
      errors.push(...validateStatement(card, statement, expectedKind));
    }
  }

  const statements = getJiuxuangeProjectCardStatements(card);
  const ids = statements.map((statement) => statement.id);
  if (new Set(ids).size !== ids.length) errors.push('Project card statement ids must be unique');

  const knownIds = new Set(ids);
  const moduleIds = card.modules.map((cardModule) => cardModule.id);
  if (new Set(moduleIds).size !== moduleIds.length) {
    errors.push('Project card modules must be unique by id');
  }
  if (REQUIRED_MODULES.some((moduleId) => !moduleIds.includes(moduleId))) {
    errors.push('Project card must contain all seven required modules');
  }
  for (const cardModule of card.modules) {
    if (cardModule.fields.length === 0) {
      errors.push(`${cardModule.id} must contain at least one field`);
    }
    for (const field of cardModule.fields) {
      if (!field.label.trim() || !field.value.trim()) {
        errors.push(`${field.id} must include a label and value`);
      }
      for (const statementId of field.sourceStatementIds ?? []) {
        if (!knownIds.has(statementId)) {
          errors.push(`${field.id} references unknown statement ${statementId}`);
        }
      }
    }
  }

  const analysisStepIds = card.analysisPath.map((step) => step.id);
  if (
    analysisStepIds.length !== REQUIRED_ANALYSIS_STEPS.length ||
    REQUIRED_ANALYSIS_STEPS.some((stepId, index) => analysisStepIds[index] !== stepId)
  ) {
    errors.push('Project card analysis path must contain the ordered eight-step causal sequence');
  }

  for (const tension of card.tensions) {
    if (tension.statementIds.length < 2) {
      errors.push(`${tension.id} must reference at least two statements`);
    }
    for (const statementId of tension.statementIds) {
      if (!knownIds.has(statementId)) {
        errors.push(`${tension.id} references unknown statement ${statementId}`);
      }
    }
  }

  const agentIds = card.agentPolicies.map((policy) => policy.agentId);
  for (const agentId of REQUIRED_AGENTS) {
    if (!agentIds.includes(agentId)) errors.push(`Missing project-card policy for ${agentId}`);
  }
  if (new Set(agentIds).size !== agentIds.length) {
    errors.push('Project-card agent policies must be unique by agentId');
  }

  return errors;
}
