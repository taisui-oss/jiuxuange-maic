import { describe, expect, it } from 'vitest';
import {
  NATIVE_CLASSROOM_PROGRESS_VERSION,
  buildNativeClassroomCompletion,
  isNativeClassroomPassed,
  parseNativeClassroomProgress,
} from '@/lib/jiuxuange/native-classroom-progress';

describe('Jiuxuange native classroom progress', () => {
  it('marks a classroom complete when it has no gradeable objective questions', () => {
    const record = buildNativeClassroomCompletion({
      classroomId: 'classroom-1',
      quiz: null,
      completedAt: '2026-07-27T08:00:00.000Z',
    });

    expect(record).toEqual({
      version: NATIVE_CLASSROOM_PROGRESS_VERSION,
      classroomId: 'classroom-1',
      completedAt: '2026-07-27T08:00:00.000Z',
      quizCorrect: 0,
      quizTotal: 0,
      passed: true,
    });
  });

  it('requires every gradeable objective question to be correct', () => {
    expect(
      isNativeClassroomPassed({
        countsByType: { quiz: 1 },
        quiz: { correct: 1, total: 2, pct: 50 },
      }),
    ).toBe(false);
    expect(
      isNativeClassroomPassed({
        countsByType: { quiz: 1 },
        quiz: { correct: 2, total: 2, pct: 100 },
      }),
    ).toBe(true);
  });

  it('rejects malformed or failed progress records', () => {
    expect(parseNativeClassroomProgress('{')).toEqual({});
    expect(
      parseNativeClassroomProgress(
        JSON.stringify({
          broken: {
            version: NATIVE_CLASSROOM_PROGRESS_VERSION,
            classroomId: 'broken',
            completedAt: 'not-a-date',
            quizCorrect: 0,
            quizTotal: 2,
            passed: false,
          },
        }),
      ),
    ).toEqual({});
  });
});
