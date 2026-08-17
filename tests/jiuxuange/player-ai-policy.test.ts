import { afterEach, describe, expect, test } from 'vitest';
import type { StatelessChatRequest } from '@/lib/types/chat';
import {
  acquirePlayerAiSlot,
  clearPlayerAiSlotsForTests,
  playerChatInputChars,
  resolvePlayerAiLimits,
} from '@/lib/server/jiuxuange-player/ai-policy';

afterEach(clearPlayerAiSlotsForTests);

describe('player AI limits', () => {
  test('uses bounded server defaults and ignores invalid values', () => {
    expect(resolvePlayerAiLimits({})).toEqual({
      maxInputChars: 24_000,
      maxOutputTokens: 1_200,
      maxConcurrentPerUser: 1,
    });
    expect(
      resolvePlayerAiLimits({
        JIUXUANGE_PLAYER_MAX_INPUT_CHARS: '10',
        JIUXUANGE_PLAYER_MAX_OUTPUT_TOKENS: '999999',
        JIUXUANGE_PLAYER_MAX_CONCURRENT_AI: '3',
      }),
    ).toEqual({
      maxInputChars: 1_000,
      maxOutputTokens: 8_192,
      maxConcurrentPerUser: 3,
    });
  });

  test('counts learner-controlled chat context but not the signed classroom', () => {
    const request = {
      messages: [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'hello' }] }],
      storeState: {
        stage: null,
        scenes: [],
        currentSceneId: null,
        mode: 'playback',
        whiteboardOpen: false,
      },
      config: { agentIds: ['default-1'], discussionPrompt: 'compare options' },
      apiKey: '',
    } satisfies StatelessChatRequest;
    expect(playerChatInputChars(request)).toBeGreaterThan(20);
    expect(playerChatInputChars(request)).toBeLessThan(500);
  });

  test('enforces and releases the per-user concurrency slot', () => {
    const release = acquirePlayerAiSlot('user-1', 1);
    expect(release).toBeTypeOf('function');
    expect(acquirePlayerAiSlot('user-1', 1)).toBeNull();
    release?.();
    expect(acquirePlayerAiSlot('user-1', 1)).toBeTypeOf('function');
  });
});
