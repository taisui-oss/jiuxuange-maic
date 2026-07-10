'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, CheckCircle2, CircleDashed, FlaskConical } from 'lucide-react';

import {
  C_CUBIC_BUSINESS_MODEL_MODULES,
  type CubicBusinessModelModule,
  type CubicClassroomRef,
  type CubicLearningStep,
} from '@/lib/c-cubic/business-model-course';
import {
  listBusinessModelProgress,
  markBusinessModelStepStarted,
  type ModuleProgressSnapshot,
} from '@/lib/c-cubic/learning-progress';
import { cn } from '@/lib/utils';

function stepLabel(step: CubicLearningStep) {
  return step === 'concept' ? '概念理解卡' : '案例观察卡';
}

function moduleLevelLabel(level: CubicBusinessModelModule['level']) {
  const labels: Record<CubicBusinessModelModule['level'], string> = {
    foundation: '基础',
    core: '核心',
    method: '方法',
    advanced: '进阶',
  };
  return labels[level];
}

function StepButton({
  module,
  refData,
  progress,
  onStart,
}: {
  module: CubicBusinessModelModule;
  refData: CubicClassroomRef;
  progress?: ModuleProgressSnapshot;
  onStart: (
    module: CubicBusinessModelModule,
    refData: CubicClassroomRef & { classroomId: string },
  ) => void;
}) {
  const isAvailable = Boolean(refData.classroomId);
  const isStarted = progress?.startedSteps.includes(refData.kind) ?? false;
  const Icon = refData.kind === 'concept' ? BookOpen : FlaskConical;

  return (
    <div className="rounded-lg border border-border/60 bg-background/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'grid size-7 shrink-0 place-items-center rounded-md',
              refData.kind === 'concept'
                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300'
                : 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
            )}
          >
            <Icon className="size-3.5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-foreground">{refData.title}</div>
            <div className="text-[11px] text-muted-foreground">
              {isStarted ? '已开始' : isAvailable ? '可进入' : '待接入'}
            </div>
          </div>
        </div>
        {isStarted ? (
          <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
        ) : (
          <CircleDashed className="size-4 shrink-0 text-muted-foreground/45" />
        )}
      </div>
      <p className="mb-3 line-clamp-2 min-h-[36px] text-[12px] leading-relaxed text-muted-foreground">
        {refData.description}
      </p>
      <button
        type="button"
        disabled={!isAvailable}
        onClick={() => {
          if (!refData.classroomId) return;
          onStart(module, { ...refData, classroomId: refData.classroomId });
        }}
        className={cn(
          'flex h-8 w-full items-center justify-center gap-1.5 rounded-md text-[12px] font-medium transition-colors',
          isAvailable
            ? 'bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200'
            : 'cursor-not-allowed bg-muted text-muted-foreground/45',
        )}
      >
        <span>{isStarted ? '继续' : '进入'}</span>
        <ArrowRight className="size-3.5" />
      </button>
    </div>
  );
}

export function BusinessModelLearningPath() {
  const router = useRouter();
  const [progress, setProgress] = useState<ModuleProgressSnapshot[]>([]);

  const progressByModule = useMemo(() => {
    return new Map(progress.map((item) => [item.moduleId, item]));
  }, [progress]);

  const availableCount = useMemo(
    () =>
      C_CUBIC_BUSINESS_MODEL_MODULES.reduce(
        (sum, module) =>
          sum +
          Number(Boolean(module.concept.classroomId)) +
          Number(Boolean(module.case.classroomId)),
        0,
      ),
    [],
  );

  const startedStepCount = useMemo(
    () => progress.reduce((sum, item) => sum + item.startedSteps.length, 0),
    [progress],
  );

  async function refreshProgress() {
    setProgress(await listBusinessModelProgress());
  }

  useEffect(() => {
    let cancelled = false;
    void listBusinessModelProgress().then((snapshot) => {
      if (!cancelled) setProgress(snapshot);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleStart(
    module: CubicBusinessModelModule,
    refData: CubicClassroomRef & { classroomId: string },
  ) {
    await markBusinessModelStepStarted({
      moduleId: module.id,
      step: refData.kind,
      classroomId: refData.classroomId,
    });
    await refreshProgress();
    router.push(`/classroom/${refData.classroomId}`);
  }

  return (
    <section className="relative z-10 mt-8 w-full max-w-6xl">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-1 text-[12px] font-medium text-cyan-600 dark:text-cyan-300">
            九轩阁 Phase 1
          </div>
          <h2 className="text-xl font-semibold tracking-normal text-foreground">
            商业模式大课 · 7 模块学练路径
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            先跑通“学 + 练”的真实链路：每个模块由概念理解卡和案例观察卡推进，后续再接入小组
            PBL、后台报表和正式评分。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-right sm:min-w-[220px]">
          <div className="rounded-lg border border-border/60 bg-white/60 p-3 dark:bg-slate-900/60">
            <div className="text-lg font-semibold">{availableCount}/14</div>
            <div className="text-[11px] text-muted-foreground">已接入卡片</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-white/60 p-3 dark:bg-slate-900/60">
            <div className="text-lg font-semibold">{startedStepCount}</div>
            <div className="text-[11px] text-muted-foreground">本地开始记录</div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {C_CUBIC_BUSINESS_MODEL_MODULES.map((module) => {
          const moduleProgress = progressByModule.get(module.id);
          return (
            <article
              key={module.id}
              className="rounded-lg border border-border/60 bg-white/75 p-4 shadow-sm shadow-black/[0.02] backdrop-blur-xl dark:bg-slate-900/75 dark:shadow-black/20"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-gradient-to-br from-cyan-400/20 to-violet-500/20 text-[12px] font-semibold text-cyan-700 dark:text-cyan-200">
                      {module.code}
                    </span>
                    <span className="rounded-md border border-border/60 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      {moduleLevelLabel(module.level)}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{module.title}</h3>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">{module.subtitle}</p>
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  {moduleProgress?.startedSteps.length ? '已进入' : '未开始'}
                </div>
              </div>

              <div className="mb-3 rounded-lg bg-muted/40 p-3">
                <div className="mb-1 text-[11px] text-muted-foreground">课程锚点</div>
                <div className="text-[12px] leading-relaxed text-foreground/80">
                  {module.anchorText}
                </div>
                <div className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
                  {module.learningGoal}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
                {[module.concept, module.case].map((refData) => (
                  <StepButton
                    key={`${module.id}:${refData.kind}`}
                    module={module}
                    refData={refData}
                    progress={moduleProgress}
                    onStart={handleStart}
                  />
                ))}
              </div>

              {moduleProgress?.startedSteps.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {moduleProgress.startedSteps.map((step) => (
                    <span
                      key={step}
                      className="rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[11px] text-cyan-700 dark:text-cyan-300"
                    >
                      {stepLabel(step)}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
