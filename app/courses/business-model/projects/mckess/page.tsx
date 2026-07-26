import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  CircleHelp,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { mckessProjectCardV1 } from '@/lib/jiuxuange/project-card';

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
  if (
    !isLoopbackHost(requestHeaders.get('host')) &&
    process.env.JIUXUANGE_ENABLE_DRAFT_PROJECT_CARDS !== 'true'
  ) {
    notFound();
  }

  const card = mckessProjectCardV1;

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
              <div className="text-sm font-semibold">模拟项目卡 · 尚未发布</div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                当前内容来自小组作业，全部保持草案状态。页面用于核对数据分层，不代表项目方已经确认，也不会进入正式评分。
              </p>
            </div>
          </div>
        </div>

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
            当前只开放项目卡查看。待项目事实确认和运行时接线后，才开放正式互动与证据回放。
          </p>
        </section>
      </div>
    </main>
  );
}
