import { describe, expect, test } from 'vitest';
import { mapPlayerQuizGrade } from '@/lib/jiuxuange/player/quiz-grade';
import type { QuizQuestion } from '@/lib/types/stage';

const questions: QuizQuestion[] = [
  {
    id: 'q1',
    type: 'single_choice',
    question: 'Question one',
    options: ['A', 'B'],
    answer: [],
    points: 20,
  },
  {
    id: 'q2',
    type: 'single_choice',
    question: 'Question two',
    options: ['A', 'B'],
    answer: [],
    points: 20,
  },
];

describe('player remote quiz grade mapping', () => {
  test('keeps correctly answered questions correct on a failed attempt', () => {
    const grade = mapPlayerQuizGrade(questions, false, {
      success: false,
      incorrectQuestionIds: ['q2'],
      incorrectQuestionFeedback: { q2: 'Review the causal chain.' },
    });

    expect(grade.passed).toBe(false);
    expect(grade.results).toEqual([
      expect.objectContaining({ questionId: 'q1', correct: true, earned: 20 }),
      expect.objectContaining({
        questionId: 'q2',
        correct: false,
        earned: 0,
        aiComment: 'Review the causal chain.',
      }),
    ]);
  });

  test('does not infer correctness from malformed or conflicting responses', () => {
    const grade = mapPlayerQuizGrade(questions, true, { success: true });
    expect(grade.passed).toBe(false);
    expect(grade.results.every((result) => result.correct === false)).toBe(true);
  });

  test('accepts the explicit answer-free success contract', () => {
    const grade = mapPlayerQuizGrade(questions, true, {
      success: true,
      incorrectQuestionIds: [],
    });
    expect(grade.passed).toBe(true);
    expect(grade.results.every((result) => result.correct === true)).toBe(true);
  });
});
