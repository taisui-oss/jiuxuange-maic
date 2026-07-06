import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

interface JiuxuangeCaseTest {
  id: string;
  version: number;
  source: {
    title: string;
    path: string;
  };
  projectFactPack: {
    targetName: string;
    facts: Array<{ factId: string; text: string; confidence: 'high' | 'medium' | 'low' }>;
  };
  learnerVisibleCards: Array<{ cardType: 'concept_understanding' | 'case_observation' }>;
  coachOnlyCards: Array<{ cardType: 'contradiction_discovery' | 'business_model_judgement' }>;
  expectedBehaviors: {
    must: string[];
    mustNot: string[];
  };
  pblConfig: {
    projectTopic: string;
    projectDescription: string;
    targetSkills: string[];
    issueCount: number;
  };
}

function loadCases(): JiuxuangeCaseTest[] {
  const path = resolve(
    __dirname,
    '..',
    '..',
    '..',
    'eval',
    'jiuxuange-learning-partner',
    'scenarios',
    'case-tests.json',
  );
  return JSON.parse(readFileSync(path, 'utf-8')) as JiuxuangeCaseTest[];
}

describe('Jiuxuange learning partner case dataset', () => {
  const cases = loadCases();

  it('contains exactly five reusable opening-report review cases', () => {
    expect(cases).toHaveLength(5);
    expect(new Set(cases.map((c) => c.id)).size).toBe(5);
  });

  it('keeps learner-visible cards separate from coach-only evidence cards', () => {
    for (const testCase of cases) {
      expect(testCase.learnerVisibleCards.map((c) => c.cardType)).toEqual([
        'concept_understanding',
        'case_observation',
      ]);
      expect(testCase.coachOnlyCards.map((c) => c.cardType)).toEqual([
        'contradiction_discovery',
        'business_model_judgement',
      ]);
      expect(testCase.expectedBehaviors.mustNot).toContain('向学员展示“矛盾发现卡”或“商模判断卡”');
    }
  });

  it('grounds each case in project facts and PBL planner inputs', () => {
    for (const testCase of cases) {
      expect(testCase.source.path).toContain('/开题报告评审案例库/');
      expect(testCase.projectFactPack.targetName.length).toBeGreaterThan(1);
      expect(testCase.projectFactPack.facts.length).toBeGreaterThanOrEqual(4);
      expect(testCase.pblConfig.projectTopic).toContain(testCase.projectFactPack.targetName);
      expect(testCase.pblConfig.projectDescription).toContain('商业模式');
      expect(testCase.pblConfig.targetSkills).toEqual(
        expect.arrayContaining(['项目事实观察', '矛盾发现', '商业模式判断']),
      );
    }
  });

  it('locks Socratic and PBL behavior gates for every case', () => {
    for (const testCase of cases) {
      expect(testCase.expectedBehaviors.must).toEqual(
        expect.arrayContaining([
          '每轮只问一个问题',
          '围绕项目事实追问',
          '不替学员命名矛盾',
          '缺事实时追问，不编造',
        ]),
      );
    }
  });
});
