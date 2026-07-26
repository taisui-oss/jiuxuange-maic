import {
  getJiuxuangeProjectCardStatements,
  type JiuxuangeProjectCard,
  type JiuxuangeProjectCardAgentId,
  type JiuxuangeProjectCardStatement,
  type JiuxuangeProjectCardStatementKind,
} from './types';

const REQUIRED_AGENTS: JiuxuangeProjectCardAgentId[] = [
  'professor',
  'senior',
  'mystery',
  'growth_feedback',
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
  if (card.kind !== 'project_card') errors.push('Project card kind must be project_card');
  if (!card.version.trim()) errors.push('Project card version is required');
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
