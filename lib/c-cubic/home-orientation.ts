export type HomeOrientationStatus = 'draft' | 'awaiting_reply' | 'resolved' | 'attached';

export interface HomeOrientationMessage {
  role: 'learner' | 'professor';
  content: string;
}

export interface HomeOrientationDraft {
  id: string;
  learnerId: string;
  status: HomeOrientationStatus;
  recommendedCourseId?: 'business-model';
  initialMessages: HomeOrientationMessage[];
  createdAt: string;
  resolvedAt?: string;
}

const FALLBACK_QUESTION = '你现在最想通过这次学习解决哪个具体判断？';
const NON_SUBSTANTIVE = /^(?:不知道|不清楚|随便|都可以|没有|没想好|嗯|哦|好的)[。！!？?]*$/u;

export function normalizeHomeOrientationQuestion(text: string): string {
  const candidate = text.trim();
  const questionCount = candidate.match(/[?？]+/g)?.length ?? 0;
  return questionCount === 1 ? candidate : FALLBACK_QUESTION;
}

export function createHomeOrientationDraft(input: {
  id: string;
  learnerId: string;
  message: string;
  now: string;
}): HomeOrientationDraft {
  const message = input.message.trim();
  if (!message) throw new Error('Home orientation requires a learner message');
  return {
    id: input.id,
    learnerId: input.learnerId,
    status: 'draft',
    initialMessages: [{ role: 'learner', content: message }],
    createdAt: input.now,
  };
}

export function applyProfessorQuestion(
  draft: HomeOrientationDraft,
  question: string,
): HomeOrientationDraft {
  if (draft.status !== 'draft') return draft;
  return {
    ...draft,
    status: 'awaiting_reply',
    initialMessages: [
      ...draft.initialMessages,
      { role: 'professor', content: normalizeHomeOrientationQuestion(question) },
    ],
  };
}

export function completeHomeOrientation(
  draft: HomeOrientationDraft,
  reply: string,
  now: string,
): HomeOrientationDraft {
  const content = reply.trim();
  if (draft.status !== 'awaiting_reply') throw new Error('Home orientation is not awaiting reply');
  if (content.length < 10 || NON_SUBSTANTIVE.test(content)) {
    throw new Error('Home orientation requires a substantive learner reply');
  }
  return {
    ...draft,
    status: 'resolved',
    recommendedCourseId: 'business-model',
    initialMessages: [...draft.initialMessages, { role: 'learner', content }],
    resolvedAt: now,
  };
}
