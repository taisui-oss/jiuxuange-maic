'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, ClipboardCheck, LoaderCircle, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { JiuxuangeCoursePackage } from '@/lib/c-cubic/course-package/types';
import type { LearnerPortalView } from '@/lib/jiuxuange/portal/types';
import { BusinessModelCourseEntry } from '@/components/c-cubic/business-model-course-entry';
import { BusinessModelCourseHubEntry } from '@/components/jiuxuange/business-model-course-hub-entry';
import { Button } from '@/components/ui/button';
import { shouldUseJiuxuangeCourseHubV1 } from '@/lib/config/feature-flags';

interface PortalResponse {
  success: boolean;
  portal?: LearnerPortalView;
  error?: string;
}

export function JiuxuangeLearningPortal({
  coursePackage,
}: {
  coursePackage?: JiuxuangeCoursePackage;
}) {
  const router = useRouter();
  const courseHubEnabled = shouldUseJiuxuangeCourseHubV1();
  const [portal, setPortal] = useState<LearnerPortalView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/jiuxuange/portal', { cache: 'no-store' })
      .then(async (response) => {
        const body = (await response.json()) as PortalResponse;
        if (!response.ok || !body.portal) throw new Error(body.error ?? '无法读取学习门户');
        if (!cancelled) setPortal(body.portal);
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : '无法读取学习门户');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const assessment = portal?.assessments[0];
  const attemptLabel =
    assessment?.status === 'locked'
      ? '查看反馈'
      : assessment?.status === 'in_progress'
        ? `继续作答 · 已提交 ${assessment.attemptsUsed}/2`
        : '开始测评';

  return (
    <section aria-labelledby="my-courses-title" className="w-full">
      <div className="mb-3 flex items-end justify-between gap-4 px-1">
        <div>
          <h2 id="my-courses-title" className="text-base font-semibold text-foreground">
            我的课程
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            正式课程使用 OpenMAIC 原生课堂；完成主线单元后逐级解锁案例课。
          </p>
        </div>
        {!portal && !error && (
          <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {courseHubEnabled ? (
        <BusinessModelCourseHubEntry />
      ) : (
        <BusinessModelCourseEntry coursePackage={coursePackage} />
      )}

      <div className="mt-3 border-y border-violet-400/20 bg-violet-500/[0.025] py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-300">
              <ClipboardCheck className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-violet-600 dark:text-violet-300">
                <span>个人项目测评</span>
                {assessment && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Users className="size-3" />
                    同组共享项目卡 v{assessment.projectCardVersion}
                  </span>
                )}
              </div>
              <h3 className="mt-0.5 text-lg font-semibold text-foreground">
                {assessment?.projectTitle ?? '商业模式项目测评'}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {error
                  ? '当前未取得可信学员身份，测评入口保持关闭。'
                  : '六道必答题，个人独立作答；草稿不消耗机会，最多正式提交两次。'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            disabled={!assessment}
            onClick={() => assessment && router.push(`/assessment/${assessment.assignmentId}`)}
            className="h-10 w-full gap-2 rounded-md bg-violet-600 px-5 text-white hover:bg-violet-500 sm:w-auto"
          >
            <span>{assessment ? attemptLabel : error ? '暂不可用' : '正在加载'}</span>
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>

      {error && <p className="mt-2 px-1 text-xs text-amber-700 dark:text-amber-300">{error}</p>}
    </section>
  );
}
