'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, RotateCcw } from 'lucide-react';
import { SlideCanvas } from '@openmaic/renderer';
import type { QuizQuestion } from '@/lib/types/stage';
import type {
  CaseOnlyAnswers,
  CaseOnlyContentPackage,
  CaseOnlyProgressItem,
  CaseOnlySubmitBody,
} from '@/lib/jiuxuange/case-only/types';

interface QuizViewResult {
  passed: boolean;
  incorrectQuestionIds: string[];
  error?: string;
}

function LightweightQuiz({
  sceneId,
  questions,
  alreadyCompleted,
  onSubmit,
}: {
  sceneId: string;
  questions: QuizQuestion[];
  alreadyCompleted: boolean;
  onSubmit: (answers: CaseOnlyAnswers) => Promise<CaseOnlySubmitBody>;
}) {
  const [answers, setAnswers] = useState<CaseOnlyAnswers>({});
  const [result, setResult] = useState<QuizViewResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const allAnswered = questions.every((question) => {
    const answer = answers[question.id];
    return Array.isArray(answer) ? answer.length > 0 : Boolean(answer?.trim());
  });

  const setSingleAnswer = (questionId: string, value: string) => {
    setResult(null);
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const toggleMultipleAnswer = (questionId: string, value: string) => {
    setResult(null);
    setAnswers((current) => {
      const selected = new Set(Array.isArray(current[questionId]) ? current[questionId] : []);
      if (selected.has(value)) selected.delete(value);
      else selected.add(value);
      return { ...current, [questionId]: [...selected] };
    });
  };

  const submit = async () => {
    setSubmitting(true);
    const response = await onSubmit(answers);
    setSubmitting(false);
    if (response.success) {
      setResult({ passed: true, incorrectQuestionIds: [] });
      return;
    }
    setResult({
      passed: false,
      incorrectQuestionIds: response.incorrectQuestionIds ?? [],
      error: response.error,
    });
  };

  const retry = () => {
    setAnswers({});
    setResult(null);
  };

  return (
    <div
      className="h-full overflow-y-auto bg-white px-4 py-5 sm:px-8 sm:py-8"
      data-scene-id={sceneId}
    >
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 border-b border-slate-200 pb-4">
          <p className="text-xs font-medium text-cyan-700">必需互动</p>
          <h2 className="mt-1 text-xl font-semibold">完成知识检测</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            客观题需要全部答对；开放题提交即可完成。答错后可查看解释并重新作答。
          </p>
        </div>

        <div className="space-y-7">
          {questions.map((question, index) => (
            <fieldset key={question.id} className="border-0 p-0">
              <legend className="text-sm font-semibold leading-6 text-slate-900">
                {index + 1}. {question.question}
              </legend>
              {question.type === 'short_answer' ? (
                <textarea
                  aria-label={`第 ${index + 1} 题回答`}
                  value={(answers[question.id] as string | undefined) ?? ''}
                  onChange={(event) => setSingleAnswer(question.id, event.target.value)}
                  className="mt-3 min-h-28 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
                />
              ) : (
                <div className="mt-3 grid gap-2">
                  {question.options?.map((option) => {
                    const selected = Array.isArray(answers[question.id])
                      ? answers[question.id].includes(option.value)
                      : answers[question.id] === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        data-question-id={question.id}
                        data-option-value={option.value}
                        aria-pressed={selected}
                        onClick={() =>
                          question.type === 'multiple'
                            ? toggleMultipleAnswer(question.id, option.value)
                            : setSingleAnswer(question.id, option.value)
                        }
                        className={`flex min-h-11 items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                          selected
                            ? 'border-cyan-700 bg-cyan-50 text-cyan-950'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                        }`}
                      >
                        <span
                          className={`grid size-6 shrink-0 place-items-center rounded border text-xs ${
                            selected
                              ? 'border-cyan-700 bg-cyan-700 text-white'
                              : 'border-slate-300 text-slate-500'
                          }`}
                        >
                          {selected ? <Check className="size-3.5" /> : option.value}
                        </span>
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {result && result.incorrectQuestionIds.includes(question.id) && question.analysis && (
                <p className="mt-3 border-l-2 border-amber-400 pl-3 text-sm leading-6 text-slate-600">
                  {question.analysis}
                </p>
              )}
            </fieldset>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div aria-live="polite" className="text-sm">
            {(alreadyCompleted || result?.passed) && (
              <span className="inline-flex items-center gap-2 font-medium text-emerald-700">
                <CheckCircle2 className="size-4" />
                本轮互动已完成
              </span>
            )}
            {result && !result.passed && <span className="text-amber-700">{result.error}</span>}
          </div>
          {result && !result.passed && result.incorrectQuestionIds.length > 0 ? (
            <button
              type="button"
              onClick={retry}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-slate-50"
            >
              <RotateCcw className="size-4" />
              重新作答
            </button>
          ) : alreadyCompleted || result?.passed ? null : (
            <button
              type="button"
              disabled={!allAnswered || submitting}
              onClick={submit}
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? '正在提交' : '提交答案'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function LightweightCasePlayer({
  content,
  initialProgress,
}: {
  content: CaseOnlyContentPackage;
  initialProgress: CaseOnlyProgressItem;
}) {
  const scenes = content.classroom.scenes;
  const [progress, setProgress] = useState(initialProgress);
  const [sceneIndex, setSceneIndex] = useState(
    Math.min(initialProgress.nextSceneIndex, scenes.length - 1),
  );
  const [completed, setCompleted] = useState(initialProgress.status === 'completed');
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const scene = scenes[sceneIndex];
  const isQuiz = scene?.type === 'quiz' && scene.content.type === 'quiz';
  const sceneRecorded = sceneIndex < progress.nextSceneIndex || progress.status === 'completed';
  const quizPassed = !isQuiz || sceneRecorded;
  const progressPercent = useMemo(
    () => Math.round((progress.nextSceneIndex / scenes.length) * 100),
    [progress.nextSceneIndex, scenes.length],
  );

  const submitCurrentScene = async (answers?: CaseOnlyAnswers): Promise<CaseOnlySubmitBody> => {
    if (sceneRecorded) {
      return { success: true, replayed: true, progress };
    }
    setSubmitting(true);
    setSubmissionError(null);
    const idempotencyKey = crypto.randomUUID();
    const payload = {
      caseId: content.lesson.id,
      contentVersion: content.contentVersion,
      progressVersion: progress.progressVersion,
      sceneId: scene.id,
      ...(answers ? { answers } : {}),
    };

    let lastError = '无法连接进度服务，请重试。';
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await fetch('/api/jiuxuange/case-only/progress/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(payload),
        });
        const body = (await response.json()) as CaseOnlySubmitBody;
        if (body.success) {
          setProgress(body.progress);
          setSubmitting(false);
          return body;
        }
        if (body.progress) setProgress(body.progress);
        lastError = body.error;
        setSubmissionError(lastError);
        setSubmitting(false);
        return body;
      } catch {
        if (attempt === 1) break;
      }
    }
    setSubmitting(false);
    setSubmissionError(lastError);
    return { success: false, errorCode: 'INVALID_REQUEST', error: lastError };
  };

  const goNext = async () => {
    if (isQuiz && !quizPassed) return;
    if (!sceneRecorded) {
      const result = await submitCurrentScene();
      if (!result.success) return;
    }
    if (sceneIndex === scenes.length - 1) {
      setCompleted(true);
      return;
    }
    setSceneIndex((current) => current + 1);
  };

  const goPrevious = () => {
    if (completed) {
      setCompleted(false);
      setSceneIndex(scenes.length - 1);
      return;
    }
    setSceneIndex((current) => Math.max(0, current - 1));
  };

  return (
    <main className="flex min-h-dvh flex-col bg-[#eef2f7] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6">
          <Link
            href="/courses/business-model"
            aria-label="返回案例目录"
            title="返回案例目录"
            className="grid size-9 shrink-0 place-items-center rounded-md text-slate-600 hover:bg-slate-100"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-slate-500">商业模式大课 · 案例学习</div>
            <h1 className="truncate text-sm font-semibold sm:text-base">{content.lesson.title}</h1>
          </div>
          <div className="shrink-0 text-xs tabular-nums text-slate-500">
            {completed ? scenes.length : sceneIndex + 1} / {scenes.length}
          </div>
        </div>
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-cyan-600 transition-[width] duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      <section
        className="flex min-h-0 flex-1 flex-col"
        aria-label="案例播放器"
        data-scene-id={completed ? undefined : scene.id}
      >
        {completed ? (
          <div className="flex flex-1 items-center justify-center px-5 py-12">
            <div className="w-full max-w-xl text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="size-8" />
              </span>
              <p className="mt-5 text-sm font-medium text-emerald-700">案例学习完成</p>
              <h2 className="mt-2 text-2xl font-semibold">{content.lesson.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                你已完成全部场景和必需互动。返回课程目录查看下一案例。
              </p>
              <Link
                href="/courses/business-model"
                className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-5 text-sm font-medium text-white hover:bg-slate-800"
              >
                返回案例目录
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 px-3 py-3 sm:px-6 sm:py-5">
              <div className="mx-auto h-full max-w-6xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
                {scene.type === 'slide' && scene.content.type === 'slide' ? (
                  <div className="flex h-full min-h-[320px] items-center justify-center bg-slate-100 p-2 sm:p-5">
                    <div className="aspect-video w-full max-w-[1200px] overflow-hidden bg-white shadow-sm">
                      <SlideCanvas slide={scene.content.canvas} chrome={false} />
                    </div>
                  </div>
                ) : scene.type === 'quiz' && scene.content.type === 'quiz' ? (
                  <LightweightQuiz
                    key={scene.id}
                    sceneId={scene.id}
                    questions={scene.content.questions}
                    alreadyCompleted={sceneRecorded}
                    onSubmit={submitCurrentScene}
                  />
                ) : (
                  <div className="grid h-full place-items-center p-8 text-sm text-slate-600">
                    当前候选播放器不支持该场景类型。
                  </div>
                )}
              </div>
            </div>

            <footer className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
              <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
                <button
                  type="button"
                  title="上一场景"
                  aria-label="上一场景"
                  disabled={sceneIndex === 0}
                  onClick={goPrevious}
                  className="grid size-10 place-items-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="min-w-0 flex-1 text-center">
                  <div className="truncate text-sm font-medium">{scene.title}</div>
                  {isQuiz && !quizPassed && (
                    <div className="mt-0.5 text-xs text-amber-700">完成本轮互动后继续</div>
                  )}
                  {submissionError && !isQuiz && (
                    <div className="mt-0.5 truncate text-xs text-rose-700" role="alert">
                      {submissionError}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  title={sceneIndex === scenes.length - 1 ? '完成案例' : '下一场景'}
                  aria-label={sceneIndex === scenes.length - 1 ? '完成案例' : '下一场景'}
                  disabled={!quizPassed || submitting}
                  onClick={goNext}
                  className="grid size-10 place-items-center rounded-md bg-slate-950 text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {sceneIndex === scenes.length - 1 ? (
                    <Check className="size-4" />
                  ) : (
                    <ArrowRight className="size-4" />
                  )}
                </button>
              </div>
            </footer>
          </>
        )}
      </section>
      <span className="sr-only" data-content-version={content.contentVersion}>
        内容版本 {content.contentVersion}
      </span>
      <span className="sr-only" data-progress-version={progress.progressVersion}>
        进度版本 {progress.progressVersion}
      </span>
    </main>
  );
}
