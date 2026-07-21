/**
 * Unified LLM Call Layer
 *
 * All LLM interactions should go through callLLM / streamLLM.
 */

import { generateText, streamText } from 'ai';
import type { GenerateTextResult, JSONValue, LanguageModel, StreamTextResult } from 'ai';
import { createLogger } from '@/lib/logger';
import { PROVIDERS } from './providers';
import { thinkingContext } from './thinking-context';
import { getModelMetadataKey } from './model-metadata';
import type { ThinkingCapability, ThinkingConfig } from '@/lib/types/provider';
import {
  getThinkingMode,
  pickThinkingBudget,
  pickThinkingEffort,
  pickThinkingLevel,
} from '@/lib/ai/thinking-config';
const log = createLogger('LLM');

// Re-export for external use
export type { ThinkingConfig } from '@/lib/types/provider';

// ---------------------------------------------------------------------------
// Request timeouts
//
// Without an explicit timeout, a hung upstream (connection accepted but never
// answered, or a stream that stalls mid-generation) keeps the request — and
// the SSE pump feeding the UI — alive forever. Every callLLM/streamLLM call
// therefore gets:
//   - a request timeout (default 120s, LLM_REQUEST_TIMEOUT_MS) bounding the
//     non-streaming call and, for streams, connection setup + first chunk;
//   - for streams, an idle watchdog (default 90s, LLM_STREAM_IDLE_TIMEOUT_MS):
//     any gap with no chunk at all aborts the stream.
// Caller-supplied abortSignals keep working: they are combined with the
// timeout signal, and a caller abort is never reported as a timeout.
// ---------------------------------------------------------------------------

export type LLMTimeoutKind = 'request' | 'idle';

export class LLMTimeoutError extends Error {
  readonly kind: LLMTimeoutKind;
  readonly timeoutMs: number;

  constructor(kind: LLMTimeoutKind, timeoutMs: number) {
    super(
      kind === 'idle'
        ? `LLM stream stalled: no chunk received for ${Math.round(timeoutMs / 1000)}s`
        : `LLM request timed out after ${Math.round(timeoutMs / 1000)}s`,
    );
    this.name = 'LLMTimeoutError';
    this.kind = kind;
    this.timeoutMs = timeoutMs;
  }
}

export function isLLMTimeoutError(error: unknown): error is LLMTimeoutError {
  return error instanceof LLMTimeoutError;
}

const DEFAULT_LLM_REQUEST_TIMEOUT_MS = 120_000;
const DEFAULT_LLM_STREAM_IDLE_TIMEOUT_MS = 90_000;

function readTimeoutEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Timeout for a non-streaming LLM call, or for stream connect + first chunk. */
export function getLlmRequestTimeoutMs(): number {
  return readTimeoutEnv('LLM_REQUEST_TIMEOUT_MS', DEFAULT_LLM_REQUEST_TIMEOUT_MS);
}

/** Max gap between streamed chunks before the stream is aborted. */
export function getLlmStreamIdleTimeoutMs(): number {
  return readTimeoutEnv('LLM_STREAM_IDLE_TIMEOUT_MS', DEFAULT_LLM_STREAM_IDLE_TIMEOUT_MS);
}

/**
 * Combine an optional caller signal with a fresh timeout signal.
 * Returns the timeout signal too, so callers can tell *which* signal fired
 * (a timeout abort maps to LLMTimeoutError; a caller abort passes through).
 */
function combineWithTimeout(
  callerSignal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; timeoutSignal: AbortSignal } {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return {
    signal: callerSignal ? AbortSignal.any([callerSignal, timeoutSignal]) : timeoutSignal,
    timeoutSignal,
  };
}

/**
 * Streams whose last activity gap/connect phase exceeded a timeout, keyed by
 * the StreamTextResult returned from streamLLM. Routes consuming the stream
 * can check this after the stream ends (an abort ends v6 streams cleanly, so
 * the timeout would otherwise look like a short/empty completion).
 */
const streamTimeoutErrors = new WeakMap<object, LLMTimeoutError>();

export function getLlmStreamTimeoutError(result: object): LLMTimeoutError | undefined {
  return streamTimeoutErrors.get(result);
}

// Re-export the parameter types accepted by AI SDK
type GenerateTextParams = Parameters<typeof generateText>[0];
type StreamTextParams = Parameters<typeof streamText>[0];

function _extractRequestInfo(params: GenerateTextParams | StreamTextParams) {
  const tools = params.tools ? Object.keys(params.tools as Record<string, unknown>) : undefined;

  const p = params as Record<string, unknown>;
  return {
    system: p.system as string | undefined,
    prompt: p.prompt as string | undefined,
    messages: p.messages as unknown[] | undefined,
    tools,
    maxOutputTokens: p.maxOutputTokens as number | undefined,
  };
}

function getModelId(params: GenerateTextParams | StreamTextParams): string {
  const m = params.model;
  if (typeof m === 'string') return m;
  if (m && typeof m === 'object' && 'modelId' in m) return (m as { modelId: string }).modelId;
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Thinking / Reasoning Adapter
//
// Builds a lookup table from PROVIDERS at module load time, then uses it to
// map a unified ThinkingConfig into provider-specific providerOptions.
// Native providers (OpenAI/Anthropic/Google) are mapped to providerOptions.
// OpenAI-compatible providers are injected by the providers.ts fetch wrapper.
// ---------------------------------------------------------------------------

interface ModelThinkingInfo {
  thinking?: ThinkingCapability;
}

/** Provider/model → thinking capability (built once at module load) */
const MODEL_THINKING_MAP: Map<string, ModelThinkingInfo> = (() => {
  const map = new Map<string, ModelThinkingInfo>();
  for (const provider of Object.values(PROVIDERS)) {
    for (const model of provider.models) {
      map.set(getModelMetadataKey(provider.id, model.id), {
        thinking: model.capabilities?.thinking,
      });
    }
  }
  return map;
})();

/** Model ID → thinking capability for IDs that are unique across providers. */
const UNIQUE_MODEL_THINKING_MAP: Map<string, ModelThinkingInfo> = (() => {
  const counts = new Map<string, number>();
  for (const provider of Object.values(PROVIDERS)) {
    for (const model of provider.models) {
      counts.set(model.id, (counts.get(model.id) ?? 0) + 1);
    }
  }

  const map = new Map<string, ModelThinkingInfo>();
  for (const provider of Object.values(PROVIDERS)) {
    for (const model of provider.models) {
      if (counts.get(model.id) === 1) {
        map.set(model.id, {
          thinking: model.capabilities?.thinking,
        });
      }
    }
  }
  return map;
})();

/** Global thinking override from environment variable */
function getGlobalThinkingConfig(): ThinkingConfig | undefined {
  if (process.env.LLM_THINKING_DISABLED === 'true') {
    return { mode: 'disabled', enabled: false };
  }
  return undefined;
}

type ProviderOptions = Record<string, Record<string, JSONValue | undefined>>;

function getAnthropicEffort(
  thinking: ThinkingCapability,
  config: ThinkingConfig,
): 'low' | 'medium' | 'high' | 'xhigh' | 'max' | undefined {
  const effort = pickThinkingEffort(thinking, config);
  if (!effort || effort === 'none' || effort === 'minimal') return undefined;
  return effort;
}

function normalizeProviderId(
  provider: string | undefined,
  modelId: string | undefined,
): string | undefined {
  if (!provider) return undefined;
  if (provider === 'anthropic.messages' && modelId?.startsWith('MiniMax-')) return 'minimax';
  if (provider in PROVIDERS) return provider;
  const prefix = provider.split('.')[0];
  return prefix in PROVIDERS ? prefix : undefined;
}

function getModelProviderId(params: GenerateTextParams | StreamTextParams): string | undefined {
  const m = params.model;
  if (!m || typeof m !== 'object' || !('provider' in m)) return undefined;
  const provider = (m as { provider?: string }).provider;
  const modelId = 'modelId' in m ? (m as { modelId?: string }).modelId : undefined;
  return normalizeProviderId(provider, modelId);
}

/**
 * Map a unified ThinkingConfig to provider-specific providerOptions.
 */
function buildThinkingProviderOptions(
  providerId: string | undefined,
  modelId: string,
  config: ThinkingConfig,
): ProviderOptions | undefined {
  const info = providerId
    ? MODEL_THINKING_MAP.get(getModelMetadataKey(providerId, modelId))
    : UNIQUE_MODEL_THINKING_MAP.get(modelId);
  if (!info?.thinking) return undefined; // model has no thinking capability
  const thinking = info.thinking;
  if (thinking.control === 'none') return undefined;

  const mode = getThinkingMode(config);

  switch (thinking.requestAdapter) {
    case 'openai': {
      const effort = pickThinkingEffort(thinking, config);
      return effort ? { openai: { reasoningEffort: effort } } : undefined;
    }

    case 'anthropic': {
      const buildAnthropicOptions = (
        options: Record<string, JSONValue | undefined>,
      ): ProviderOptions => ({
        anthropic: options,
      });

      if (mode === 'disabled') return buildAnthropicOptions({ thinking: { type: 'disabled' } });

      if (thinking.control === 'toggle-budget' || thinking.control === 'budget-only') {
        const budget = pickThinkingBudget(thinking, config);
        return budget === undefined
          ? undefined
          : buildAnthropicOptions({ thinking: { type: 'enabled', budgetTokens: budget } });
      }

      const effort = getAnthropicEffort(thinking, config);
      if (!effort) return undefined;

      if (thinking.anthropicThinking?.type === 'adaptive') {
        // Some newly released Anthropic effort values can lag the local SDK
        // schema. OpenAI-compatible transports still inject those at fetch time.
        if (effort === 'xhigh') return undefined;
        return buildAnthropicOptions({
          thinking: { type: 'adaptive' },
          effort,
        });
      }

      const manualEffort = effort === 'xhigh' ? 'max' : effort;
      const budget = thinking.anthropicThinking?.budgetByEffort?.[manualEffort];
      if (!budget) return undefined;
      return buildAnthropicOptions({
        thinking: { type: 'enabled', budgetTokens: budget },
        effort: manualEffort,
      });
    }

    case 'google': {
      if (thinking.control === 'level') {
        const level = pickThinkingLevel(thinking, config);
        return level ? { google: { thinkingConfig: { thinkingLevel: level } } } : undefined;
      }

      const budget = pickThinkingBudget(thinking, config);
      if (budget === undefined) return undefined;
      return { google: { thinkingConfig: { thinkingBudget: budget } } };
    }

    default:
      // OpenAI-compatible providers are injected in providers.ts fetch wrapper.
      return undefined;
  }
}

/**
 * Resolve providerOptions for direct AI SDK calls that bypass callLLM/streamLLM.
 */
export function resolveThinkingProviderOptions(
  model: LanguageModel,
  thinkingConfig?: ThinkingConfig,
): ProviderOptions | undefined {
  if (!thinkingConfig) return undefined;
  if (typeof model !== 'object' || !('modelId' in model)) return undefined;
  const modelId = (model as { modelId?: string }).modelId ?? 'unknown';
  const provider = 'provider' in model ? (model as { provider?: string }).provider : undefined;
  return buildThinkingProviderOptions(
    normalizeProviderId(provider, modelId),
    modelId,
    thinkingConfig,
  );
}

/**
 * Inject provider-specific thinking options into LLM call params.
 *
 * For native providers (OpenAI/Anthropic/Google), this sets providerOptions.
 * For OpenAI-compatible providers, providerOptions won't work (stripped by
 * zod schema) — those are handled by the custom fetch wrapper via thinkingContext.
 *
 * Priority: caller's providerOptions > ThinkingConfig
 */
function injectProviderOptions<T extends GenerateTextParams | StreamTextParams>(
  params: T,
  thinking?: ThinkingConfig,
): T {
  if ((params as Record<string, unknown>).providerOptions) return params; // caller explicitly set providerOptions

  const modelId = getModelId(params);
  const providerId = getModelProviderId(params);

  if (thinking) {
    const opts = buildThinkingProviderOptions(providerId, modelId, thinking);
    if (opts) return { ...params, providerOptions: opts };
  }

  return params;
}

/**
 * Options for LLM call retry on validation failure.
 * This is separate from the AI SDK's built-in maxRetries (which handles network/5xx errors).
 */
export interface LLMRetryOptions {
  /** Max retry attempts when validate() fails or the response is empty (default: 0 = no retry) */
  retries?: number;
  /** Custom validation function. Return true to accept the result, false to retry.
   *  Default: checks that response text is non-empty. */
  validate?: (text: string) => boolean;
}

const DEFAULT_VALIDATE = (text: string) => text.trim().length > 0;

// ---------------------------------------------------------------------------
// Usage capture
//
// Every server-side LLM call funnels through callLLM/streamLLM, so usage is
// recorded here in one place. Fire-and-forget: failures never affect generation.
// The fs-backed storage is imported dynamically so llm.ts stays safe to bundle
// wherever it's transitively imported.
// ---------------------------------------------------------------------------

function buildUsageMeta(params: GenerateTextParams | StreamTextParams, source: string) {
  const modelId = getModelId(params);
  const providerId = getModelProviderId(params) ?? 'unknown';
  return { source, providerId, modelId, modelString: `${providerId}:${modelId}` };
}

/** Record one call's usage. Never throws. */
function recordUsageSafe(
  rawUsage: unknown,
  meta: { source: string; providerId: string; modelId: string; modelString: string },
): void {
  void (async () => {
    try {
      const { normalizeUsage } = await import('@/lib/usage/normalize');
      const { recordUsage } = await import('@/lib/server/usage-storage');
      await recordUsage({
        kind: 'llm',
        source: meta.source,
        providerId: meta.providerId,
        modelId: meta.modelId,
        modelString: meta.modelString,
        usage: normalizeUsage(rawUsage as never),
      });
    } catch (err) {
      log.warn('Usage capture failed (ignored):', err);
    }
  })();
}

/**
 * Unified wrapper around `generateText`.
 *
 * @param params - Same parameters as AI SDK's `generateText`
 * @param source - A short label for log grouping (e.g. 'scene-stream', 'pbl-chat')
 * @param retryOptions - Optional retry-on-validation-failure settings
 * @param thinking - Optional per-call thinking config (overrides global LLM_THINKING_DISABLED)
 */
export async function callLLM<T extends GenerateTextParams>(
  params: T,
  source: string,
  retryOptions?: LLMRetryOptions,
  thinking?: ThinkingConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<GenerateTextResult<any, any>> {
  const maxAttempts = (retryOptions?.retries ?? 0) + 1;
  const validate = retryOptions?.validate ?? (maxAttempts > 1 ? DEFAULT_VALIDATE : undefined);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastResult: GenerateTextResult<any, any> | undefined;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Fresh timeout per attempt: a hung upstream aborts instead of blocking
    // forever. The caller's own abortSignal still wins (and is not misreported
    // as a timeout).
    const callerSignal = (params as Record<string, unknown>).abortSignal as
      | AbortSignal
      | undefined;
    const requestTimeoutMs = getLlmRequestTimeoutMs();
    const { signal, timeoutSignal } = combineWithTimeout(callerSignal, requestTimeoutMs);
    try {
      // Resolve effective thinking config: per-call > global env > undefined
      const effectiveThinking = thinking ?? getGlobalThinkingConfig();
      const injectedParams = injectProviderOptions(
        { ...params, abortSignal: signal },
        effectiveThinking,
      );

      // Wrap in thinkingContext so the custom fetch wrapper in providers.ts
      // can read the config and inject vendor-specific body params for
      // OpenAI-compatible providers.
      const result = await thinkingContext.run(effectiveThinking, () =>
        generateText(injectedParams),
      );

      // Validate result (only when retries are configured)
      if (validate && !validate(result.text)) {
        log.warn(
          `[${source}] Validation failed (attempt ${attempt}/${maxAttempts}), ${attempt < maxAttempts ? 'retrying...' : 'giving up'}`,
        );
        lastResult = result;
        continue;
      }

      recordUsageSafe(result.usage, buildUsageMeta(params, source));
      return result;
    } catch (error) {
      // Timeout abort → explicit upstream-timeout error. A caller-initiated
      // abort passes through untouched so cancellation semantics are preserved.
      lastError =
        timeoutSignal.aborted && !callerSignal?.aborted
          ? new LLMTimeoutError('request', requestTimeoutMs)
          : error;

      if (attempt < maxAttempts) {
        log.warn(`[${source}] Call failed (attempt ${attempt}/${maxAttempts}), retrying...`, error);
        continue;
      }
    }
  }

  // All attempts exhausted — return last result or throw last error
  if (lastResult) return lastResult;
  throw lastError;
}

/**
 * Unified wrapper around `streamText`.
 *
 * Returns the same StreamTextResult.
 *
 * @param params - Same parameters as AI SDK's `streamText`
 * @param source - A short label for log grouping
 * @param thinking - Optional per-call thinking config (overrides global LLM_THINKING_DISABLED)
 */
export function streamLLM<T extends StreamTextParams>(
  params: T,
  source: string,
  thinking?: ThinkingConfig,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): StreamTextResult<any, any> {
  // Resolve effective thinking config and wrap in thinkingContext
  const effectiveThinking = thinking ?? getGlobalThinkingConfig();

  // --- Timeout wiring -------------------------------------------------------
  // Request timeout bounds connection setup + first chunk; after the first
  // chunk an idle watchdog takes over (any gap with no chunk aborts). The
  // caller's abortSignal (e.g. client disconnect) is combined in and never
  // reported as a timeout.
  const callerSignal = (params as Record<string, unknown>).abortSignal as AbortSignal | undefined;
  const requestTimeoutMs = getLlmRequestTimeoutMs();
  const idleTimeoutMs = getLlmStreamIdleTimeoutMs();
  const watchdog = new AbortController();
  let watchdogTimer: ReturnType<typeof setTimeout> | undefined;
  // Indirection so the watchdog callback can key the error map by the result
  // object even though the timer is armed before streamText returns it.
  const resultHolder: { current?: object } = {};

  const clearWatchdog = () => {
    if (watchdogTimer) {
      clearTimeout(watchdogTimer);
      watchdogTimer = undefined;
    }
  };
  const armWatchdog = (ms: number, kind: LLMTimeoutKind) => {
    clearWatchdog();
    watchdogTimer = setTimeout(() => {
      const error = new LLMTimeoutError(kind, ms);
      if (resultHolder.current) streamTimeoutErrors.set(resultHolder.current, error);
      log.warn(
        `[${source}] ${kind === 'idle' ? `stream idle for ${Math.round(ms / 1000)}s` : `no response within ${Math.round(ms / 1000)}s`} — aborting upstream request`,
      );
      watchdog.abort();
    }, ms);
    // Never keep the process alive just for a pending watchdog.
    (watchdogTimer as { unref?: () => void }).unref?.();
  };
  armWatchdog(requestTimeoutMs, 'request');

  const onCallerAbort = () => {
    clearWatchdog();
    watchdog.abort();
  };
  callerSignal?.addEventListener('abort', onCallerAbort, { once: true });

  const combinedSignal = callerSignal
    ? AbortSignal.any([callerSignal, watchdog.signal])
    : watchdog.signal;

  const callerOnChunk = (params as Record<string, unknown>).onChunk as
    | ((event: unknown) => void | Promise<void>)
    | undefined;
  const callerOnError = (params as Record<string, unknown>).onError as
    | ((event: { error: unknown }) => void | Promise<void>)
    | undefined;
  const callerOnAbort = (params as Record<string, unknown>).onAbort as
    | ((event: unknown) => void | Promise<void>)
    | undefined;

  // Wrap onFinish to capture usage when the stream completes, preserving any
  // caller-supplied onFinish. totalUsage aggregates across steps.
  const usageMeta = buildUsageMeta(params, source);
  const callerOnFinish = (params as Record<string, unknown>).onFinish as
    | ((event: { totalUsage?: unknown; usage?: unknown }) => void | Promise<void>)
    | undefined;
  const wrappedParams = {
    ...params,
    abortSignal: combinedSignal,
    onChunk: async (event: unknown) => {
      // First chunk ends the connect/first-chunk phase; from here on only the
      // idle gap between chunks is watched.
      armWatchdog(idleTimeoutMs, 'idle');
      if (callerOnChunk) await callerOnChunk(event);
    },
    onFinish: async (event: { totalUsage?: unknown; usage?: unknown }) => {
      clearWatchdog();
      callerSignal?.removeEventListener('abort', onCallerAbort);
      recordUsageSafe(event.totalUsage ?? event.usage, usageMeta);
      if (callerOnFinish) await callerOnFinish(event);
    },
    onError: async (event: { error: unknown }) => {
      clearWatchdog();
      callerSignal?.removeEventListener('abort', onCallerAbort);
      if (callerOnError) await callerOnError(event);
    },
    onAbort: async (event: unknown) => {
      clearWatchdog();
      callerSignal?.removeEventListener('abort', onCallerAbort);
      if (callerOnAbort) await callerOnAbort(event);
    },
  } as T;

  const injectedParams = injectProviderOptions(wrappedParams, effectiveThinking);
  let result: StreamTextResult<any, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    result = thinkingContext.run(effectiveThinking, () => streamText(injectedParams));
  } catch (error) {
    clearWatchdog();
    callerSignal?.removeEventListener('abort', onCallerAbort);
    throw error;
  }
  resultHolder.current = result;

  return result;
}
