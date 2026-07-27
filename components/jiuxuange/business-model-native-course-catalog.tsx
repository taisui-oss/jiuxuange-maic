'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpenCheck, CheckCircle2, Clock3, LockKeyhole, Route } from 'lucide-react';
import {
  BUSINESS_MODEL_CASE_LESSONS,
  BUSINESS_MODEL_LEVEL_LABELS,
  BUSINESS_MODEL_MAINLINE_UNITS,
  businessModelClassroomHref,
} from '@/lib/jiuxuange/course-catalog/business-model';
import {
  NATIVE_CLASSROOM_PROGRESS_EVENT,
  NATIVE_CLASSROOM_PROGRESS_KEY,
  readNativeClassroomProgress,
  type NativeClassroomProgress,
} from '@/lib/jiuxuange/native-classroom-progress';

function ReleaseLabel({ status }: { status: 'pilot' | 'published' | 'in_review' }) {
  if (status === 'published') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="size-3.5" />
        已发布
      </span>
    );
  }
  if (status === 'pilot') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-cyan-700 dark:text-cyan-300">
        <Clock3 className="size-3.5" />
        内部试学
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
      <Clock3 className="size-3.5" />
      审校中
    </span>
  );
}

export function BusinessModelNativeCourseCatalog() {
  const [progress, setProgress] = useState<NativeClassroomProgress>({});

  useEffect(() => {
    const refresh = () => setProgress(readNativeClassroomProgress());
    refresh();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === NATIVE_CLASSROOM_PROGRESS_KEY) refresh();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener(NATIVE_CLASSROOM_PROGRESS_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(NATIVE_CLASSROOM_PROGRESS_EVENT, refresh);
    };
  }, []);

  const completedUnitIds = useMemo(
    () =>
      new Set(
        BUSINESS_MODEL_MAINLINE_UNITS.filter((unit) => progress[unit.classroomId]?.passed).map(
          (unit) => unit.id,
        ),
      ),
    [progress],
  );

  return (
    <>
      <section aria-labelledby="course-mainline-title">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
            <Route className="size-5" />
          </span>
          <div>
            <h2 id="course-mainline-title" className="text-lg font-semibold">
              六要素学习主线
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              进入 OpenMAIC 原生课堂学习课件、角色讲解与互动；客观题全部答对后完成单元。
            </p>
          </div>
        </div>

        <div className="divide-y divide-border/70 border-y border-border/70">
          {BUSINESS_MODEL_MAINLINE_UNITS.map((unit) => {
            const completed = Boolean(progress[unit.classroomId]?.passed);
            return (
              <div
                key={unit.id}
                className="flex flex-col gap-4 bg-cyan-500/[0.025] px-4 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <ReleaseLabel status={unit.releaseStatus} />
                    {completed && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="size-3.5" />
                        已完成
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-base font-semibold">{unit.title}</h3>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                    {unit.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {unit.focus.map((level) => (
                      <span
                        key={level}
                        className="rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground"
                      >
                        {BUSINESS_MODEL_LEVEL_LABELS[level]}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href={businessModelClassroomHref(unit.classroomId)}
                  className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-md bg-slate-950 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800 sm:w-auto dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  {completed ? '再次学习' : '开始学习'}
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="official-cases-title" className="mt-10">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <BookOpenCheck className="size-5" />
          </span>
          <div>
            <h2 id="official-cases-title" className="text-lg font-semibold">
              正式案例课
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              每个案例按便利蜂标准制作成多轮 OpenMAIC 原生课堂；完成对应主线单元后逐级解锁。
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {BUSINESS_MODEL_CASE_LESSONS.map((lesson) => {
            const prerequisiteMet =
              !lesson.unlockAfterMainlineUnitId ||
              completedUnitIds.has(lesson.unlockAfterMainlineUnitId);
            const canOpen =
              Boolean(lesson.classroomId) &&
              lesson.releaseStatus !== 'in_review' &&
              prerequisiteMet;
            return (
              <article key={lesson.id} className="rounded-lg border border-border/70 bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold leading-snug">{lesson.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {lesson.summary}
                    </p>
                  </div>
                  {lesson.releaseStatus === 'in_review' ? (
                    <ReleaseLabel status="in_review" />
                  ) : prerequisiteMet ? (
                    <ReleaseLabel status={lesson.releaseStatus} />
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
                      <LockKeyhole className="size-3.5" />
                      待解锁
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded bg-violet-500/10 px-2 py-1 text-[11px] font-medium text-violet-700 dark:text-violet-300">
                    多轮原生课堂
                  </span>
                  {lesson.focus.map((level) => (
                    <span
                      key={level}
                      className="rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground"
                    >
                      {BUSINESS_MODEL_LEVEL_LABELS[level]}
                    </span>
                  ))}
                </div>
                <div className="mt-4 border-t border-border/70 pt-3">
                  {canOpen && lesson.classroomId ? (
                    <Link
                      href={businessModelClassroomHref(lesson.classroomId)}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      进入案例课堂
                      <ArrowRight className="size-4" />
                    </Link>
                  ) : (
                    <span className="inline-flex h-9 items-center text-xs text-muted-foreground">
                      {lesson.releaseStatus === 'in_review'
                        ? '教师审校通过后开放'
                        : '完成对应主线单元后开放'}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
