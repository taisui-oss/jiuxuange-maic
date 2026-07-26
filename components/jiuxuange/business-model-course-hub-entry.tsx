'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, BookOpenCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { JiuxuangeCoursePackage } from '@/lib/c-cubic/course-package/types';
import { loadBusinessModelResumeState, type BusinessModelResumeState } from '@/lib/c-cubic/session';
import { Button } from '@/components/ui/button';

export function BusinessModelCourseHubEntry({
  coursePackage,
}: {
  coursePackage?: JiuxuangeCoursePackage;
}) {
  const router = useRouter();
  const [resume, setResume] = useState<BusinessModelResumeState>({ status: 'not_started' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadBusinessModelResumeState({ coursePackage })
      .then((state) => {
        if (!cancelled) setResume(state);
      })
      .catch(() => {
        if (!cancelled) setResume({ status: 'unavailable' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coursePackage]);

  const supportingText =
    resume.summary && (resume.status === 'in_progress' || resume.status === 'completed')
      ? `上次聊到：${resume.summary}`
      : '进入正式案例主线，并把学到的六要素带回项目练习。';

  return (
    <section
      aria-labelledby="business-model-course-title"
      className="relative z-10 w-full border-y border-cyan-400/20 bg-cyan-500/[0.025] py-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
            <BookOpenCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-violet-600 dark:text-violet-300">
              九轩阁专业大课
            </div>
            <h2
              id="business-model-course-title"
              className="mt-0.5 text-lg font-semibold tracking-normal text-foreground"
            >
              商业模式大课
            </h2>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {loading ? '正在恢复你的课程状态…' : supportingText}
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => router.push('/courses/business-model')}
          className="h-10 w-full shrink-0 gap-2 rounded-md bg-slate-950 px-5 text-white hover:bg-slate-800 sm:w-auto dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
        >
          <ArrowRight className="size-4" />
          <span>进入课程</span>
        </Button>
      </div>
    </section>
  );
}
