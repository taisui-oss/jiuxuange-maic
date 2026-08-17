import { describe, expect, test } from 'vitest';
import type { StatelessChatRequest } from '@/lib/types/chat';
import { buildPlayerChatRequest } from '@/lib/server/jiuxuange-player/chat-policy';
import { readPlayerPackage } from '@/lib/server/jiuxuange-player/package-repository';

describe('Jiuxuange Player chat policy', () => {
  test('discards client credentials and replaces classroom state with the signed package', async () => {
    const loaded = await readPlayerPackage('breakfast-chain-six-elements-foundation');
    if (!loaded) throw new Error('Player package fixture missing');
    const body = {
      messages: [],
      storeState: {
        stage: { ...loaded.classroom.stage, name: 'tampered' },
        scenes: [],
        currentSceneId: loaded.classroom.scenes[0].id,
        mode: 'playback',
        whiteboardOpen: false,
      },
      config: { agentIds: ['default-1', 'unauthorized-agent'] },
      apiKey: 'client-secret-must-not-pass',
      baseUrl: 'https://untrusted.example.com',
      providerType: 'openai',
      model: 'client/model',
    } satisfies StatelessChatRequest;

    const sanitized = buildPlayerChatRequest(body, loaded, 'server/primary-model');
    expect(sanitized.apiKey).toBe('');
    expect(sanitized.baseUrl).toBeUndefined();
    expect(sanitized.providerType).toBeUndefined();
    expect(sanitized.model).toBe('server/primary-model');
    expect(sanitized.config.agentIds).toEqual(['default-1']);
    expect(sanitized.storeState.stage?.name).toBe(loaded.classroom.stage.name);
    expect(sanitized.storeState.scenes).toHaveLength(10);
  });

  test('rejects a request without an Agent authorized by the package', async () => {
    const loaded = await readPlayerPackage('breakfast-chain-six-elements-foundation');
    if (!loaded) throw new Error('Player package fixture missing');
    const body = {
      messages: [],
      storeState: {
        stage: loaded.classroom.stage,
        scenes: loaded.classroom.scenes,
        currentSceneId: loaded.classroom.scenes[0].id,
        mode: 'playback',
        whiteboardOpen: false,
      },
      config: { agentIds: ['unauthorized-agent'] },
      apiKey: 'ignored',
    } satisfies StatelessChatRequest;
    expect(() => buildPlayerChatRequest(body, loaded, 'server/primary-model')).toThrow(
      /authorized player Agent/,
    );
  });
});
