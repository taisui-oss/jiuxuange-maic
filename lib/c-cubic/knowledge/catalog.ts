import 'server-only';

import type { JiuxuangeKnowledgeDocument, JiuxuangeKnowledgeSource } from './types';

const BIANLIFENG_SOURCE: JiuxuangeKnowledgeSource = {
  documentId: 'bianlifeng',
  sourcePath: '/Users/sijia/C立方/商业模式学原理/商业模式大课图书/1.案例库/便利蜂商业模式.pdf',
  title: '便利蜂商业模式',
  authority: 'primary',
  verificationStatus: 'verified',
  page: 5,
};

const DINGDONG_SOURCE: JiuxuangeKnowledgeSource = {
  documentId: 'dingdong-fresh',
  sourcePath:
    '/Users/sijia/C立方/商业模式学原理/商业模式大课图书/1.案例库/生鲜零售行业商业模式对比.pdf',
  title: '生鲜零售行业商业模式对比',
  authority: 'primary',
  verificationStatus: 'verified',
  page: 11,
};

const BIANLIFENG_OPERATIONS_SOURCE: JiuxuangeKnowledgeSource = {
  ...BIANLIFENG_SOURCE,
  page: 6,
};

const DINGDONG_ADVANTAGES_SOURCE: JiuxuangeKnowledgeSource = {
  ...DINGDONG_SOURCE,
  page: 13,
};

const PRINCIPLES_SOURCE_PATH =
  '/Users/sijia/MinerU/商业模式学原理.pdf-fdb45fcf-3928-4253-8ec6-58da1586bd70/# Principles of BusinessModel 商业模式学原理.md';

function principlesSource(heading: string): JiuxuangeKnowledgeSource {
  return {
    documentId: 'principles-of-business-model',
    sourcePath: PRINCIPLES_SOURCE_PATH,
    title: '商业模式学原理',
    authority: 'primary',
    verificationStatus: 'verified',
    headingPath: ['商业模式学原理', '第3章 商业模式六要素模型', heading],
  };
}

export const JIUXUANGE_KNOWLEDGE_DOCUMENTS: JiuxuangeKnowledgeDocument[] = [
  {
    id: 'principles-of-business-model',
    courseId: 'business-model',
    title: '商业模式学原理：概念主教材',
    authority: 'primary',
    sections: [
      {
        id: 'transaction-principle-definition',
        nodeIds: ['transaction-principle'],
        order: 1,
        kind: 'learner_fact',
        content:
          '交易结构需要同时观察交易主体、交易内容、交易方式、交易成本与风险，以及各方获得的价值。',
        sources: [principlesSource('第2章 交易的基本原理')],
      },
      {
        id: 'six-elements-overview-definition',
        nodeIds: ['six-elements-overview'],
        order: 1,
        kind: 'learner_fact',
        content: '商业模式六要素包括定位、业务系统、关键资源能力、盈利模式、现金流结构和企业价值。',
        sources: [principlesSource('第3章 商业模式六要素模型')],
      },
      {
        id: 'positioning-definition',
        nodeIds: ['positioning'],
        order: 1,
        kind: 'learner_fact',
        content:
          '定位从交易主体、交易内容、交易方式和交易成本出发，说明企业为哪些利益相关者满足什么需求。',
        sources: [principlesSource('3.3 定位')],
      },
      {
        id: 'business-system-definition',
        nodeIds: ['business-system'],
        order: 1,
        kind: 'learner_fact',
        content: '业务系统由构型、角色和关系组成，描述焦点企业与利益相关者如何连接并完成业务活动。',
        sources: [principlesSource('3.4 业务系统')],
      },
      {
        id: 'key-resources-definition',
        nodeIds: ['key-resources-capabilities'],
        order: 1,
        kind: 'learner_fact',
        content: '关键资源能力是支撑业务系统、形成差异并难以被替代的资源和能力组合。',
        sources: [principlesSource('3.5 关键资源能力')],
      },
      {
        id: 'profit-model-definition',
        nodeIds: ['profit-model'],
        order: 1,
        kind: 'learner_fact',
        content: '盈利模式需要同时解释收支来源、收支方式、定价方式及其与成本结构的匹配。',
        sources: [principlesSource('3.6 盈利模式')],
      },
      {
        id: 'cash-value-definition',
        nodeIds: ['cash-flow-enterprise-value'],
        order: 1,
        kind: 'learner_fact',
        content: '现金流结构关注流入流出的组成与时序，企业价值是六要素持续运行和相互作用的结果。',
        sources: [principlesSource('3.7 现金流结构与企业价值')],
      },
    ],
  },
  {
    id: 'bianlifeng',
    courseId: 'business-model',
    title: '便利蜂：动态定价与门店补货',
    authority: 'primary',
    sections: [
      {
        id: 'bianlifeng-data-inputs-fact',
        nodeIds: ['six-elements', 'convenience-bee'],
        order: 1,
        kind: 'learner_fact',
        content:
          '便利蜂后台采集门店消费、生产、仓储运输、视频、电商、天气和热点等数据，用于新品和当天商品配置决策。',
        sources: [BIANLIFENG_SOURCE],
      },
      {
        id: 'bianlifeng-ordering-fact',
        nodeIds: ['six-elements', 'convenience-bee'],
        order: 2,
        kind: 'learner_fact',
        content:
          '便利蜂中央大脑根据销售反馈和周期性综合数据制定门店生产计划，并在每天清晨自动下单采购。',
        sources: [BIANLIFENG_OPERATIONS_SOURCE],
      },
      {
        id: 'bianlifeng-analysis',
        nodeIds: ['six-elements', 'convenience-bee'],
        order: 3,
        kind: 'locked_analysis',
        content:
          '分析提示：订货和价格决策由店长经验转向系统，同时改变了决策权与执行分工；仍需用浪费、缺货和毛利数据核验效果。',
        sources: [BIANLIFENG_OPERATIONS_SOURCE],
      },
    ],
  },
  {
    id: 'dingdong-fresh',
    courseId: 'business-model',
    title: '叮咚买菜：生鲜选品与源头采购',
    authority: 'primary',
    sections: [
      {
        id: 'dingdong-model-fact',
        nodeIds: ['six-elements', 'fresh-grocery-comparison'],
        order: 1,
        kind: 'learner_fact',
        content:
          '教材记录叮咚买菜2021年在35个以上城市建立约1,375个前置仓，采购地、区域处理中心与前置仓构成三段式供应链。',
        sources: [DINGDONG_SOURCE],
      },
      {
        id: 'dingdong-sourcing-fact',
        nodeIds: ['six-elements', 'fresh-grocery-comparison'],
        order: 2,
        kind: 'learner_fact',
        content:
          '教材记录叮咚买菜生鲜采购中约80%来自直接生产者、基地合作社或独家指定分销机构等直接渠道。',
        sources: [DINGDONG_ADVANTAGES_SOURCE],
      },
      {
        id: 'dingdong-analysis',
        nodeIds: ['six-elements', 'fresh-grocery-comparison'],
        order: 3,
        kind: 'locked_analysis',
        content:
          '分析提示：前置仓和直接采购缩短了链路，但不能单凭时效与直采比例判断商业成立；还需核验履约费用、损耗和库存周转。',
        sources: [DINGDONG_SOURCE, DINGDONG_ADVANTAGES_SOURCE],
      },
    ],
  },
];
