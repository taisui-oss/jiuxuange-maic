import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { SceneOutline } from '@/lib/types/generation';
import type { Scene } from '@/lib/types/stage';

const mocks = vi.hoisted(() => ({
  getCurrentModelConfig: vi.fn(),
  settingsState: vi.fn(),
  audioPut: vi.fn(),
  isTTSProviderEnabled: vi.fn(),
  pickNarratorAgent: vi.fn(),
  resolveAgentVoiceOptions: vi.fn(),
  listAgents: vi.fn(),
}));

vi.mock('@/lib/utils/model-config', () => ({
  getCurrentModelConfig: mocks.getCurrentModelConfig,
}));

vi.mock('@/lib/store/settings', () => ({
  useSettingsStore: {
    getState: mocks.settingsState,
  },
}));

vi.mock('@/lib/utils/database', () => ({
  db: {
    audioFiles: {
      put: mocks.audioPut,
    },
  },
}));

vi.mock('@/lib/audio/provider-enablement', () => ({
  isTTSProviderEnabled: mocks.isTTSProviderEnabled,
}));

vi.mock('@/lib/audio/agent-voice', () => ({
  pickNarratorAgent: mocks.pickNarratorAgent,
  resolveAgentVoiceOptions: mocks.resolveAgentVoiceOptions,
}));

vi.mock('@/lib/orchestration/registry/store', () => ({
  useAgentRegistry: {
    getState: () => ({
      listAgents: mocks.listAgents,
    }),
  },
}));

const mockFetch = vi.fn() as Mock;
vi.stubGlobal('fetch', mockFetch);

const outline = {
  id: 'outline-1',
  type: 'slide',
  title: 'Retry Scene',
  description: 'Retry transient failures',
  keyPoints: ['retry'],
  order: 2,
} as SceneOutline;

const retryOptions = {
  maxRetries: 1,
  sleep: async () => undefined,
  random: () => 0,
};

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 429 ? 'Too Many Requests' : status === 401 ? 'Unauthorized' : 'OK',
    json: async () => body,
  };
}

describe('browser scene generation retry wrappers', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mocks.audioPut.mockReset();
    mocks.getCurrentModelConfig.mockReturnValue({});
    mocks.settingsState.mockReturnValue({
      imageProviderId: '',
      imageProvidersConfig: {},
      imageGenerationEnabled: false,
      videoProviderId: '',
      videoProvidersConfig: {},
      videoGenerationEnabled: false,
      ttsProviderId: 'server-tts',
      ttsProvidersConfig: {
        'server-tts': {
          apiKey: 'tts-key',
          modelId: 'tts-model',
        },
      },
      ttsVoice: 'narrator',
      ttsSpeed: 1,
    });
    mocks.isTTSProviderEnabled.mockReturnValue(true);
    mocks.pickNarratorAgent.mockReturnValue(undefined);
    mocks.resolveAgentVoiceOptions.mockResolvedValue({});
    mocks.listAgents.mockReturnValue([]);
  });

  it('retries transient scene content HTTP failures before returning success', async () => {
    const { fetchSceneContent } = await import('@/lib/hooks/use-scene-generator');
    mockFetch
      .mockResolvedValueOnce(jsonResponse(429, { error: 'rate limited' }))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, content: { elements: [] } }));

    const result = await fetchSceneContent(
      {
        outline,
        allOutlines: [outline],
        stageId: 'stage-1',
        stageInfo: { name: 'Retry Course' },
      },
      undefined,
      retryOptions,
    );

    expect(result).toMatchObject({ success: true, content: { elements: [] } });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry permanent scene action HTTP failures', async () => {
    const { fetchSceneActions } = await import('@/lib/hooks/use-scene-generator');
    mockFetch.mockResolvedValue(jsonResponse(401, { error: 'unauthorized' }));

    const result = await fetchSceneActions(
      {
        outline,
        allOutlines: [outline],
        content: { elements: [] },
        stageId: 'stage-1',
      },
      undefined,
      retryOptions,
    );

    expect(result).toMatchObject({ success: false, error: 'unauthorized' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('rethrows an aborted scene content request', async () => {
    const { fetchSceneContent } = await import('@/lib/hooks/use-scene-generator');
    const abort = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    mockFetch.mockRejectedValueOnce(abort);

    await expect(
      fetchSceneContent(
        {
          outline,
          allOutlines: [outline],
          stageId: 'stage-1',
          stageInfo: { name: 'Retry Course' },
        },
        undefined,
        retryOptions,
      ),
    ).rejects.toBe(abort);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('rethrows an aborted scene actions request', async () => {
    const { fetchSceneActions } = await import('@/lib/hooks/use-scene-generator');
    const abort = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    mockFetch.mockRejectedValueOnce(abort);

    await expect(
      fetchSceneActions(
        {
          outline,
          allOutlines: [outline],
          content: { elements: [] },
          stageId: 'stage-1',
        },
        undefined,
        retryOptions,
      ),
    ).rejects.toBe(abort);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries transient TTS failures before storing audio', async () => {
    const { generateAndStoreTTS } = await import('@/lib/hooks/use-scene-generator');
    mockFetch
      .mockResolvedValueOnce(jsonResponse(503, { error: 'provider overloaded' }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          success: true,
          base64: btoa('audio-data'),
          format: 'wav',
        }),
      );

    await generateAndStoreTTS('tts_s2_action_1', 'Hello class', 'English', undefined, retryOptions);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mocks.audioPut).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tts_s2_action_1',
        format: 'wav',
      }),
    );
  });

  it('keeps a generated scene usable when every TTS clip fails', async () => {
    const { generateTTSForScene } = await import('@/lib/hooks/use-scene-generator');
    const scene = {
      id: 'scene-tts-failure',
      stageId: 'stage-1',
      type: 'slide',
      title: 'Text-first lesson',
      order: 3,
      content: {
        type: 'slide',
        canvas: {
          id: 'canvas-1',
          elements: [],
        },
      },
      actions: [
        {
          id: 'speech-1',
          type: 'speech',
          agentId: 'professor',
          text: 'The lesson must remain readable without generated audio.',
        },
      ],
    } as unknown as Scene;
    mockFetch.mockResolvedValue(jsonResponse(503, { error: 'system TTS unavailable' }));

    const result = await generateTTSForScene(scene, 'English', undefined, retryOptions);

    expect(result).toMatchObject({
      success: false,
      failedCount: 1,
      error: 'system TTS unavailable',
    });
    expect(scene.actions).toEqual([
      expect.objectContaining({
        id: 'speech-1',
        text: 'The lesson must remain readable without generated audio.',
      }),
    ]);
    expect(scene.actions?.[0]).not.toHaveProperty('audioId');
    expect(mocks.audioPut).not.toHaveBeenCalled();
  });

  it('adds an audio id only after a TTS clip is stored successfully', async () => {
    const { generateTTSForScene } = await import('@/lib/hooks/use-scene-generator');
    const scene = {
      id: 'scene-tts-success',
      stageId: 'stage-1',
      type: 'slide',
      title: 'Lesson with audio',
      order: 4,
      content: {
        type: 'slide',
        canvas: {
          id: 'canvas-2',
          elements: [],
        },
      },
      actions: [
        {
          id: 'speech-2',
          type: 'speech',
          agentId: 'professor',
          text: 'Audio is optional, but this clip succeeds.',
        },
      ],
    } as unknown as Scene;
    mockFetch.mockResolvedValue(
      jsonResponse(200, {
        success: true,
        base64: btoa('audio-data'),
        format: 'wav',
      }),
    );

    const result = await generateTTSForScene(scene, 'English', undefined, retryOptions);

    expect(result).toEqual({ success: true, failedCount: 0, error: undefined });
    expect(scene.actions?.[0]).toHaveProperty('audioId', 'tts_s4_speech-2');
    expect(mocks.audioPut).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tts_s4_speech-2',
        format: 'wav',
      }),
    );
  });
});
