import { FIXED_ASSESSMENT_QUESTIONS } from '../assessment/questions';
import { BUSINESS_MODEL_GUIDED_PACKAGE } from './business-model-v2';
import type {
  JiuxuangeConcept,
  JiuxuangeCourseModule,
  JiuxuangeCoursePackage,
  JiuxuangeEvidenceSignal,
  JiuxuangeQuestionPhase,
  JiuxuangeQuestionTemplate,
  JiuxuangeVisibleLevelId,
} from './types';

const V2 = BUSINESS_MODEL_GUIDED_PACKAGE;

interface LevelDefinition {
  id: JiuxuangeVisibleLevelId;
  title: string;
  objective: string;
  fragmentId: string;
  conceptPrompt: string;
  projectPrompt: string;
  challengePrompt: string;
  reflectionPrompt: string;
}

const LEVELS: LevelDefinition[] = [
  {
    id: 'positioning',
    title: '定位',
    objective: '从交易主体、内容、方式和成本识别项目定位。',
    fragmentId: 'positioning-definition',
    conceptPrompt: '用你自己的话说，定位为什么不等于选定一类客户？',
    projectPrompt: '回到你的项目，哪条已核验事实最能说明当前的交易方式？',
    challengePrompt: '在什么条件下，你现在的定位判断会失效？',
    reflectionPrompt: '经过刚才的检验，你会怎样修正原先的定位判断？',
  },
  {
    id: 'business-system',
    title: '业务系统',
    objective: '判断构型、角色与关系如何共同创造价值。',
    fragmentId: 'business-system-definition',
    conceptPrompt: '用你自己的话说，业务系统为什么不是一张普通组织架构图？',
    projectPrompt: '回到你的项目，哪条已核验事实最能说明某个角色正在改变价值创造？',
    challengePrompt: '如果把其中一个关键角色换掉，哪条关系可能首先失效？',
    reflectionPrompt: '经过角色与关系检验后，你会如何修正原先的业务系统判断？',
  },
  {
    id: 'key-resources-capabilities',
    title: '关键资源能力',
    objective: '识别支撑业务系统且难以被替代的资源与能力。',
    fragmentId: 'key-resources-definition',
    conceptPrompt: '用你自己的话说，一项重要资源为什么不一定是关键资源？',
    projectPrompt: '回到你的项目，哪条已核验事实能证明某项能力正在支撑交易结构？',
    challengePrompt: '如果竞争者可以轻易获得这项能力，你的关键资源判断还成立吗？',
    reflectionPrompt: '经过可替代性检验后，你会怎样修正原先的资源能力判断？',
  },
  {
    id: 'profit-model',
    title: '盈利模式',
    objective: '解释收支来源、收支方式与定价方式的联动。',
    fragmentId: 'profit-model-definition',
    conceptPrompt: '用你自己的话说，知道收入来源为什么还不足以说明盈利模式？',
    projectPrompt: '回到你的项目，哪条已核验事实能同时连上收入、支出或定价方式？',
    challengePrompt: '如果当前收费方式不变，哪个成本变化最可能推翻你的盈利判断？',
    reflectionPrompt: '经过收支与定价检验后，你会如何修正原先的盈利模式判断？',
  },
  {
    id: 'cash-flow-structure',
    title: '现金流结构',
    objective: '从现金流入流出的组成与时序识别项目风险。',
    fragmentId: 'cash-flow-definition',
    conceptPrompt: '用你自己的话说，利润为正为什么不代表现金流结构健康？',
    projectPrompt: '回到你的项目，哪条已核验事实最能说明现金流入与流出的时序差？',
    challengePrompt: '如果回款周期突然延长，你现在的现金流判断会在哪个边界失效？',
    reflectionPrompt: '经过时序与回款检验后，你会怎样修正原先的现金流判断？',
  },
  {
    id: 'enterprise-value',
    title: '企业价值',
    objective: '从六要素联动与未来净现金流判断企业价值。',
    fragmentId: 'enterprise-value-definition',
    conceptPrompt: '用你自己的话说，企业价值为什么不是一个独立于前五个要素的终点？',
    projectPrompt: '回到你的项目，哪条已核验事实最能说明未来净现金流的关键驱动因素？',
    challengePrompt: '如果其中一个驱动因素消失，你的企业价值判断会如何被推翻？',
    reflectionPrompt: '经过六要素联动检验后，你会怎样修正原先的企业价值判断？',
  },
];

function scaffolds(title: string, action: string) {
  return [
    { hintLevel: 1 as const, prompt: `先不求完整，你能先说出${title}判断中最不确定的一点吗？` },
    { hintLevel: 2 as const, prompt: `把${title}拆成“事实、因果、边界”三部分后，你会先补哪一部分？` },
    { hintLevel: 3 as const, prompt: `只看已核验事实，哪一条最能帮你${action}？` },
  ];
}

function levelQuestion(
  level: LevelDefinition,
  suffix: 'concept' | 'project' | 'challenge' | 'reflect',
  phase: JiuxuangeQuestionPhase,
  prompt: string,
  evidenceRuleId: string,
): JiuxuangeQuestionTemplate {
  const action =
    suffix === 'concept'
      ? '说清概念边界'
      : suffix === 'project'
        ? '形成项目判断'
        : suffix === 'challenge'
          ? '找到可推翻条件'
          : '修正原有判断';
  return {
    id: `${level.id}-${suffix}`,
    phase,
    conceptIds: [level.id],
    prompt,
    singleQuestion: true,
    evidenceRuleIds: [evidenceRuleId],
    factScope: suffix === 'project' ? 'project' : 'none',
    learningFragmentIds: [level.fragmentId],
    scaffolds: scaffolds(level.title, action),
    conceptNodeId: level.id,
  };
}

const levelQuestions = Object.fromEntries(
  LEVELS.flatMap((level) => [
    levelQuestion(level, 'concept', 'ground', level.conceptPrompt, 'concept-expression'),
    levelQuestion(level, 'project', 'apply', level.projectPrompt, 'project-application'),
    levelQuestion(level, 'challenge', 'tension', level.challengePrompt, 'boundary-challenge'),
    levelQuestion(level, 'reflect', 'reflect', level.reflectionPrompt, 'level-reflection'),
  ]).map((question) => [question.id, question]),
);

function levelModule(level: LevelDefinition, code: JiuxuangeCourseModule['code'], order: number) {
  return {
    id: level.id,
    code,
    order,
    title: level.title,
    learningObjective: level.objective,
    conceptIds: [level.id],
    caseIds: [],
    questionTemplateIds: [
      `${level.id}-concept`,
      `${level.id}-project`,
      `${level.id}-challenge`,
      `${level.id}-reflect`,
    ],
    evidenceRuleIds: [
      'concept-expression',
      'project-application',
      'boundary-challenge',
      'level-reflection',
    ],
  } satisfies JiuxuangeCourseModule;
}

const combinedCashValue = V2.concepts['cash-flow-enterprise-value'];
const cashFlowConcept: JiuxuangeConcept = {
  ...combinedCashValue,
  id: 'cash-flow-structure',
  name: '现金流结构',
  definition: '现金流结构反映现金流入流出的组成、对象与时序。',
  distinctions: ['利润不等于现金流', '需同时观察金额与时间分布'],
};
const enterpriseValueConcept: JiuxuangeConcept = {
  ...combinedCashValue,
  id: 'enterprise-value',
  name: '企业价值',
  definition: '企业价值是六要素持续运行所形成的未来净现金流价值。',
  distinctions: ['不是孤立的第六张清单', '必须回到前五个要素的联动'],
};

const assessmentTemplates = Object.fromEntries(
  FIXED_ASSESSMENT_QUESTIONS.map((question) => [
    question.id,
    {
      id: question.id,
      phase: 'reflect' as const,
      conceptIds: ['six-elements-overview'],
      prompt: question.prompt,
      singleQuestion: true,
      evidenceRuleIds: ['assessment-response'],
      factScope: 'none' as const,
    },
  ]),
);

export const BUSINESS_MODEL_SIX_LEVEL_PACKAGE: JiuxuangeCoursePackage = {
  id: 'business-model',
  version: '3.0.0-six-level-pbl',
  releaseStatus: 'full',
  formalScoringEnabled: false,
  title: '商业模式大课',
  journey: {
    version: 'six-level-journey.v1',
    preludeModuleIds: ['course-foundations'],
    levels: [
      { id: 'positioning', title: '定位', order: 1, moduleIds: ['positioning'] },
      { id: 'business-system', title: '业务系统', order: 2, moduleIds: ['business-system'] },
      {
        id: 'key-resources-capabilities',
        title: '关键资源能力',
        order: 3,
        moduleIds: ['key-resources-capabilities', 'case-convenience-bee'],
        calibrationCaseId: 'convenience-bee',
      },
      {
        id: 'profit-model',
        title: '盈利模式',
        order: 4,
        moduleIds: ['profit-model', 'case-fresh-grocery'],
        calibrationCaseId: 'fresh-grocery-comparison',
      },
      { id: 'cash-flow-structure', title: '现金流结构', order: 5, moduleIds: ['cash-flow-structure'] },
      { id: 'enterprise-value', title: '企业价值', order: 6, moduleIds: ['enterprise-value'] },
    ],
    postludeModuleIds: ['project-synthesis', 'personal-assessment', 'final-review'],
  },
  modules: [
    {
      id: 'course-foundations',
      code: 'A',
      order: 1,
      title: '交易原理与六要素总览',
      learningObjective: '建立交易结构与六要素的整体图景。',
      conceptIds: ['transaction-principle', 'six-elements-overview'],
      caseIds: [],
      questionTemplateIds: ['course-foundations-question'],
      evidenceRuleIds: ['concept-expression'],
    },
    levelModule(LEVELS[0]!, 'B', 2),
    levelModule(LEVELS[1]!, 'C', 3),
    levelModule(LEVELS[2]!, 'D', 4),
    { ...V2.modules.find((module) => module.id === 'case-convenience-bee')!, code: 'E', order: 5 },
    levelModule(LEVELS[3]!, 'F', 6),
    { ...V2.modules.find((module) => module.id === 'case-fresh-grocery')!, code: 'G', order: 7 },
    levelModule(LEVELS[4]!, 'H', 8),
    levelModule(LEVELS[5]!, 'I', 9),
    {
      id: 'project-synthesis',
      code: 'J',
      order: 10,
      title: '真实项目综合判断',
      learningObjective: '将六要素组合成可验证的项目判断。',
      conceptIds: ['six-elements-overview'],
      caseIds: [],
      questionTemplateIds: ['project-synthesis-question'],
      evidenceRuleIds: ['project-synthesis'],
    },
    {
      id: 'personal-assessment',
      code: 'K',
      order: 11,
      title: '个人学习成果测评',
      learningObjective: '用六道开放题呈现概念、因果、反证和迁移能力。',
      conceptIds: ['six-elements-overview'],
      caseIds: [],
      questionTemplateIds: FIXED_ASSESSMENT_QUESTIONS.map((question) => question.id),
      evidenceRuleIds: ['assessment-response'],
    },
    {
      id: 'final-review',
      code: 'L',
      order: 12,
      title: '最终学习回顾',
      learningObjective: '回放判断变化、证据质量与待验证问题。',
      conceptIds: ['six-elements-overview'],
      caseIds: [],
      questionTemplateIds: ['final-review-question'],
      evidenceRuleIds: ['level-reflection'],
    },
  ],
  concepts: {
    ...V2.concepts,
    'cash-flow-structure': cashFlowConcept,
    'enterprise-value': enterpriseValueConcept,
  },
  cases: V2.cases,
  questionTemplates: {
    ...V2.questionTemplates,
    ...levelQuestions,
    ...assessmentTemplates,
    'course-foundations-question': {
      id: 'course-foundations-question',
      phase: 'ground',
      conceptIds: ['transaction-principle', 'six-elements-overview'],
      prompt: '一家企业卖出了产品，为什么还不足以说明它的商业模式？',
      singleQuestion: true,
      evidenceRuleIds: ['concept-expression'],
      learningFragmentIds: ['transaction-principle-definition', 'six-elements-overview-definition'],
      conceptNodeId: 'six-elements-overview',
    },
    'project-synthesis-question': {
      id: 'project-synthesis-question',
      phase: 'reflect',
      conceptIds: ['six-elements-overview'],
      prompt: '综合六要素，你现在最想保留并继续验证的项目判断是什么？',
      singleQuestion: true,
      evidenceRuleIds: ['project-synthesis'],
      factScope: 'project',
      conceptNodeId: 'six-elements-overview',
    },
    'final-review-question': {
      id: 'final-review-question',
      phase: 'reflect',
      conceptIds: ['six-elements-overview'],
      prompt: '回看整个学习过程，哪一次判断修正最改变你看项目的方式？',
      singleQuestion: true,
      evidenceRuleIds: ['level-reflection'],
      conceptNodeId: 'six-elements-overview',
    },
  },
  evidenceRules: {
    ...V2.evidenceRules,
    'concept-expression': {
      id: 'concept-expression',
      description: '用自己的话说明概念与边界。',
      requiredSignals: ['own_words', 'distinction'],
      provenanceRequired: false,
    },
    'project-application': {
      id: 'project-application',
      description: '引用已核验项目事实形成因果判断。',
      requiredSignals: ['fact_ref', 'causal_link'],
      provenanceRequired: true,
    },
    'boundary-challenge': {
      id: 'boundary-challenge',
      description: '说明判断的边界与可推翻条件。',
      requiredSignals: ['boundary', 'counterevidence'],
      provenanceRequired: false,
    },
    'level-reflection': {
      id: 'level-reflection',
      description: '保存修正后判断及修正依据。',
      requiredSignals: ['judgment_revision'],
      provenanceRequired: false,
    },
    'project-synthesis': {
      id: 'project-synthesis',
      description: '综合项目事实、因果与反证形成待验证判断。',
      requiredSignals: ['fact_ref', 'causal_link', 'counterevidence'],
      provenanceRequired: true,
    },
  } satisfies Record<
    string,
    { id: string; description: string; requiredSignals: JiuxuangeEvidenceSignal[]; provenanceRequired: boolean }
  >,
  transferRules: [],
};
