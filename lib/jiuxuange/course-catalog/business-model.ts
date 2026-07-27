import type { JiuxuangeVisibleLevelId } from '@/lib/c-cubic/course-package/types';

export type BusinessModelClassroomReleaseStatus = 'pilot' | 'published' | 'in_review';

export interface BusinessModelCaseLesson {
  id: string;
  title: string;
  summary: string;
  format: 'native_multi_round';
  focus: JiuxuangeVisibleLevelId[];
  releaseStatus: BusinessModelClassroomReleaseStatus;
  classroomId?: string;
  unlockAfterCaseId?: string;
  sequence: number;
}

export interface BusinessModelProjectPractice {
  id: string;
  title: string;
  summary: string;
  status: 'draft' | 'published';
  href: string;
  agentIds: Array<'senior' | 'mystery' | 'growth_feedback'>;
}

export interface BusinessModelCaseAnalysisStep {
  id:
    | 'transaction-map'
    | 'positioning'
    | 'business-system'
    | 'key-resources-capabilities'
    | 'profit-model'
    | 'cash-flow-structure'
    | 'enterprise-value'
    | 'causal-map';
  title: string;
  prompt: string;
}

const BUSINESS_MODEL_COURSE_RETURN_TO = '/courses/business-model';

export function businessModelClassroomHref(classroomId: string): string {
  const query = new URLSearchParams({
    returnTo: BUSINESS_MODEL_COURSE_RETURN_TO,
    completion: 'all-correct',
  });
  return `/classroom/${classroomId}?${query.toString()}`;
}

export const BUSINESS_MODEL_CASE_ANALYSIS_PATH: BusinessModelCaseAnalysisStep[] = [
  {
    id: 'transaction-map',
    title: '谁和谁交易',
    prompt: '识别购买者、使用者、决策者、供应者和合作方。',
  },
  {
    id: 'positioning',
    title: '服务谁、解决什么问题',
    prompt: '明确目标客户、核心问题和价值主张。',
  },
  {
    id: 'business-system',
    title: '各主体如何协作',
    prompt: '沿着产品、服务、信息和责任关系拆解业务系统。',
  },
  {
    id: 'key-resources-capabilities',
    title: '企业必须擅长什么',
    prompt: '找出让交易结构成立且难以被替代的能力。',
  },
  {
    id: 'profit-model',
    title: '谁向谁付钱',
    prompt: '识别收入来源、定价单位、成本承担和利益分配。',
  },
  {
    id: 'cash-flow-structure',
    title: '钱在什么时候流入和占用',
    prompt: '观察预收、账期、库存、固定投入和扩张资金。',
  },
  {
    id: 'enterprise-value',
    title: '什么决定长期企业价值',
    prompt: '判断可复制能力、自由现金流和增长风险。',
  },
  {
    id: 'causal-map',
    title: '汇总六要素因果图',
    prompt: '把六要素连成可以被事实检验的因果链。',
  },
];

export const BUSINESS_MODEL_CASE_LESSONS: BusinessModelCaseLesson[] = [
  {
    id: 'breakfast-chain-six-elements-foundation',
    title: '社区早餐连锁：从一笔订单到六要素因果图',
    summary:
      '使用不对应具体企业的教学情境，沿交易主体、定位、协作、能力、盈利、现金流和企业价值完成第一轮因果拆解。',
    classroomId: 'jxg-bm-case-breakfast-chain-six-elements-v1',
    releaseStatus: 'pilot',
    format: 'native_multi_round',
    sequence: 1,
    focus: [
      'positioning',
      'business-system',
      'key-resources-capabilities',
      'profit-model',
      'cash-flow-structure',
      'enterprise-value',
    ],
  },
  {
    id: 'convenience-bee',
    title: '便利蜂：六要素事实迁移',
    summary: '沿同一八步路径观察便利蜂的定位、中央决策、门店执行、数据能力、盈利与企业价值。',
    format: 'native_multi_round',
    focus: ['business-system', 'key-resources-capabilities'],
    releaseStatus: 'pilot',
    classroomId: 'jxg-bm-case-convenience-bee-v1',
    unlockAfterCaseId: 'breakfast-chain-six-elements-foundation',
    sequence: 2,
  },
  {
    id: 'fresh-grocery-comparison',
    title: '生鲜零售：模式比较与迁移',
    summary: '比较店仓一体、前置仓、平台到家和社区团购，观察定位、系统与盈利方式如何联动。',
    format: 'native_multi_round',
    focus: ['positioning', 'business-system', 'profit-model'],
    releaseStatus: 'in_review',
    unlockAfterCaseId: 'convenience-bee',
    sequence: 3,
  },
  {
    id: 'shein-system-capabilities',
    title: 'SHEIN：业务系统与关键资源能力',
    summary: '用于分析多主体协同、柔性供应链与数据能力之间的关系。',
    format: 'native_multi_round',
    focus: ['business-system', 'key-resources-capabilities'],
    releaseStatus: 'in_review',
    unlockAfterCaseId: 'fresh-grocery-comparison',
    sequence: 4,
  },
  {
    id: 'florasis-business-model',
    title: '花西子：定位与盈利模式',
    summary: '用于观察品牌定位、渠道关系、内容投入和收入结构之间的因果链。',
    format: 'native_multi_round',
    focus: ['positioning', 'profit-model', 'cash-flow-structure'],
    releaseStatus: 'in_review',
    unlockAfterCaseId: 'shein-system-capabilities',
    sequence: 5,
  },
  {
    id: 'freight-platform-ecosystem',
    title: '整车货运平台：商业模式共生体',
    summary: '用于练习平台型业务中的交易主体、利益关系和价值分配。',
    format: 'native_multi_round',
    focus: ['business-system', 'profit-model', 'enterprise-value'],
    releaseStatus: 'in_review',
    unlockAfterCaseId: 'florasis-business-model',
    sequence: 6,
  },
  {
    id: 'smart-auto-comparison',
    title: '智能汽车：行业商业模式比较',
    summary: '用于迁移六要素框架，比较产业变化对现金流与企业价值的影响。',
    format: 'native_multi_round',
    focus: ['positioning', 'cash-flow-structure', 'enterprise-value'],
    releaseStatus: 'in_review',
    unlockAfterCaseId: 'freight-platform-ecosystem',
    sequence: 7,
  },
];

export function isBusinessModelCaseUnlocked(
  lesson: BusinessModelCaseLesson,
  completedClassroomIds: ReadonlySet<string>,
): boolean {
  if (!lesson.unlockAfterCaseId) return true;
  const prerequisite = BUSINESS_MODEL_CASE_LESSONS.find(
    (candidate) => candidate.id === lesson.unlockAfterCaseId,
  );
  return Boolean(prerequisite?.classroomId && completedClassroomIds.has(prerequisite.classroomId));
}

export const BUSINESS_MODEL_PROJECT_PRACTICES: BusinessModelProjectPractice[] = [
  {
    id: 'mckess-central-kitchen',
    title: '麦客思中央厨房商业模式重构',
    summary: '模拟项目卡：基于小组作业中的项目事实、判断、方案假设和开放矛盾进行练习。',
    status: 'draft',
    href: '/courses/business-model/projects/mckess',
    agentIds: ['senior', 'mystery', 'growth_feedback'],
  },
];

export const BUSINESS_MODEL_LEVEL_LABELS: Record<JiuxuangeVisibleLevelId, string> = {
  positioning: '定位',
  'business-system': '业务系统',
  'key-resources-capabilities': '关键资源能力',
  'profit-model': '盈利模式',
  'cash-flow-structure': '现金流结构',
  'enterprise-value': '企业价值',
};
