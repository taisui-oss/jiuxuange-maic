import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the AI SDK entry points so no real model/network is involved. The mocks
// emulate the two upstream behaviours this fix targets: hanging forever (the
// "blackhole" upstream) and respecting the abort signal we inject.
vi.mock('ai', () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
}));

import { generateText, streamText } from 'ai';
import {
  callLLM,
  streamLLM,
  getLlmRequestTimeoutMs,
  getLlmStreamIdleTimeoutMs,
  getLlmStreamTimeoutError,
  isLLMTimeoutError,
  LLMTimeoutError,
} from '@/lib/ai/llm';

const mockGenerateText = vi.mocked(generateText);
const mockStreamText = vi.mocked(streamText);

const REQUEST_TIMEOUT = 60;
const IDLE_TIMEOUT = 40;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** generateText that hangs until the injected abort signal fires. */
function mockHungGenerateText() {
  mockGenerateText.mockImplementation(
    (params: Record<string, unknown>) =>
      new Promise((_, reject) => {
        const signal = params.abortSignal as AbortSignal;
        signal.addEventListener('abort', () =>
          reject(signal.reason ?? new DOMException('Aborted', 'AbortError')),
        );
      }) as never,
  );
}

describe('LLM request timeout configuration', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('defaults to 120s request / 90s stream-idle timeout', () => {
    delete process.env.LLM_REQUEST_TIMEOUT_MS;
    delete process.env.LLM_STREAM_IDLE_TIMEOUT_MS;
    expect(getLlmRequestTimeoutMs()).toBe(120_000);
    expect(getLlmStreamIdleTimeoutMs()).toBe(90_000);
  });

  it('honours LLM_REQUEST_TIMEOUT_MS override and ignores garbage', () => {
    process.env.LLM_REQUEST_TIMEOUT_MS = '5000';
    expect(getLlmRequestTimeoutMs()).toBe(5000);
    process.env.LLM_REQUEST_TIMEOUT_MS = 'not-a-number';
    expect(getLlmRequestTimeoutMs()).toBe(120_000);
    process.env.LLM_REQUEST_TIMEOUT_MS = '-100';
    expect(getLlmRequestTimeoutMs()).toBe(120_000);
  });
});

describe('callLLM timeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LLM_REQUEST_TIMEOUT_MS = String(REQUEST_TIMEOUT);
  });

  afterEach(() => {
    delete process.env.LLM_REQUEST_TIMEOUT_MS;
  });

  it('always injects an abort signal into generateText', async () => {
    mockGenerateText.mockResolvedValue({ text: 'ok', usage: {} } as never);

    const result = await callLLM({ model: 'openai/gpt-4o', prompt: 'hi' } as never, 'test');

    expect(result.text).toBe('ok');
    const calledWith = mockGenerateText.mock.calls[0][0] as Record<string, unknown>;
    expect(calledWith.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it('maps a hung upstream to LLMTimeoutError instead of hanging forever', async () => {
    mockHungGenerateText();

    await expect(
      callLLM({ model: 'openai/gpt-4o', prompt: 'hi' } as never, 'test'),
    ).rejects.toSatisfy(
      (error) => isLLMTimeoutError(error) && error.kind === 'request' && error.timeoutMs === 60,
    );
  });

  it('does not misreport a caller-initiated abort as a timeout', async () => {
    mockHungGenerateText();
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20);

    await expect(
      callLLM(
        { model: 'openai/gpt-4o', prompt: 'hi', abortSignal: controller.signal } as never,
        'test',
      ),
    ).rejects.toSatisfy((error) => !isLLMTimeoutError(error));
  });

  it('uses a fresh timeout per retry attempt', async () => {
    mockHungGenerateText();

    await expect(
      callLLM({ model: 'openai/gpt-4o', prompt: 'hi' } as never, 'test', { retries: 1 }),
    ).rejects.toSatisfy((error) => isLLMTimeoutError(error));
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
  });
});

describe('streamLLM watchdog', () => {
  interface StreamParams {
    abortSignal?: AbortSignal;
    onChunk?: (event: unknown) => void | Promise<void>;
    onFinish?: (event: unknown) => void | Promise<void>;
  }

  let lastParams: StreamParams;
  let fakeResult: object;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LLM_REQUEST_TIMEOUT_MS = String(REQUEST_TIMEOUT);
    process.env.LLM_STREAM_IDLE_TIMEOUT_MS = String(IDLE_TIMEOUT);
    fakeResult = { tag: 'fake-stream-result' };
    mockStreamText.mockImplementation((params: Record<string, unknown>) => {
      lastParams = params as unknown as StreamParams;
      return fakeResult as never;
    });
  });

  afterEach(() => {
    delete process.env.LLM_REQUEST_TIMEOUT_MS;
    delete process.env.LLM_STREAM_IDLE_TIMEOUT_MS;
  });

  it('aborts when connection/first chunk takes longer than the request timeout', async () => {
    const result = streamLLM({ model: 'openai/gpt-4o', prompt: 'hi' } as never, 'test');

    await sleep(REQUEST_TIMEOUT + 40);

    expect(lastParams.abortSignal?.aborted).toBe(true);
    const error = getLlmStreamTimeoutError(result);
    expect(error).toBeInstanceOf(LLMTimeoutError);
    expect(error?.kind).toBe('request');
  });

  it('switches to the idle watchdog after the first chunk and resets on activity', async () => {
    const result = streamLLM({ model: 'openai/gpt-4o', prompt: 'hi' } as never, 'test');

    // First chunk ends the connect phase and arms the idle watchdog.
    await sleep(REQUEST_TIMEOUT / 2);
    await lastParams.onChunk?.({});
    // Two activities spaced below the idle timeout must keep the stream alive
    // past the original request-timeout deadline.
    await sleep(IDLE_TIMEOUT / 2);
    await lastParams.onChunk?.({});
    await sleep(IDLE_TIMEOUT / 2);
    expect(lastParams.abortSignal?.aborted).toBe(false);

    // No more activity: the idle watchdog fires.
    await sleep(IDLE_TIMEOUT + 40);
    expect(lastParams.abortSignal?.aborted).toBe(true);
    const error = getLlmStreamTimeoutError(result);
    expect(error?.kind).toBe('idle');
    expect(error?.timeoutMs).toBe(IDLE_TIMEOUT);
  });

  it('does not record a timeout when the caller aborts', async () => {
    const controller = new AbortController();
    const result = streamLLM(
      { model: 'openai/gpt-4o', prompt: 'hi', abortSignal: controller.signal } as never,
      'test',
    );

    controller.abort();
    await sleep(REQUEST_TIMEOUT + 40);

    expect(lastParams.abortSignal?.aborted).toBe(true);
    expect(getLlmStreamTimeoutError(result)).toBeUndefined();
  });

  it('disarms the watchdog once the stream finishes', async () => {
    const result = streamLLM({ model: 'openai/gpt-4o', prompt: 'hi' } as never, 'test');

    await lastParams.onChunk?.({});
    await lastParams.onFinish?.({});
    await sleep(REQUEST_TIMEOUT + IDLE_TIMEOUT + 60);

    expect(lastParams.abortSignal?.aborted).toBe(false);
    expect(getLlmStreamTimeoutError(result)).toBeUndefined();
  });

  it('preserves caller-supplied onChunk/onFinish callbacks', async () => {
    const onChunk = vi.fn();
    const onFinish = vi.fn();
    streamLLM({ model: 'openai/gpt-4o', prompt: 'hi', onChunk, onFinish } as never, 'test');

    await lastParams.onChunk?.({ chunk: { type: 'text-delta' } });
    await lastParams.onFinish?.({ totalUsage: {} });

    expect(onChunk).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
