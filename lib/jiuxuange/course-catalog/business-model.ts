import type { JiuxuangeVisibleLevelId } from '@/lib/c-cubic/course-package/types';

export type BusinessModelClassroomReleaseStatus = 'pilot' | 'published' | 'in_review';

export interface BusinessModelMainlineUnit {
  id: string;
  title: string;
  summary: string;
  classroomId: string;
  releaseStatus: BusinessModelClassroomReleaseStatus;
  focus: JiuxuangeVisibleLevelId[];
}

export interface BusinessModelCaseLesson {
  id: string;
  title: string;
  summary: string;
  format: 'native_multi_round';
  focus: JiuxuangeVisibleLevelId[];
  releaseStatus: BusinessModelClassroomReleaseStatus;
  classroomId?: string;
  unlockAfterMainlineUnitId?: string;
  sequence?: number;
}

export interface BusinessModelProjectPractice {
  id: string;
  title: string;
  summary: string;
  status: 'draft' | 'published';
  href: string;
  agentIds: Array<'senior' | 'mystery' | 'growth_feedback'>;
}

const BUSINESS_MODEL_COURSE_RETURN_TO = '/courses/business-model';

export function businessModelClassroomHref(classroomId: string): string {
  const query = new URLSearchParams({
    returnTo: BUSINESS_MODEL_COURSE_RETURN_TO,
    completion: 'all-correct',
  });
  return `/classroom/${classroomId}?${query.toString()}`;
}

export const BUSINESS_MODEL_MAINLINE_UNITS: BusinessModelMainlineUnit[] = [
  {
    id: 'six-elements-coffee-foundation',
    title: '六要素概念与整体关系',
    summary: '通过咖啡店公共案例理解商业模式要素之间的基本关系，并完成原生互动。',
    classroomId: 'jxg-bm-mainline-six-elements-coffee-v1',
    releaseStatus: 'pilot',
    focus: [
      'positioning',
      'business-system',
      'key-resources-capabilities',
      'profit-model',
      'cash-flow-structure',
      'enterprise-value',
    ],
  },
];

export const BUSINESS_MODEL_CASE_LESSONS: BusinessModelCaseLesson[] = [
  {
    id: 'convenience-bee',
    title: '便利蜂：商业模式事实观察',
    summary: '从中央决策、门店执行和数据关系切入，练习业务系统与关键资源能力判断。',
    format: 'native_multi_round',
    focus: ['business-system', 'key-resources-capabilities'],
    releaseStatus: 'pilot',
    classroomId: 'jxg-bm-case-convenience-bee-v1',
    unlockAfterMainlineUnitId: 'six-elements-coffee-foundation',
    sequence: 1,
  },
  {
    id: 'fresh-grocery-comparison',
    title: '生鲜零售：模式比较与迁移',
    summary: '比较店仓一体、前置仓、平台到家和社区团购，观察定位、系统与盈利方式如何联动。',
    format: 'native_multi_round',
    focus: ['positioning', 'business-system', 'profit-model'],
    releaseStatus: 'in_review',
    sequence: 2,
  },
  {
    id: 'shein-system-capabilities',
    title: 'SHEIN：业务系统与关键资源能力',
    summary: '用于分析多主体协同、柔性供应链与数据能力之间的关系。',
    format: 'native_multi_round',
    focus: ['business-system', 'key-resources-capabilities'],
    releaseStatus: 'in_review',
  },
  {
    id: 'florasis-business-model',
    title: '花西子：定位与盈利模式',
    summary: '用于观察品牌定位、渠道关系、内容投入和收入结构之间的因果链。',
    format: 'native_multi_round',
    focus: ['positioning', 'profit-model', 'cash-flow-structure'],
    releaseStatus: 'in_review',
  },
  {
    id: 'freight-platform-ecosystem',
    title: '整车货运平台：商业模式共生体',
    summary: '用于练习平台型业务中的交易主体、利益关系和价值分配。',
    format: 'native_multi_round',
    focus: ['business-system', 'profit-model', 'enterprise-value'],
    releaseStatus: 'in_review',
  },
  {
    id: 'smart-auto-comparison',
    title: '智能汽车：行业商业模式比较',
    summary: '用于迁移六要素框架，比较产业变化对现金流与企业价值的影响。',
    format: 'native_multi_round',
    focus: ['positioning', 'cash-flow-structure', 'enterprise-value'],
    releaseStatus: 'in_review',
  },
];

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
