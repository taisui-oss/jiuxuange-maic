import { describe, expect, it } from 'vitest';
import { gradeCaseOnlyQuiz } from '@/lib/jiuxuange/case-only/grading';
import type { QuizQuestion } from '@/lib/types/stage';

const questions: QuizQuestion[] = [
  {
    id: 'objective',
    type: 'single',
    question: 'Choose B',
    options: [
      { value: 'A', label: 'A' },
      { value: 'B', label: 'B' },
    ],
    answer: ['B'],
    analysis: 'B is required',
    points: 1,
    hasAnswer: true,
  },
  {
    id: 'open',
    type: 'short_answer',
    question: 'Reflect',
    answer: [],
    analysis: '',
    points: 0,
    hasAnswer: false,
  },
];

describe('case-only server grading', () => {
  it('requires every objective answer to be correct and every open answer to be non-empty', () => {
    expect(gradeCaseOnlyQuiz(questions, { objective: 'A', open: '  ' })).toEqual({
      passed: false,
      incorrectQuestionIds: ['objective', 'open'],
    });
    expect(gradeCaseOnlyQuiz(questions, { objective: 'B', open: '我的观点' })).toEqual({
      passed: true,
      incorrectQuestionIds: [],
    });
  });
});
