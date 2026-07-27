import { mckessProjectCardV2 } from '@/lib/jiuxuange/project-card';
import type { AssessmentAssignment, AssessmentQuestion, ProjectCardVersion } from './types';

export const MCKESS_ASSESSMENT_ASSIGNMENT_ID = 'bm-assessment-mckess-v2';

const ASSESSMENT_FACT_IDS = new Set([
  'fact-core-business',
  'fact-revenue-composition',
  'fact-capacity-utilization',
  'fact-customer-and-region',
  'fact-transaction-process',
  'fact-payment-terms',
  'fact-capability-base',
  'fact-financial-performance',
  'fact-margin-performance',
]);

const ASSESSMENT_SAFE_FACT_TEXT: Record<string, string> = {
  'fact-core-business':
    '项目卡草案称，核心业务面向区域餐饮 B 端客户，提供定制预制菜、半成品和成品。',
  'fact-revenue-composition':
    '项目卡草案称，收入由原材料销售与半成品、成品销售构成，后者是更主要的收入来源。',
  'fact-capacity-utilization': '项目卡草案称，最近一个报告期的产能利用率约为两成。',
  'fact-customer-and-region':
    '项目卡草案称，当前主要服务辽沈地区的茶餐厅、火锅店和中式酒楼等 B 端客户。',
  'fact-transaction-process': '项目卡草案将当前交付流程概括为“订单—生产—配送”。',
  'fact-payment-terms': '项目卡草案称，客户通常预付款后生产；供应商结算以月结为主、现付为辅。',
  'fact-capability-base':
    '项目卡草案列出供应商网络、产品 SOP、配方储备、柔性生产、采购与库存管理等能力。',
  'fact-financial-performance':
    '项目卡草案显示，最近一个报告期收入较上一期下降，净利润为小幅正值；但作业其他部分仍存在“当前亏损”的判断。',
  'fact-margin-performance': '项目卡草案显示，最近一个报告期毛利率高于前两期，净利润率为小幅正值。',
};

const MCKESS_ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: 'transaction-map-1',
    title: '交易地图与核心问题',
    questionType: 'fact_diagnosis',
    prompt:
      '根据项目卡，先说明麦客思当前“谁和谁交易”、各方交换什么，再判断最关键的商业模式问题是什么。请引用至少两条项目事实。',
    learningObjectiveIds: ['identify-transaction-actors', 'define-core-business-model-problem'],
    courseConceptIds: ['positioning', 'business_system'],
    scenarioFactIds: ['fact-core-business', 'fact-customer-and-region', 'fact-transaction-process'],
    minimumFactReferences: 2,
    rubricDimensionIds: ['project_specificity', 'fact_hypothesis_distinction', 'causal_logic'],
    required: true,
  },
  {
    id: 'hypothesis-constraint-2',
    title: '增长约束假设',
    questionType: 'hypothesis_evaluation',
    prompt:
      '一个尚未验证的假设是：“麦客思增长放缓并非获客不足，而是交付能力已经成为约束。”你是否认同？请说明依据，并指出还需要补充什么信息。',
    learningObjectiveIds: ['evaluate-business-hypothesis', 'identify-missing-evidence'],
    courseConceptIds: ['positioning', 'key_resources_capabilities'],
    scenarioFactIds: [
      'fact-capacity-utilization',
      'fact-financial-performance',
      'fact-revenue-composition',
    ],
    introducedHypothesis: '增长放缓的首要原因是交付能力，而不是获客不足。',
    minimumFactReferences: 2,
    rubricDimensionIds: ['fact_hypothesis_distinction', 'causal_logic', 'validation_awareness'],
    required: true,
  },
  {
    id: 'option-comparison-3',
    title: '增长路径比较',
    questionType: 'option_comparison',
    prompt:
      '比较两条增长路径：A. 深耕区域定制 B 端；B. 扩展 OEM、多品类与新渠道。你会优先选择哪一条？请比较两种方案的协作主体、关键资源要求和主要风险。',
    learningObjectiveIds: ['compare-business-system-options', 'make-evidence-based-tradeoff'],
    courseConceptIds: ['business_system', 'key_resources_capabilities', 'profit_model'],
    scenarioFactIds: [
      'fact-customer-and-region',
      'fact-capability-base',
      'fact-capacity-utilization',
    ],
    minimumFactReferences: 2,
    rubricDimensionIds: [
      'concept_application',
      'project_specificity',
      'options_tradeoffs',
      'validation_awareness',
    ],
    required: true,
  },
  {
    id: 'causal-chain-4',
    title: '经营数据因果链',
    questionType: 'causal_reasoning',
    prompt:
      '项目卡显示 2024 年收入较上年下降、毛利率上升，同时产能利用率较低。请提出一条可能的因果链，并逐段标明哪些已有事实支持、哪些只是推测。',
    learningObjectiveIds: ['build-causal-chain', 'separate-fact-from-inference'],
    courseConceptIds: ['profit_model', 'cash_flow_structure'],
    scenarioFactIds: [
      'fact-financial-performance',
      'fact-margin-performance',
      'fact-capacity-utilization',
    ],
    minimumFactReferences: 3,
    rubricDimensionIds: ['project_specificity', 'fact_hypothesis_distinction', 'causal_logic'],
    required: true,
  },
  {
    id: 'judgment-revision-5',
    title: '新信息下的判断修正',
    questionType: 'judgment_revision',
    prompt:
      '新增信息：“新客户愿意预付，但定制订单会显著增加换线频率和小批量损耗。”这条信息会怎样改变你对增长优先级的判断？请说明原判断、修正后的判断和改变依据。',
    learningObjectiveIds: ['revise-judgment-with-new-information'],
    courseConceptIds: ['key_resources_capabilities', 'profit_model', 'cash_flow_structure'],
    scenarioFactIds: ['fact-payment-terms', 'fact-capability-base'],
    introducedNewInformation: '新客户愿意预付，但定制订单会显著增加换线频率和小批量损耗。',
    minimumFactReferences: 1,
    rubricDimensionIds: [
      'concept_application',
      'causal_logic',
      'options_tradeoffs',
      'validation_awareness',
    ],
    required: true,
  },
  {
    id: 'causal-map-6',
    title: '六要素因果图',
    questionType: 'causal_reasoning',
    prompt:
      '汇总你的判断：麦客思服务谁、各主体如何协作、企业必须擅长什么、谁向谁付钱、资金何时流入和占用，以及什么决定长期企业价值。请用文字箭头写出六要素因果图，并指出最先要验证的一条连接。',
    learningObjectiveIds: ['synthesize-six-element-causal-map', 'prioritize-validation'],
    courseConceptIds: [
      'positioning',
      'business_system',
      'key_resources_capabilities',
      'profit_model',
      'cash_flow_structure',
      'enterprise_value',
    ],
    scenarioFactIds: [
      'fact-core-business',
      'fact-transaction-process',
      'fact-capability-base',
      'fact-payment-terms',
      'fact-financial-performance',
    ],
    minimumFactReferences: 3,
    rubricDimensionIds: [
      'concept_application',
      'project_specificity',
      'causal_logic',
      'validation_awareness',
    ],
    required: true,
  },
];

export function createMckessAssessmentProjectCardVersion(): ProjectCardVersion {
  const facts = mckessProjectCardV2.reportedFacts
    .filter((fact) => ASSESSMENT_FACT_IDS.has(fact.id))
    .map((fact) => ({
      id: fact.id,
      text: ASSESSMENT_SAFE_FACT_TEXT[fact.id] ?? fact.text,
      sourceLabel: '麦客思项目卡草案 · 已按模型披露规则脱敏 · 待案主确认',
    }));

  return {
    id: mckessProjectCardV2.id,
    groupId: mckessProjectCardV2.groupId,
    projectId: mckessProjectCardV2.projectId,
    version: mckessProjectCardV2.version,
    title: mckessProjectCardV2.title,
    facts,
    frozenAt: mckessProjectCardV2.sourceDocument.createdAt,
  };
}

export function createMckessAssessmentAssignment(): AssessmentAssignment {
  return {
    id: MCKESS_ASSESSMENT_ASSIGNMENT_ID,
    title: '麦客思商业模式个人项目测评',
    groupId: mckessProjectCardV2.groupId,
    projectId: mckessProjectCardV2.projectId,
    projectCardVersionId: mckessProjectCardV2.id,
    questionVersion: 'bm-mckess-six-open-scenarios@2',
    questions: structuredClone(MCKESS_ASSESSMENT_QUESTIONS),
    promptVersion: 'directional-feedback@2',
    rubricVersion: 'business-model-transfer-rubric@2',
    status: 'published',
    publishedAt: '2026-07-27T00:00:00.000Z',
  };
}
