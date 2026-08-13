import type { QuizQuestion } from '@/lib/types/stage';
import type { CaseOnlyAnswers } from './types';
import { arraysEqual, toArray } from '@/lib/quiz/grading';

export interface CaseOnlyGradeResult {
  passed: boolean;
  incorrectQuestionIds: string[];
}

export function gradeCaseOnlyQuiz(
  questions: QuizQuestion[],
  answers: CaseOnlyAnswers,
): CaseOnlyGradeResult {
  const incorrectQuestionIds = questions.flatMap((question) => {
    const answer = answers[question.id];
    if (question.type === 'short_answer') {
      return typeof answer === 'string' && answer.trim().length > 0 ? [] : [question.id];
    }
    return arraysEqual(toArray(answer), toArray(question.answer)) ? [] : [question.id];
  });

  return {
    passed: incorrectQuestionIds.length === 0,
    incorrectQuestionIds,
  };
}
