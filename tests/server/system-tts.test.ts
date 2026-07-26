import { describe, expect, it } from 'vitest';
import {
  buildMacOSSayArguments,
  validateSystemTTSRequest,
} from '@/lib/server/system-tts';

describe('Jiuxuange system TTS', () => {
  it('builds a shell-free macOS say command for Chinese WAV output', () => {
    expect(
      buildMacOSSayArguments(
        {
          providerId: 'system-tts',
          modelId: 'macos-say',
          voice: 'Tingting',
          speed: 1,
        },
        'Welcome to Jiuxuange.',
        '/tmp/jiuxuange.wav',
      ),
    ).toEqual([
      '-v',
      'Tingting',
      '-r',
      '190',
      '--file-format=WAVE',
      '--data-format=LEI16@22050',
      '-o',
      '/tmp/jiuxuange.wav',
      'Welcome to Jiuxuange.',
    ]);
  });

  it('clamps the speaking speed to the supported range', () => {
    const args = buildMacOSSayArguments(
      {
        providerId: 'system-tts',
        voice: 'Tingting',
        speed: 20,
      },
      'Hello',
      '/tmp/jiuxuange.wav',
    );

    expect(args[3]).toBe('380');
  });

  it('rejects unsupported voices and oversized text before starting a process', () => {
    expect(() =>
      validateSystemTTSRequest({
        providerId: 'system-tts',
        voice: 'NotARealVoice',
        speed: 1,
      }),
    ).toThrow(/Unsupported system TTS voice/);

    expect(() =>
      validateSystemTTSRequest(
        {
          providerId: 'system-tts',
          voice: 'Tingting',
          speed: 1,
        },
        'x'.repeat(4001),
      ),
    ).toThrow(/4000 characters/);
  });
});
