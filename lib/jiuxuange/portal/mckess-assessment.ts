import { mckessProjectCardV1 } from '@/lib/jiuxuange/project-card';
import type { AssessmentAssignment, AssessmentQuestion, ProjectCardVersion } from './types';

export const MCKESS_ASSESSMENT_ASSIGNMENT_ID = 'bm-assessment-mckess-v1';

const ASSESSMENT_FACT_IDS = new Set([
  'fact-core-business',
  'fact-revenue-composition',
  'fact-capacity-utilization',
  'fact-customer-and-region',
  'fact-transaction-process',
  'fact-payment-terms',
  'fact-capability-base',
  'fact-financial-performance',
]);

const MCKESS_ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: 'positioning-1',
    prompt:
      '结合麦客思项目卡中的主营业务与客户结构，判断企业当前的核心交易对象和价值主张分别是什么，并引用项目事实。',
    required: true,
  },
  {
    id: 'bottleneck-2',
    prompt:
      '项目卡同时呈现收入变化和 2024 年产能利用率。你认为当前增长的首要瓶颈是什么？请区分事实与推测。',
    required: true,
  },
  {
    id: 'system-3',
    prompt: '围绕“订单—生产—配送”的现有业务系统，哪一个关键角色或关系最需要补强？为什么？',
    required: true,
  },
  {
    id: 'resource-4',
    prompt:
      '在项目卡列出的资源能力中，哪一项最可能限制麦客思的下一阶段发展？什么新事实会推翻你的判断？',
    required: true,
  },
  {
    id: 'profit-5',
    prompt: '结合收入结构、付款方式和利润表现，指出麦客思当前盈利模式中的主要张力，并说明因果链。',
    required: true,
  },
  {
    id: 'revision-6',
    prompt:
      '如果只能优先验证一个关于麦客思未来发展的假设，你会选择什么？请给出验证所需信息和判断标准。',
    required: true,
  },
];

export function createMckessAssessmentProjectCardVersion(): ProjectCardVersion {
  const facts = mckessProjectCardV1.reportedFacts
    .filter((fact) => ASSESSMENT_FACT_IDS.has(fact.id))
    .map((fact) => ({
      id: fact.id,
      text: fact.text,
      sourceLabel: `${mckessProjectCardV1.sourceDocument.title} · 第 ${fact.sourceRef.page} 页 · ${fact.sourceRef.locator}`,
    }));

  return {
    id: mckessProjectCardV1.id,
    groupId: mckessProjectCardV1.groupId,
    projectId: mckessProjectCardV1.projectId,
    version: mckessProjectCardV1.version,
    title: mckessProjectCardV1.title,
    facts,
    frozenAt: mckessProjectCardV1.sourceDocument.createdAt,
  };
}

export function createMckessAssessmentAssignment(): AssessmentAssignment {
  return {
    id: MCKESS_ASSESSMENT_ASSIGNMENT_ID,
    title: '麦客思商业模式个人项目测评',
    groupId: mckessProjectCardV1.groupId,
    projectId: mckessProjectCardV1.projectId,
    projectCardVersionId: mckessProjectCardV1.id,
    questionVersion: 'bm-mckess-six-open-questions@1',
    questions: structuredClone(MCKESS_ASSESSMENT_QUESTIONS),
    promptVersion: 'directional-feedback@1',
    rubricVersion: 'text-evidence-rubric@1',
    status: 'published',
    publishedAt: '2026-07-27T00:00:00.000Z',
  };
}
