import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

import type { PBLPlannerV2Input } from '@/lib/pbl/v2/types';
import type { SceneOutline } from '@/lib/types/generation';

export type JiuxuangeCardType =
  | 'concept_understanding'
  | 'case_observation'
  | 'contradiction_discovery'
  | 'business_model_judgement';

export interface JiuxuangeCaseTest {
  id: string;
  version: number;
  course: string;
  node: string;
  source: {
    title: string;
    path: string;
  };
  learnerProfile: string;
  projectFactPack: {
    targetName: string;
    facts: Array<{
      factId: string;
      text: string;
      confidence: 'high' | 'medium' | 'low';
    }>;
  };
  initialState: {
    effectiveMinutes: number;
    depthLevel: number;
    hintLevel: number;
  };
  learnerInput: string;
  learnerVisibleCards: Array<{
    cardType: Extract<JiuxuangeCardType, 'concept_understanding' | 'case_observation'>;
    title: string;
    prompt: string;
  }>;
  coachOnlyCards: Array<{
    cardType: Extract<JiuxuangeCardType, 'contradiction_discovery' | 'business_model_judgement'>;
    title: string;
    evidenceHint: string;
  }>;
  expectedBehaviors: {
    must: string[];
    mustNot: string[];
  };
  expectedEvents: Array<{
    eventType: string;
    agentState: string;
    evidenceStatus: string;
  }>;
  pblConfig: NonNullable<SceneOutline['pblConfig']>;
  languageDirective: string;
}

export interface JiuxuangeFlowCheckpoint {
  cardType: JiuxuangeCardType;
  title: string;
  visibleToLearner: boolean;
  instruction: string;
}

export interface JiuxuangeDryRunFlow {
  caseId: string;
  targetName: string;
  checkpoints: JiuxuangeFlowCheckpoint[];
  plannerInput: PBLPlannerV2Input;
}

function getCurrentDir(): string {
  return typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));
}

export function getDefaultCaseTestsPath(): string {
  return join(getCurrentDir(), 'scenarios', 'case-tests.json');
}

export function loadJiuxuangeCaseTests(filePath = getDefaultCaseTestsPath()): JiuxuangeCaseTest[] {
  return JSON.parse(readFileSync(filePath, 'utf8')) as JiuxuangeCaseTest[];
}

export function validateJiuxuangeCaseTests(cases: JiuxuangeCaseTest[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const testCase of cases) {
    if (seen.has(testCase.id)) errors.push(`${testCase.id}: duplicate id`);
    seen.add(testCase.id);

    if (!testCase.source.path.includes('/开题报告评审案例库/')) {
      errors.push(`${testCase.id}: source path must point to the case library`);
    }

    if (testCase.projectFactPack.facts.length < 4) {
      errors.push(`${testCase.id}: at least four project facts are required`);
    }

    const learnerCards = testCase.learnerVisibleCards.map((card) => card.cardType).sort();
    if (learnerCards.join(',') !== 'case_observation,concept_understanding') {
      errors.push(`${testCase.id}: learner cards must be concept understanding + case observation`);
    }

    const coachCards = testCase.coachOnlyCards.map((card) => card.cardType).sort();
    if (coachCards.join(',') !== 'business_model_judgement,contradiction_discovery') {
      errors.push(
        `${testCase.id}: coach cards must be contradiction discovery + business judgement`,
      );
    }

    for (const requiredSkill of ['项目事实观察', '矛盾发现', '商业模式判断']) {
      if (!testCase.pblConfig.targetSkills.includes(requiredSkill)) {
        errors.push(`${testCase.id}: missing target skill ${requiredSkill}`);
      }
    }

    for (const requiredBehavior of [
      '每轮只问一个问题',
      '围绕项目事实追问',
      '不替学员命名矛盾',
      '缺事实时追问，不编造',
    ]) {
      if (!testCase.expectedBehaviors.must.includes(requiredBehavior)) {
        errors.push(`${testCase.id}: missing behavior ${requiredBehavior}`);
      }
    }
  }

  return errors;
}

export function buildOutlineFromCase(testCase: JiuxuangeCaseTest, order = 1): SceneOutline {
  return {
    id: testCase.id,
    type: 'pbl',
    title: testCase.pblConfig.projectTopic,
    description: testCase.pblConfig.projectDescription,
    keyPoints: [
      `${testCase.projectFactPack.targetName} 项目事实观察`,
      '概念理解回到真实案例',
      '矛盾发现不由 AI 代替命名',
      '商业模式判断必须引用证据',
    ],
    teachingObjective: `让学员围绕 ${testCase.projectFactPack.targetName} 的真实评审事实完成商业模式判断练习。`,
    estimatedDuration: 1800,
    order,
    languageNote: testCase.languageDirective,
    pblConfig: testCase.pblConfig,
  };
}

export function buildPlannerInputFromCase(
  testCase: JiuxuangeCaseTest,
  order = 1,
): PBLPlannerV2Input {
  const outline = buildOutlineFromCase(testCase, order);

  return {
    outline,
    courseContext: {
      allOutlines: [outline],
      languageDirective: testCase.languageDirective,
    },
    user: {
      bio: testCase.learnerProfile,
      requirement: `围绕 ${testCase.projectFactPack.targetName} 的开题评审案例，进行九轩阁商业模式学习伙伴测试。`,
    },
  };
}

export function buildDryRunFlow(testCase: JiuxuangeCaseTest, order = 1): JiuxuangeDryRunFlow {
  return {
    caseId: testCase.id,
    targetName: testCase.projectFactPack.targetName,
    checkpoints: [
      ...testCase.learnerVisibleCards.map((card) => ({
        cardType: card.cardType,
        title: card.title,
        visibleToLearner: true,
        instruction: card.prompt,
      })),
      ...testCase.coachOnlyCards.map((card) => ({
        cardType: card.cardType,
        title: card.title,
        visibleToLearner: false,
        instruction: card.evidenceHint,
      })),
    ],
    plannerInput: buildPlannerInputFromCase(testCase, order),
  };
}

export function runJiuxuangeDryRun(cases = loadJiuxuangeCaseTests()): JiuxuangeDryRunFlow[] {
  const errors = validateJiuxuangeCaseTests(cases);
  if (errors.length > 0) {
    throw new Error(`Jiuxuange case dataset failed validation:\n${errors.join('\n')}`);
  }

  return cases.map((testCase, index) => buildDryRunFlow(testCase, index + 1));
}

const isCli =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isCli) {
  try {
    const flows = runJiuxuangeDryRun();
    console.log(
      JSON.stringify(
        {
          status: 'ok',
          caseCount: flows.length,
          cases: flows.map((flow) => ({
            id: flow.caseId,
            targetName: flow.targetName,
            checkpointCount: flow.checkpoints.length,
            learnerVisibleCount: flow.checkpoints.filter(
              (checkpoint) => checkpoint.visibleToLearner,
            ).length,
            coachOnlyCount: flow.checkpoints.filter((checkpoint) => !checkpoint.visibleToLearner)
              .length,
          })),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
