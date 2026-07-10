export type JiuxuangeQuestionPhase =
  | 'ground'
  | 'apply'
  | 'compare'
  | 'tension'
  | 'judge'
  | 'test'
  | 'reflect';

export type JiuxuangeRole = 'professor' | 'senior' | 'mystery' | 'growth-feedback';

export interface JiuxuangeRuntimeRole {
  id: string;
  name: string;
}

export interface JiuxuangeRuntimeMicrotask {
  id: string;
  status: string;
  jiuxuange?: {
    phase: JiuxuangeQuestionPhase;
    questionPrompt: string;
  };
}

export interface JiuxuangeRuntimeMilestone {
  id: string;
  status: string;
  microtasks: JiuxuangeRuntimeMicrotask[];
}

export interface JiuxuangeRuntimeProject {
  jiuxuange?: {
    courseVersion?: string;
  };
  roles: JiuxuangeRuntimeRole[];
  milestones: JiuxuangeRuntimeMilestone[];
}

export interface JiuxuangeRuntimeFact {
  id: string;
  text: string;
  visibility: 'learner' | 'coach_only';
  verificationStatus: 'draft' | 'verified' | 'rejected';
  sourceRef?: {
    verificationStatus?: 'draft' | 'verified' | 'rejected';
  };
}

export interface JiuxuangeRuntimeFactCollection {
  facts?: readonly JiuxuangeRuntimeFact[];
  cases?: Readonly<Record<string, { facts: readonly JiuxuangeRuntimeFact[] }>>;
}

const ROLE_BY_PHASE: Readonly<Record<JiuxuangeQuestionPhase, JiuxuangeRole>> = {
  ground: 'professor',
  apply: 'senior',
  compare: 'senior',
  tension: 'mystery',
  judge: 'mystery',
  test: 'senior',
  reflect: 'growth-feedback',
};

export function roleForJiuxuangePhase(phase: JiuxuangeQuestionPhase): JiuxuangeRole {
  return ROLE_BY_PHASE[phase];
}

export function getCurrentJiuxuangeMicrotask(
  project: JiuxuangeRuntimeProject,
): JiuxuangeRuntimeMicrotask | undefined {
  if (!project.jiuxuange) return undefined;
  return project.milestones
    .find((milestone) => milestone.status === 'active')
    ?.microtasks.find((microtask) => microtask.status === 'in_progress' && microtask.jiuxuange);
}

export const getJiuxuangeCurrentMicrotask = getCurrentJiuxuangeMicrotask;

function roleMatches(candidate: JiuxuangeRuntimeRole, role: JiuxuangeRole): boolean {
  return candidate.id === role || candidate.id === `jiuxuange-${role}`;
}

export function selectJiuxuangeRole(project: JiuxuangeRuntimeProject): JiuxuangeRuntimeRole {
  const phase = getCurrentJiuxuangeMicrotask(project)?.jiuxuange?.phase;
  const selected = phase ? roleForJiuxuangePhase(phase) : 'professor';
  const role = project.roles.find((candidate) => roleMatches(candidate, selected));
  if (!role) throw new Error(`Missing Jiuxuange role: ${selected}`);
  return role;
}

function collectFacts(
  source: readonly JiuxuangeRuntimeFact[] | JiuxuangeRuntimeFactCollection,
): JiuxuangeRuntimeFact[] {
  if (Array.isArray(source)) return [...source];
  const collection = source as JiuxuangeRuntimeFactCollection;
  if (collection.facts) return [...collection.facts];
  return Object.values(collection.cases ?? {}).flatMap((item) => [...item.facts]);
}

export function isVerifiedLearnerFact(fact: JiuxuangeRuntimeFact): boolean {
  return (
    fact.visibility === 'learner' &&
    fact.verificationStatus === 'verified' &&
    fact.sourceRef?.verificationStatus !== 'draft' &&
    fact.sourceRef?.verificationStatus !== 'rejected'
  );
}

export function buildJiuxuangeRuntimeBlock(
  project: JiuxuangeRuntimeProject,
  facts: readonly JiuxuangeRuntimeFact[] | JiuxuangeRuntimeFactCollection = [],
): string {
  if (!project.jiuxuange) return '';
  const microtask = getCurrentJiuxuangeMicrotask(project);
  if (!microtask?.jiuxuange?.questionPrompt.trim()) return '';

  const role = selectJiuxuangeRole(project);
  const allowedFacts = collectFacts(facts).filter(isVerifiedLearnerFact);
  const factLines = allowedFacts.length
    ? allowedFacts.map((fact) => `- [${fact.id}] ${fact.text}`)
    : ['- 本轮没有可引用的已核验学员可见事实。'];

  return [
    '## 九轩阁本轮运行约束',
    `本轮唯一可见角色：${role.name}`,
    `本轮唯一问题：${microtask.jiuxuange.questionPrompt.trim()}`,
    '本轮允许引用的事实：',
    ...factLines,
    '仅以上述一个角色发言，只向学员提出上述一个问题。',
    '不展示课程模块、阶段、评价维度或证据门槛。',
    '不直接说出或命名学员需要自己发现的矛盾。',
    '只能陈述上述已核验且学员可见的事实；缺少事实时不补写、不推断。',
  ].join('\n');
}

export function countLearnerFacingQuestions(text: string): number {
  const withoutCode = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  return withoutCode.match(/[?？]+/g)?.length ?? 0;
}

export function hasOneLearnerFacingQuestion(text: string): boolean {
  return countLearnerFacingQuestions(text) === 1;
}

export function enforceOneLearnerFacingQuestion(text: string): string {
  const count = countLearnerFacingQuestions(text);
  if (count !== 1) {
    throw new Error(`Expected exactly one learner-facing question, received ${count}`);
  }
  return text;
}

export const enforceSingleLearnerFacingQuestion = enforceOneLearnerFacingQuestion;

const UNSAFE_REPLY_PATTERNS = [
  /(?:你的|该项目的|这个案例的)(?:核心)?矛盾(?:是|在于)/u,
  /矛盾在于/u,
  /(?:矛盾发现卡|商模判断卡|反速通|评分维度|证据门槛|内部评分|隐藏评分)/u,
];

export function normalizeJiuxuangeReply(text: string, canonicalQuestion: string): string {
  const fallback = enforceOneLearnerFacingQuestion(canonicalQuestion.trim());
  const candidate = text.trim();
  if (
    countLearnerFacingQuestions(candidate) !== 1 ||
    UNSAFE_REPLY_PATTERNS.some((pattern) => pattern.test(candidate))
  ) {
    return fallback;
  }
  return candidate;
}
