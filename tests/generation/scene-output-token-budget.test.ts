import { describe, expect, it } from 'vitest';

import failureFixture from '@/tests/replay/jiuxuange-deepseek-scene-terminated-20260727.json';
import {
  resolveSceneActionsOutputTokens,
  resolveSceneContentOutputTokens,
} from '@/lib/generation/scene-output-token-budget';

describe('scene output token budget', () => {
  it('caps the observed DeepSeek slide request at the verified recovery budget', () => {
    expect(
      resolveSceneContentOutputTokens('slide', failureFixture.request.requestedMaxOutputTokens),
    ).toBe(failureFixture.targetPolicy.slideMaxOutputTokens);
  });

  it.each([
    ['slide', 4_096],
    ['quiz', 8_192],
    ['pbl', 16_384],
    ['interactive', 32_768],
  ] as const)('caps %s content while preserving smaller model limits', (type, cap) => {
    expect(resolveSceneContentOutputTokens(type, 393_216)).toBe(cap);
    expect(resolveSceneContentOutputTokens(type, 4_096)).toBe(4_096);
  });

  it('uses a bounded budget for scene actions', () => {
    expect(resolveSceneActionsOutputTokens(393_216)).toBe(4_096);
    expect(resolveSceneActionsOutputTokens(4_096)).toBe(4_096);
  });

  it('falls back to the route budget when model metadata is missing or invalid', () => {
    expect(resolveSceneContentOutputTokens('slide', undefined)).toBe(4_096);
    expect(resolveSceneContentOutputTokens('slide', Number.NaN)).toBe(4_096);
    expect(resolveSceneActionsOutputTokens(0)).toBe(4_096);
  });
});
