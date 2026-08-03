'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpenText,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  FileCheck2,
  FileText,
  FolderOpen,
  LoaderCircle,
  PanelRightOpen,
  Save,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type {
  AssessmentAttempt,
  AssessmentQuestion,
  AssessmentSession,
  ProjectCardVersion,
  ProjectFact,
} from '@/lib/jiuxuange/portal/types';

const QUESTION_TYPE_LABELS: Record<NonNullable<AssessmentQuestion['questionType']>, string> = {
  fact_diagnosis: '事实判断',
  hypothesis_evaluation: '假设互动',
  option_comparison: '方案比较',
  causal_reasoning: '因果推理',
  judgment_revision: '判断修正',
};

type ContextTab = 'materials' | 'overview' | 'facts';

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

interface ProjectContextProps {
  projectCard?: ProjectCardVersion;
  questionFacts: ProjectFact[];
  tab: ContextTab;
  onTabChange: (tab: ContextTab) => void;
}

const CONTEXT_TABS: Array<{ id: ContextTab; label: string }> = [
  { id: 'materials', label: '上传材料' },
  { id: 'overview', label: '项目卡' },
  { id: 'facts', label: '全部事实' },
];

function fieldStatusLabel(status: 'draft' | 'owner_confirmed' | 'unknown') {
  if (status === 'owner_confirmed') return '案主已确认';
  if (status === 'unknown') return '待补充';
  return '待案主确认';
}

function ProjectContext({ projectCard, questionFacts, tab, onTabChange }: ProjectContextProps) {
  if (!projectCard) {
    return <p className="px-4 py-5 text-sm text-slate-400">本次测评没有可读取的项目资料。</p>;
  }

  const materials = projectCard.materials ?? [];
  const sections = projectCard.contextSections ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-cyan-300">冻结项目资料</p>
            <h2 className="mt-1 break-words text-sm font-semibold leading-5 text-white">
              {projectCard.title}
            </h2>
          </div>
          <span className="shrink-0 rounded bg-white/[0.07] px-2 py-1 text-[11px] text-slate-300">
            v{projectCard.version}
          </span>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-400">
          信息截止 {projectCard.informationAsOf ?? '未标注'} ·
          {projectCard.ownerConfirmationStatus === 'confirmed' ? ' 案主已确认' : ' 待案主确认'}
        </p>
      </div>

      {questionFacts.length > 0 && (
        <div className="border-b border-cyan-400/20 bg-cyan-400/[0.045] px-4 py-3">
          <p className="text-xs font-semibold text-cyan-200">
            当前题可引用 {questionFacts.length} 条事实
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            可在“全部事实”中查看完整冻结事实集。
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 border-b border-white/10 px-3 pt-2" role="tablist">
        {CONTEXT_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => onTabChange(item.id)}
            className={`border-b-2 px-1 py-2 text-xs font-medium transition-colors ${
              tab === item.id
                ? 'border-violet-400 text-white'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {tab === 'materials' && (
          <div className="space-y-5">
            {materials.length > 0 ? (
              materials.map((material) => (
                <section key={material.id} className="border-b border-white/10 pb-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-md bg-violet-400/10 text-violet-300">
                      <FileText className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium leading-5 text-slate-100">
                        {material.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        {material.pageCount && <span>{material.pageCount} 页</span>}
                        <span>{material.parseStatus === 'parsed' ? '内容已解析' : '等待解析'}</span>
                        <span>{material.disclosure === 'mask' ? '已脱敏' : '允许使用'}</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-300">{material.safeSummary}</p>
                </section>
              ))
            ) : (
              <p className="text-sm leading-6 text-slate-400">当前项目卡快照尚未附带材料目录。</p>
            )}

            {sections.length > 0 && (
              <section>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <FileCheck2 className="size-4 text-emerald-300" />
                  从材料中提取的可见内容
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  以下内容已经进入本次冻结项目卡；原始敏感正文不会在测评页显示。
                </p>
                <div className="mt-3 space-y-2">
                  {sections.map((section, index) => (
                    <details
                      key={section.id}
                      open={index === 0}
                      className="border-b border-white/10 py-2"
                    >
                      <summary className="cursor-pointer text-xs font-medium text-slate-200">
                        {section.title} · {section.fields.length} 项
                      </summary>
                      <dl className="mt-3 space-y-3 pb-2">
                        {section.fields.map((field) => (
                          <div key={field.id}>
                            <dt className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                              <span>{field.label}</span>
                              <span>
                                {field.disclosure === 'mask'
                                  ? '已区间化'
                                  : fieldStatusLabel(field.status)}
                              </span>
                            </dt>
                            <dd className="mt-1 text-xs leading-5 text-slate-300">{field.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {tab === 'overview' && (
          <div className="space-y-3">
            {sections.length > 0 ? (
              sections.map((section, index) => (
                <details
                  key={section.id}
                  open={index < 2}
                  className="border-b border-white/10 pb-3"
                >
                  <summary className="cursor-pointer py-2 text-sm font-medium text-slate-100">
                    {section.title}
                  </summary>
                  <p className="mb-3 text-xs leading-5 text-slate-500">{section.summary}</p>
                  <dl className="space-y-3">
                    {section.fields.map((field) => (
                      <div key={field.id}>
                        <dt className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                          <span>{field.label}</span>
                          <span>
                            {field.disclosure === 'mask'
                              ? '已区间化'
                              : fieldStatusLabel(field.status)}
                          </span>
                        </dt>
                        <dd className="mt-1 text-xs leading-5 text-slate-300">{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              ))
            ) : (
              <p className="text-sm leading-6 text-slate-400">
                当前快照只包含事实，没有项目卡字段。
              </p>
            )}
          </div>
        )}

        {tab === 'facts' && (
          <ol className="space-y-4">
            {projectCard.facts.map((fact, index) => {
              const highlighted = questionFacts.some((item) => item.id === fact.id);
              return (
                <li key={fact.id} className={highlighted ? 'border-l-2 border-cyan-400 pl-3' : ''}>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className={highlighted ? 'text-cyan-300' : 'text-slate-500'}>
                      F{index + 1}
                    </span>
                    {highlighted && <span className="text-cyan-300">当前题相关</span>}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-300">{fact.text}</p>
                  <p className="mt-1 text-[11px] leading-4 text-slate-600">{fact.sourceLabel}</p>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

export default function AssessmentPage() {
  const params = useParams<{ assignmentId: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<AssessmentDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [contextTab, setContextTab] = useState<ContextTab>('materials');
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
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
      const firstUnanswered = body.detail.session.questions.find(
        (question) => !body.detail!.session.draftAnswers[question.id]?.trim(),
      );
      setActiveQuestionId(firstUnanswered?.id ?? body.detail.session.questions[0]?.id ?? null);
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
    if (action === 'submit') {
      const missing = detail.session.questions.filter(
        (question) => (answers[question.id]?.trim().length ?? 0) < 12,
      );
      if (missing.length > 0) {
        setActiveQuestionId(missing[0].id);
        setError(`还有 ${missing.length} 道题未完成，每题至少需要形成一段完整判断。`);
        return;
      }
    }

    setBusy(action === 'submit' ? 'submit' : 'save');
    setError(null);
    try {
      const response = await fetch(`/api/jiuxuange/assessment/session/${detail.session.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, answers }),
      });
      const body = (await response.json()) as ApiResponse;
      if (!response.ok || !body.session) throw new Error(body.error ?? '保存失败');
      setDetail((current) =>
        current
          ? {
              ...current,
              session: body.session!,
              attempts: body.attempt ? [...current.attempts, body.attempt] : current.attempts,
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

  const questions = detail.session.questions;
  const activeIndex = Math.max(
    0,
    questions.findIndex((question) => question.id === activeQuestionId),
  );
  const activeQuestion = questions[activeIndex];
  const answeredCount = questions.filter((question) => answers[question.id]?.trim()).length;
  const locked = detail.session.status === 'locked';
  const attemptsUsed = detail.session.attemptIds.length;
  const latestFeedback = detail.attempts.at(-1)?.feedback;
  const projectCardHref =
    detail.session.projectId === 'mckess-central-kitchen'
      ? '/courses/business-model/projects/mckess'
      : '/';
  const questionFacts = (activeQuestion?.scenarioFactIds ?? []).flatMap((factId) => {
    const fact = detail.projectCard?.facts.find((item) => item.id === factId);
    return fact ? [fact] : [];
  });

  function moveQuestion(offset: number) {
    const next = questions[activeIndex + offset];
    if (next) setActiveQuestionId(next.id);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => router.push(projectCardHref)}
            className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">返回项目卡</span>
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate text-sm font-medium">
              {detail.projectCard?.title ?? '商业模式个人项目测评'}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              已回答 {answeredCount}/{questions.length} · 已正式提交 {attemptsUsed}/2
            </div>
          </div>
          <button
            type="button"
            title="查看项目资料"
            aria-label="查看项目资料"
            onClick={() => setMobileContextOpen(true)}
            className="grid size-9 place-items-center rounded-md border border-white/10 text-slate-300 hover:bg-white/[0.06] lg:hidden"
          >
            <PanelRightOpen className="size-4" />
          </button>
          <div className="hidden w-[84px] justify-end text-xs text-slate-500 sm:flex">
            草稿不计次数
          </div>
        </div>
        <div className="h-1 bg-white/[0.05]">
          <div
            className="h-full bg-violet-500 transition-[width]"
            style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }}
          />
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] lg:grid-cols-[220px_minmax(0,1fr)_360px]">
        <nav className="hidden min-h-[calc(100vh-65px)] border-r border-white/10 px-4 py-6 lg:block">
          <div className="sticky top-24">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <ClipboardList className="size-4" />
              六道项目场景题
            </div>
            <ol className="mt-4 space-y-1">
              {questions.map((question, index) => {
                const answered = !!answers[question.id]?.trim();
                const active = activeIndex === index;
                return (
                  <li key={question.id}>
                    <button
                      type="button"
                      aria-current={active ? 'step' : undefined}
                      onClick={() => setActiveQuestionId(question.id)}
                      className={`grid w-full grid-cols-[24px_1fr] items-start gap-2 rounded-md px-2 py-2 text-left transition-colors ${
                        active
                          ? 'bg-violet-400/10 text-white'
                          : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-300'
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid size-5 place-items-center rounded-full text-[11px] ${
                          answered
                            ? 'bg-emerald-400/15 text-emerald-300'
                            : active
                              ? 'bg-violet-400/20 text-violet-200'
                              : 'bg-white/[0.06]'
                        }`}
                      >
                        {answered ? <Check className="size-3" /> : index + 1}
                      </span>
                      <span className="text-xs leading-5">
                        {question.title ?? `问题 ${index + 1}`}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="mt-6 border-t border-white/10 pt-4 text-xs leading-5 text-slate-500">
              <div className="flex items-center gap-2 text-slate-300">
                <ShieldCheck className="size-4 text-cyan-300" />
                独立作答
              </div>
              <p className="mt-2">测评页不提供 Agent 实时帮助，不读取个人研习或小组讨论记录。</p>
            </div>
          </div>
        </nav>

        <section className="min-w-0 px-4 py-7 sm:px-8 lg:px-10" aria-labelledby="assessment-title">
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">
                问题 {activeIndex + 1} / {questions.length}
              </span>
              {activeQuestion.questionType && (
                <span className="rounded bg-violet-400/10 px-2 py-1 font-medium text-violet-300">
                  {QUESTION_TYPE_LABELS[activeQuestion.questionType]}
                </span>
              )}
              {typeof activeQuestion.minimumFactReferences === 'number' &&
                activeQuestion.minimumFactReferences > 0 && (
                  <span className="text-cyan-300">
                    至少引用 {activeQuestion.minimumFactReferences} 条项目事实
                  </span>
                )}
            </div>

            <h1 id="assessment-title" className="mt-4 text-xl font-semibold leading-8 sm:text-2xl">
              {activeQuestion.title ?? `问题 ${activeIndex + 1}`}
            </h1>
            <p className="mt-3 text-base leading-8 text-slate-200">{activeQuestion.prompt}</p>

            {questionFacts.length > 0 && (
              <section className="mt-6 border-y border-cyan-400/20 bg-cyan-400/[0.035] py-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-xs font-semibold text-cyan-200">
                    <BookOpenText className="size-4" />
                    本题相关项目事实
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setContextTab('facts');
                      setMobileContextOpen(true);
                    }}
                    className="text-xs text-slate-400 hover:text-white lg:hidden"
                  >
                    查看全部
                  </button>
                </div>
                <ol className="mt-3 space-y-3">
                  {questionFacts.map((fact) => (
                    <li
                      key={fact.id}
                      className="grid grid-cols-[18px_1fr] gap-2 text-sm leading-6 text-slate-300"
                    >
                      <CheckCircle2 className="mt-1 size-4 text-cyan-400" />
                      <span>{fact.text}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <label
              htmlFor={activeQuestion.id}
              className="mt-7 block text-sm font-medium text-slate-200"
            >
              你的回答
            </label>
            <textarea
              id={activeQuestion.id}
              value={answers[activeQuestion.id] ?? ''}
              disabled={locked}
              onChange={(event) =>
                setAnswers((current) => ({
                  ...current,
                  [activeQuestion.id]: event.target.value,
                }))
              }
              rows={12}
              className="mt-3 w-full resize-y rounded-md border border-white/10 bg-slate-900 px-4 py-3 text-sm leading-7 outline-none transition focus:border-violet-400 disabled:opacity-60"
              placeholder="写下你的判断、项目事实、因果依据和可能的反证条件。"
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-600">
              <span>{answers[activeQuestion.id]?.trim().length ?? 0} 字</span>
              <span>回答保存在你的个人测评记录中</span>
            </div>

            <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5">
              <Button
                type="button"
                variant="outline"
                disabled={activeIndex === 0}
                onClick={() => moveQuestion(-1)}
                className="gap-2 border-white/15 bg-transparent text-white hover:bg-white/[0.06]"
              >
                <ChevronLeft className="size-4" />
                上一题
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={activeIndex === questions.length - 1}
                onClick={() => moveQuestion(1)}
                className="gap-2 border-white/15 bg-transparent text-white hover:bg-white/[0.06]"
              >
                下一题
                <ChevronRight className="size-4" />
              </Button>
            </div>

            {error && (
              <div className="mt-6 flex gap-3 rounded-md border border-red-400/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
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

            {latestFeedback && (
              <section className="mt-8 border-l-2 border-violet-400 pl-4">
                <h2 className="text-sm font-semibold text-violet-200">
                  {latestFeedback.kind === 'directional' ? '第一次方向反馈' : '最终个人反馈'}
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-300">{latestFeedback.body}</p>
              </section>
            )}
          </div>
        </section>

        <aside className="hidden h-[calc(100vh-65px)] border-l border-white/10 bg-slate-900/45 lg:sticky lg:top-[65px] lg:flex lg:flex-col">
          <ProjectContext
            projectCard={detail.projectCard}
            questionFacts={questionFacts}
            tab={contextTab}
            onTabChange={setContextTab}
          />
        </aside>
      </div>

      {mobileContextOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="关闭项目资料"
            className="absolute inset-0 bg-black/65"
            onClick={() => setMobileContextOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 flex w-[min(92vw,390px)] flex-col border-l border-white/10 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FolderOpen className="size-4 text-violet-300" />
                项目资料
              </div>
              <button
                type="button"
                title="关闭"
                aria-label="关闭"
                onClick={() => setMobileContextOpen(false)}
                className="grid size-8 place-items-center rounded-md text-slate-400 hover:bg-white/[0.06] hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>
            <ProjectContext
              projectCard={detail.projectCard}
              questionFacts={questionFacts}
              tab={contextTab}
              onTabChange={setContextTab}
            />
          </aside>
        </div>
      )}
    </main>
  );
}
