export type JiuxuangeOrientationPhase =
  | 'problem'
  | 'baseline'
  | 'goal'
  | 'assessment_contract'
  | 'complete';

export interface JiuxuangeOrientationState {
  phase: JiuxuangeOrientationPhase;
  problemDefined: boolean;
  baselineCaptured: boolean;
  goalConfirmed: boolean;
  assessmentUnderstood: boolean;
  evidenceMessageIds: string[];
  attachedDraftIds: string[];
  completedAt?: string;
  formalOpeningDeliveredAt?: string;
}

export interface JiuxuangeOrientationMessage {
  id: string;
  agentId?: 'jiuxuange-professor';
  roleType: 'user' | 'instructor';
  content: string;
  ts: string;
}

export interface AttachHomeOrientationArgs {
  state: JiuxuangeOrientationState;
  draftId: string;
  messages: readonly JiuxuangeOrientationMessage[];
  existingMessageIds: readonly string[];
  now: string;
}

export interface AttachHomeOrientationResult {
  draftId: string;
  state: JiuxuangeOrientationState;
  messages: JiuxuangeOrientationMessage[];
}

export interface OrientationLearnerMessage {
  id: string;
  content: string;
  now: string;
}

const ORIENTATION_QUESTIONS: Record<Exclude<JiuxuangeOrientationPhase, 'complete'>, string> = {
  problem: '先带着一个真实问题开始：你现在最想通过这门课解决哪个具体的商业判断？',
  baseline: '不看教材的话，你现在会怎样判断一家企业的商业模式是否成立？',
  goal: '完成这门课后，你希望自己能独立完成什么样的商业模式判断？',
  assessment_contract: '到课程结束时，你准备用哪些事实、推理和反证来证明自己的判断？',
};

const FORMULAIC_REPLIES = new Set([
  '好',
  '好的',
  '嗯',
  '嗯嗯',
  'ok',
  '收到',
  '知道了',
  '不知道',
  '随便',
  '都行',
  '同意',
  '可以',
  '是',
  '否',
]);

export function createOrientationState(): JiuxuangeOrientationState {
  return {
    phase: 'problem',
    problemDefined: false,
    baselineCaptured: false,
    goalConfirmed: false,
    assessmentUnderstood: false,
    evidenceMessageIds: [],
    attachedDraftIds: [],
  };
}

function appendUnique(values: readonly string[], additions: readonly string[]): string[] {
  return [...new Set([...values, ...additions])];
}

export function attachHomeOrientation(
  args: AttachHomeOrientationArgs,
): AttachHomeOrientationResult {
  if (args.state.attachedDraftIds.includes(args.draftId)) {
    return { draftId: args.draftId, state: structuredClone(args.state), messages: [] };
  }
  if (
    args.messages.length !== 3 ||
    args.messages[0]?.roleType !== 'user' ||
    args.messages[1]?.roleType !== 'instructor' ||
    args.messages[2]?.roleType !== 'user'
  ) {
    throw new Error('Home orientation must contain learner, professor, learner messages');
  }

  const existingIds = new Set(args.existingMessageIds);
  const messages = args.messages.filter((message) => !existingIds.has(message.id));
  const learnerEvidenceIds = args.messages
    .filter((message) => message.roleType === 'user')
    .map((message) => message.id);

  return {
    draftId: args.draftId,
    messages: messages.map((message) => ({ ...message })),
    state: {
      ...args.state,
      phase: 'baseline',
      problemDefined: true,
      evidenceMessageIds: appendUnique(args.state.evidenceMessageIds, learnerEvidenceIds),
      attachedDraftIds: appendUnique(args.state.attachedDraftIds, [args.draftId]),
    },
  };
}

function retryOrientationQuestion(
  state: JiuxuangeOrientationState,
  learnerMessage: string,
  retryAttempt: number,
): string | null {
  const normalized = learnerMessage.trim().replace(/\s+/g, ' ');
  if (!normalized) return null;
  const repeatedQuestionComplaint = /(?:问过|重复|刚才问|又问|说过了)/u.test(normalized);

  if (state.phase === 'problem') {
    if (repeatedQuestionComplaint) {
      return '你说得对，我换个入口：你家的项目现在哪一个变化最让你拿不准？';
    }
    return '先不用完整定义问题。眼下最困扰你的，是客户减少、收入下降，还是原有做法开始失效？';
  }

  if (state.phase === 'baseline') {
    if (repeatedQuestionComplaint) {
      return '你说得对，我换个问法：以你家的项目为例，什么事实会让你判断现在的赚钱方式已经不可持续？';
    }
    if (/(?:赚钱|盈利|利润|收入)/u.test(normalized)) {
      return '赚钱是结果。你会先看哪一组事实，来判断这种赚钱方式能不能持续？';
    }
    return '先不用下结论。你会优先核对哪一条事实，再判断这个商业模式是否成立？';
  }
  if (state.phase === 'goal') {
    if (/^(?:不知道|不清楚|没想好|没有想法)$/u.test(normalized)) {
      return retryAttempt >= 2
        ? '我先给你一个可以修改的临时目标：用事实判断原有客户与渠道为什么失效，并比较两条转型路径。你愿意先用这个目标开始吗？'
        : '不知道也可以。就你家的项目，你更想先学会判断“继续原有客户与渠道”，还是“换一种客户与交易方式”？';
    }
    return repeatedQuestionComplaint
      ? '你说得对，我换个问法：课程结束后，你希望自己能独立做出哪个现在还做不出的判断？'
      : '把目标再落具体一点：课程结束后，你希望能独立完成哪个商业判断？';
  }
  if (state.phase === 'assessment_contract') {
    return repeatedQuestionComplaint
      ? '你说得对，我换个问法：什么证据会让你愿意修改自己的最终判断？'
      : '为了让结论可以被检验，你准备保留哪一种可能推翻它的证据？';
  }
  return null;
}

export function nextOrientationQuestion(
  state: JiuxuangeOrientationState,
  learnerMessage?: string,
  retryAttempt = 1,
): string | null {
  if (state.phase === 'complete') return null;
  if (learnerMessage) {
    const retry = retryOrientationQuestion(state, learnerMessage, retryAttempt);
    if (retry) return retry;
  }
  return ORIENTATION_QUESTIONS[state.phase];
}

export function shouldPromptOrientation(
  state: JiuxuangeOrientationState | undefined,
  messages: readonly { roleType: string; content?: string }[],
): boolean {
  if (!state || state.phase === 'complete' || messages.length === 0) return false;
  const latest = messages.at(-1);
  if (latest?.roleType === 'user') return true;

  const previous = messages.at(-2);
  const canonicalQuestion = nextOrientationQuestion(state);
  const latestText = latest?.content?.trim() ?? '';
  const duplicatedEarlier = messages
    .slice(0, -2)
    .some((message) => message.roleType === 'instructor' && message.content?.trim() === latestText);
  const legacyEmptyFallback =
    latestText.startsWith('刚才的回复没有完整生成。') ||
    latestText.startsWith('导师本轮没有产生新的内容。');
  return Boolean(
    latest?.roleType === 'instructor' &&
    previous?.roleType === 'user' &&
    ((canonicalQuestion &&
      latestText === canonicalQuestion &&
      /(?:问过|重复|刚才问|又问|说过了)/u.test(previous.content?.trim() ?? '')) ||
      (duplicatedEarlier && !hasMeaningfulOrientationAnswer(previous.content ?? '')) ||
      legacyEmptyFallback),
  );
}

function hasMeaningfulOrientationAnswer(content: string): boolean {
  const normalized = content.trim().replace(/\s+/g, ' ');
  const compact = normalized.replace(/[\s\p{P}\p{S}]/gu, '');
  const asksForGuidance = /不(?:知道|清楚|确定).*(?:引导|提示)/u.test(normalized);
  return (
    compact.length >= 8 && !FORMULAIC_REPLIES.has(normalized.toLowerCase()) && !asksForGuidance
  );
}

export function advanceOrientationFromMessage(
  state: JiuxuangeOrientationState,
  message: OrientationLearnerMessage,
): JiuxuangeOrientationState {
  if (!hasMeaningfulOrientationAnswer(message.content)) return structuredClone(state);

  const evidenceMessageIds = appendUnique(state.evidenceMessageIds, [message.id]);
  if (state.phase === 'problem') {
    return { ...state, phase: 'baseline', problemDefined: true, evidenceMessageIds };
  }
  if (state.phase === 'baseline') {
    return { ...state, phase: 'goal', baselineCaptured: true, evidenceMessageIds };
  }
  if (state.phase === 'goal') {
    return { ...state, phase: 'assessment_contract', goalConfirmed: true, evidenceMessageIds };
  }
  if (state.phase === 'assessment_contract') {
    return {
      ...state,
      phase: 'complete',
      assessmentUnderstood: true,
      evidenceMessageIds,
      completedAt: state.completedAt ?? message.now,
    };
  }
  return { ...state, evidenceMessageIds };
}
