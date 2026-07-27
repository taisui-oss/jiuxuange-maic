import { describe, expect, it } from 'vitest';
import {
  getJiuxuangeProjectCardStatements,
  mckessProjectCardV2,
  validateJiuxuangeProjectCard,
} from '@/lib/jiuxuange/project-card';

describe('Jiuxuange Mckess project card draft', () => {
  it('is a traceable project card rather than a teaching case', () => {
    expect(mckessProjectCardV2.schemaVersion).toBe(2);
    expect(mckessProjectCardV2.kind).toBe('project_card');
    expect(mckessProjectCardV2.status).toBe('draft');
    expect(mckessProjectCardV2.entryMethod).toBe('admin_import');
    expect(mckessProjectCardV2.ownerConfirmationStatus).toBe('pending');
    expect(mckessProjectCardV2.importRef).toBe('mckess-v29-development-fixture');
    expect(mckessProjectCardV2.sourceDocument.pageCount).toBe(37);
    expect(mckessProjectCardV2.sourceDocument.contentHash).toBe(
      'sha256:c6c9e6ce2fa77a3d23ac2b98669dd8262cb8de4784051c6ad9e258286c26d376',
    );
    expect(validateJiuxuangeProjectCard(mckessProjectCardV2)).toEqual([]);
  });

  it('contains the seven intake modules with field-level model policies', () => {
    expect(mckessProjectCardV2.modules.map((module) => module.id)).toEqual([
      'identity_governance',
      'business_profile',
      'operating_snapshot',
      'core_challenge',
      'facts_hypotheses_unknowns',
      'enterprise_assets',
      'course_conclusions',
    ]);
    expect(mckessProjectCardV2.modules.every((module) => module.fields.length > 0)).toBe(true);
    expect(
      mckessProjectCardV2.modules
        .flatMap((module) => module.fields)
        .every((field) => ['allow', 'mask', 'block'].includes(field.modelPolicy)),
    ).toBe(true);
  });

  it('uses the agreed eight-step path from transaction map to causal map', () => {
    expect(mckessProjectCardV2.analysisPath.map((step) => step.title)).toEqual([
      '谁和谁交易',
      '服务谁、解决什么问题',
      '各主体如何协作',
      '企业必须擅长什么',
      '谁向谁付钱',
      '钱在什么时候流入和占用',
      '什么决定长期企业价值',
      '汇总六要素因果图',
    ]);
  });

  it('does not allow an imported draft to become published before owner confirmation', () => {
    const broken = structuredClone(mckessProjectCardV2);
    broken.status = 'published';

    expect(validateJiuxuangeProjectCard(broken)).toContain(
      'Published project cards must be confirmed by their owner',
    );
  });

  it('physically separates reported facts, learner claims, proposals, and forecasts', () => {
    expect(mckessProjectCardV2.reportedFacts).toHaveLength(14);
    expect(mckessProjectCardV2.learnerClaims).toHaveLength(8);
    expect(mckessProjectCardV2.redesignProposals).toHaveLength(6);
    expect(mckessProjectCardV2.forecastAssumptions).toHaveLength(6);

    expect(mckessProjectCardV2.reportedFacts.every((item) => item.kind === 'reported_fact')).toBe(
      true,
    );
    expect(mckessProjectCardV2.learnerClaims.every((item) => item.kind === 'learner_claim')).toBe(
      true,
    );
    expect(
      mckessProjectCardV2.redesignProposals.every((item) => item.kind === 'redesign_proposal'),
    ).toBe(true);
    expect(
      mckessProjectCardV2.forecastAssumptions.every((item) => item.kind === 'forecast_assumption'),
    ).toBe(true);
  });

  it('keeps every extracted statement in draft status until owner verification', () => {
    const statements = getJiuxuangeProjectCardStatements(mckessProjectCardV2);

    expect(statements.length).toBeGreaterThan(0);
    expect(statements.every((statement) => statement.verificationStatus === 'draft')).toBe(true);
    expect(
      statements.every(
        (statement) =>
          statement.sourceRef.page >= 1 &&
          statement.sourceRef.page <= mckessProjectCardV2.sourceDocument.pageCount &&
          statement.sourceRef.locator.length > 0,
      ),
    ).toBe(true);
  });

  it('preserves contradictions as open interaction prompts', () => {
    expect(mckessProjectCardV2.tensions.map((tension) => tension.id)).toEqual(
      expect.arrayContaining([
        'tension-profit-status',
        'tension-capacity-baseline',
        'tension-expansion-versus-idle-capacity',
      ]),
    );
    expect(mckessProjectCardV2.tensions.every((tension) => tension.status === 'open')).toBe(true);
  });

  it('assigns distinct project-card boundaries to all four agents', () => {
    expect(mckessProjectCardV2.agentPolicies.map((policy) => policy.agentId)).toEqual([
      'professor',
      'senior',
      'mystery',
      'growth_feedback',
    ]);

    const senior = mckessProjectCardV2.agentPolicies.find((policy) => policy.agentId === 'senior');
    expect(senior?.mustNot).toContain('把小组建议称为标准答案');

    const mystery = mckessProjectCardV2.agentPolicies.find(
      (policy) => policy.agentId === 'mystery',
    );
    expect(mystery?.mustNot).toContain('虚构项目卡没有提供的新事实');
  });

  it('rejects category mixing and untraceable tension references', () => {
    const broken = structuredClone(mckessProjectCardV2);
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
