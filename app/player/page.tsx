import { JIUXUANGE_PLAYER_VERSION } from '@/lib/jiuxuange/player/types';

export default function PlayerServicePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-slate-50 px-6 text-slate-900">
      <section className="max-w-md text-center">
        <p className="text-sm font-medium text-cyan-700">九轩阁 MAIC</p>
        <h1 className="mt-2 text-2xl font-semibold">课堂播放器</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          请从九轩阁课程目录进入已授权课堂。
        </p>
        <p className="mt-5 text-xs text-slate-400">Player {JIUXUANGE_PLAYER_VERSION}</p>
      </section>
    </main>
  );
}
