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

const ORIENTATION_QUESTIONS: Record<
  Exclude<JiuxuangeOrientationPhase, 'problem' | 'complete'>,
  string
> = {
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

export function nextOrientationQuestion(state: JiuxuangeOrientationState): string | null {
  if (state.phase === 'problem' || state.phase === 'complete') return null;
  return ORIENTATION_QUESTIONS[state.phase];
}

export function shouldPromptOrientation(
  state: JiuxuangeOrientationState | undefined,
  messages: readonly { roleType: string }[],
): boolean {
  if (!state || state.phase === 'complete' || messages.length === 0) return false;
  return messages.at(-1)?.roleType === 'user';
}

function hasMeaningfulOrientationAnswer(content: string): boolean {
  const normalized = content.trim().replace(/\s+/g, ' ');
  const compact = normalized.replace(/[\s\p{P}\p{S}]/gu, '');
  return compact.length >= 8 && !FORMULAIC_REPLIES.has(normalized.toLowerCase());
}

export function advanceOrientationFromMessage(
  state: JiuxuangeOrientationState,
  message: OrientationLearnerMessage,
): JiuxuangeOrientationState {
  if (!hasMeaningfulOrientationAnswer(message.content)) return structuredClone(state);

  const evidenceMessageIds = appendUnique(state.evidenceMessageIds, [message.id]);
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
