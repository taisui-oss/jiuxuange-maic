import { BUSINESS_MODEL_SIX_LEVEL_PACKAGE } from './business-model-v3';
import type { JiuxuangeCourseModule, JiuxuangeCoursePackage } from './types';

const V3 = BUSINESS_MODEL_SIX_LEVEL_PACKAGE;

const foundations: JiuxuangeCourseModule = {
  id: 'course-foundations',
  code: 'A',
  order: 1,
  title: '单课导学',
  learningObjective: '建立商业模式的必要区分，并用便利蜂看见六要素之间的连接。',
  conceptIds: ['transaction-principle', 'six-elements-overview'],
  caseIds: [],
  questionTemplateIds: [
    'orientation-must-know',
    'orientation-convenience-bee',
    'orientation-six-element-map',
  ],
  evidenceRuleIds: ['concept-expression', 'case-fact-causality'],
};

export const BUSINESS_MODEL_SINGLE_COURSE_PACKAGE: JiuxuangeCoursePackage = {
  ...V3,
  version: '4.0.0-learning-first-orientation',
  entryMode: 'learning-first',
  journey: {
    ...V3.journey!,
    version: 'single-course-orientation.v1',
  },
  modules: [foundations, ...V3.modules.filter((module) => module.id !== 'course-foundations')],
  questionTemplates: {
    ...V3.questionTemplates,
    'orientation-must-know': {
      id: 'orientation-must-know',
      phase: 'ground',
      conceptIds: ['transaction-principle', 'six-elements-overview'],
      prompt: '只看这段定义，你会怎样区分“卖什么”和“商业模式如何成立”？',
      singleQuestion: true,
      evidenceRuleIds: ['concept-expression'],
      factScope: 'none',
      learningFragmentIds: ['transaction-principle-definition', 'six-elements-overview-definition'],
      conceptNodeId: 'six-elements-overview',
      teachingMode: 'explain-then-check',
      teachingText:
        '我们直接从学习开始。商业模式不等于企业卖什么，也不只是赚不赚钱；它描述利益相关者之间如何交易、共同创造价值，并分别承担成本和风险。',
    },
    'orientation-convenience-bee': {
      id: 'orientation-convenience-bee',
      phase: 'compare',
      conceptIds: ['business-system', 'key-resources-capabilities'],
      prompt: '在便利蜂案例中，把订货决策从店长经验交给中央系统，至少改变了哪两个协作关系？',
      singleQuestion: true,
      evidenceRuleIds: ['case-fact-causality'],
      factScope: 'case',
      learningFragmentIds: ['bianlifeng-data-inputs-fact', 'bianlifeng-ordering-fact'],
      conceptNodeId: 'convenience-bee',
      caseId: 'convenience-bee',
      casePhase: 'blind',
      teachingMode: 'explain-then-check',
      teachingText:
        '来看一个固定案例。便利蜂把消费、库存、天气等数据交给中央系统处理，再由系统制定门店生产和订货计划。变化不只是一套软件，而是决策权、信息流和门店分工同时发生了改变。',
    },
    'orientation-six-element-map': {
      id: 'orientation-six-element-map',
      phase: 'reflect',
      conceptIds: ['six-elements-overview', 'business-system', 'key-resources-capabilities'],
      prompt: '沿着便利蜂的例子，你认为“业务系统”和“关键资源能力”之间最直接的一条连接是什么？',
      singleQuestion: true,
      evidenceRuleIds: ['concept-expression'],
      factScope: 'case',
      learningFragmentIds: [
        'six-elements-overview-definition',
        'business-system-definition',
        'key-resources-definition',
      ],
      conceptNodeId: 'six-elements-overview',
      caseId: 'convenience-bee',
      casePhase: 'blind',
      teachingMode: 'explain-then-check',
      teachingText:
        '六要素不是六张互不相干的清单。定位决定为谁解决什么问题，业务系统决定各方怎样协作，关键资源能力支撑这套协作；随后盈利模式、现金流结构和企业价值共同检验它能否持续。',
    },
  },
  evidenceRules: {
    ...V3.evidenceRules,
    'case-fact-causality': {
      id: 'case-fact-causality',
      description: '观察学员可见案例事实，并说明事实改变了哪项协作关系。',
      requiredSignals: ['fact_ref', 'causal_link'],
      provenanceRequired: true,
    },
  },
};
