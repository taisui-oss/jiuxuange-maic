'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpenCheck, LoaderCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  getOrCreateBusinessModelSession,
  loadBusinessModelResumeState,
  type BusinessModelResumeState,
} from '@/lib/c-cubic/session';

export function BusinessModelCourseEntry() {
  const router = useRouter();
  const [resume, setResume] = useState<BusinessModelResumeState>({ status: 'not_started' });
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadBusinessModelResumeState()
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
  }, []);

  async function openCourse() {
    setOpening(true);
    try {
      const session = await getOrCreateBusinessModelSession();
      router.push(`/classroom/${session.stageId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '暂时无法进入课程');
      setOpening(false);
    }
  }

  const hasProgress = resume.status === 'in_progress' || resume.status === 'completed';
  const buttonLabel =
    resume.status === 'completed' ? '回看学习' : hasProgress ? '继续学习' : '开始学习';
  const supportingText = resume.summary
    ? `上次聊到：${resume.summary}`
    : '从一个真实商业问题开始。';

  return (
    <section
      aria-labelledby="business-model-course-title"
      className="relative z-10 mt-8 w-full max-w-6xl border-y border-border/60 py-5"
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
              {loading ? '正在恢复你的学习进度…' : supportingText}
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={openCourse}
          disabled={loading || opening}
          className="h-10 w-full shrink-0 gap-2 rounded-md bg-slate-950 px-5 text-white hover:bg-slate-800 sm:w-auto dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
        >
          {opening ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          <span>{opening ? '正在进入' : buttonLabel}</span>
        </Button>
      </div>
    </section>
  );
}
