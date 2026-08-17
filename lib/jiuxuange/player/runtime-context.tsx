'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { PENDING_SCENE_ID, useStageStore } from '@/lib/store/stage';
import type { QuizQuestion } from '@/lib/types/stage';
import type { QuestionResult } from '@/lib/quiz/grading';
import type { CaseOnlyAnswers, CaseOnlyProgressItem } from '@/lib/jiuxuange/case-only/types';

export interface PlayerQuizGradeResult {
  passed: boolean;
  results: QuestionResult[];
  revealedAnswers: Record<string, string[]>;
  error?: string;
}

interface PlayerRuntimeContextValue {
  packageId: string;
  contentVersion: string;
  progress: CaseOnlyProgressItem;
  backHref: string;
  chatEndpoint: string;
  requestSceneChange: (currentSceneId: string | null, targetSceneId: string) => Promise<boolean>;
  gradeQuiz: (
    sceneId: string,
    questions: QuizQuestion[],
    answers: CaseOnlyAnswers,
  ) => Promise<PlayerQuizGradeResult>;
}

const PlayerRuntimeContext = createContext<PlayerRuntimeContextValue | null>(null);

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function PlayerRuntimeProvider({
  packageId,
  contentVersion,
  initialProgress,
  backHref,
  children,
}: {
  packageId: string;
  contentVersion: string;
  initialProgress: CaseOnlyProgressItem;
  backHref: string;
  children: ReactNode;
}) {
  const [progress, setProgress] = useState(initialProgress);

  const submitProgress = useCallback(
    async (sceneId: string) => {
      const response = await fetch('/api/player/progress/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({
          packageId,
          contentVersion,
          progressVersion: progress.progressVersion,
          sceneId,
        }),
      });
      const body = await readJson(response);
      if (body.progress) setProgress(body.progress as CaseOnlyProgressItem);
      return response.ok && body.success === true
        ? (body.progress as CaseOnlyProgressItem)
        : null;
    },
    [contentVersion, packageId, progress.progressVersion],
  );

  const requestSceneChange = useCallback(
    async (currentSceneId: string | null, targetSceneId: string): Promise<boolean> => {
      const { scenes } = useStageStore.getState();
      const currentIndex = scenes.findIndex((scene) => scene.id === currentSceneId);
      const targetIndex =
        targetSceneId === PENDING_SCENE_ID
          ? scenes.length
          : scenes.findIndex((scene) => scene.id === targetSceneId);
      if (targetIndex < 0) return false;
      if (targetIndex <= progress.nextSceneIndex) return true;
      if (currentIndex !== progress.nextSceneIndex || targetIndex !== currentIndex + 1) return false;
      const currentScene = scenes[currentIndex];
      if (!currentScene || currentScene.type === 'quiz') return false;
      const updated = await submitProgress(currentScene.id);
      return Boolean(updated && targetIndex <= updated.nextSceneIndex);
    },
    [progress.nextSceneIndex, submitProgress],
  );

  const gradeQuiz = useCallback(
    async (
      sceneId: string,
      questions: QuizQuestion[],
      answers: CaseOnlyAnswers,
    ): Promise<PlayerQuizGradeResult> => {
      const response = await fetch(
        `/api/player/interactions/${encodeURIComponent(sceneId)}/attempts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': crypto.randomUUID(),
          },
          body: JSON.stringify({
            packageId,
            contentVersion,
            progressVersion: progress.progressVersion,
            answers,
          }),
        },
      );
      const body = await readJson(response);
      if (body.progress) setProgress(body.progress as CaseOnlyProgressItem);
      const incorrect = new Set(
        Array.isArray(body.incorrectQuestionIds)
          ? (body.incorrectQuestionIds as string[])
          : [],
      );
      const feedback = (body.incorrectQuestionFeedback ?? {}) as Record<string, string>;
      const results: QuestionResult[] = questions.map((question) => {
        const correct = !incorrect.has(question.id) && response.ok;
        return {
          questionId: question.id,
          correct,
          status: correct ? 'correct' : 'incorrect',
          earned: correct ? (question.points ?? 1) : 0,
          aiComment: feedback[question.id],
        };
      });
      return {
        passed: response.ok && body.success === true,
        results,
        revealedAnswers: (body.revealedAnswers ?? {}) as Record<string, string[]>,
        error: typeof body.error === 'string' ? body.error : undefined,
      };
    },
    [contentVersion, packageId, progress.progressVersion],
  );

  const value = useMemo<PlayerRuntimeContextValue>(
    () => ({
      packageId,
      contentVersion,
      progress,
      backHref,
      chatEndpoint: '/api/player/chat',
      requestSceneChange,
      gradeQuiz,
    }),
    [backHref, contentVersion, gradeQuiz, packageId, progress, requestSceneChange],
  );

  return <PlayerRuntimeContext.Provider value={value}>{children}</PlayerRuntimeContext.Provider>;
}

export function useOptionalPlayerRuntime(): PlayerRuntimeContextValue | null {
  return useContext(PlayerRuntimeContext);
}
