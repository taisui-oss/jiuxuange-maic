'use client';

import { useEffect, useState } from 'react';
import { ArrowUp, GraduationCap, LoaderCircle } from 'lucide-react';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { getCurrentModelConfig } from '@/lib/utils/model-config';
import { getOrCreateLocalLearnerId } from '@/lib/c-cubic/session';
import {
  applyProfessorQuestion,
  completeHomeOrientation,
  createHomeOrientationDraft,
  type HomeOrientationDraft,
} from '@/lib/c-cubic/home-orientation';
import { cn } from '@/lib/utils';
import { setAsciiHeader } from '@/lib/utils/http-headers';

const STORAGE_KEY = 'jiuxuangeHomeOrientationV2';

export function HomeOrientationEntry({
  onResolved,
}: {
  onResolved: (draft: HomeOrientationDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<HomeOrientationDraft | null>(null);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setDraft(JSON.parse(raw) as HomeOrientationDraft);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function persist(next: HomeOrientationDraft) {
    setDraft(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  async function submit() {
    const content = value.trim();
    if (!content || loading) return;
    setLoading(true);
    try {
      if (!draft || draft.status === 'resolved' || draft.status === 'attached') {
        const learnerId = getOrCreateLocalLearnerId();
        const next = createHomeOrientationDraft({
          id: `orientation_${nanoid(10)}`,
          learnerId,
          message: content,
          now: new Date().toISOString(),
        });
        const model = getCurrentModelConfig();
        const headers: Record<string, string> = { 'content-type': 'application/json' };
        setAsciiHeader(headers, 'x-model', model.modelString);
        setAsciiHeader(headers, 'x-api-key', model.apiKey);
        setAsciiHeader(headers, 'x-base-url', model.baseUrl);
        setAsciiHeader(headers, 'x-provider-type', model.providerType);
        const response = await fetch('/api/c-cubic/orientation', {
          method: 'POST',
          headers,
          body: JSON.stringify({ message: content }),
        });
        if (!response.ok) throw new Error('暂时无法开始导学');
        const body = (await response.json()) as { question: string };
        persist(applyProfessorQuestion(next, body.question));
        setValue('');
        return;
      }

      const completed = completeHomeOrientation(draft, content, new Date().toISOString());
      persist(completed);
      setValue('');
      await onResolved(completed);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '暂时无法继续导学');
    } finally {
      setLoading(false);
    }
  }

  const awaitingReply = draft?.status === 'awaiting_reply';
  const firstMessage = draft?.initialMessages[0]?.content;
  const professorQuestion = draft?.initialMessages[1]?.content;

  return (
    <div className="w-full rounded-2xl border border-border/60 bg-white/80 shadow-xl shadow-black/[0.03] backdrop-blur-xl dark:bg-slate-900/80 dark:shadow-black/20">
      <div className="flex min-h-[220px] flex-col px-5 py-4">
        {awaitingReply ? (
          <div className="mb-4 space-y-3 text-sm leading-relaxed">
            <p className="ml-auto max-w-[85%] rounded-md bg-muted/70 px-3 py-2 text-foreground/80">
              {firstMessage}
            </p>
            <div className="flex max-w-[90%] items-start gap-2">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <GraduationCap className="size-4" />
              </span>
              <p className="px-1 py-1.5 text-foreground/85">{professorQuestion}</p>
            </div>
          </div>
        ) : (
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground/80">
            <GraduationCap className="size-4 text-violet-600 dark:text-violet-300" />
            <span>带着一个真实问题开始</span>
          </div>
        )}

        <textarea
          aria-label={awaitingReply ? '回答教授的问题' : '描述你的真实问题'}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder={
            awaitingReply
              ? '说说你希望形成的判断、决定或行动…'
              : '例如：加盟门店增长很快，但续约率持续下降，我该从哪里判断问题？'
          }
          className="min-h-[120px] w-full flex-1 resize-none border-0 bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/45"
        />

        <div className="flex justify-end pt-3">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!value.trim() || loading}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors',
              value.trim() && !loading
                ? 'bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950'
                : 'cursor-not-allowed bg-muted text-muted-foreground/40',
            )}
          >
            {loading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ArrowUp className="size-4" />
            )}
            <span>{awaitingReply ? '进入商业模式大课' : '和教授聊聊'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
