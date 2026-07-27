import { describe, expect, it } from 'vitest';

import { resolveSceneThinkingConfig } from '@/lib/generation/scene-thinking-policy';

describe('scene thinking policy', () => {
  it('disables DeepSeek thinking for structured scene serialization', () => {
    expect(resolveSceneThinkingConfig('deepseek', { effort: 'high' })).toEqual({
      mode: 'disabled',
      enabled: false,
      effort: 'none',
    });
    expect(resolveSceneThinkingConfig('deepseek')).toEqual({
      mode: 'disabled',
      enabled: false,
      effort: 'none',
    });
  });

  it('preserves the configured thinking policy for other providers', () => {
    const configured = { mode: 'enabled', effort: 'medium' } as const;

    expect(resolveSceneThinkingConfig('openai', configured)).toBe(configured);
  });
});
