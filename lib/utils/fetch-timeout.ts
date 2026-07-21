/**
 * Client-side fetch timeout helpers.
 *
 * A fetch without a timeout hangs forever when the server (or the upstream it
 * proxies to) accepts the connection but never responds — which used to leave
 * course generation spinning indefinitely. These helpers bound every call
 * while preserving the caller's own abort signal (user navigates away, etc.).
 *
 * Timeout aborts surface as `TimeoutError` (from `AbortSignal.timeout`), which
 * `isRetryableGenerationError` treats as retryable — so a timeout flows into
 * the existing retry/error paths instead of being mistaken for a user abort.
 */

/** Combine an optional caller signal with a fresh per-attempt timeout. */
export function withTimeoutSignal(
  signal: AbortSignal | undefined | null,
  timeoutMs: number,
): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
}

export type StreamTimeoutReason = 'no-event' | 'total';

export interface StreamWatchdogOptions {
  /** Fire when no data at all (including heartbeats) arrives for this long. */
  noEventMs: number;
  /** Fire when the stream has been open longer than this without completing. */
  totalMs: number;
  onTimeout: (reason: StreamTimeoutReason) => void;
}

export interface StreamWatchdog {
  start: () => void;
  /** Call on every received chunk — resets the no-event timer. */
  notifyActivity: () => void;
  stop: () => void;
}

/**
 * Watchdog for a streaming (SSE) response: fires when the stream goes silent
 * or exceeds a total-duration cap. `onTimeout` fires at most once.
 */
export function createStreamWatchdog(options: StreamWatchdogOptions): StreamWatchdog {
  let noEventTimer: ReturnType<typeof setTimeout> | undefined;
  let totalTimer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const stop = () => {
    stopped = true;
    if (noEventTimer !== undefined) {
      clearTimeout(noEventTimer);
      noEventTimer = undefined;
    }
    if (totalTimer !== undefined) {
      clearTimeout(totalTimer);
      totalTimer = undefined;
    }
  };

  const fire = (reason: StreamTimeoutReason) => {
    if (stopped) return;
    stop();
    options.onTimeout(reason);
  };

  const armNoEvent = () => {
    if (stopped) return;
    if (noEventTimer !== undefined) clearTimeout(noEventTimer);
    noEventTimer = setTimeout(() => fire('no-event'), options.noEventMs);
  };

  return {
    start() {
      armNoEvent();
      totalTimer = setTimeout(() => fire('total'), options.totalMs);
    },
    notifyActivity() {
      armNoEvent();
    },
    stop,
  };
}
