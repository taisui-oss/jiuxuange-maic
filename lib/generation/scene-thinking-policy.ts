import type { ThinkingConfig } from '@/lib/types/provider';

const DEEPSEEK_SCENE_THINKING_DISABLED: ThinkingConfig = {
  mode: 'disabled',
  enabled: false,
  effort: 'none',
};

export function resolveSceneThinkingConfig(
  providerId: string | undefined,
  configured?: ThinkingConfig,
): ThinkingConfig | undefined {
  return providerId === 'deepseek' ? DEEPSEEK_SCENE_THINKING_DISABLED : configured;
}
