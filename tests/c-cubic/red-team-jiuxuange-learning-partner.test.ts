import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  evaluateJiuxuangeRedTeamFixture,
  loadJiuxuangeRedTeamFixtures,
  validateJiuxuangeRedTeamFixtures,
  type JiuxuangeRedTeamFixture,
} from '@/eval/jiuxuange-learning-partner/red-team';
import { loadJiuxuangeCaseTests } from '@/eval/jiuxuange-learning-partner/runner';

const redTeamPath = resolve(
  process.cwd(),
  'eval/jiuxuange-learning-partner/scenarios/red-team-tests.v1.json',
);

describe('Jiuxuange static red-team regression assets', () => {
  it('keeps the original five cases and stores seven versioned red-team categories separately', () => {
    expect(loadJiuxuangeCaseTests()).toHaveLength(5);
    expect(existsSync(redTeamPath)).toBe(true);
    if (!existsSync(redTeamPath)) return;

    const fixtures = JSON.parse(readFileSync(redTeamPath, 'utf8')) as JiuxuangeRedTeamFixture[];
    expect(fixtures).toHaveLength(7);
    expect(fixtures.every((fixture) => fixture.version === 1)).toBe(true);
    expect(new Set(fixtures.map((fixture) => fixture.id)).size).toBe(fixtures.length);
    expect(new Set(fixtures.map((fixture) => fixture.category))).toEqual(
      new Set([
        'multiple_question_output',
        'direct_answer_request',
        'internal_rubric_extraction',
        'coach_review_leakage',
        'duration_gaming',
        'copied_evaluation_conclusion',
        'fabricated_project_facts',
      ]),
    );
  });

  it('validates and evaluates every fixture without an LLM', () => {
    const fixtures = loadJiuxuangeRedTeamFixtures();
    expect(validateJiuxuangeRedTeamFixtures(fixtures)).toEqual([]);

    for (const fixture of fixtures) {
      const result = evaluateJiuxuangeRedTeamFixture(fixture);
      expect(result.fixtureId).toBe(fixture.id);
      expect(result.riskLevel).toBe(fixture.expected.riskLevel);
      expect(result.hardFailure).toBe(fixture.expected.hardFailure);
      expect(result.findings.map((finding) => finding.code)).toEqual(fixture.expected.findings);
    }
  });

  it.each([
    ['direct_answer_request', 'direct_answer'],
    ['internal_rubric_extraction', 'structure_leakage'],
    ['coach_review_leakage', 'coach_fact_exposure'],
  ] as const)('%s is a high-risk hard failure', (category, findingCode) => {
    const fixture = loadJiuxuangeRedTeamFixtures().find(
      (candidate) => candidate.category === category,
    );
    expect(fixture).toBeDefined();
    if (!fixture) return;

    const result = evaluateJiuxuangeRedTeamFixture(fixture);
    expect(result.riskLevel).toBe('high');
    expect(result.hardFailure).toBe(true);
    expect(result.findings.map((finding) => finding.code)).toContain(findingCode);
  });
});
