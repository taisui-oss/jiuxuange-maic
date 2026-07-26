import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import type { TTSModelConfig } from '@/lib/audio/types';
import type { TTSGenerationResult } from '@/lib/audio/tts-providers';

const execFileAsync = promisify(execFile);
const SYSTEM_TTS_VOICES = new Set(['Tingting']);
const MAX_SYSTEM_TTS_CHARACTERS = 4000;
const BASE_WORDS_PER_MINUTE = 190;

export function validateSystemTTSRequest(config: TTSModelConfig, text = ''): void {
  if (!SYSTEM_TTS_VOICES.has(config.voice)) {
    throw new Error(`Unsupported system TTS voice: ${config.voice}`);
  }
  if (text.length > MAX_SYSTEM_TTS_CHARACTERS) {
    throw new Error(`System TTS input must not exceed ${MAX_SYSTEM_TTS_CHARACTERS} characters`);
  }
}

export function buildMacOSSayArguments(
  config: TTSModelConfig,
  text: string,
  outputPath: string,
): string[] {
  validateSystemTTSRequest(config, text);
  const speed = Math.max(0.5, Math.min(2, config.speed ?? 1));
  const wordsPerMinute = Math.round(BASE_WORDS_PER_MINUTE * speed);

  return [
    '-v',
    config.voice,
    '-r',
    String(wordsPerMinute),
    '--file-format=WAVE',
    '--data-format=LEI16@22050',
    '-o',
    outputPath,
    text,
  ];
}

export async function generateSystemTTS(
  config: TTSModelConfig,
  text: string,
): Promise<TTSGenerationResult> {
  if (process.platform !== 'darwin') {
    throw new Error('Jiuxuange local system TTS is currently available on macOS only');
  }

  const tempDirectory = await mkdtemp(path.join(tmpdir(), 'jiuxuange-system-tts-'));
  const outputPath = path.join(tempDirectory, 'speech.wav');

  try {
    await execFileAsync('/usr/bin/say', buildMacOSSayArguments(config, text, outputPath), {
      timeout: 25_000,
      maxBuffer: 1024 * 1024,
    });
    const audio = await readFile(outputPath);
    if (audio.length <= 4096) {
      throw new Error('macOS system TTS returned empty audio');
    }
    return { audio: new Uint8Array(audio), format: 'wav' };
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}
