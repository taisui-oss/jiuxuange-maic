import { PENDING_SCENE_ID } from '@/lib/store/stage';

export function resolvePlayerInitialSceneId(
  sceneIds: string[],
  nextSceneIndex: number,
  status: string,
): string | null {
  if (sceneIds.length === 0) return null;
  if (status === 'completed' || nextSceneIndex >= sceneIds.length) return PENDING_SCENE_ID;
  return sceneIds[Math.max(0, nextSceneIndex)] ?? sceneIds[0] ?? null;
}
