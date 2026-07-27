import { describe, expect, it } from 'vitest';
import {
  getJiuxuangeProjectCardStatements,
  mckessProjectCardV1,
  validateJiuxuangeProjectCard,
} from '@/lib/jiuxuange/project-card';

describe('Jiuxuange Mckess project card draft', () => {
  it('is a traceable project card rather than a teaching case', () => {
    expect(mckessProjectCardV1.kind).toBe('project_card');
    expect(mckessProjectCardV1.status).toBe('draft');
    expect(mckessProjectCardV1.entryMethod).toBe('admin_import');
    expect(mckessProjectCardV1.ownerConfirmationStatus).toBe('pending');
    expect(mckessProjectCardV1.importRef).toBe('mckess-v29-development-fixture');
    expect(mckessProjectCardV1.sourceDocument.pageCount).toBe(37);
    expect(mckessProjectCardV1.sourceDocument.contentHash).toBe(
      'sha256:c6c9e6ce2fa77a3d23ac2b98669dd8262cb8de4784051c6ad9e258286c26d376',
    );
    expect(validateJiuxuangeProjectCard(mckessProjectCardV1)).toEqual([]);
  });

  it('does not allow an imported draft to become published before owner confirmation', () => {
    const broken = structuredClone(mckessProjectCardV1);
    broken.status = 'published';

    expect(validateJiuxuangeProjectCard(broken)).toContain(
      'Published project cards must be confirmed by their owner',
    );
  });

  it('physically separates reported facts, learner claims, proposals, and forecasts', () => {
    expect(mckessProjectCardV1.reportedFacts).toHaveLength(14);
    expect(mckessProjectCardV1.learnerClaims).toHaveLength(8);
    expect(mckessProjectCardV1.redesignProposals).toHaveLength(6);
    expect(mckessProjectCardV1.forecastAssumptions).toHaveLength(6);

    expect(mckessProjectCardV1.reportedFacts.every((item) => item.kind === 'reported_fact')).toBe(
      true,
    );
    expect(mckessProjectCardV1.learnerClaims.every((item) => item.kind === 'learner_claim')).toBe(
      true,
    );
    expect(
      mckessProjectCardV1.redesignProposals.every((item) => item.kind === 'redesign_proposal'),
    ).toBe(true);
    expect(
      mckessProjectCardV1.forecastAssumptions.every((item) => item.kind === 'forecast_assumption'),
    ).toBe(true);
  });

  it('keeps every extracted statement in draft status until owner verification', () => {
    const statements = getJiuxuangeProjectCardStatements(mckessProjectCardV1);

    expect(statements.length).toBeGreaterThan(0);
    expect(statements.every((statement) => statement.verificationStatus === 'draft')).toBe(true);
    expect(
      statements.every(
        (statement) =>
          statement.sourceRef.page >= 1 &&
          statement.sourceRef.page <= mckessProjectCardV1.sourceDocument.pageCount &&
          statement.sourceRef.locator.length > 0,
      ),
    ).toBe(true);
  });

  it('preserves contradictions as open interaction prompts', () => {
    expect(mckessProjectCardV1.tensions.map((tension) => tension.id)).toEqual(
      expect.arrayContaining([
        'tension-profit-status',
        'tension-capacity-baseline',
        'tension-expansion-versus-idle-capacity',
      ]),
    );
    expect(mckessProjectCardV1.tensions.every((tension) => tension.status === 'open')).toBe(true);
  });

  it('assigns distinct project-card boundaries to all four agents', () => {
    expect(mckessProjectCardV1.agentPolicies.map((policy) => policy.agentId)).toEqual([
      'professor',
      'senior',
      'mystery',
      'growth_feedback',
    ]);

    const senior = mckessProjectCardV1.agentPolicies.find((policy) => policy.agentId === 'senior');
    expect(senior?.mustNot).toContain('把小组建议称为标准答案');

    const mystery = mckessProjectCardV1.agentPolicies.find(
      (policy) => policy.agentId === 'mystery',
    );
    expect(mystery?.mustNot).toContain('虚构项目卡没有提供的新事实');
  });

  it('rejects category mixing and untraceable tension references', () => {
    const broken = structuredClone(mckessProjectCardV1);
    broken.reportedFacts[0].kind = 'redesign_proposal';
    broken.tensions[0].statementIds.push('missing-statement');

    expect(validateJiuxuangeProjectCard(broken)).toEqual(
      expect.arrayContaining([
        'fact-company-registration must be stored under reported_fact, not redesign_proposal',
        'tension-profit-status references unknown statement missing-statement',
      ]),
    );
  });
});
