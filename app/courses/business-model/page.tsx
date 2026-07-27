import Link from 'next/link';
import { ArrowLeft, FolderKanban } from 'lucide-react';
import { BusinessModelNativeCourseCatalog } from '@/components/jiuxuange/business-model-native-course-catalog';
import { BUSINESS_MODEL_PROJECT_PRACTICES } from '@/lib/jiuxuange/course-catalog/business-model';

export default function BusinessModelCoursePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-background/95">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/"
            aria-label="返回首页"
            className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">九轩阁专业大课</div>
            <h1 className="truncate text-xl font-semibold">商业模式大课</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <BusinessModelNativeCourseCatalog />

        <section aria-labelledby="project-practice-title" className="mt-10">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <FolderKanban className="size-5" />
            </span>
            <div>
              <h2 id="project-practice-title" className="text-lg font-semibold">
                项目练习
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                项目卡不负责讲授概念，而是让学长、神秘角色和成长反馈官围绕真实材料陪你练习。
              </p>
            </div>
          </div>

          <div className="divide-y divide-border/70 border-y border-border/70">
            {BUSINESS_MODEL_PROJECT_PRACTICES.map((practice) => (
              <div
                key={practice.id}
                className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    模拟项目卡 · 待项目方核验
                  </div>
                  <h3 className="mt-1 text-base font-semibold">{practice.title}</h3>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                    {practice.summary}
                  </p>
                </div>
                <Link
                  href={practice.href}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
                >
                  查看项目卡
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
