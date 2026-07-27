'use client';

import { ArrowRight, BookOpenCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function BusinessModelCourseHubEntry() {
  const router = useRouter();

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
              进入课程目录，学习六要素主线与已解锁案例；课堂均使用 OpenMAIC 原生能力。
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
