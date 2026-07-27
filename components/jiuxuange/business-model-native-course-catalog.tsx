'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Clock3, LockKeyhole, Route } from 'lucide-react';
import {
  BUSINESS_MODEL_CASE_LESSONS,
  BUSINESS_MODEL_LEVEL_LABELS,
  businessModelClassroomHref,
  isBusinessModelCaseUnlocked,
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

  const completedClassroomIds = useMemo(
    () =>
      new Set(
        Object.values(progress)
          .filter((item) => item.passed)
          .map((item) => item.classroomId),
      ),
    [progress],
  );

  return (
    <section aria-labelledby="case-path-title">
      <div className="mb-4 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
          <Route className="size-5" />
        </span>
        <div>
          <h2 id="case-path-title" className="text-lg font-semibold">
            案例学习路径
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            每个案例都是多轮 OpenMAIC 原生课堂；完成当前案例后，依次开放下一个案例。
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {BUSINESS_MODEL_CASE_LESSONS.map((lesson) => {
          const prerequisiteMet = isBusinessModelCaseUnlocked(lesson, completedClassroomIds);
          const completed = Boolean(lesson.classroomId && progress[lesson.classroomId]?.passed);
          const canOpen =
            Boolean(lesson.classroomId) && lesson.releaseStatus !== 'in_review' && prerequisiteMet;
          return (
            <article
              key={lesson.id}
              className="rounded-lg border border-border/70 bg-card p-4 sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      第 {lesson.sequence} 个案例
                    </span>
                    <ReleaseLabel status={lesson.releaseStatus} />
                    {completed && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="size-3.5" />
                        已完成
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold leading-snug">{lesson.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {lesson.summary}
                  </p>
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
                </div>
                {canOpen && lesson.classroomId ? (
                  <Link
                    href={businessModelClassroomHref(lesson.classroomId)}
                    className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 sm:w-auto dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                  >
                    {completed ? '再次学习' : '进入案例课堂'}
                    <ArrowRight className="size-4" />
                  </Link>
                ) : (
                  <span className="inline-flex h-10 shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    <LockKeyhole className="size-3.5" />
                    {!prerequisiteMet
                      ? '完成上一案例后开放'
                      : lesson.releaseStatus === 'in_review'
                        ? '课程审校通过后开放'
                        : '课堂尚未发布'}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
