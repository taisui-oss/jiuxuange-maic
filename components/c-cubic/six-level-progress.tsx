'use client';

import { Check, ChevronDown, LockKeyhole } from 'lucide-react';

import { deriveJiuxuangeJourneyProgress } from '@/lib/c-cubic/journey-progress';
import { getCoursePackage } from '@/lib/c-cubic/course-package/registry';
import type { PBLProjectV2 } from '@/lib/pbl/v2/types';
import { cn } from '@/lib/utils/cn';

export function JiuxuangeSixLevelProgress({ project }: { readonly project: PBLProjectV2 }) {
  const metadata = project.jiuxuange;
  if (!metadata) return null;

  const coursePackage = getCoursePackage(metadata.courseId, metadata.courseVersion);
  if (!coursePackage.journey) return null;
  const progress = deriveJiuxuangeJourneyProgress(project, coursePackage);
  const current = progress.levels.find((level) => level.status === 'current');
  const completedCount = progress.levels.filter((level) => level.status === 'completed').length;
  const mobileIndex = current?.order ?? Math.min(completedCount + 1, progress.levels.length);
  const mobileTitle = current?.title ?? (progress.phase === 'completed' ? '学习回顾' : '课程前奏');

  return (
    <div className="relative min-w-0 flex-1" data-jiuxuange-six-level-progress>
      <div className="hidden items-center gap-1.5 lg:flex" aria-label="六关学习进度">
        {progress.levels.map((level) => (
          <div key={level.id} className="flex min-w-0 flex-1 items-center gap-1.5">
            <div
              className={cn(
                'flex h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded border px-1.5 text-[10px] font-medium',
                level.status === 'completed' &&
                  'border-cyan-300/30 bg-cyan-300/10 text-cyan-100',
                level.status === 'current' &&
                  'border-violet-300/55 bg-violet-300/16 text-white shadow-[0_0_14px_rgba(167,139,250,0.22)]',
                level.status === 'locked' && 'border-white/10 bg-white/[0.025] text-slate-400',
              )}
              title={`第${level.order}关 ${level.title}`}
              aria-current={level.status === 'current' ? 'step' : undefined}
            >
              {level.status === 'completed' ? (
                <Check className="h-3 w-3 shrink-0" />
              ) : level.status === 'locked' ? (
                <LockKeyhole className="h-2.5 w-2.5 shrink-0" />
              ) : (
                <span className="shrink-0">{level.order}</span>
              )}
              <span className="truncate">{level.title}</span>
            </div>
          </div>
        ))}
      </div>

      <details className="group lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-end gap-1 text-xs font-medium text-indigo-100 marker:content-none">
          第 {mobileIndex}/6 关 · {mobileTitle}
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="absolute right-0 top-8 z-50 grid w-56 gap-1 rounded-md border border-indigo-100/15 bg-[#101b32] p-2 shadow-xl">
          {progress.levels.map((level) => (
            <div
              key={level.id}
              className={cn(
                'flex items-center gap-2 rounded px-2 py-1.5 text-xs',
                level.status === 'completed' && 'text-cyan-100',
                level.status === 'current' && 'bg-violet-300/15 text-white',
                level.status === 'locked' && 'text-slate-500',
              )}
            >
              {level.status === 'completed' ? (
                <Check className="h-3.5 w-3.5" />
              ) : level.status === 'locked' ? (
                <LockKeyhole className="h-3 w-3" />
              ) : (
                <span className="w-3.5 text-center">{level.order}</span>
              )}
              第{level.order}关 · {level.title}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
