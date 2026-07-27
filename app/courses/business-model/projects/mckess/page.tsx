import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CircleHelp,
  ClipboardCheck,
  Database,
  GraduationCap,
  Route,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { mckessProjectCardV2 } from '@/lib/jiuxuange/project-card';
import { MCKESS_ASSESSMENT_ASSIGNMENT_ID } from '@/lib/jiuxuange/portal/mckess-assessment';

function isLoopbackHost(host: string | null): boolean {
  const hostname = host?.split(':')[0]?.toLowerCase();
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '[::1]';
}

const AGENT_LABELS = {
  professor: '教授',
  senior: '学长',
  mystery: '神秘角色',
  growth_feedback: '成长反馈官',
} as const;

export default async function MckessProjectCardPage() {
  const requestHeaders = await headers();
  const loopback = isLoopbackHost(requestHeaders.get('host'));
  if (!loopback && process.env.JIUXUANGE_ENABLE_DRAFT_PROJECT_CARDS !== 'true') {
    notFound();
  }

  const card = mckessProjectCardV2;
  const publicPreview = !loopback;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-background/95">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/courses/business-model"
            aria-label="返回商业模式大课"
            className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">商业模式大课 · 项目练习</div>
            <h1 className="truncate text-xl font-semibold">{card.title}</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="border-y border-amber-400/30 bg-amber-500/[0.04] py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
            <div>
              <div className="text-sm font-semibold">后台导入草案 · 待案主确认</div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                当前内容来自小组作业并由后台导入。正式项目卡应由案主学员在学员端填写；后台代导入时，也必须由案主逐项确认后才能发布。
              </p>
              {publicPreview && (
                <p className="mt-2 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                  当前为脱敏预览：仅展示允许使用或已经区间化的字段，不展示禁止进入模型的字段、原始页码和完整报告事实。
                </p>
              )}
            </div>
          </div>
        </div>

        <section
          aria-labelledby="project-assessment-title"
          className="mt-6 flex flex-col gap-4 border-y border-violet-400/30 bg-violet-500/[0.035] py-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-3">
            <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-violet-700 dark:text-violet-300" />
            <div>
              <h2 id="project-assessment-title" className="text-base font-semibold">
                麦客思个人项目测评
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                6 道开放场景题固定使用本项目和项目卡 {card.version}
                ；个人独立作答，最多正式提交两次。
              </p>
            </div>
          </div>
          <Link
            href={`/assessment/${MCKESS_ASSESSMENT_ASSIGNMENT_ID}`}
            className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-md bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-500 sm:w-auto"
          >
            进入个人测评
            <ArrowRight className="size-4" />
          </Link>
        </section>

        <section aria-labelledby="analysis-path-title" className="mt-8">
          <div className="flex items-center gap-2">
            <Route className="size-5 text-cyan-700 dark:text-cyan-300" />
            <h2 id="analysis-path-title" className="text-lg font-semibold">
              项目分析路径
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            项目研习、讨论和个人测评使用同一条八步路径，避免把六要素拆成互不相关的标签。
          </p>
          <ol className="mt-4 grid gap-x-5 gap-y-4 border-y border-border/70 py-5 sm:grid-cols-2 lg:grid-cols-4">
            {card.analysisPath.map((step, index) => (
              <li key={step.id} className="grid grid-cols-[28px_1fr] gap-2">
                <span className="grid size-7 place-items-center rounded-full bg-cyan-500/10 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.prompt}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="project-modules-title" className="mt-10">
          <div className="flex items-center gap-2">
            <Database className="size-5 text-violet-700 dark:text-violet-300" />
            <h2 id="project-modules-title" className="text-lg font-semibold">
              项目卡七个模块
            </h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            当前为后台导入草案。字段中的“草案”和“未知”均不能作为案主已确认事实。
          </p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {card.modules.map((module, index) => {
              const visibleFields = publicPreview
                ? module.fields.filter((field) => field.modelPolicy !== 'block')
                : module.fields;
              return (
                <article key={module.id} className="rounded-lg border border-border/70 bg-card p-4">
                  <div className="text-xs font-medium text-violet-700 dark:text-violet-300">
                    模块 {index + 1}
                  </div>
                  <h3 className="mt-1 text-sm font-semibold">{module.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{module.summary}</p>
                  <dl className="mt-4 divide-y divide-border/70 border-y border-border/70">
                    {visibleFields.map((field) => (
                      <div key={field.id} className="py-3">
                        <dt className="flex items-center justify-between gap-3 text-xs font-medium">
                          <span>{field.label}</span>
                          <span className="flex items-center gap-2">
                            {field.modelPolicy === 'mask' && (
                              <span className="text-muted-foreground">已区间化</span>
                            )}
                            <span
                              className={
                                field.status === 'unknown'
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : field.status === 'owner_confirmed'
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : 'text-muted-foreground'
                              }
                            >
                              {field.status === 'unknown'
                                ? '待补充'
                                : field.status === 'owner_confirmed'
                                  ? '案主已确认'
                                  : '待案主确认'}
                            </span>
                          </span>
                        </dt>
                        <dd className="mt-1 text-sm leading-6 text-muted-foreground">
                          {field.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </article>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="project-overview-title" className="mt-8">
          <div className="flex items-center gap-2">
            <BookOpenCheck className="size-5 text-cyan-700 dark:text-cyan-300" />
            <h2 id="project-overview-title" className="text-lg font-semibold">
              项目底图
            </h2>
          </div>
          <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-border/70 bg-border/70 sm:grid-cols-5">
            {[
              ['报告事实', card.reportedFacts.length],
              ['小组判断', card.learnerClaims.length],
              ['改造建议', card.redesignProposals.length],
              ['预测假设', card.forecastAssumptions.length],
              ['开放矛盾', card.tensions.length],
            ].map(([label, value]) => (
              <div key={label} className="bg-card px-4 py-4">
                <div className="text-2xl font-semibold tabular-nums">{value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {!publicPreview && (
          <section aria-labelledby="reported-facts-title" className="mt-10">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-cyan-700 dark:text-cyan-300" />
              <h2 id="reported-facts-title" className="text-lg font-semibold">
                报告呈现的项目事实
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              以下内容只能表述为“作业报告称”，等待项目方逐条确认。
            </p>
            <div className="mt-4 divide-y divide-border/70 border-y border-border/70">
              {card.reportedFacts.map((fact) => (
                <div key={fact.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto]">
                  <p className="text-sm leading-relaxed">{fact.text}</p>
                  <span className="text-xs text-muted-foreground">
                    第 {fact.sourceRef.page} 页 · {fact.sourceRef.locator}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="tensions-title" className="mt-10">
          <div className="flex items-center gap-2">
            <CircleHelp className="size-5 text-violet-700 dark:text-violet-300" />
            <h2 id="tensions-title" className="text-lg font-semibold">
              可以直接用于互动的矛盾点
            </h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {card.tensions.map((tension) => (
              <article key={tension.id} className="rounded-lg border border-border/70 bg-card p-4">
                <div className="flex items-center gap-2 text-xs font-medium text-violet-700 dark:text-violet-300">
                  <Users className="size-3.5" />
                  学长追问 · 神秘角色对抗
                </div>
                <h3 className="mt-2 text-sm font-semibold">{tension.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {tension.prompt}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="agent-contract-title" className="mt-10">
          <div className="flex items-center gap-2">
            <GraduationCap className="size-5 text-emerald-700 dark:text-emerald-300" />
            <h2 id="agent-contract-title" className="text-lg font-semibold">
              伴学角色
            </h2>
          </div>
          <div className="mt-4 divide-y divide-border/70 border-y border-border/70">
            {card.agentPolicies.map((policy) => (
              <div key={policy.agentId} className="py-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">{AGENT_LABELS[policy.agentId]}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {policy.purpose}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            当前开放项目卡配置预览和同项目个人测评。个人研习、小组讨论与证据回放仍待项目事实确认和运行时接线。
          </p>
        </section>
      </div>
    </main>
  );
}
