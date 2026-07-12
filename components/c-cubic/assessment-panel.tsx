'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import type { PBLProjectV2 } from '@/lib/pbl/v2/types';
import { FIXED_ASSESSMENT_QUESTIONS } from '@/lib/c-cubic/assessment/questions';
import {
  completeAssessment,
  createAssessmentState,
  updateAssessmentDraft,
} from '@/lib/c-cubic/assessment/state';
import { useStageStore } from '@/lib/store/stage';
import { getCurrentModelConfig } from '@/lib/utils/model-config';
import type { LearnerFeedbackReport } from '@/lib/c-cubic/assessment/feedback';
import { setAsciiHeader } from '@/lib/utils/http-headers';

interface Props {
  readonly project: PBLProjectV2;
  readonly onProjectChange: (next: PBLProjectV2) => void;
}

export function JiuxuangeAssessmentPanel({ project, onProjectChange }: Props) {
  const assessment = project.jiuxuange?.assessment ?? createAssessmentState();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const complete = !!assessment.feedback;
  const canSubmit = useMemo(
    () =>
      FIXED_ASSESSMENT_QUESTIONS.every(
        (question) => (assessment.drafts[question.id]?.trim().length ?? 0) >= 12,
      ),
    [assessment.drafts],
  );

  const publish = (next: PBLProjectV2, flush = false) => {
    onProjectChange(next);
    if (flush) queueMicrotask(() => void useStageStore.getState().saveToStorage());
  };

  const updateDraft = (questionId: string, value: string) => {
    if (!project.jiuxuange) return;
    const next = structuredClone(project);
    next.jiuxuange!.assessment = updateAssessmentDraft(assessment, questionId, value);
    next.updatedAt = new Date().toISOString();
    publish(next);
  };

  const submit = async () => {
    if (!project.jiuxuange || !canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const next = structuredClone(project);
      const now = new Date().toISOString();
      const completedAssessment = completeAssessment(assessment, {
        learnerId: project.jiuxuange.learnerId ?? 'local-session-learner',
        submittedAt: now,
      });
      const model = getCurrentModelConfig();
      try {
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        setAsciiHeader(headers, 'x-model', model.modelString);
        setAsciiHeader(headers, 'x-api-key', model.apiKey);
        setAsciiHeader(headers, 'x-base-url', model.baseUrl);
        setAsciiHeader(headers, 'x-provider-type', model.providerType);
        const response = await fetch('/api/c-cubic/assessment', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            answers: completedAssessment.responses.map((response) => ({
              questionId: response.questionId,
              rawAnswer: response.rawAnswer,
            })),
          }),
        });
        if (response.ok) {
          const body = (await response.json()) as { feedback?: LearnerFeedbackReport };
          if (body.feedback) completedAssessment.feedback = body.feedback;
        }
      } catch {
        // Keep the deterministic feedback already attached to the responses.
      }
      next.jiuxuange!.assessment = completedAssessment;
      const milestone = next.milestones.find(
        (candidate) => candidate.id === 'jgx-milestone-personal-assessment',
      );
      if (milestone) {
        milestone.status = 'completed';
        for (const task of milestone.microtasks) task.status = 'completed';
      }
      next.status = 'completed';
      next.updatedAt = now;
      setError(null);
      publish(next, true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '测评提交失败，请检查回答。');
    } finally {
      setSubmitting(false);
    }
  };

  const finish = () => {
    if (!project.jiuxuange?.assessment) return;
    const next = structuredClone(project);
    next.jiuxuange!.assessment!.acknowledgedAt = new Date().toISOString();
    next.uiPhase = 'completed';
    next.updatedAt = new Date().toISOString();
    publish(next, true);
  };

  return (
    <main className="h-full overflow-y-auto bg-[#111c34] text-slate-100">
      <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8">
        <header className="border-b border-white/10 pb-7">
          <p className="text-sm text-cyan-200/75">个人学习成果测评</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
            {complete ? '你的学习反馈' : '用六个判断完成这段学习'}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            {complete
              ? '这份反馈关注你如何使用事实、形成推理并检验判断，不显示数字分数。'
              : '请依据课程概念和两个案例独立回答。系统会保留原始回答，用于与你导学时的初始判断比较。'}
          </p>
        </header>

        {complete && assessment.feedback ? (
          <section className="py-8">
            <div className="space-y-4">
              {Object.values(assessment.feedback.observations).map((observation) => (
                <div key={observation} className="flex gap-3 border-b border-white/10 pb-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                  <p className="leading-7 text-slate-200">{observation}</p>
                </div>
              ))}
            </div>
            <div className="mt-7 border-l-2 border-violet-400 pl-4">
              <p className="text-sm text-violet-200">下一步</p>
              <p className="mt-2 leading-7 text-slate-100">{assessment.feedback.nextStep}</p>
            </div>
            <button
              type="button"
              onClick={finish}
              className="mt-9 inline-flex h-11 items-center gap-2 rounded-md bg-violet-500 px-5 font-medium text-white hover:bg-violet-400"
            >
              完成课程
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>
        ) : (
          <section className="divide-y divide-white/10">
            {FIXED_ASSESSMENT_QUESTIONS.map((question, index) => (
              <label key={question.id} className="block py-7">
                <span className="text-sm text-cyan-200/70">问题 {index + 1}</span>
                <span className="mt-2 block text-base font-medium leading-7">
                  {question.prompt}
                </span>
                <textarea
                  value={assessment.drafts[question.id] ?? ''}
                  onChange={(event) => updateDraft(question.id, event.target.value)}
                  rows={5}
                  className="mt-4 w-full resize-y rounded-md border border-white/15 bg-white/[0.06] px-4 py-3 leading-6 text-slate-100 outline-none focus:border-violet-300"
                  placeholder="写下你的事实依据、推理过程和判断条件"
                />
              </label>
            ))}
            {error && <p className="pt-4 text-sm text-rose-300">{error}</p>}
            <div className="py-8">
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit || submitting}
                className="inline-flex h-11 items-center gap-2 rounded-md bg-violet-500 px-5 font-medium text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? '正在生成反馈' : '生成个人反馈'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
