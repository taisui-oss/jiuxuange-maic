import type { CompleteSummary } from '@/lib/classroom/complete-summary';

export const NATIVE_CLASSROOM_PROGRESS_VERSION = 1;
export const NATIVE_CLASSROOM_PROGRESS_KEY = 'jiuxuange:native-classroom-progress:v1';
export const NATIVE_CLASSROOM_PROGRESS_EVENT = 'jiuxuange:native-classroom-progress';

export interface NativeClassroomCompletion {
  version: typeof NATIVE_CLASSROOM_PROGRESS_VERSION;
  classroomId: string;
  completedAt: string;
  quizCorrect: number;
  quizTotal: number;
  passed: true;
}

export type NativeClassroomProgress = Record<string, NativeClassroomCompletion>;

interface StorageReader {
  getItem(key: string): string | null;
}

interface StorageWriter extends StorageReader {
  setItem(key: string, value: string): void;
}

function isValidCompletion(value: unknown): value is NativeClassroomCompletion {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<NativeClassroomCompletion>;
  return (
    candidate.version === NATIVE_CLASSROOM_PROGRESS_VERSION &&
    typeof candidate.classroomId === 'string' &&
    candidate.classroomId.length > 0 &&
    typeof candidate.completedAt === 'string' &&
    !Number.isNaN(Date.parse(candidate.completedAt)) &&
    Number.isInteger(candidate.quizCorrect) &&
    Number.isInteger(candidate.quizTotal) &&
    (candidate.quizCorrect ?? -1) >= 0 &&
    (candidate.quizTotal ?? -1) >= 0 &&
    candidate.quizCorrect === candidate.quizTotal &&
    candidate.passed === true
  );
}

export function parseNativeClassroomProgress(raw: string | null): NativeClassroomProgress {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const validEntries = Object.entries(parsed).filter(
      ([classroomId, value]) => isValidCompletion(value) && value.classroomId === classroomId,
    ) as Array<[string, NativeClassroomCompletion]>;
    return Object.fromEntries(validEntries);
  } catch {
    return {};
  }
}

export function readNativeClassroomProgress(
  storage: StorageReader | null = typeof window === 'undefined' ? null : window.localStorage,
): NativeClassroomProgress {
  if (!storage) return {};
  try {
    return parseNativeClassroomProgress(storage.getItem(NATIVE_CLASSROOM_PROGRESS_KEY));
  } catch {
    return {};
  }
}

export function isNativeClassroomPassed(summary: CompleteSummary): boolean {
  return summary.quiz === null || summary.quiz.correct === summary.quiz.total;
}

export function buildNativeClassroomCompletion(input: {
  classroomId: string;
  quiz: CompleteSummary['quiz'];
  completedAt?: string;
}): NativeClassroomCompletion {
  const quizCorrect = input.quiz?.correct ?? 0;
  const quizTotal = input.quiz?.total ?? 0;
  if (quizCorrect !== quizTotal) {
    throw new Error('Native classroom completion requires every objective question to be correct');
  }
  return {
    version: NATIVE_CLASSROOM_PROGRESS_VERSION,
    classroomId: input.classroomId,
    completedAt: input.completedAt ?? new Date().toISOString(),
    quizCorrect,
    quizTotal,
    passed: true,
  };
}

export function recordNativeClassroomCompletion(
  input: {
    classroomId: string;
    quiz: CompleteSummary['quiz'];
    completedAt?: string;
  },
  storage: StorageWriter | null = typeof window === 'undefined' ? null : window.localStorage,
): NativeClassroomCompletion | null {
  if (!storage) return null;
  const record = buildNativeClassroomCompletion(input);
  const current = readNativeClassroomProgress(storage);
  const existing = current[input.classroomId];
  if (
    existing &&
    existing.quizCorrect === record.quizCorrect &&
    existing.quizTotal === record.quizTotal
  ) {
    return existing;
  }

  storage.setItem(
    NATIVE_CLASSROOM_PROGRESS_KEY,
    JSON.stringify({ ...current, [input.classroomId]: record }),
  );
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(NATIVE_CLASSROOM_PROGRESS_EVENT, {
        detail: { classroomId: input.classroomId },
      }),
    );
  }
  return record;
}
