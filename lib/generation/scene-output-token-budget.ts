import type { SceneOutline } from '@/lib/types/generation';

const CONTENT_OUTPUT_TOKEN_LIMITS: Record<SceneOutline['type'], number> = {
  slide: 4_096,
  quiz: 8_192,
  pbl: 16_384,
  interactive: 32_768,
};

const ACTIONS_OUTPUT_TOKEN_LIMIT = 4_096;

function clampToRouteBudget(modelOutputWindow: number | undefined, routeBudget: number): number {
  if (
    typeof modelOutputWindow !== 'number' ||
    !Number.isFinite(modelOutputWindow) ||
    modelOutputWindow <= 0
  ) {
    return routeBudget;
  }

  return Math.min(Math.floor(modelOutputWindow), routeBudget);
}

export function resolveSceneContentOutputTokens(
  sceneType: SceneOutline['type'],
  modelOutputWindow: number | undefined,
): number {
  return clampToRouteBudget(modelOutputWindow, CONTENT_OUTPUT_TOKEN_LIMITS[sceneType]);
}

export function resolveSceneActionsOutputTokens(modelOutputWindow: number | undefined): number {
  return clampToRouteBudget(modelOutputWindow, ACTIONS_OUTPUT_TOKEN_LIMIT);
}
