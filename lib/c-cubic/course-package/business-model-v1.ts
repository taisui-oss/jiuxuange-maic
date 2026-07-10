import type { JiuxuangeCoursePackage } from './types';

const COURSE_SOURCE = {
  documentId: 'business-model-economic-explanation',
  title: '《商业模式的经济解释》',
  locator: '第3章：商业模式六要素模型（页码待课程负责人核定）',
  verificationStatus: 'draft' as const,
};

export const BUSINESS_MODEL_PILOT_PACKAGE: JiuxuangeCoursePackage = {
  id: 'business-model',
  version: '1.0.0-pilot-b',
  releaseStatus: 'pilot_b_only',
  formalScoringEnabled: false,
  title: '商业模式大课',
  modules: [
    {
      id: 'six-elements',
      code: 'B',
      order: 2,
      title: '六要素拆解',
      learningObjective: '用项目事实形成一项可反证的商业模式判断。',
      conceptIds: ['business-model-six-elements'],
      caseIds: ['demo_chain_franchise'],
      questionTemplateIds: [
        'ground_fact',
        'explain_concept',
        'apply_six_elements',
        'probe_tension',
        'judge_with_counterevidence',
      ],
      evidenceRuleIds: ['concept_to_case', 'case_to_handover'],
    },
  ],
  concepts: {
    'business-model-six-elements': {
      id: 'business-model-six-elements',
      name: '商业模式六要素',
      definition: '从定位、业务系统、关键资源能力、盈利模式、现金流结构和企业价值理解价值创造与获取结构。',
      distinctions: ['不是产品功能清单', '不是收入模式的同义词'],
      misconceptions: ['列满六项就等于完成商业模式判断'],
      applicationCriteria: ['每项判断引用项目事实', '说明要素之间的因果关系'],
      sourceRefs: [COURSE_SOURCE],
    },
  },
  cases: {
    demo_chain_franchise: {
      id: 'demo_chain_franchise',
      title: '连锁加盟商业模式演示',
      mode: 'synthetic_demo',
      availability: 'demo',
      conceptIds: ['business-model-six-elements'],
      facts: [
        {
          id: 'demo-f1',
          text: '门店数量持续增长，但加盟商的续约率在下降。',
          sourceKind: 'synthetic',
          sourceRef: {
            documentId: 'synthetic-chain-franchise-v1',
            title: '连锁加盟合成演示事实包',
            locator: 'fact-01',
            verificationStatus: 'verified',
          },
          visibility: 'learner',
          verificationStatus: 'verified',
          confidence: 'high',
        },
        {
          id: 'demo-f2',
          text: '总部的主要收入来自新店加盟费，与单店后续盈利的关联较弱。',
          sourceKind: 'synthetic',
          sourceRef: {
            documentId: 'synthetic-chain-franchise-v1',
            title: '连锁加盟合成演示事实包',
            locator: 'fact-02',
            verificationStatus: 'verified',
          },
          visibility: 'learner',
          verificationStatus: 'verified',
          confidence: 'high',
        },
      ],
    },
    'guan-yu-nan': {
      id: 'guan-yu-nan',
      title: '管与楠鸡公煲',
      mode: 'real_project',
      availability: 'draft',
      conceptIds: ['business-model-six-elements'],
      facts: [
        {
          id: 'project-fact-1',
          text: '项目报告提及门店数量及加盟收入结构，原始报告尚待入库核对。',
          sourceKind: 'primary_project',
          sourceRef: {
            documentId: 'guan-yu-nan-primary-report-pending',
            title: '管与楠项目原始报告（待入库）',
            locator: '待核定',
            verificationStatus: 'draft',
          },
          visibility: 'coach_only',
          verificationStatus: 'draft',
          confidence: 'low',
        },
        {
          id: 'learner-claim-1',
          text: '学员报告将商业模式视为企业当前问题的根因。',
          sourceKind: 'learner_report',
          sourceRef: {
            documentId: 'guan-yu-nan-learner-report-pending',
            title: '管与楠学员报告（待入库）',
            locator: '待核定',
            verificationStatus: 'draft',
          },
          visibility: 'coach_only',
          verificationStatus: 'draft',
          confidence: 'low',
        },
        {
          id: 'coach-judgement-1',
          text: '教练评审认为总部与加盟商之间存在交易结构张力。',
          sourceKind: 'coach_review',
          sourceRef: {
            documentId: 'opening-review-guan-yu-nan-20260505',
            title: '开题报告评审-管与楠鸡公煲-20260505',
            locator: '案例测试包教练判断，原始段落待二次核对',
            verificationStatus: 'verified',
          },
          visibility: 'coach_only',
          verificationStatus: 'verified',
          confidence: 'medium',
        },
      ],
    },
  },
  questionTemplates: {
    ground_fact: {
      id: 'ground_fact',
      phase: 'ground',
      conceptIds: ['business-model-six-elements'],
      prompt: '你刚才的判断对应事实包里的哪条观察？',
      singleQuestion: true,
      evidenceRuleIds: ['fact_grounding'],
    },
    explain_concept: {
      id: 'explain_concept',
      phase: 'ground',
      conceptIds: ['business-model-six-elements'],
      prompt: '用你自己的话说，商业模式和收入模式最大的不同是什么？',
      singleQuestion: true,
      evidenceRuleIds: ['concept_to_case'],
    },
    apply_six_elements: {
      id: 'apply_six_elements',
      phase: 'apply',
      conceptIds: ['business-model-six-elements'],
      prompt: '这条事实首先改变了六要素中的哪一项？',
      singleQuestion: true,
      evidenceRuleIds: ['fact_grounding'],
    },
    probe_tension: {
      id: 'probe_tension',
      phase: 'tension',
      conceptIds: ['business-model-six-elements'],
      prompt: '把门店增长和续约下降放在一起，你看到了什么不一致？',
      singleQuestion: true,
      evidenceRuleIds: ['fact_grounding'],
    },
    judge_with_counterevidence: {
      id: 'judge_with_counterevidence',
      phase: 'judge',
      conceptIds: ['business-model-six-elements'],
      prompt: '什么新事实出现时，你会推翻刚才的判断？',
      singleQuestion: true,
      evidenceRuleIds: ['case_to_handover'],
    },
  },
  evidenceRules: {
    fact_grounding: {
      id: 'fact_grounding',
      description: '引用一条项目事实，并说明它如何支撑当前判断。',
      requiredSignals: ['fact_ref', 'causal_link'],
      provenanceRequired: true,
    },
    concept_to_case: {
      id: 'concept_to_case',
      description: '能用自己的话解释概念并区分常见误区。',
      requiredSignals: ['own_words', 'distinction'],
      provenanceRequired: true,
    },
    case_to_handover: {
      id: 'case_to_handover',
      description: '引用项目事实形成因果判断并给出反证条件。',
      requiredSignals: ['fact_ref', 'causal_link', 'counterevidence'],
      provenanceRequired: true,
    },
  },
  transferRules: [],
};

export function getCoursePackage(courseId: string, version: string): JiuxuangeCoursePackage {
  if (
    courseId === BUSINESS_MODEL_PILOT_PACKAGE.id &&
    version === BUSINESS_MODEL_PILOT_PACKAGE.version
  ) {
    return BUSINESS_MODEL_PILOT_PACKAGE;
  }
  throw new Error(`Unknown Jiuxuange course package: ${courseId}@${version}`);
}
