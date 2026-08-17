import type { QuizQuestion } from '@/lib/types/stage';
import type { QuestionResult } from '@/lib/quiz/grading';

export interface RemoteQuizGradeBody {
  success?: boolean;
  incorrectQuestionIds?: unknown;
  incorrectQuestionFeedback?: unknown;
  error?: unknown;
}

export interface MappedPlayerQuizGrade {
  passed: boolean;
  results: QuestionResult[];
  error?: string;
}

export function mapPlayerQuizGrade(
  questions: QuizQuestion[],
  responseOk: boolean,
  body: RemoteQuizGradeBody,
): MappedPlayerQuizGrade {
  const incorrectIds = Array.isArray(body.incorrectQuestionIds)
    ? body.incorrectQuestionIds.filter((value): value is string => typeof value === 'string')
    : null;
  const incorrect = new Set(incorrectIds ?? []);
  const feedback =
    body.incorrectQuestionFeedback && typeof body.incorrectQuestionFeedback === 'object'
      ? (body.incorrectQuestionFeedback as Record<string, unknown>)
      : {};

  return {
    passed:
      responseOk &&
      body.success === true &&
      incorrectIds !== null &&
      incorrectIds.length === 0,
    results: questions.map((question) => {
      const correct = incorrectIds !== null && !incorrect.has(question.id);
      return {
        questionId: question.id,
        correct,
        status: correct ? 'correct' : 'incorrect',
        earned: correct ? (question.points ?? 1) : 0,
        aiComment:
          typeof feedback[question.id] === 'string' ? (feedback[question.id] as string) : undefined,
      };
    }),
    error: typeof body.error === 'string' ? body.error : undefined,
  };
}
