'use client';

import { useEffect, useState } from 'react';
import { PlaybackChromeRoot } from '@/components/edit/PlaybackChromeRoot';
import { InteractiveIframeHost } from '@/components/scene-renderers/InteractiveIframeHost';
import { useStageStore } from '@/lib/store/stage';
import { useSettingsStore } from '@/lib/store/settings';
import { migrateScene } from '@/lib/edit/slide-schema';
import { PlayerRuntimeProvider } from '@/lib/jiuxuange/player/runtime-context';
import { resolvePlayerInitialSceneId } from '@/lib/jiuxuange/player/initial-scene';
import type { LoadedPlayerPackage } from '@/lib/jiuxuange/player/types';
import type { CaseOnlyProgressItem } from '@/lib/jiuxuange/case-only/types';

function HydratedPlayer({
  loaded,
  progress,
}: {
  loaded: LoadedPlayerPackage;
  progress: CaseOnlyProgressItem;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const scenes = loaded.classroom.scenes.map(migrateScene);
    const compact = window.matchMedia('(max-width: 640px)').matches;
    const currentSceneId = resolvePlayerInitialSceneId(
      scenes.map((scene) => scene.id),
      progress.nextSceneIndex,
      progress.status,
    );
    useStageStore.setState({
      stage: loaded.classroom.stage,
      scenes,
      currentSceneId,
      chats: [],
      mode: compact ? 'autonomous' : 'playback',
      generatingOutlines: [],
      outlines: [],
      generationComplete: true,
      generationStatus: 'completed',
      failedOutlines: [],
    });
    const settings = useSettingsStore.getState();
    settings.setAutoPlayLecture(false);
    settings.setSidebarCollapsed(true);
    settings.setChatAreaCollapsed(true);
    settings.setAgentMode('preset');
    settings.setSelectedAgentIds(
      loaded.manifest.agents.map((agent) => agent.id).length > 0
        ? loaded.manifest.agents.map((agent) => agent.id)
        : ['default-1', 'default-2', 'default-3', 'default-4'],
    );
    const readyTimer = window.setTimeout(() => setReady(true), 0);

    return () => {
      window.clearTimeout(readyTimer);
      useStageStore.setState({
        stage: null,
        scenes: [],
        currentSceneId: null,
        chats: [],
        outlines: [],
        generatingOutlines: [],
        generationComplete: false,
        generationStatus: 'idle',
        failedOutlines: [],
      });
    };
  }, [loaded, progress.nextSceneIndex]);

  if (!ready) {
    return <div className="grid h-dvh place-items-center text-sm text-slate-500">课堂加载中…</div>;
  }

  return (
    <div className="relative flex h-dvh w-full overflow-hidden bg-gray-50 dark:bg-gray-900">
      <PlaybackChromeRoot />
      <InteractiveIframeHost />
    </div>
  );
}

export function NativePlayerRuntime({
  loaded,
  progress,
}: {
  loaded: LoadedPlayerPackage;
  progress: CaseOnlyProgressItem;
}) {
  return (
    <PlayerRuntimeProvider
      packageId={loaded.manifest.packageId}
      contentVersion={loaded.manifest.contentVersion}
      initialProgress={progress}
      backHref="/courses/business-model"
    >
      <HydratedPlayer loaded={loaded} progress={progress} />
    </PlayerRuntimeProvider>
  );
}
