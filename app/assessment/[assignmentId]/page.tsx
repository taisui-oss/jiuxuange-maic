'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, LoaderCircle, Save, Send, ShieldCheck } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type {
  AssessmentAttempt,
  AssessmentSession,
  ProjectCardVersion,
} from '@/lib/jiuxuange/portal/types';

interface AssessmentDetail {
  session: AssessmentSession;
  projectCard?: ProjectCardVersion;
  attempts: AssessmentAttempt[];
}

interface ApiResponse {
  success: boolean;
  detail?: AssessmentDetail;
  session?: AssessmentSession;
  attempt?: AssessmentAttempt;
  error?: string;
}

export default function AssessmentPage() {
  const params = useParams<{ assignmentId: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'load' | 'save' | 'submit' | null>('load');
  const [error, setError] = useState<string | null>(null);
  const lastInteractionRef = useRef(Date.now());

  const loadAssessment = useCallback(async () => {
    setBusy('load');
    setError(null);
    try {
      const response = await fetch(`/api/jiuxuange/assessment/${params.assignmentId}`, {
        method: 'POST',
      });
      const body = (await response.json()) as ApiResponse;
      if (!response.ok || !body.detail) throw new Error(body.error ?? '无法进入测评');
      setDetail(body.detail);
      setAnswers(body.detail.session.draftAnswers);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '无法进入测评');
    } finally {
      setBusy(null);
    }
  }, [params.assignmentId]);

  useEffect(() => {
    void loadAssessment();
  }, [loadAssessment]);

  useEffect(() => {
    const markInteraction = () => {
      lastInteractionRef.current = Date.now();
    };
    const events = ['keydown', 'pointerdown', 'input'] as const;
    events.forEach((event) => window.addEventListener(event, markInteraction, { passive: true }));
    const interval = window.setInterval(() => {
      void fetch('/api/jiuxuange/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: 'assessment',
          visible: document.visibilityState === 'visible',
          secondsSinceInteraction: Math.floor((Date.now() - lastInteractionRef.current) / 1000),
          intervalSeconds: 30,
        }),
        keepalive: true,
      });
    }, 30_000);
    return () => {
      events.forEach((event) => window.removeEventListener(event, markInteraction));
      window.clearInterval(interval);
    };
  }, []);

  async function persist(action: 'save_draft' | 'submit') {
    if (!detail) return;
    setBusy(action === 'submit' ? 'submit' : 'save');
    setError(null);
    try {
      const response = await fetch(
        `/api/jiuxuange/assessment/session/${detail.session.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, answers }),
        },
      );
      const body = (await response.json()) as ApiResponse;
      if (!response.ok || !body.session) throw new Error(body.error ?? '保存失败');
      setDetail((current) =>
        current
          ? {
              ...current,
              session: body.session!,
              attempts: body.attempt
                ? [...current.attempts, body.attempt]
                : current.attempts,
            }
          : current,
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '保存失败');
    } finally {
      setBusy(null);
    }
  }

  if (busy === 'load' && !detail) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 text-white">
        <LoaderCircle className="size-7 animate-spin" />
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">暂时无法进入测评</h1>
          <p className="mt-3 text-sm text-slate-400">{error}</p>
          <Button className="mt-6" onClick={() => router.push('/')}>
            返回学习门户
          </Button>
        </div>
      </main>
    );
  }

  const locked = detail.session.status === 'locked';
  const attemptsUsed = detail.session.attemptIds.length;
  const latestFeedback = detail.attempts.at(-1)?.feedback;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            学习门户
          </button>
          <div className="text-right">
            <div className="text-sm font-medium">商业模式个人项目测评</div>
            <div className="text-xs text-slate-400">
              已正式提交 {attemptsUsed}/2 · 草稿不消耗机会
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="assessment-title">
          <div className="mb-8">
            <div className="mb-2 flex items-center gap-2 text-xs text-violet-300">
              <ShieldCheck className="size-4" />
              项目卡已冻结 · v{detail.projectCard?.version}
            </div>
            <h1 id="assessment-title" className="text-2xl font-semibold">
              {detail.projectCard?.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              请独立形成判断。第一次提交只获得方向性反馈；第二次用于检验你的判断修正。
            </p>
          </div>

          <div className="space-y-8">
            {detail.session.questions.map((question, index) => (
              <div key={question.id} className="border-t border-white/10 pt-6">
                <label htmlFor={question.id} className="block text-base font-medium leading-7">
                  <span className="mr-2 text-violet-300">{index + 1}.</span>
                  {question.prompt}
                </label>
                <textarea
                  id={question.id}
                  value={answers[question.id] ?? ''}
                  disabled={locked}
                  onChange={(event) =>
                    setAnswers((current) => ({
                      ...current,
                      [question.id]: event.target.value,
                    }))
                  }
                  rows={5}
                  className="mt-3 w-full resize-y rounded-md border border-white/10 bg-slate-900 px-4 py-3 text-sm leading-6 outline-none transition focus:border-violet-400 disabled:opacity-60"
                  placeholder="写下你的判断、项目事实、因果依据和可能的反证条件。"
                />
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-6 rounded-md border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row">
            {!locked && (
              <>
                <Button
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => void persist('save_draft')}
                  className="gap-2 border-white/20 bg-transparent text-white hover:bg-white/10"
                >
                  {busy === 'save' ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  保存草稿
                </Button>
                <Button
                  disabled={busy !== null}
                  onClick={() => void persist('submit')}
                  className="gap-2 bg-violet-600 text-white hover:bg-violet-500"
                >
                  {busy === 'submit' ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  正式提交第 {attemptsUsed + 1} 次
                </Button>
              </>
            )}
            {locked && (
              <div className="inline-flex items-center gap-2 text-sm text-emerald-300">
                <CheckCircle2 className="size-5" />
                两次提交已完成，本次测评已锁定
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="border-t border-cyan-400/40 pt-4">
            <h2 className="text-sm font-semibold">项目事实</h2>
            <div className="mt-3 space-y-3">
              {detail.projectCard?.facts.map((fact) => (
                <div key={fact.id}>
                  <p className="text-sm leading-6 text-slate-300">{fact.text}</p>
                  <p className="mt-1 text-xs text-slate-500">{fact.sourceLabel}</p>
                </div>
              ))}
            </div>
          </section>

          {latestFeedback && (
            <section className="border-t border-violet-400/40 pt-4">
              <h2 className="text-sm font-semibold">
                {latestFeedback.kind === 'directional' ? '第一次方向反馈' : '最终个人反馈'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{latestFeedback.body}</p>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
