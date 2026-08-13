import Link from 'next/link';
import { ArrowRight, BookOpenCheck, CheckCircle2, LockKeyhole } from 'lucide-react';
import { caseOnlyLessonHref, type CaseOnlyLesson } from '@/lib/jiuxuange/case-only/catalog';
import { JIUXUANGE_CASE_ONLY_RELEASE } from '@/lib/jiuxuange/case-only/release';
import type { CaseOnlyCourseProgress } from '@/lib/jiuxuange/case-only/types';

export function CaseOnlyHome({
  lessons,
  progress,
}: {
  lessons: CaseOnlyLesson[];
  progress: CaseOnlyCourseProgress;
}) {
  const completedCount = progress.cases.filter((item) => item.status === 'completed').length;

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-5 sm:px-8">
          <span className="grid size-9 place-items-center rounded-md bg-cyan-50 text-cyan-700">
            <BookOpenCheck className="size-5" />
          </span>
          <div>
            <div className="text-xs text-slate-500">九轩阁专业大课</div>
            <div className="text-base font-semibold">商业模式大课</div>
          </div>
          <span className="ml-auto whitespace-nowrap rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
            v{JIUXUANGE_CASE_ONLY_RELEASE.version} 预览
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <section aria-labelledby="case-only-title" className="max-w-3xl">
          <p className="text-sm font-medium text-cyan-700">当前学习</p>
          <h1 id="case-only-title" className="mt-2 text-3xl font-semibold sm:text-4xl">
            按顺序完成案例
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            每个案例由多个场景和必需互动组成。完成当前案例后，系统开放下一案例。
          </p>
          <p className="mt-3 text-sm font-medium tabular-nums text-slate-700">
            {completedCount} / {lessons.length} 已完成
          </p>
        </section>

        <ol className="mt-8 divide-y divide-slate-200 border-y border-slate-200 bg-white">
          {lessons.map((lesson) => {
            const caseProgress = progress.cases.find((item) => item.caseId === lesson.id);
            const available = caseProgress?.unlocked === true;
            const completed = caseProgress?.status === 'completed';
            const inProgress = caseProgress?.status === 'in_progress';
            return (
              <li
                key={lesson.id}
                className="grid gap-4 px-5 py-6 sm:grid-cols-[56px_1fr_auto] sm:items-center sm:px-7"
              >
                <span
                  className={`grid size-11 place-items-center rounded-md text-sm font-semibold ${
                    available ? 'bg-cyan-50 text-cyan-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {String(lesson.sequence).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold leading-6 sm:text-lg">{lesson.title}</h2>
                    {available ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="size-3.5" />
                        {completed ? '已完成' : inProgress ? '进行中' : '可学习'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <LockKeyhole className="size-3.5" />
                        完成上一案例后开放
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{lesson.summary}</p>
                </div>
                {available ? (
                  <Link
                    href={caseOnlyLessonHref(lesson.id)}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto"
                  >
                    {completed ? '回看案例' : inProgress ? '继续案例' : '进入案例'}
                    <ArrowRight className="size-4" />
                  </Link>
                ) : (
                  <span className="hidden text-xs text-slate-400 sm:block">尚未开放</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </main>
  );
}
