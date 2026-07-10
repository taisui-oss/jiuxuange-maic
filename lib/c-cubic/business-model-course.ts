export const C_CUBIC_BUSINESS_MODEL_COURSE_ID = 'c-cubic-business-model-phase1';

export type CubicLearningStep = 'concept' | 'case';

export type CubicModuleLevel = 'foundation' | 'core' | 'method' | 'advanced';

export interface CubicClassroomRef {
  classroomId?: string;
  title: string;
  description: string;
  kind: CubicLearningStep;
}

export interface CubicBusinessModelModule {
  id: string;
  order: number;
  code: string;
  title: string;
  subtitle: string;
  level: CubicModuleLevel;
  anchorText: string;
  learningGoal: string;
  concept: CubicClassroomRef;
  case: CubicClassroomRef;
}

export const C_CUBIC_BUSINESS_MODEL_MODULES: CubicBusinessModelModule[] = [
  {
    id: 'bm-foundation',
    order: 1,
    code: 'A',
    title: '基础概念',
    subtitle: '先建立商业模式的共同语言',
    level: 'foundation',
    anchorText: '《发现商业模式》与《商业模式的经济解释》绪论',
    learningGoal: '能区分产品、业务、商业模式，并用交易结构描述一个项目。',
    concept: {
      title: '概念理解卡',
      description: '梳理商业模式的基本定义、交易主体和价值流。',
      kind: 'concept',
    },
    case: {
      title: '案例观察卡',
      description: '用一个真实项目练习“谁和谁发生什么交易”。',
      kind: 'case',
    },
  },
  {
    id: 'bm-six-elements',
    order: 2,
    code: 'B',
    title: '六要素拆解',
    subtitle: '把项目拆成可追问的结构',
    level: 'core',
    anchorText: '《商业模式的经济解释》核心章节',
    learningGoal: '能用六要素定位一个项目的关键约束与初始矛盾。',
    concept: {
      classroomId: '2bgkxp8v_H',
      title: '概念理解卡',
      description: '进入“商业模式六要素工作坊”，学习拆解框架。',
      kind: 'concept',
    },
    case: {
      classroomId: 'ds9xotYKD7',
      title: '案例观察卡',
      description: '进入“连锁加盟商业模式实战”，把六要素落到案例。',
      kind: 'case',
    },
  },
  {
    id: 'bm-reconstruction',
    order: 3,
    code: 'C',
    title: '重构方法',
    subtitle: '从发现问题进入结构重构',
    level: 'method',
    anchorText: '《重构商业模式》',
    learningGoal: '能提出至少一个可验证的重构假设，而不是停留在口号建议。',
    concept: {
      title: '概念理解卡',
      description: '理解重构不是优化单点，而是调整交易关系和约束条件。',
      kind: 'concept',
    },
    case: {
      title: '案例观察卡',
      description: '围绕项目事实生成重构假设，并检查代价与副作用。',
      kind: 'case',
    },
  },
  {
    id: 'bm-profit-model',
    order: 4,
    code: 'D',
    title: '盈利模式',
    subtitle: '看清钱从哪里来、为什么能持续',
    level: 'core',
    anchorText: '《透析盈利模式》',
    learningGoal: '能解释收入、成本、付费意愿和留存之间的因果关系。',
    concept: {
      title: '概念理解卡',
      description: '拆解收费对象、收费方式、成本结构和利润来源。',
      kind: 'concept',
    },
    case: {
      title: '案例观察卡',
      description: '用项目数据判断盈利模式是否只是“看起来能赚钱”。',
      kind: 'case',
    },
  },
  {
    id: 'bm-design-engineering',
    order: 5,
    code: 'E',
    title: '设计工程学',
    subtitle: '把商业模式变成可测试的设计',
    level: 'advanced',
    anchorText: '《商业模式的经济解释 II》Ch1-Ch6',
    learningGoal: '能把商业模式假设拆成小实验、小任务和可观察证据。',
    concept: {
      title: '概念理解卡',
      description: '学习把不确定性变成可执行设计题。',
      kind: 'concept',
    },
    case: {
      title: '案例观察卡',
      description: '为真实项目设计一轮最小验证。',
      kind: 'case',
    },
  },
  {
    id: 'bm-accounting-finance',
    order: 6,
    code: 'F',
    title: '会计与财务',
    subtitle: '用财务语言校验商业模式',
    level: 'advanced',
    anchorText: '《商业模式的经济解释 II》Ch7-Ch8',
    learningGoal: '能从现金流、成本归集和关键比率反查模式问题。',
    concept: {
      title: '概念理解卡',
      description: '建立商业模式与财务结果之间的映射。',
      kind: 'concept',
    },
    case: {
      title: '案例观察卡',
      description: '用简化财务事实判断模式是否健康。',
      kind: 'case',
    },
  },
  {
    id: 'bm-platform',
    order: 7,
    code: 'G',
    title: '单边平台',
    subtitle: '处理平台、网络效应和启动问题',
    level: 'advanced',
    anchorText: '《商业模式的经济解释 II》Ch9',
    learningGoal: '能判断一个项目是否真的具备平台属性，以及启动侧在哪里。',
    concept: {
      title: '概念理解卡',
      description: '区分渠道、平台、生态和网络效应。',
      kind: 'concept',
    },
    case: {
      title: '案例观察卡',
      description: '用项目事实检查平台叙事是否成立。',
      kind: 'case',
    },
  },
];

export function getBusinessModelModule(moduleId: string): CubicBusinessModelModule | undefined {
  return C_CUBIC_BUSINESS_MODEL_MODULES.find((module) => module.id === moduleId);
}

export function getAvailableClassroomRefs() {
  return C_CUBIC_BUSINESS_MODEL_MODULES.flatMap((module) =>
    [module.concept, module.case]
      .filter((ref): ref is CubicClassroomRef & { classroomId: string } => Boolean(ref.classroomId))
      .map((ref) => ({
        courseId: C_CUBIC_BUSINESS_MODEL_COURSE_ID,
        moduleId: module.id,
        moduleCode: module.code,
        moduleTitle: module.title,
        step: ref.kind,
        classroomId: ref.classroomId,
        title: ref.title,
      })),
  );
}

export function getModuleCompletionPercent(completedSteps?: CubicLearningStep[]): number {
  if (!completedSteps?.length) return 0;
  const unique = new Set(completedSteps);
  const totalSteps: CubicLearningStep[] = ['concept', 'case'];
  const completed = totalSteps.filter((step) => unique.has(step)).length;
  return Math.round((completed / totalSteps.length) * 100);
}
